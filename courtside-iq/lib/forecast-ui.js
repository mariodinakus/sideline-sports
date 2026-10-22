// COURTSIDE IQ — source-backed audit UI for predictions locked before tipoff.
export function renderForecastLedger(ledger,{esc=x=>String(x),error=null,loading=false}={}) {
 const pct=x=>Number.isFinite(x)?(100*x).toFixed(1)+'%':'—';
 const num=(x,d=1)=>Number.isFinite(x)?x.toFixed(d):'—';
 const signed=x=>Number.isFinite(x)?(x>0?'+':'')+x.toFixed(1):'—';
 const e=x=>esc(x==null?'—':x);
 if(!ledger||!Array.isArray(ledger.records)) {
  return '<p class="lab-caption">'+(error?'Forecast archive unavailable: '+e(error):
   loading?'Loading the forecast archive…':'No archived pregame forecasts yet. Automated runs must first collect games before tipoff.')+'</p>';
 }
 const records=ledger.records.slice().sort((a,b)=>String(b.tip).localeCompare(String(a.tip)));
 const settled=records.filter(r=>r.actual);
 const upcoming=records.filter(r=>!r.actual&&Date.parse(r.tip)>Date.now()-3*3600000)
  .sort((a,b)=>String(a.tip).localeCompare(String(b.tip))).slice(0,18);
 const recent=settled.slice(0,30);
 const s=ledger.summary||{}, m=ledger.model||{};
 const tile=(name,val,note)=>'<div class="lab-stat"><div class="k">'+name+'</div><div class="v">'+val+'</div><div class="s">'+note+'</div></div>';
 const table=items=>'<div class="table-wrap"><table class="data-table lab-table"><thead><tr><th>Tipoff (UTC)</th><th>Match</th><th>Locked score</th><th>Pick (1 / 2)</th><th>Home win</th><th>Projected total</th><th>Actual score</th><th>Evaluation</th></tr></thead><tbody>'+
  items.map(r=>{
   const f=r.forecast||{},a=r.actual,home=r.homeCode||r.home,away=r.awayCode||r.away;
   const picked=r.pick==='HOME'?'1 · '+home:r.pick==='AWAY'?'2 · '+away:'No confident pick';
   const won=a?(a.home>a.away?'HOME':'AWAY'):null;
   const hit=a?(r.pick==='NO_PICK'?'No pick':r.pick===won?'✓ WIN':'✕ MISS'):'Pending';
   const marginError=a?Math.abs((a.home-a.away)-f.margin):null;
   const totalError=a?Math.abs((a.home+a.away)-f.total):null;
   return '<tr><td>'+e(String(r.tip).slice(0,16).replace('T',' '))+'</td><td>'+e(away)+' @ '+e(home)+'</td>'+
    '<td class="num">'+num(f.awayPts,0)+' – '+num(f.homePts,0)+'</td>'+
    '<td>'+e(picked)+'</td><td class="num">'+pct(f.homeWinProb)+'</td><td class="num">'+num(f.total,1)+'</td>'+
    '<td class="num">'+(a?num(a.away,0)+' – '+num(a.home,0):'—')+'</td>'+
    '<td class="num">'+e(hit)+(a?'<div class="lab-caption">Margin ±'+num(marginError,1)+' · Total ±'+num(totalError,1)+'</div>':'')+'</td></tr>';
  }).join('')+'</tbody></table></div>';
 let out='<div class="lab-stats compact">'+
  tile('PREGAME RECORDS',String(records.length),'Immutable snapshots before tipoff')+
  tile('GAMES SETTLED',String(s.n||0),'Only final ESPN scores are evaluated')+
  tile('WINNER HIT RATE',pct(s.winnerAccuracy),'All evaluated games; no odds calibration claim')+
  tile('PICK HIT RATE',pct(s.decisiveAccuracy),(s.decisiveN||0)+' picks ≥58% or ≤42%')+
  tile('SCORE MAE',num(s.scoreMAE)+' pts','Average per-team absolute score error')+
  tile('MARGIN / TOTAL MAE',num(s.marginMAE)+' / '+num(s.totalMAE),'Absolute points of error')+
  tile('BRIER SCORE',num(s.brier,3),'Probability accuracy; smaller is better')+
  tile('80% MARGIN COVERAGE',pct(s.margin80Coverage),'Empirical coverage of stated range')+'</div>';
 out+='<p class="lab-caption"><strong>Learning:</strong> '+e(m.status||'baseline')+
  ' · '+(m.sample||0)+' completed training samples; minimum '+(m.minimum||50)+
  '. '+(m.marginValidated?'Margin residual learner validated. ':'Margin baseline retained. ')+
  (m.totalValidated?'Total residual learner validated.':'Total baseline retained.')+
  ' A time-ordered holdout must outperform the original baseline before any learner is used. Last archive update: '+
  e(ledger.updatedAt||'Not started')+'.</p>';
 out+='<h3>Upcoming · forecasts locked before tipoff</h3>'+
  (upcoming.length?table(upcoming):'<div class="blank">No locked upcoming predictions. The scheduled data collector will add a match only when it sees it before tipoff.</div>');
 out+='<h3>Prediction versus reality · last 30 completed games</h3>'+
  (recent.length?table(recent):'<div class="blank">No completed forecasts yet. Accuracy will appear once previously recorded games finish.</div>');
 out+='<p class="lab-caption">Source: ESPN public NBA scoreboard and team standings. This is a reproducible pregame audit, not an odds service. The provisional live forecast higher on this page can change; only the timestamped archive counts toward accuracy. Automatic updates depend on GitHub Actions running successfully and Vercel publishing the resulting data.</p>';
 return out;
}
