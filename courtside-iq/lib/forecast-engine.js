// COURTSIDE IQ — point-in-time forecasts and walk-forward residual learning.
// No historical prediction is ever reconstructed using hindsight standings.
import {normalCdf, predictMatchup} from './lab-math.js';

const finite = x => typeof x === 'number' && Number.isFinite(x);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const average = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;
const FEATURES = 5;

export function matchFeatures(home, away, base) {
  return [1, clamp(base.margin/12,-3,3), clamp((base.total-230)/25,-3,3),
    clamp((home.ppg-away.ppg)/14,-3,3), clamp((home.oppg-away.oppg)/14,-3,3)];
}

// Ridge solution via pivoted Gaussian elimination; intercept is unpenalized.
function ridge(samples, outcome, penalty=80) {
  const dim=FEATURES, a=Array.from({length:dim},()=>Array(dim+1).fill(0));
  for(const row of samples) {
    const x=row.features, target=outcome(row);
    if(!Array.isArray(x)||x.length!==dim||!x.every(finite)||!finite(target))continue;
    for(let i=0;i<dim;i++) {
      a[i][dim]+=x[i]*target;
      for(let j=0;j<dim;j++)a[i][j]+=x[i]*x[j];
    }
  }
  for(let i=1;i<dim;i++)a[i][i]+=penalty;
  a[0][0]+=1;
  for(let i=0;i<dim;i++){
    let p=i;for(let j=i+1;j<dim;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;
    if(Math.abs(a[p][i])<1e-9)return null;
    [a[i],a[p]]=[a[p],a[i]];
    const divisor=a[i][i];for(let k=i;k<=dim;k++)a[i][k]/=divisor;
    for(let j=0;j<dim;j++)if(j!==i){const factor=a[j][i];for(let k=i;k<=dim;k++)a[j][k]-=factor*a[i][k]}
  }
  return a.map(row=>row[dim]);
}

function correction(weights, features, limit) {
  return !weights||!Array.isArray(features) ? 0 : clamp(weights.reduce((s,w,i)=>s+w*features[i],0),-limit,limit);
}

export function trainForecastModel(rows,{minimum=50}={}) {
  const completed=(rows||[]).filter(r=>r.actual&&finite(r.actual.home)&&finite(r.actual.away)&&r.forecast&&
    finite(r.forecast.margin)&&finite(r.forecast.total)&&r.features?.length===FEATURES&&r.features.every(finite))
    .sort((a,b)=>String(a.tip).localeCompare(String(b.tip))).slice(-600);
  if(completed.length<minimum)return {status:'baseline',sample:completed.length,minimum,marginWeights:null,totalWeights:null,
    marginValidated:false,totalValidated:false,sigmaMargin:12,sigmaTotal:18};
  // Hold out the LAST 25% of completed, time-ordered games, not a shuffled training sample.
  const n=Math.floor(completed.length*.75),train=completed.slice(0,n),valid=completed.slice(n);
  const targetMargin=r=>(r.actual.home-r.actual.away)-r.forecast.margin;
  const targetTotal=r=>(r.actual.home+r.actual.away)-r.forecast.total;
  function fit(label,fn,limit) {
    const w=ridge(train,fn);
    if(!w)return {enabled:false,weights:null,baseMAE:null,modelMAE:null};
    const base=average(valid.map(r=>Math.abs(fn(r))));
    const tested=average(valid.map(r=>Math.abs(fn(r)-correction(w,r.features,limit))));
    // Use adjustment only if genuine future-period holdout improves enough.
    const enabled=valid.length>=12&&tested<base*.98;
    return {enabled,weights:enabled?ridge(completed,fn):null,baseMAE:base,modelMAE:tested};
  }
  const m=fit('margin',targetMargin,12),t=fit('total',targetTotal,15);
  const rmse=(fn,weights,limit)=>Math.sqrt(average(completed.map(r=>
    (fn(r)-correction(weights,r.features,limit))**2)));
  return {status:m.enabled||t.enabled?'validated-learning':'baseline-holdout-rejected',
    sample:completed.length,minimum,holdout:valid.length,marginWeights:m.weights,totalWeights:t.weights,
    marginValidated:m.enabled,totalValidated:t.enabled,
    marginHoldoutMAE:m.baseMAE,marginModelHoldoutMAE:m.modelMAE,
    totalHoldoutMAE:t.baseMAE,totalModelHoldoutMAE:t.modelMAE,
    sigmaMargin:clamp(rmse(targetMargin,m.weights,12),10,18),
    sigmaTotal:clamp(rmse(targetTotal,t.weights,15),14,27)};
}

export function forecastGame(home,away,leagueAvg,model={}) {
  const base=predictMatchup(home,away,leagueAvg);
  if(!base)return null;
  const features=matchFeatures(home,away,base);
  const margin=base.margin+correction(model.marginWeights,features,12);
  const total=base.total+correction(model.totalWeights,features,15);
  const sigmaMargin=finite(model.sigmaMargin)?model.sigmaMargin:12;
  const sigmaTotal=finite(model.sigmaTotal)?model.sigmaTotal:18;
  const z=1.281551565545;
  return {features,homePts:(total+margin)/2,awayPts:(total-margin)/2,margin,total,
    homeWinProb:normalCdf(margin/sigmaMargin),sigmaMargin,sigmaTotal,
    marginLow:margin-z*sigmaMargin,marginHigh:margin+z*sigmaMargin,
    totalLow:total-z*sigmaTotal,totalHigh:total+z*sigmaTotal,
    model:model.status||'baseline'};
}

export function scoreLedger(rows) {
  const done=(rows||[]).filter(r=>r.actual&&finite(r.actual.home)&&finite(r.actual.away)&&
    finite(r.forecast?.homePts)&&finite(r.forecast?.awayPts));
  if(!done.length)return {n:0,winnerAccuracy:null,decisiveAccuracy:null,decisiveN:0,scoreMAE:null,
    marginMAE:null,totalMAE:null,brier:null,margin80Coverage:null};
  const avg=fn=>average(done.map(fn));
  const decisive=done.filter(r=>r.pick==='HOME'||r.pick==='AWAY');
  const win=r=>r.actual.home>r.actual.away;
  return {n:done.length,
    winnerAccuracy:avg(r=>Number((r.forecast.homeWinProb>=.5)===win(r))),
    decisiveAccuracy:decisive.length?average(decisive.map(r=>Number((r.pick==='HOME')===win(r)))):null,
    decisiveN:decisive.length,
    scoreMAE:avg(r=>(Math.abs(r.forecast.homePts-r.actual.home)+Math.abs(r.forecast.awayPts-r.actual.away))/2),
    marginMAE:avg(r=>Math.abs(r.forecast.margin-(r.actual.home-r.actual.away))),
    totalMAE:avg(r=>Math.abs(r.forecast.total-(r.actual.home+r.actual.away))),
    brier:avg(r=>(r.forecast.homeWinProb-Number(win(r)))**2),
    margin80Coverage:avg(r=>Number((r.actual.home-r.actual.away)>=r.forecast.marginLow&&
      (r.actual.home-r.actual.away)<=r.forecast.marginHigh))};
}

export function choosePick(probability,threshold=.58) {
  return !finite(probability)?'NO_PICK':probability>=threshold?'HOME':probability<=1-threshold?'AWAY':'NO_PICK';
}
