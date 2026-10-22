// MONO BASKET — transparent, conditionally available multi-model NBA ensemble.
// No claims of measured individual player impact without minutes/on-off data.
import {normalCdf,pythagorean,log5} from './lab-math.js';
import {forecastGame} from './forecast-engine.js';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const alias={WSH:'WAS',GS:'GSW',NY:'NYK',SA:'SAS',NO:'NOP',PHO:'PHX',BRK:'BKN',CHO:'CHA'};
export const teamKey=x=>alias[String(x||'').toUpperCase()]||String(x||'').toUpperCase();
export const MODEL_LABELS={
 scoring:'Attack / defence',net:'Net-rating strength',pyth:'Pythagorean expectation',
 bayes:'Bayesian win rates',form:'Last-10 form',momentum:'Recency-weighted form',
 elo:'Historical Elo',conditions:'Rest / roster / availability',ridge:'Online / validated ridge'
};
function form(schedule=[],before=Date.now()){
 const played=schedule.filter(g=>g&&g.final&&finite(g.for)&&finite(g.against)&&Date.parse(g.date)<before)
 .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const last=played.slice(0,10),old=last.slice(0,5),margin=g=>g.for-g.against;
 const weighted=last.length?last.reduce((v,g,i)=>v+margin(g)*Math.pow(.75,i),0)/last.reduce((v,g,i)=>v+Math.pow(.75,i),0):null;
 const lastTip=played[0]?Date.parse(played[0].date):null;
 const rest=lastTip===null?null:Math.max(0,(before-lastTip)/86400000);
 return {games:played.length,last10:avg(last.map(margin)),last5:avg(old.map(margin)),
  ewma:weighted,avgPoints:avg(last.map(g=>g.for)),avgAgainst:avg(last.map(g=>g.against)),restDays:rest};
}
function rosterMetric(roster,prior){
 const current=(roster?.athletes||[]).map(p=>String(p.id||'')).filter(Boolean);
 const previous=(prior?.athletes||[]).map(p=>String(p.id||'')).filter(Boolean);
 if(current.length<8||previous.length<8)return null;
 const p=new Set(previous);
 return {current:current.length,retained:current.filter(id=>p.has(id)).length,share:current.filter(id=>p.has(id)).length/current.length,
  source:'Roster-overlap proxy; not minutes-weighted'};
}
function conditionalVote(id,margin,total,why,available=true){
 if(!available||!finite(margin)||!finite(total))return null;
 return {id,label:MODEL_LABELS[id],margin:+clamp(margin,-38,38).toFixed(2),total:+clamp(total,170,290).toFixed(2),
  homeWinProb:+normalCdf(clamp(margin,-38,38)/12).toFixed(4),why};
}
function learnedWeights(votes,ledger=[]){
 const ready=votes.filter(Boolean),weights={};
 for(const v of ready){
  const samples=ledger.filter(r=>r.actual&&Array.isArray(r.modelVotes)).map(r=>{
    const p=r.modelVotes.find(m=>m.id===v.id);
    return p&&finite(p.homeWinProb)?{p:p.homeWinProb,actual:r.actual.home>r.actual.away?1:0}:null;
  }).filter(Boolean).slice(-200);
  const brier=samples.length?avg(samples.map(s=>(s.p-s.actual)**2)):null;
  // Shrink skill estimate toward a common prior: no spuriously dominant model on a tiny sample.
  weights[v.id]=Math.pow(.24+(brier===null?.24:brier)*samples.length/(samples.length+45)-.24*samples.length/(samples.length+45),-1);
 }
 const sum=Object.values(weights).reduce((a,b)=>a+b,0)||1;
 return Object.fromEntries(Object.entries(weights).map(([k,w])=>[k,w/sum]));
}
function chronologicalMargin(hf,af,eh,ea,model){
 const xs=chronologicalFeatures(null,null,hf,af,eh,ea);
 return clamp(xs.reduce((sum,x,i)=>sum+x*(model.weights?.[i]||0),0),-38,38);
}
export function predictEnsemble(home,away,leagueAvg,model={},context={},historical=[]){
 const baseline=forecastGame(home,away,leagueAvg,model);if(!baseline)return null;
 const gTime=Date.parse(context.tip)||Date.now(),hf=form(context.homeGames||[],gTime),af=form(context.awayGames||[],gTime);
 const hrs=rosterMetric(context.homeRoster,context.homePriorRoster),ars=rosterMetric(context.awayRoster,context.awayPriorRoster);
 const hW=finite(home.wins)?home.wins:null,hL=finite(home.losses)?home.losses:null,aW=finite(away.wins)?away.wins:null,aL=finite(away.losses)?away.losses:null;
 const hWrate=hW===null?null:(hW+6)/(hW+hL+12),aWrate=aW===null?null:(aW+6)/(aW+aL+12);
 const deltaRest=hf.restDays!==null&&af.restDays!==null?clamp(hf.restDays-af.restDays,-4,4):null;
 const hc=context.homeInjuries,ac=context.awayInjuries;
 const countOut=items=>Array.isArray(items)?items.filter(x=>/\b(out|doubtful)\b/i.test(String(x.status||''))).length:null;
 const oh=countOut(hc),oa=countOut(ac);
 const continuity=hrs&&ars?hrs.share-ars.share:null;
 const conditions= ((deltaRest===null?0:deltaRest*.32)+(oh===null||oa===null?0:clamp(oa-oh,-4,4)*.5)
   +(continuity===null?0:continuity*2));
 const contextAvailable=deltaRest!==null||(oh!==null&&oa!==null)||continuity!==null;
 const elo=context.elo||{},eh=elo[teamKey(home.abbr)],ea=elo[teamKey(away.abbr)];
 const votes=[
  conditionalVote('scoring',baseline.margin,baseline.total,'Blended points for and against'),
  conditionalVote('net',2.5+((home.ppg-home.oppg)-(away.ppg-away.oppg))*.56,baseline.total,'Smoothed net points per game'),
  conditionalVote('pyth',2.5+((pythagorean(home.ppg,home.oppg)??.5)-(pythagorean(away.ppg,away.oppg)??.5))*34,baseline.total,'Pythagorean expectation'),
  conditionalVote('bayes',2.5+(log5(hWrate,aWrate)-.5)*31,baseline.total,'Beta(6,6) prior and Log5',hWrate!==null&&aWrate!==null),
  conditionalVote('form',2.5+(hf.last10-af.last10)*.54,baseline.total,'Past ten real results',hf.games>=5&&af.games>=5),
  conditionalVote('momentum',2.5+(hf.ewma-af.ewma)*.53,baseline.total+(hf.avgPoints+af.avgPoints-baseline.total)*.24,'Exponentially weighted real match form',hf.games>=5&&af.games>=5),
  conditionalVote('elo',2.5+(eh-ea)*.032,baseline.total,'Chronological completed-game Elo',finite(eh)&&finite(ea)),
  conditionalVote('conditions',baseline.margin+conditions,baseline.total,'Rest days / verified OUT counts / roster overlap',contextAvailable),
  conditionalVote('ridge',
   context.historicalModel?.validated&&finite(eh)&&finite(ea)?chronologicalMargin(hf,af,eh,ea,context.historicalModel):baseline.margin,
   baseline.total,
   context.historicalModel?.validated?'Online ridge trained and prequentially tested on prior final games':'Chronologically validated residual regression',
   !!((context.historicalModel?.validated&&finite(eh)&&finite(ea))||model.marginValidated))
 ].filter(Boolean);
 const weights=learnedWeights(votes,historical);
 const m=votes.reduce((s,v)=>s+v.margin*weights[v.id],0),total=votes.reduce((s,v)=>s+v.total*weights[v.id],0);
 const p=normalCdf(m/(finite(model.sigmaMargin)?model.sigmaMargin:12));
 const confidence={roster:!!(context.homeRoster&&context.awayRoster),
  previousRoster:hrs!==null&&ars!==null,injuries:oh!==null&&oa!==null,
  rest:deltaRest!==null,form:hf.games>=5&&af.games>=5,elo:finite(eh)&&finite(ea),
  note:'Context proxies are conservative; player minutes, opponent-adjusted strength and verified starting lineups may be unavailable.'};
 return {...baseline,homePts:(total+m)/2,awayPts:(total-m)/2,margin:m,total,homeWinProb:p,
  marginLow:m-1.28155*(model.sigmaMargin||12),marginHigh:m+1.28155*(model.sigmaMargin||12),
  totalLow:total-1.28155*(model.sigmaTotal||18),totalHigh:total+1.28155*(model.sigmaTotal||18),
  model:'multi-model-ensemble',modelVotes:votes.map(v=>({...v,weight:+weights[v.id].toFixed(3)})),
  conditions:{formH:hf,formA:af,rosterH:hrs,rosterA:ars,restGapDays:deltaRest,
   outH:oh,outA:oa,sourceCoverage:confidence},activeModels:votes.length};
}
export function elosFromSchedules(games=[]){
 const ordered=[...new Map(games.filter(g=>g?.id&&g.final&&finite(g.homeScore)&&finite(g.awayScore))
 .map(g=>[g.id,g])).values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const rates=new Map();
 for(const g of ordered){const h=teamKey(g.homeCode),a=teamKey(g.awayCode);if(!h||!a)continue;
  const hr=rates.get(h)||1500,ar=rates.get(a)||1500;
  const expect=1/(1+Math.pow(10,((ar-hr-65)/400))),delta=18*((g.homeScore>g.awayScore?1:0)-expect);
  rates.set(h,hr+delta);rates.set(a,ar-delta);
 }
 return Object.fromEntries(rates);
}


/**
 * Walk-forward learning from raw final NBA games. The game being evaluated is
 * NEVER inserted into team form/Elo until after its prediction has been scored.
 * Updates use robust stochastic ridge optimisation, retaining an online audit.
 */
function chronologicalFeatures(home,away,hf,af,eloH,eloA){
 const safe=x=>finite(x)?x:0;
 return [1,clamp((eloH-eloA)/250,-3,3),
  clamp((safe(hf.last10)-safe(af.last10))/15,-3,3),
  clamp((safe(hf.avgPoints)-safe(af.avgPoints))/14,-3,3),
  clamp((safe(hf.avgAgainst)-safe(af.avgAgainst))/14,-3,3),
  clamp((safe(hf.restDays)-safe(af.restDays))/4,-2,2)];
}
export function trainHistoricalOnline(games=[]){
 const unique=[...new Map(games.filter(g=>g?.id&&g.final&&finite(g.homeScore)&&finite(g.awayScore)&&g.date)
  .map(g=>[String(g.id),g])).values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const histories=new Map(),elo=new Map();
 let w=[2.5,7,3,1.5,-1.5,.25],fitN=0,holdN=0,mlErr=0,baseErr=0,correct=0,brier=0;
 for(const g of unique){
  const h=teamKey(g.homeCode),a=teamKey(g.awayCode);
  if(!h||!a||h===a)continue;
  const hr=elo.get(h)||1500,ar=elo.get(a)||1500;
  const hh=histories.get(h)||[],aa=histories.get(a)||[];
  const time=Date.parse(g.date),hf=form(hh,time),af=form(aa,time);
  const xs=chronologicalFeatures(h,a,hf,af,hr,ar);
  const baseline=clamp(2.5+(hr-ar)*.032,-35,35);
  const estimated=clamp(w.reduce((sum,v,i)=>sum+v*xs[i],0),-35,35);
  const outcome=g.homeScore-g.awayScore;
  if(hh.length>=5&&aa.length>=5){
   fitN++;
   if(fitN>=150){
    holdN++;mlErr+=Math.abs(estimated-outcome);baseErr+=Math.abs(baseline-outcome);
    const p=normalCdf(estimated/12),won=+(outcome>0);
    correct+=+(+(estimated>=0)===won);brier+=(p-won)**2;
   }
   const err=clamp(estimated-outcome,-42,42),step=.013/Math.sqrt(1+fitN/200);
   w=w.map((v,i)=>clamp(v-step*(err*xs[i]+(i===0?0:.008*v)),-32,32));
  }
  const expect=1/(1+Math.pow(10,((ar-hr-65)/400))),delta=18*((outcome>0?1:0)-expect);
  elo.set(h,hr+delta);elo.set(a,ar-delta);
  const add=(key,pts,other)=>{
   const list=histories.get(key)||[];
   list.push({date:g.date,final:true,for:pts,against:other});
   if(list.length>82)list.shift();
   histories.set(key,list);
  };
  add(h,g.homeScore,g.awayScore);add(a,g.awayScore,g.homeScore);
 }
 const validated=fitN>=250&&holdN>=50&&mlErr<baseErr;
 return {method:'chronological-online-ridge',trained:fitN,backtest:holdN,validated,weights:w,
  marginMAE:holdN?+(mlErr/holdN).toFixed(2):null,
  eloBaselineMAE:holdN?+(baseErr/holdN).toFixed(2):null,
  winAccuracy:holdN?+(correct/holdN).toFixed(3):null,
  brier:holdN?+(brier/holdN).toFixed(4):null,
  description:'Expanding time-order; prior games only, evaluated before learning each result.'};
}
