/**
 * COURTSIDE IQ — Lab math. Pure, dependency-free, unit-tested.
 * Every model here is a transparent baseline, not a calibrated betting model.
 */
const ok=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));

export const NBA_SIGMA_MARGIN=12;   // typical sd of single-game NBA margin (assumption)
export const NBA_SIGMA_TOTAL=18;    // typical sd of single-game total points (assumption)
export const HOME_EDGE=3;           // ~3 points of margin for home court (assumption, split ±1.5)

export function normalCdf(x){const s=x<0?-1:1,z=Math.abs(x)/Math.SQRT2,t=1/(1+0.3275911*z);return 0.5*(1+s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-z*z)));}
export const normalPdf=(x,mu=0,sd=1)=>Math.exp(-0.5*((x-mu)/sd)**2)/(sd*Math.sqrt(2*Math.PI));
export const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
export function sd(a){if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1));}

/** Ordinary least squares y = a + b x, with Pearson r. Pairs with missing values are dropped. */
export function ols(points){
 const p=points.filter(d=>ok(d.x)&&ok(d.y)).map(d=>({x:+d.x,y:+d.y})),n=p.length;
 if(n<3)return null;
 const mx=mean(p.map(d=>d.x)),my=mean(p.map(d=>d.y));
 let sxx=0,syy=0,sxy=0;for(const d of p){sxx+=(d.x-mx)**2;syy+=(d.y-my)**2;sxy+=(d.x-mx)*(d.y-my)}
 if(sxx===0||syy===0)return null;
 const b=sxy/sxx,a=my-b*mx,r=sxy/Math.sqrt(sxx*syy);
 return {n,slope:b,intercept:a,r,r2:r*r};
}
export const pearson=(xs,ys)=>ols(xs.map((x,i)=>({x,y:ys[i]})))?.r??null;
export function corrMatrix(rows,keys){
 return keys.map(a=>keys.map(b=>a===b?1:pearson(rows.map(r=>r[a]),rows.map(r=>r[b]))));
}
export function histogram(values,bins=10){
 const v=values.filter(ok).map(Number);if(v.length<2)return null;
 const lo=Math.min(...v),hi=Math.max(...v),w=(hi-lo)/bins||1,out=Array.from({length:bins},(_,i)=>({from:lo+i*w,to:lo+(i+1)*w,count:0}));
 for(const x of v)out[Math.min(bins-1,Math.floor((x-lo)/w))].count++;
 return out;
}

/* ---------- team rating equations ---------- */
export function pythagorean(pf,pa,exp=13.91){
 if(!ok(pf)||!ok(pa)||+pf<=0||+pa<=0)return null;const a=(+pf)**exp,b=(+pa)**exp;return a/(a+b);
}
/** Grid-search the exponent that minimises squared error vs. actual win%. */
export function fitPythagoreanExponent(teams,{from=6,to=20,step=0.05}={}){
 const t=teams.filter(r=>ok(r.ppg)&&ok(r.oppg)&&ok(r.winPct));if(t.length<8)return null;
 let best=null;
 for(let e=from;e<=to+1e-9;e+=step){
  const sse=t.reduce((s,r)=>s+(r.winPct-pythagorean(r.ppg,r.oppg,e))**2,0);
  if(!best||sse<best.sse)best={exponent:Math.round(e*100)/100,sse};
 }
 const mae=t.reduce((s,r)=>s+Math.abs(r.winPct-pythagorean(r.ppg,r.oppg,best.exponent)),0)/t.length;
 return {...best,rmse:Math.sqrt(best.sse/t.length),mae,n:t.length};
}
export const eFG=(fgm,fga,fg3m)=>fga>0?(fgm+0.5*fg3m)/fga:null;
export const trueShooting=(pts,fga,fta)=>(fga+0.44*fta)>0?pts/(2*(fga+0.44*fta)):null;
export const possessions=(fga,oreb,tov,fta)=>fga-oreb+tov+0.44*fta;
/** Dean Oliver's Four Factors composite (weights 40/25/20/15). Inputs as fractions. */
export const fourFactorScore=({efg,tov,orb,ftr})=>0.40*efg-0.25*tov+0.20*orb+0.15*ftr;

/* ---------- head-to-head ---------- */
export const eloExpected=(ra,rb)=>1/(1+10**((rb-ra)/400));
/** FiveThirtyEight-style margin-of-victory multiplier for Elo updates. */
export const eloMovMultiplier=(margin,winnerEloDiff)=>Math.log(Math.abs(margin)+1)*2.2/(Math.abs(winnerEloDiff)*0.001+2.2);
export function eloUpdate(ra,rb,scoreA,margin=0,{k=20,homeEdge=0}={}){
 const e=eloExpected(ra+homeEdge,rb),mult=margin?eloMovMultiplier(margin,scoreA>0.5?ra+homeEdge-rb:rb-ra-homeEdge):1,d=k*mult*(scoreA-e);
 return {a:ra+d,b:rb-d,expected:e,delta:d};
}
/** Log5 (Bill James): probability A beats B given each side's win% against an average team. */
export function log5(pa,pb){const d=pa+pb-2*pa*pb;return d===0?null:(pa-pa*pb)/d;}

/* ---------- ratings + score prediction ---------- */
/** Shrink current-season per-game rates toward last season: w = g / (g + prior). */
export function blendRating(cur,prev,{prior=20}={}){
 const g=ok(cur?.games)?+cur.games:0,w=g/(g+prior);
 const mix=(a,b)=>ok(a)&&ok(b)?w*a+(1-w)*b:ok(a)&&g>0?a:ok(b)?+b:null;
 return {ppg:mix(cur?.ppg,prev?.ppg),oppg:mix(cur?.oppg,prev?.oppg),weightCurrent:w,games:g};
}
export function leagueAverage(rows,key='ppg'){return mean(rows.map(r=>r[key]).filter(ok).map(Number));}
/**
 * Expected score of home vs away. Multiplicative attack×defence form:
 *   E[points A] = ppgA × oppgB / leagueAvg, then a symmetric home-court shift.
 */
export function predictMatchup(home,away,lgAvg,{homeEdge=HOME_EDGE,sigmaMargin=NBA_SIGMA_MARGIN,sigmaTotal=NBA_SIGMA_TOTAL}={}){
 if(![home?.ppg,home?.oppg,away?.ppg,away?.oppg,lgAvg].every(ok))return null;
 const h=home.ppg*away.oppg/lgAvg+homeEdge/2,a=away.ppg*home.oppg/lgAvg-homeEdge/2;
 const margin=h-a,total=h+a,z=1.2816;      // 80% interval
 return {homePts:h,awayPts:a,margin,total,homeWinProb:normalCdf(margin/sigmaMargin),
  marginLow:margin-z*sigmaMargin,marginHigh:margin+z*sigmaMargin,totalLow:total-z*sigmaTotal,totalHigh:total+z*sigmaTotal,sigmaMargin,sigmaTotal};
}
/** Mean absolute error of predicted vs actual win% (a sanity check, not a backtest of games). */
export function winPctMAE(teams,exp=13.91){
 const t=teams.filter(r=>ok(r.ppg)&&ok(r.oppg)&&ok(r.winPct));
 return t.length?t.reduce((s,r)=>s+Math.abs(r.winPct-pythagorean(r.ppg,r.oppg,exp)),0)/t.length:null;
}
