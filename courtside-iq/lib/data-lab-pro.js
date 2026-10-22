/**
 * COURTSIDE IQ — Data Lab Pro: Chart Studio, Equation Lab, Score Predictor,
 * Season Outlook and Modern Game. Live data only; models are transparent baselines.
 */
import {flattenStandings} from './data-lab.js';
import {renderForecastLedger,renderModelVotes} from './forecast-ui.js';
import {predictEnsemble,teamKey} from './ensemble-engine.js';
import {NBA_ERA} from './evolution.js';
import {mulberry32} from './models.js';
import {ols,corrMatrix,histogram,pythagorean,fitPythagoreanExponent,eFG,trueShooting,possessions,fourFactorScore,eloUpdate,eloExpected,log5,normalCdf,mean,sd,blendRating,leagueAverage,predictMatchup,winPctMAE,NBA_SIGMA_MARGIN,NBA_SIGMA_TOTAL,HOME_EDGE} from './lab-math.js';
import {scatter,bars,histogramSvg,lines,heatmap,marginCurve,nf} from './lab-charts.js';

const ok=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const seasonLabel=y=>`${y}–${String(y+1).slice(-2)}`;
const seasonNow=()=>{const d=new Date();return d.getUTCMonth()>=8?d.getUTCFullYear():d.getUTCFullYear()-1};
const ALIAS={WSH:'WAS',GS:'GSW',NY:'NYK',SA:'SAS',NO:'NOP',UTAH:'UTA',PHO:'PHX',BRK:'BKN',CHO:'CHA',NOH:'NOP',NJN:'BKN'};
const key=r=>{const a=String(r.abbr||'').toUpperCase();return ALIAS[a]||a||String(r.team||'').toUpperCase()};
const pct=x=>ok(x)?(Number(x)*100).toFixed(1)+'%':'—';
const SEASONS=Array.from({length:11},(_,i)=>seasonNow()-i);   // current + ten prior

const TEAM_METRICS={ppg:['Points for / game',v=>nf(v,1)],oppg:['Points against / game',v=>nf(v,1)],diff:['Point differential / game',v=>nf(v,1)],winPct:['Win %',pct],pythWinPct:['Pythagorean win %',pct]};
const PLAYER_METRICS={ptsG:['Points / game'],rebG:['Rebounds / game'],astG:['Assists / game'],minG:['Minutes / game'],ts:['True shooting %'],efg:['Effective FG %'],usg:['Usage %'],per:['PER'],bpm:['BPM'],vorp:['VORP'],ws:['Win shares']};

export function createLabPro({shell,title,esc,render}){
 const P={ui:{season:SEASONS[1],tx:'ppg',ty:'oppg',th:'ppg',px:'usg',py:'ts',pm:'per',home:'',away:'',eqSeason:SEASONS[1]},data:new Map(),loading:new Set(),errors:new Map()};
 const lab=(body)=>`<div class="lab">${body}</div>`;
 const cell=(n,t,code,body)=>`<section class="lab-cell"><div class="lab-gutter">In&nbsp;[${n}]</div><div class="lab-body"><div class="lab-cell-head"><h3>${t}</h3></div>${code?`<pre class="lab-code">${esc(code)}</pre>`:''}${body}</div></section>`;
 const sel=(id,opts,val,label)=>`<label>${label}<select id="${id}" class="lab-field">${opts.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 const seasonSel=(id,val)=>sel(id,SEASONS.map(y=>[y,seasonLabel(y)+(y===seasonNow()?' (current)':'')]),val,'Season');
 const note=t=>`<p class="lab-caption">${t}</p>`;
 const warn=t=>`<div class="lab-warn">${t}</div>`;

 /* ---------- data layer (cached, de-duplicated) ---------- */
 const json=async url=>{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
 const LOADERS={
  archive:async y=>{const d=await json('/data/prediction-ledger.json?y='+y);if(!Array.isArray(d.records))throw Error('Forecast archive unavailable');return d;},
  standings:async y=>flattenStandings((await json(`/api/live?league=nba&season=${y}`)).groups).map(r=>({...r,key:key(r)})),
  live:async y=>{const d=await json(`/api/live?league=nba&season=${y}`);return {games:d.games||[],date:d.date,rows:flattenStandings(d.groups).map(r=>({...r,key:key(r)})),notes:d.notes}},
  players:async y=>{const d=await json(`/api/data?league=nba&season=${y}`);return (d.players||[]).map(p=>{const g=+p.games>0?+p.games:null;return {...p,ptsG:g&&ok(p.pts)?p.pts/g:null,rebG:g&&ok(p.reb)?p.reb/g:null,astG:g&&ok(p.ast)?p.ast/g:null,minG:g&&ok(p.mins)?p.mins/g:null}})}
 };
 function need(kind,y){
  const k=`${kind}:${y}`;
  if(P.data.has(k)||P.loading.has(k)||P.errors.has(k))return P.data.get(k);
  P.loading.add(k);P.errors.delete(k);
  LOADERS[kind](y).then(v=>P.data.set(k,v)).catch(e=>P.errors.set(k,String(e.message||e))).finally(()=>{P.loading.delete(k);render()});
  return undefined;
 }
 const get=(kind,y)=>P.data.get(`${kind}:${y}`);
 const err=(kind,y)=>P.errors.get(`${kind}:${y}`);
 const busy=()=>P.loading.size>0;
 const status=(...pairs)=>{
  const e=pairs.map(([k,y])=>err(k,y)).filter(Boolean)[0];
  return e?`<span class="lab-state err">✕ ${esc(e)}</span>`:busy()?'<span class="lab-state run">● loading live data…</span>':'<span class="lab-state ok">✓ data loaded</span>';
 };
 /** History for trend/persistence pages: standings for the last ten seasons plus the current one. */
 function needHistory(){SEASONS.forEach(y=>need('standings',y))}
 function history(){
  return SEASONS.map(y=>({season:y,rows:get('standings',y)})).filter(h=>h.rows?.length).sort((a,b)=>a.season-b.season);
 }
 const completed=h=>{const gp=h.rows.map(r=>r.games).filter(ok);return gp.length>=20&&Math.min(...gp)>=60};   // full, comparable regular seasons
 const persistence=()=>{
  const h=history().filter(completed),pts=[];
  for(let i=0;i<h.length-1;i++){
   if(h[i+1].season!==h[i].season+1)continue;
   const next=new Map(h[i+1].rows.map(r=>[r.key,r]));
   for(const r of h[i].rows){const n=next.get(r.key);if(n&&ok(r.pythWinPct)&&ok(n.winPct))pts.push({x:r.pythWinPct,y:n.winPct,label:`${r.team} ${seasonLabel(h[i].season)}→${seasonLabel(h[i+1].season)}`,short:r.abbr||r.team})}
  }
  return {pts,fit:ols(pts),seasons:h.length};
 };

 /* ---------- 1. Chart Studio ---------- */
 function charts(){
  const y=P.ui.season;need('standings',y);need('players',y);
  const t=get('standings',y)||[],pl=get('players',y)||[];
  const tm=Object.entries(TEAM_METRICS),pm=Object.entries(PLAYER_METRICS);
  const tOpts=tm.map(([k,v])=>[k,v[0]]),pOpts=pm.map(([k,v])=>[k,v[0]]);
  const ptsT=t.map(r=>({x:r[P.ui.tx],y:r[P.ui.ty],label:r.team,short:r.abbr,cls:ok(r.winPct)?(r.winPct>=.5?'sec':'neg'):'neu'}));
  const hist=histogram(t.map(r=>r[P.ui.th]),8);
  const diff=[...t].filter(r=>ok(r.diff)).sort((a,b)=>b.diff-a.diff).map(r=>({label:r.team,short:r.abbr||r.team,value:r.diff}));
  const players=pl.filter(p=>ok(p[P.ui.px])&&ok(p[P.ui.py]));
  const ptsP=pl.map(p=>({x:p[P.ui.px],y:p[P.ui.py],label:`${p.name} (${p.teamCode||p.team||''})`,short:(p.name||'').split(' ').slice(-1)[0],cls:'pri',r:5}));
  const lead=[...pl].filter(p=>ok(p[P.ui.pm])).sort((a,b)=>b[P.ui.pm]-a[P.ui.pm]).slice(0,15).map(p=>({label:`${p.name} (${p.teamCode||''})`,short:p.name,value:p[P.ui.pm],cls:'pri'}));
  const hm=['ts','usg','per','bpm','vorp','ws','ptsG','astG','rebG'],full=pl.filter(p=>hm.every(k=>ok(p[k])));
  const era=NBA_ERA.filter(e=>ok(e.threePA)),ortg=NBA_ERA.filter(e=>ok(e.ortg));
  shell('Chart Studio',lab(`${title('DATA LAB / CHART STUDIO','Every angle.<br><em>Every chart.</em>','Pick the axes. Fit the line. Each chart reads the live ESPN feed for the selected season and shows its own sample size.')}
  <div class="lab-toolbar">${seasonSel('lp-season',y)}${status(['standings',y],['players',y])}</div>
  ${cell(1,'Team relationship + regression',`scatter(team.${P.ui.tx}, team.${P.ui.ty}); OLS y = a + b·x`,`<div class="lab-toolbar inner">${sel('lp-tx',tOpts,P.ui.tx,'X axis')}${sel('lp-ty',tOpts,P.ui.ty,'Y axis')}</div>${scatter(ptsT,{xLabel:TEAM_METRICS[P.ui.tx][0],yLabel:TEAM_METRICS[P.ui.ty][0],aria:'Team metric scatter',invertY:false})}${note('Lime = at or above .500, pink = below. The fitted line and r are computed from the plotted teams only.')}`)}
  ${cell(2,'Distribution across the league',`histogram(team.${P.ui.th}, bins = 8)`,`<div class="lab-toolbar inner">${sel('lp-th',tOpts,P.ui.th,'Metric')}</div>${histogramSvg(hist,{xLabel:TEAM_METRICS[P.ui.th][0],aria:'Team metric histogram'})}`)}
  ${cell(3,'Point differential, all teams','sort(team.diff, desc)',bars(diff,{diverging:true,fmt:v=>(v>0?'+':'')+nf(v,1)}))}
  ${cell(4,'Player relationship + regression',`scatter(player.${P.ui.px}, player.${P.ui.py}); n = ${players.length}`,`<div class="lab-toolbar inner">${sel('lp-px',pOpts,P.ui.px,'X axis')}${sel('lp-py',pOpts,P.ui.py,'Y axis')}</div>${scatter(ptsP,{xLabel:PLAYER_METRICS[P.ui.px][0],yLabel:PLAYER_METRICS[P.ui.py][0],aria:'Player metric scatter'})}${note('The feed lists the top 50 players by volume; advanced columns exist for about two thirds of them. Missing values are dropped, not filled.')}`)}
  ${cell(5,'Player leaderboard',`top15(player.${P.ui.pm})`,`<div class="lab-toolbar inner">${sel('lp-pm',pOpts,P.ui.pm,'Metric')}</div>${bars(lead,{fmt:v=>nf(v,1)})}`)}
  ${cell(6,'What moves with what',`pearson(ts, usg, per, bpm, vorp, ws, pts/g, ast/g, reb/g)  // n = ${full.length}`,full.length>=8?heatmap(corrMatrix(full,hm),['TS%','USG%','PER','BPM','VORP','WS','PTS/G','AST/G','REB/G']):'<div class="blank">Needs at least eight players with every metric.</div>')}
  ${cell(7,'How the game changed (league averages)','NBA_ERA // Basketball-Reference league averages, sparse by design',`${lines([{name:'3-point attempts / team / game',cls:'pri',pts:era.map(e=>({x:e.year,y:e.threePA}))}],{xLabel:'Season ending',yLabel:'3PA per team per game',aria:'Three-point attempts by era',xFmt:v=>String(v)})}${lines([{name:'Offensive rating',cls:'sec',pts:ortg.map(e=>({x:e.year,y:e.ortg}))},{name:'Points per game',cls:'neg',pts:NBA_ERA.filter(e=>ok(e.pts)).map(e=>({x:e.year,y:e.pts}))}],{xLabel:'Season ending',yLabel:'Points (per 100 poss. / per game)',aria:'Efficiency by era'})}`)}
  </div>`));
 }

 /* ---------- 2. Equation Lab ---------- */
 const bad='<div class="lab-result muted">Enter valid numbers.</div>';
 const res=(...p)=>`<div class="lab-result">${p.join('')}</div>`;
 const big=t=>`<b>${t}</b>`;
 const EQ={
  pyth:v=>{const p=pythagorean(v.pf,v.pa,v.exp);return p===null?bad:res(big(pct(p)),' expected win% · ',big(nf(p*82,1)),' wins over 82')},
  margin:(v,ctx)=>{const f=ctx?.fit;if(!f)return '<div class="lab-result muted">Needs a loaded season.</div>';const p=Math.min(1,Math.max(0,f.intercept+f.slope*v.diff));return res(big(pct(p)),' win% · ',big(nf(p*82,1)),' wins · slope ',big((f.slope*100).toFixed(2)+' pp'),' of win% per +1 point/game')},
  shoot:v=>{const e=eFG(v.fgm,v.fga,v.tpm),ts=trueShooting(v.pts,v.fga,v.fta),po=possessions(v.fga,v.oreb,v.tov,v.fta);return e===null?bad:res('eFG% ',big(pct(e)),' · TS% ',big(pct(ts)),' · possessions ',big(nf(po,1)),' · ORtg ',big(nf(100*v.pts/po,1)))},
  four:v=>{const s=fourFactorScore({efg:v.efg/100,tov:v.tov/100,orb:v.orb/100,ftr:v.ftr/100});return Number.isFinite(s)?res('Composite ',big(nf(s*100,2)),' index points',` <span class="muted">(higher is better; a +1 swing in eFG% moves it ${nf(.40,2)})</span>`):bad},
  elo:v=>{if(![v.ra,v.rb,v.h,v.m].every(Number.isFinite))return bad;const sc=v.m>0?1:v.m<0?0:.5,u=eloUpdate(v.ra,v.rb,sc,Math.abs(v.m),{homeEdge:v.h});return res('Home win prob ',big(pct(u.expected)),' · after a ',big((v.m>0?'+':'')+v.m),' result: home ',big(nf(u.a,1)),' (',(u.delta>=0?'+':'')+nf(u.delta,1),'), away ',big(nf(u.b,1)))},
  log5:v=>{const p=log5(v.pa,v.pb);return p===null?bad:res('P(A beats B) ',big(pct(p)))},
  mprob:v=>v.sigma>0?res('Win probability ',big(pct(normalCdf(v.m/v.sigma))),' at expected margin ',big((v.m>0?'+':'')+nf(v.m,1)),' and σ = ',nf(v.sigma,1)):bad
 };
 const num=(k,val,step='any',label='')=>`<label class="eqin"><span>${label||k}</span><input class="lab-field" type="number" step="${step}" data-in="${k}" value="${val}"></label>`;
 function eqCard(id,name,formula,inputs,ctx){
  const defaults=Object.fromEntries(inputs.map(([k,v])=>[k,v]));
  return `<div class="lab-eqcard" data-eq="${id}"><h4>${name}</h4><pre class="lab-formula">${formula}</pre><div class="eqins">${inputs.map(([k,v,l,s])=>num(k,v,s,l)).join('')}</div><div class="eqout" data-out>${EQ[id](defaults,ctx)}</div></div>`;
 }
 function equations(){
  const y=P.ui.eqSeason;need('standings',y);
  const t=get('standings',y)||[],fit=fitPythagoreanExponent(t),lin=ols(t.map(r=>({x:r.diff,y:r.winPct})));
  P.eqCtx={fit:lin};
  shell('Equation Lab',lab(`${title('DATA LAB / EQUATION LAB','The maths<br><em>of winning.</em>','Seven working equations of basketball analytics. Change a number and the answer updates live; two of them are fitted to the real season you select.')}
  <div class="lab-toolbar">${seasonSel('lp-eqseason',y)}${status(['standings',y])}</div>
  ${cell(1,'Fitted to this season',`best k = argmin Σ (W% − PF^k/(PF^k+PA^k))²   over k ∈ [6, 20]`,fit?`<div class="lab-stats compact"><div class="lab-stat"><div class="k">BEST EXPONENT k</div><div class="v">${nf(fit.exponent,2)}</div><div class="s">${fit.n} teams · RMSE ${pct(fit.rmse)}</div></div><div class="lab-stat"><div class="k">MAE AT k = 13.91</div><div class="v">${pct(winPctMAE(t))}</div><div class="s">textbook NBA exponent</div></div><div class="lab-stat"><div class="k">MAE AT BEST k</div><div class="v">${pct(fit.mae)}</div><div class="s">in-sample fit</div></div><div class="lab-stat"><div class="k">WIN% PER +1 PT/G</div><div class="v">${lin?(lin.slope*100).toFixed(1)+' pp':'—'}</div><div class="s">${lin?`W% = ${nf(lin.intercept,3)} + ${nf(lin.slope,4)}·diff · R² ${nf(lin.r2,3)}`:'no fit'}</div></div></div>`:'<div class="blank">Loading standings, or too few teams with a record yet.</div>')}
  <div class="lab-eqgrid">
  ${eqCard('pyth','Pythagorean expectation','W% = PF^k / (PF^k + PA^k)     k ≈ 13.91 (NBA)',[['pf',118.5,'Points for / G'],['pa',116.0,'Points against / G'],['exp',13.91,'Exponent k','0.01']])}
  ${eqCard('margin','Win% from point differential','W% ≈ a + b · (PF − PA)     a, b fitted above',[['diff',3,'Differential / G']],P.eqCtx)}
  ${eqCard('shoot','Shooting efficiency and ORtg','eFG% = (FGM + 0.5·3PM)/FGA\nTS% = PTS / (2·(FGA + 0.44·FTA))\nPOSS ≈ FGA − OREB + TOV + 0.44·FTA\nORtg = 100 · PTS / POSS',[['fgm',41,'FGM'],['fga',88,'FGA'],['tpm',14,'3PM'],['fta',22,'FTA'],['pts',110,'Points'],['oreb',10,'OREB'],['tov',13,'TOV']])}
  ${eqCard('four','Dean Oliver’s Four Factors','S = 0.40·eFG% − 0.25·TOV% + 0.20·ORB% + 0.15·FTR',[['efg',54.5,'eFG %'],['tov',13.2,'TOV %'],['orb',27.5,'ORB %'],['ftr',25,'FTA/FGA %']])}
  ${eqCard('elo','Elo with home court and margin','E = 1 / (1 + 10^((R_away − R_home − H)/400))\nΔ = K · ln(|margin|+1)·2.2/(|ΔR|·0.001+2.2) · (S − E),  K = 20',[['ra',1600,'Home Elo'],['rb',1500,'Away Elo'],['h',100,'Home edge (Elo)'],['m',8,'Result margin (home)']])}
  ${eqCard('log5','Log5 head-to-head','P(A) = (pA − pA·pB) / (pA + pB − 2·pA·pB)',[['pa',0.65,'Team A win%','0.01'],['pb',0.45,'Team B win%','0.01']])}
  ${eqCard('mprob','Margin to win probability','P(win) = Φ( margin / σ )     σ ≈ 12 (NBA single game)',[['m',4,'Expected margin'],['sigma',12,'σ of margin']])}
  </div>
  ${note('Every calculator is a transparent baseline. None of them know about injuries, rest, matchups or lineups, so they are tools for understanding, not betting advice.')}</div>`));
 }

 /* ---------- team ratings shared by predictor + outlook ---------- */
 function ratings(cur,prev){
  const pm=new Map((prev||[]).map(r=>[r.key,r])),out=[];
  for(const c of (cur||[])){const b=blendRating(c,pm.get(c.key));if(ok(b.ppg)&&ok(b.oppg))out.push({...c,...b,prev:pm.get(c.key)||null})}
  // teams only in prev (no current rows yet)
  if(!cur?.length)for(const p of (prev||[])){out.push({...p,ppg:p.ppg,oppg:p.oppg,weightCurrent:0,games:0,prev:p})}
  return out;
 }
 const findTeam=(rs,name,code)=>rs.find(r=>r.team===name)||rs.find(r=>code&&r.key===(ALIAS[String(code).toUpperCase()]||String(code).toUpperCase()));
 const sign=v=>(v>0?'+':'')+nf(v,1);

 /* ---------- 3. Score Predictor ---------- */
 function predict(){
  const Y=seasonNow();need('live',Y);need('standings',Y-1);need('archive',Y);
  const live=get('live',Y),prev=get('standings',Y-1),archive=get('archive',Y);
  const rs=ratings(live?.rows,prev),lg=leagueAverage(rs,'ppg');
  const names=rs.map(r=>r.team).sort();
  if(!P.ui.home&&names.length){P.ui.home=names[0];P.ui.away=names[1]||names[0]}
  const home=rs.find(r=>r.team===P.ui.home),away=rs.find(r=>r.team===P.ui.away);
  const custom=home&&away&&home!==away?predictMatchup(home,away,lg):null;
  const rows=(live?.games||[]).map(g=>{
   const h=findTeam(rs,g.home,g.homeCode),a=findTeam(rs,g.away,g.awayCode),p=h&&a?predictMatchup(h,a,lg):null;return {g,h,a,p};
  });
  const snapshot=archive?.contextCache||{};
  const modelFor=(h,a,g)=>{
   if(!h||!a||!archive)return null;
   const hk=teamKey(g.homeCode||h.abbr),ak=teamKey(g.awayCode||a.abbr);
   const context={tip:g.date,homeGames:snapshot.homeGames?.[hk],awayGames:snapshot.homeGames?.[ak],
    homeRoster:snapshot.rosters?.[hk],awayRoster:snapshot.rosters?.[ak],
    homePriorRoster:snapshot.priorRosters?.[hk],awayPriorRoster:snapshot.priorRosters?.[ak],
    homeInjuries:snapshot.injuries?.[hk],awayInjuries:snapshot.injuries?.[ak],elo:snapshot.elo};
   return predictEnsemble(h,a,lg,archive.model||{},context,archive.records||[]);
  };
  const provisional=rows.filter(x=>x.g.state==='pre').map(x=>({...x,q:modelFor(x.h,x.a,x.g)})).filter(x=>x.q);
  const provisionalTable=provisional.length?
   '<div class="table-wrap"><table class="data-table lab-table"><thead><tr><th>Match</th><th>Ensemble score</th><th>Pick (1/2)</th><th>P(home)</th><th>Total</th><th>Models</th><th>Source coverage</th></tr></thead><tbody>'+
   provisional.map(({g,q})=>{
    const hk=teamKey(g.homeCode),ak=teamKey(g.awayCode);
    const pick=q.homeWinProb>=.58?'1 · '+hk:q.homeWinProb<=.42?'2 · '+ak:'No confident pick';
    const cov=q.conditions?.sourceCoverage||{};
    const sources=Object.entries(cov).filter(([,value])=>value===true).map(([name])=>name).join(', ')||'season averages only';
    const detail='<details><summary>'+q.activeModels+' models</summary><div class="lab-caption">'+q.modelVotes.map(v=>
     '<div>'+esc(v.label)+' · '+nf(v.margin,1)+' pts · '+pct(v.homeWinProb)+' home · '+pct(v.weight)+' weight</div>').join('')+'</div></details>';
    return '<tr><td>'+esc(ak+' @ '+hk)+'</td><td class="num">'+nf(q.awayPts,0)+'–'+nf(q.homePts,0)+
     '</td><td>'+esc(pick)+'</td><td class="num">'+pct(q.homeWinProb)+'</td><td class="num">'+nf(q.total,1)+
     '</td><td>'+detail+'</td><td>'+esc(sources)+'</td></tr>';
   }).join('')+'</tbody></table></div>':'<div class="blank">No available upcoming game with sufficient team data for a provisional ensemble forecast.</div>';
  const thin=live&&live.rows.length&&Math.max(...live.rows.map(r=>r.games||0))<20;
  shell('Score Predictor',lab(`${title('DATA LAB / SCORE PREDICTOR','Call the score.<br><em>Show the odds.</em>','Expected points, margin, total and win probability for every game on today’s feed, built from current-season form shrunk toward last season.')}
  <div class="lab-toolbar"><span class="lab-meta-inline">NBA ${seasonLabel(Y)} · ratings blend with ${seasonLabel(Y-1)}</span>${status(['live',Y],['standings',Y-1])}</div>
  ${thin?warn('<b>Early season.</b> Teams have played only a handful of games, so each rating is mostly last season’s numbers. The blend weight for this season grows as g / (g + 20).'):''}
  ${cell(1,'Today’s games',`E[pts A] = PF_A × PA_B / lgAvg ± ${HOME_EDGE/2};  P(home) = Φ(margin / ${NBA_SIGMA_MARGIN})`,rows.length?`<div class="table-wrap"><table class="data-table lab-table"><thead><tr><th>Game</th><th>Predicted score</th><th>Spread</th><th>Total</th><th>Home win</th><th>80% margin range</th><th>Actual</th></tr></thead><tbody>${rows.map(({g,p})=>`<tr><td>${esc(g.awayCode||g.away)} @ ${esc(g.homeCode||g.home)}</td>${p?`<td class="num">${nf(p.awayPts,0)} – ${nf(p.homePts,0)}</td><td class="num">${esc(g.homeCode||'H')} ${sign(-p.margin)}</td><td class="num">${nf(p.total,0)}</td><td class="num">${pct(p.homeWinProb)}</td><td class="num">${sign(p.marginLow)} to ${sign(p.marginHigh)}</td>`:'<td colspan="5" class="lab-empty">no rating for one team</td>'}<td class="num">${g.state==='pre'?'–':`${g.awayScore??'–'} – ${g.homeScore??'–'}`}${g.state==='in'?' · live':g.state==='post'?' · final':''}</td></tr>`).join('')}</tbody></table></div>`:`<div class="blank">${busy()?'Loading…':'No games on the feed for this date.'}</div>`)}
  ${cell('1B','Live multi-model consensus · provisional','New ratings, Elo, recent form, roster availability and rest when sourced. Only pre-tipoff archived versions count toward accuracy.',provisionalTable)}
  ${cell(2,'Any matchup',`predictMatchup(home, away, lgAvg = ${nf(lg,1)})`,`<div class="lab-toolbar inner">${sel('lp-home',names.map(n=>[n,n]),P.ui.home,'Home')}${sel('lp-away',names.map(n=>[n,n]),P.ui.away,'Away')}</div>${custom?`<div class="lab-stats compact"><div class="lab-stat"><div class="k">PREDICTED SCORE</div><div class="v">${nf(custom.awayPts,0)}–${nf(custom.homePts,0)}</div><div class="s">${esc(away.abbr||away.team)} @ ${esc(home.abbr||home.team)}</div></div><div class="lab-stat"><div class="k">HOME WIN</div><div class="v">${pct(custom.homeWinProb)}</div><div class="s">margin ${sign(custom.margin)} for home</div></div><div class="lab-stat"><div class="k">TOTAL</div><div class="v">${nf(custom.total,0)}</div><div class="s">80%: ${nf(custom.totalLow,0)}–${nf(custom.totalHigh,0)}</div></div></div>${marginCurve(custom.margin,custom.sigmaMargin,{homeLabel:home.abbr||'Home',awayLabel:away.abbr||'Away'})}`:'<div class="blank">Pick two different teams.</div>'}`)}
  ${cell(3,'Ratings used',`blend = w·current + (1−w)·last season,  w = g / (g + 20)`,rs.length?`<div class="table-wrap"><table class="data-table lab-table"><thead><tr><th>Team</th><th>GP</th><th>Weight current</th><th>PF/G blended</th><th>PA/G blended</th><th>Net</th></tr></thead><tbody>${[...rs].sort((a,b)=>(b.ppg-b.oppg)-(a.ppg-a.oppg)).map(r=>`<tr><td>${esc(r.team)}</td><td class="num">${r.games}</td><td class="num">${pct(r.weightCurrent)}</td><td class="num">${nf(r.ppg,1)}</td><td class="num">${nf(r.oppg,1)}</td><td class="num">${sign(r.ppg-r.oppg)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="blank">Loading ratings…</div>')}
  ${cell(4,'Pregame prediction archive · hit rate and error','Timestamped predictions locked before tipoff; never reconstructed from final scores',renderForecastLedger(archive,{esc,error:err('archive',Y),loading:P.loading.has('archive:'+Y)}))}
  ${cell(5,'Multi-model consensus · vote by vote','Up to nine conditional models; actual model weights and verified source coverage',renderModelVotes(archive,{esc}))}
  ${warn(`<b>Assumptions, stated plainly.</b> Single-game margin σ = ${NBA_SIGMA_MARGIN} and total σ = ${NBA_SIGMA_TOTAL} points; home court = ${HOME_EDGE} points of margin; no injuries, rest days, travel or lineup data. These are exploratory estimates, not calibrated odds and not betting advice.`)}</div>`));
 }

 /* ---------- 4. Season Outlook ---------- */
 const GAMES=82;
 function simulate(teams,{n=3000,tau=4,seed=20262027}={}){
  const rand=mulberry32(seed),gauss=()=>{let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const conf=t=>/west/i.test(t.group)?'W':'E',by={E:[],W:[]};
  teams.forEach((t,i)=>by[conf(t)].push(i));
  const acc=teams.map(()=>({seed1:0,top6:0,playin:0,out:0,best:0,sum:[]}));
  for(let s=0;s<n;s++){
   const wins=teams.map(t=>{const rem=Math.max(0,GAMES-t.gp),mu=rem*t.p,sdv=Math.sqrt(rem*t.p*(1-t.p)+tau*tau);return t.w+Math.min(rem,Math.max(0,mu+sdv*gauss()))});
   let bestI=0;wins.forEach((w,i)=>{if(w>wins[bestI])bestI=i});acc[bestI].best++;
   for(const c of ['E','W']){
    const order=[...by[c]].sort((a,b)=>wins[b]-wins[a]||rand()-.5);
    order.forEach((i,r)=>{if(r===0)acc[i].seed1++;if(r<6)acc[i].top6++;else if(r<10)acc[i].playin++;else acc[i].out++});
   }
   wins.forEach((w,i)=>acc[i].sum.push(w));
  }
  return teams.map((t,i)=>{const a=acc[i],srt=a.sum.sort((x,y)=>x-y);return {...t,exp:mean(srt),lo:srt[Math.floor(n*.1)],hi:srt[Math.floor(n*.9)],seed1:a.seed1/n,top6:a.top6/n,playin:a.playin/n,out:a.out/n,best:a.best/n}});
 }
 function outlook(){
  const Y=seasonNow();need('live',Y);needHistory();
  const live=get('live',Y),prev=get('standings',Y-1),per=persistence();
  const a=per.fit?.intercept??0.5*(1-0.65),b=per.fit?.slope??0.65,fitted=!!per.fit;
  const K=25,teams=(live?.rows||[]).filter(r=>r.group).map(r=>{
   const pr=prev?.find(x=>x.key===r.key),prior=pr&&ok(pr.pythWinPct)?a+b*pr.pythWinPct:.5,g=r.games||0,cur=ok(r.pythWinPct)&&g>0?r.pythWinPct:null;
   const p=cur===null?prior:(prior*K+cur*g)/(K+g);
   return {team:r.team,abbr:r.abbr,group:r.group,gp:g,w:r.wins||0,l:r.losses||0,p:Math.min(.9,Math.max(.1,p)),prior};
  });
  const sim=teams.length>=20?simulate(teams):[];
  const next=sim.map(t=>{const p1=a+b*(t.exp/GAMES);return {...t,nextWins:p1*GAMES}});
  const sorted=[...next].sort((x,y)=>y.exp-x.exp);
  const thin=live&&live.rows.length&&Math.max(...live.rows.map(r=>r.games||0))<20;
  shell('Season Outlook',lab(`${title('DATA LAB / SEASON OUTLOOK','The season<br><em>before it happens.</em>','Projected wins, playoff odds and next-year regression for every team, from last season’s results, this season’s record so far and a persistence equation fitted to a decade of real standings.')}
  <div class="lab-toolbar"><span class="lab-meta-inline">NBA ${seasonLabel(Y)} · Monte Carlo · 3,000 simulated seasons</span>${status(['live',Y],['standings',Y-1])}</div>
  ${thin?warn('<b>Early season.</b> The projection leans mostly on last season. It updates itself as games are played: weight on this season = g / (g + 25).'):''}
  ${cell(1,'The persistence equation',`W%(next) = a + b · PythW%(this),  fitted on ${per.pts.length} team-seasons`,fitted?`<div class="lab-stats compact"><div class="lab-stat"><div class="k">EQUATION</div><div class="v sm">W% = ${nf(a,3)} + ${nf(b,3)}·x</div><div class="s">${per.seasons} complete seasons</div></div><div class="lab-stat"><div class="k">R²</div><div class="v">${nf(per.fit.r2,3)}</div><div class="s">r = ${nf(per.fit.r,3)}</div></div><div class="lab-stat"><div class="k">REGRESSION TO THE MEAN</div><div class="v">${pct(1-b)}</div><div class="s">of a team’s edge fades each year</div></div></div>${scatter(per.pts,{xLabel:'Pythagorean win % (season t)',yLabel:'Actual win % (season t+1)',aria:'Year-over-year persistence',labels:false})}`:`${warn('Not enough completed seasons loaded yet to fit the equation — using a stated fallback of b = 0.65.')}`)}
  ${cell(2,`Projected ${seasonLabel(Y)} standings`,`wins = W_now + Normal((82−g)·p, √((82−g)·p(1−p) + 4²)),   p = (25·prior + g·current) / (25 + g)`,sim.length?`<div class="table-wrap"><table class="data-table lab-table"><thead><tr><th>#</th><th>Team</th><th>Conf</th><th>W–L</th><th>Proj. wins</th><th>80% range</th><th>#1 seed</th><th>Top 6</th><th>Play-in</th><th>Miss</th><th>Best record</th></tr></thead><tbody>${sorted.map((t,i)=>`<tr><td>${i+1}</td><td>${esc(t.team)}</td><td>${/west/i.test(t.group)?'W':'E'}</td><td class="num">${t.w}–${t.l}</td><td class="num"><b>${nf(t.exp,1)}</b></td><td class="num">${nf(t.lo,0)}–${nf(t.hi,0)}</td><td class="num">${pct(t.seed1)}</td><td class="num">${pct(t.top6)}</td><td class="num">${pct(t.playin)}</td><td class="num">${pct(t.out)}</td><td class="num">${pct(t.best)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="blank">${busy()?'Loading standings and history…':err('live',Y)?esc(err('live',Y)):'No standings on the feed yet.'}</div>`)}
  ${cell(3,'Projected wins, ranked','sort(proj_wins, desc)',bars(sorted.map(t=>({label:t.team,short:t.abbr||t.team,value:t.exp,cls:/west/i.test(t.group)?'pri':'sec'})),{fmt:v=>nf(v,1)})+note('Orange = West, lime = East.'))}
  ${cell(4,`Looking ahead: ${seasonLabel(Y+1)}`,'W%(next) = a + b · (projected wins / 82)',sim.length?`${bars([...next].sort((x,y)=>y.nextWins-x.nextWins).map(t=>({label:t.team,short:t.abbr||t.team,value:t.nextWins,cls:'neu'})),{fmt:v=>nf(v,1)})}${warn(`<b>Low information.</b> A year out, the equation can only say which teams start with an edge; it knows nothing about drafts, trades or injuries. Expect wide error — this chart is a regression-to-the-mean illustration, not a forecast to bet on.`)}`:'<div class="blank">Needs the current standings first.</div>')}
  ${warn('<b>What this ignores.</b> Strength of schedule, injuries, trades, minutes, tanking and the real playoff bracket. It is a transparent baseline you can interrogate, not a calibrated forecast.')}</div>`));
 }

 /* ---------- 5. Modern Game ---------- */
 function modern(){
  needHistory();
  const hs=history(),full=hs.filter(completed);
  const stat=hs.map(h=>{
   const fit=fitPythagoreanExponent(h.rows),complete=completed(h);
   return {season:h.season,complete,n:h.rows.length,ppg:leagueAverage(h.rows,'ppg'),spread:sd(h.rows.map(r=>r.ppg).filter(ok)),parity:sd(h.rows.map(r=>r.winPct).filter(ok)),exp:fit?.exponent??null,gp:Math.max(...h.rows.map(r=>r.games||0))};
  });
  const done=stat.filter(s=>s.complete),x=s=>s.season+1;
  const era=NBA_ERA.filter(e=>ok(e.threePA));
  const first=done[0],last=done.at(-1);
  shell('Modern Game',lab(`${title('DATA LAB / MODERN GAME','What basketball<br><em>is now.</em>','A decade of real standings, season by season: how much teams score, how spread out they are, how tight the league is and how well the Pythagorean exponent still fits.')}
  <div class="lab-toolbar"><span class="lab-meta-inline">${done.length} complete seasons of ESPN standings</span>${status(...SEASONS.map(y=>['standings',y]))}</div>
  ${done.length>=2?`<div class="lab-stats">${[['LEAGUE SCORING NOW',nf(last.ppg,1),`${seasonLabel(last.season)} · points per team per game`],['CHANGE SINCE '+seasonLabel(first.season),(last.ppg-first.ppg>=0?'+':'')+nf(last.ppg-first.ppg,1),'points per team per game'],['SPREAD OF TEAM SCORING',nf(last.spread,2),'sd of team PPG (higher = more diverse styles)'],['COMPETITIVE BALANCE',nf(last.parity*100,1)+' pp','sd of win% (lower = tighter league)']].map(([k,v,s])=>`<div class="lab-stat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('')}</div>`:''}
  ${cell(1,'League scoring, season by season','mean(team.ppg) per completed season',lines([{name:'League average PPG',cls:'pri',pts:done.map(s=>({x:x(s),y:s.ppg}))}],{xLabel:'Season ending',yLabel:'Points per team per game',aria:'League scoring trend'}))}
  ${cell(2,'How different are teams?','sd(team.ppg)  // style diversity',lines([{name:'Spread of team PPG',cls:'sec',pts:done.map(s=>({x:x(s),y:s.spread}))}],{xLabel:'Season ending',yLabel:'Standard deviation of team PPG',aria:'Scoring spread trend'}))}
  ${cell(3,'How tight is the league?','sd(team.winPct)  // competitive balance',lines([{name:'Spread of win%',cls:'neg',pts:done.map(s=>({x:x(s),y:s.parity*100}))}],{xLabel:'Season ending',yLabel:'Standard deviation of win % (points)',aria:'Parity trend'}))}
  ${cell(4,'Does Pythagoras still fit?','best k per season',lines([{name:'Best Pythagorean exponent',cls:'pri',pts:done.filter(s=>s.exp).map(s=>({x:x(s),y:s.exp}))}],{xLabel:'Season ending',yLabel:'Fitted exponent k',aria:'Pythagorean exponent by season'})+note('The textbook value for the NBA is about 13.91. Season-to-season wobble is normal with 30 teams.'))}
  ${cell(5,'The three-point era','NBA_ERA // Basketball-Reference league averages',lines([{name:'3-point attempts / team / game',cls:'pri',pts:era.map(e=>({x:e.year,y:e.threePA}))}],{xLabel:'Season ending',yLabel:'3PA per team per game',aria:'Three-point attempts by era'})+note('Early years are sparse reference points, not a full census.'))}
  ${cell(6,'The numbers behind the charts','per-season summary',stat.length?`<div class="table-wrap"><table class="data-table lab-table"><thead><tr><th>Season</th><th>Teams</th><th>Max GP</th><th>League PPG</th><th>SD team PPG</th><th>SD win%</th><th>Best k</th><th>Status</th></tr></thead><tbody>${[...stat].reverse().map(s=>`<tr><td>${seasonLabel(s.season)}</td><td class="num">${s.n}</td><td class="num">${s.gp}</td><td class="num">${nf(s.ppg,1)}</td><td class="num">${nf(s.spread,2)}</td><td class="num">${s.parity!==null?nf(s.parity*100,1)+' pp':'—'}</td><td class="num">${nf(s.exp,2)}</td><td>${s.complete?'complete':'in progress — excluded from trends'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="blank">Loading history…</div>')}
  </div>`));
 }

 /* ---------- events ---------- */
 const SELECTS={'lp-season':'season','lp-tx':'tx','lp-ty':'ty','lp-th':'th','lp-px':'px','lp-py':'py','lp-pm':'pm','lp-home':'home','lp-away':'away','lp-eqseason':'eqSeason'};
 function onChange(e){
  const k=SELECTS[e.target.id];if(!k)return false;
  P.ui[k]=['season','eqSeason'].includes(k)?Number(e.target.value):e.target.value;render();return true;
 }
 function onInput(e){
  const card=e.target.closest?.('[data-eq]');if(!card)return false;
  const v=Object.fromEntries([...card.querySelectorAll('[data-in]')].map(i=>[i.dataset.in,Number(i.value)]));
  const out=card.querySelector('[data-out]'),fn=EQ[card.dataset.eq];
  if(out&&fn)out.innerHTML=fn(v,P.eqCtx);
  return true;
 }
 function whenOpened(tab){
  const Y=seasonNow();
  if(tab==='labcharts'){need('standings',P.ui.season);need('players',P.ui.season)}
  if(tab==='labequations')need('standings',P.ui.eqSeason);
  if(tab==='labpredict'){P.data.delete('archive:'+Y);P.errors.delete('archive:'+Y);need('live',Y);need('standings',Y-1);need('archive',Y)}
  if(tab==='laboutlook'){need('live',Y);needHistory()}
  if(tab==='labmodern')needHistory();
 }
 return {routes:{labcharts:charts,labequations:equations,labpredict:predict,laboutlook:outlook,labmodern:modern},onChange,onInput,whenOpened,_internals:{persistence,simulate,ratings}};
}
