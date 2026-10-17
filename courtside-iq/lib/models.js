/** Transparent baselines, not ML. Pure functions reusable client/server. */
export function clamp(v, low, high) {return Math.max(low, Math.min(high, Number.isFinite(v) ? v : low));}
export function fourFactors({fgm=0,fga=0,threeMade=0,fta=0,ftm=0,oreb=0,reb=0,ast=0,tov=0,points=0}={}) {
  const efg = fga>0 ? (fgm+0.5*threeMade)/fga*100 : null;
  const ts = (fga+0.44*fta)>0 ? points/(2*(fga+0.44*fta))*100 : null;
  const possessions = fga - oreb + tov + 0.44*fta;
  return {efg,ts, possessions:possessions>0?possessions:null, tovRate:possessions>0?tov/possessions*100:null, freeThrowRate:fga>0?fta/fga*100:null, assistToTurnover:tov>0?ast/tov:null, offensiveReboundCount:oreb};
}
export function normalCdf(x){const sign=x<0?-1:1;const z=Math.abs(x)/Math.SQRT2;const t=1/(1+0.3275911*z);const erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-z*z);return 0.5*(1+sign*erf);}
export function logisticWinProbability(margin,sigma=12) {return clamp(normalCdf(margin/sigma),0.001,0.999);}
export function expectedMargin(home,away,{league='nba',homeAdvantage,paceDelta=0,homeAdjustment=0,awayAdjustment=0}={}){
  const nba=league==='nba';const basePace=nba?99:72;const fallback=nba?114:83;
  const hPace=home.pace>0?home.pace:basePace, aPace=away.pace>0?away.pace:basePace;
  const pace=clamp((hPace+aPace)/2+paceDelta,nba?80:60,nba?113:88);
  const hFor=Number(home.pointsFor)||fallback, aFor=Number(away.pointsFor)||fallback;
  const hAgainst=Number(home.pointsAgainst)||fallback, aAgainst=Number(away.pointsAgainst)||fallback;
  const hAttack=Number.isFinite(home.offRtg)?home.offRtg:hFor/basePace*100;
  const aAttack=Number.isFinite(away.offRtg)?away.offRtg:aFor/basePace*100;
  const hDef=Number.isFinite(home.defRtg)?home.defRtg:hAgainst/basePace*100;
  const aDef=Number.isFinite(away.defRtg)?away.defRtg:aAgainst/basePace*100;
  const hPpp=(hAttack+aDef)/200, aPpp=(aAttack+hDef)/200;
  const adv=homeAdvantage??(nba?2.3:3.0);
  const hPoints=pace*hPpp+adv/2+homeAdjustment;
  const aPoints=pace*aPpp-adv/2+awayAdjustment;
  return {pace,homePoints:hPoints,awayPoints:aPoints,margin:hPoints-aPoints,assumptionFallback:![home.offRtg,away.offRtg,home.defRtg,away.defRtg].every(Number.isFinite)};
}
export function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function simulateMatch({meanMargin,sigma=12,draws=5000,seed=2093}){
  const rng=mulberry32(seed);let wins=0;let sum=0;const values=[];
  for(let i=0;i<draws;i++){const u=Math.max(rng(),1e-12),v=rng();const x=meanMargin+sigma*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);values.push(x);sum+=x;if(x>0)wins++;}
  values.sort((a,b)=>a-b);
  const bucket=Array.from({length:25},(_,i)=>({margin:-36+i*3,count:0}));
  for(const x of values){let b=Math.round((x+36)/3);b=Math.max(0,Math.min(24,b));bucket[b].count++;}
  return {winProbability:wins/draws,expectedMargin:sum/draws,low:values[Math.floor(draws*.10)],high:values[Math.floor(draws*.90)],distribution:bucket,draws};
}
