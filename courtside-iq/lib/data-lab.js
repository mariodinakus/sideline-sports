/**
 * COURTSIDE IQ — Data Lab
 * A notebook-style workspace: every cell states what it loaded, from where,
 * when, and how. Nothing is simulated; missing values stay missing.
 */
import {NBA_CHAMPIONS,NBA_MVPS,EURO_CHAMPIONS,EURO_MVPS,SOURCES} from '../history-data.js';

const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const nf=(x,d=1)=>finite(x)?Number(x).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';

/* ---------- pure analytics (unit-tested) ---------- */
export function describe(values){
 const v=values.filter(finite).map(Number).sort((a,b)=>a-b);
 if(!v.length)return {n:0,mean:null,median:null,sd:null,min:null,max:null};
 const n=v.length,mean=v.reduce((a,b)=>a+b,0)/n;
 const median=n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2;
 const sd=n>1?Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/(n-1)):null;
 return {n,mean,median,sd,min:v[0],max:v[n-1]};
}
/** Pythagorean expectation. Morey/Hollinger exponent for the NBA is ~13.91. */
export function pythagorean(pointsFor,pointsAgainst,exponent=13.91){
 if(!finite(pointsFor)||!finite(pointsAgainst)||Number(pointsFor)<=0||Number(pointsAgainst)<=0)return null;
 const a=Number(pointsFor)**exponent,b=Number(pointsAgainst)**exponent;
 return a/(a+b);
}
export function toCSV(rows,cols){
 const cell=v=>{const s=v===null||v===undefined?'':String(v);return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
 return [cols.map(c=>cell(c.label)).join(','),...rows.map(r=>cols.map(c=>cell(r[c.key])).join(','))].join('\r\n');
}
export function sortRows(rows,key,dir=1){
 return [...rows].sort((a,b)=>{
  const x=a[key],y=b[key],mx=x===null||x===undefined||x==='',my=y===null||y===undefined||y==='';
  if(mx&&my)return 0;if(mx)return 1;if(my)return -1;          // missing always last
  return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y)))*dir;
 });
}
export function flattenStandings(groups){
 const rows=[];
 for(const g of groups||[])for(const r of g.rows||[]){
  const games=finite(r.wins)&&finite(r.losses)?Number(r.wins)+Number(r.losses):null;
  const pct=finite(r.pct)?(Number(r.pct)>1?Number(r.pct)/100:Number(r.pct)):games?Number(r.wins)/games:null;
  const exp=pythagorean(r.ppg,r.oppg);
  rows.push({team:r.name,abbr:r.abbr||'',group:g.name,wins:finite(r.wins)?+r.wins:null,losses:finite(r.losses)?+r.losses:null,games,
   winPct:pct,ppg:finite(r.ppg)?+r.ppg:null,oppg:finite(r.oppg)?+r.oppg:null,diff:finite(r.diff)?+r.diff:(finite(r.ppg)&&finite(r.oppg)?+r.ppg-+r.oppg:null),
   pythWinPct:exp,luck:exp!==null&&pct!==null?pct-exp:null,streak:r.streak||null});
 }
 return rows;
}

/* ---------- static datasets ---------- */
const STATIC={
 nbaChamps:{label:'NBA champions',rows:NBA_CHAMPIONS,cols:[{key:'year',label:'Season end'},{key:'winner',label:'Champion'}],source:SOURCES.nbaChamp},
 nbaMvps:{label:'NBA MVPs',rows:NBA_MVPS,cols:[{key:'year',label:'Season end'},{key:'winner',label:'MVP'}],source:SOURCES.nbaMvp},
 euroChamps:{label:'EuroLeague champions',rows:EURO_CHAMPIONS,cols:[{key:'year',label:'Season end'},{key:'winner',label:'Champion'}],source:SOURCES.euro},
 euroMvps:{label:'EuroLeague MVPs',rows:EURO_MVPS,cols:[{key:'year',label:'Season end'},{key:'winner',label:'MVP'}],source:SOURCES.euro}
};
const LIVE_COLS=[
 {key:'team',label:'Team'},{key:'group',label:'Group'},{key:'wins',label:'W'},{key:'losses',label:'L'},{key:'games',label:'GP'},
 {key:'winPct',label:'Win %'},{key:'ppg',label:'PF/G'},{key:'oppg',label:'PA/G'},{key:'diff',label:'Diff'},
 {key:'pythWinPct',label:'Pyth. Win %'},{key:'luck',label:'Win % − Pyth.'},{key:'streak',label:'Streak'}
];
const SEASONS=[2026,2025,2024,2023,2022,2021,2020];
const seasonLabel=y=>`${y}–${String(y+1).slice(-2)}`;
const pctFmt=x=>finite(x)?(Number(x)*100).toFixed(1)+'%':'—';
const cellFmt={winPct:pctFmt,pythWinPct:pctFmt,luck:x=>finite(x)?(x>=0?'+':'')+(Number(x)*100).toFixed(1)+' pp':'—',ppg:x=>nf(x),oppg:x=>nf(x),diff:x=>finite(x)?(x>0?'+':'')+nf(x):'—'};

export function createDataLab({ST,shell,title,head,block,esc,render}){
 const L={dataset:'live',league:'nba',season:2025,query:'',sortKey:'winPct',sortDir:-1,loading:false,error:null,payload:null,ms:null,fetchedAt:null,key:''};

 async function load(force=false){
  if(L.loading)return;
  const key=`${L.league}:${L.season}`;
  if(L.key===key&&L.payload&&!force)return;
  L.key=key;L.loading=true;L.error=null;L.payload=null;render();
  const t0=performance.now();
  try{
   const r=await fetch(`/api/live?league=${L.league}&season=${L.season}`);
   if(!r.ok)throw Error(`HTTP ${r.status}`);
   L.payload=await r.json();L.ms=Math.round(performance.now()-t0);L.fetchedAt=new Date();
  }catch(e){L.error=String(e.message||e);L.payload=null}
  L.loading=false;render();
 }
 const liveRows=()=>flattenStandings(L.payload?.groups);
 const current=()=>{
  if(L.dataset==='live')return {label:`${L.league==='nba'?'NBA':'EuroLeague'} standings ${seasonLabel(L.season)}`,rows:liveRows(),cols:LIVE_COLS,source:L.payload?.notes||''};
  const s=STATIC[L.dataset];return {label:s.label,rows:s.rows,cols:s.cols,source:s.source};
 };
 const filtered=()=>{
  const d=current(),q=L.query.trim().toLowerCase();
  const rows=q?d.rows.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(q))):d.rows;
  return {...d,rows:sortRows(rows,L.sortKey,L.sortDir)};
 };
 const status=()=>L.loading?'<span class="lab-state run">● running…</span>':L.error?`<span class="lab-state err">✕ ${esc(L.error)}</span>`:L.payload?`<span class="lab-state ok">✓ ${L.ms} ms · ${esc(L.fetchedAt?.toLocaleTimeString('en-GB')||'')}</span>`:'<span class="lab-state idle">○ idle</span>';
 const cell=(title_,n,code,body)=>`<section class="lab-cell"><div class="lab-gutter">In&nbsp;[${n}]</div><div class="lab-body"><div class="lab-cell-head"><h3>${title_}</h3></div>${code?`<pre class="lab-code">${esc(code)}</pre>`:''}${body}</div></section>`;

 /* ---------- Page 1: Dataset Explorer ---------- */
 function explorer(){
  const d=filtered();
  const sortable=d.cols.map(c=>`<th><button class="lab-th ${L.sortKey===c.key?'on':''}" data-lab-sort="${c.key}">${esc(c.label)}${L.sortKey===c.key?(L.sortDir>0?' ▲':' ▼'):''}</button></th>`).join('');
  const body=d.rows.length?d.rows.map(r=>`<tr>${d.cols.map(c=>`<td class="${typeof r[c.key]==='number'?'num':''}">${esc((cellFmt[c.key]||(x=>finite(x)||typeof x==='string'?x:'—'))(r[c.key]))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${d.cols.length}" class="lab-empty">${L.loading?'Loading dataset…':L.error?'The feed failed — nothing is shown instead of invented values.':'No rows match.'}</td></tr>`;
  shell('Dataset Explorer',`<div class="lab">${title('DATA LAB / DATASET EXPLORER','Query it.<br><em>Export it.</em>','Live standings and the full historical record books as sortable tables. Every dataset exports to CSV or JSON exactly as shown.')}
  <div class="lab-toolbar">
   <label>Dataset <select id="lab-dataset" class="lab-field"><option value="live" ${L.dataset==='live'?'selected':''}>Live standings (API)</option>${Object.entries(STATIC).map(([k,v])=>`<option value="${k}" ${L.dataset===k?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label>
   ${L.dataset==='live'?`<label>League <select id="lab-league" class="lab-field"><option value="nba" ${L.league==='nba'?'selected':''}>NBA</option><option value="euro" ${L.league==='euro'?'selected':''}>EuroLeague</option></select></label><label>Season <select id="lab-season" class="lab-field">${SEASONS.map(y=>`<option value="${y}" ${y===L.season?'selected':''}>${seasonLabel(y)}</option>`).join('')}</select></label><button class="lab-btn" id="lab-run">▶ Run</button>`:''}
   <label class="grow">Filter <input id="lab-query" class="lab-field" type="search" value="${esc(L.query)}" placeholder="team, player, year…" autocomplete="off"></label>
   <button class="lab-btn ghost" data-lab-export="csv" ${d.rows.length?'':'disabled'}>↓ CSV</button><button class="lab-btn ghost" data-lab-export="json" ${d.rows.length?'':'disabled'}>↓ JSON</button>
  </div>
  <div class="lab-meta"><span>${esc(d.label)}</span><span>${d.rows.length} rows</span>${L.dataset==='live'?status():''}</div>
  ${block('Result',`<div class="table-wrap"><table class="data-table lab-table"><thead><tr>${sortable}</tr></thead><tbody>${body}</tbody></table></div>`)}
  <p class="lab-foot">Source: ${/^https?:/.test(d.source)?`<a href="${esc(d.source)}" target="_blank" rel="noopener noreferrer">${esc(d.source)} ↗</a>`:esc(d.source||'—')}. Missing values display as “—” and sort last; they are never imputed.</p></div>`);
 }

 /* ---------- Page 2: Live Notebook ---------- */
 function scatter(rows){
  const p=rows.filter(r=>finite(r.ppg)&&finite(r.oppg));
  if(p.length<2)return '<div class="blank">Fewer than two teams with points-for and points-against.</div>';
  const w=720,h=420,Lm=58,R=696,T=24,B=372,xs=p.map(r=>r.ppg),ys=p.map(r=>r.oppg);
  const pad=1.5,x0=Math.min(...xs)-pad,x1=Math.max(...xs)+pad,y0=Math.min(...ys)-pad,y1=Math.max(...ys)+pad;
  const X=v=>Lm+(v-x0)/(x1-x0)*(R-Lm),Y=v=>T+(v-y0)/(y1-y0)*(B-T);   // lower opp. points = higher on chart
  const lo=Math.max(x0,y0),hi=Math.min(x1,y1);
  const ticks=Array.from({length:5},(_,i)=>{const vx=x0+(x1-x0)*i/4,vy=y0+(y1-y0)*i/4;return `<line x1="${X(vx)}" y1="${T}" x2="${X(vx)}" y2="${B}" class="g"/><text x="${X(vx)}" y="${B+20}" text-anchor="middle">${vx.toFixed(0)}</text><line x1="${Lm}" y1="${Y(vy)}" x2="${R}" y2="${Y(vy)}" class="g"/><text x="${Lm-8}" y="${Y(vy)+4}" text-anchor="end">${vy.toFixed(0)}</text>`}).join('');
  return `<div class="lab-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Points scored versus points allowed per team">${ticks}<line x1="${X(lo)}" y1="${Y(lo)}" x2="${X(hi)}" y2="${Y(hi)}" class="diag"/>
  ${p.map(r=>{const good=finite(r.winPct)?r.winPct>=.5:null;return `<g><circle cx="${X(r.ppg)}" cy="${Y(r.oppg)}" r="6" class="dot ${good===null?'na':good?'up':'dn'}"><title>${esc(r.team)} · PF ${nf(r.ppg)} · PA ${nf(r.oppg)} · W% ${pctFmt(r.winPct)}</title></circle><text x="${X(r.ppg)+8}" y="${Y(r.oppg)+3}" class="lbl">${esc(r.abbr||r.team.slice(0,3).toUpperCase())}</text></g>`}).join('')}
  <text x="${(Lm+R)/2}" y="${h-8}" text-anchor="middle" class="ax">Points scored per game →</text><text transform="translate(14 ${(T+B)/2}) rotate(-90)" text-anchor="middle" class="ax">Points allowed per game ↓ (better is up)</text></svg><p class="lab-caption">Dashed line: points for = points against. Gold = at or above .500, violet = below, grey = no record yet.</p></div>`;
 }
 function luckBars(rows){
  const p=rows.filter(r=>finite(r.luck)).sort((a,b)=>b.luck-a.luck);
  if(!p.length)return '<div class="blank">Not enough data for a Pythagorean comparison.</div>';
  const max=Math.max(.01,...p.map(r=>Math.abs(r.luck)));
  return `<div class="lab-luck">${p.map(r=>`<div class="lab-luck-row"><span>${esc(r.abbr||r.team)}</span><div class="lab-luck-track"><i class="${r.luck>=0?'pos':'neg'}" style="width:${Math.max(1,Math.abs(r.luck)/max*50)}%;${r.luck>=0?'left:50%':'right:50%'}"></i></div><b>${cellFmt.luck(r.luck)}</b></div>`).join('')}</div>`;
 }
 function notebook(){
  const rows=liveRows(),games=rows.map(r=>r.games).filter(finite),maxGp=games.length?Math.max(...games):0,thin=rows.length&&maxGp<20;
  const dPf=describe(rows.map(r=>r.ppg)),dPa=describe(rows.map(r=>r.oppg)),dDf=describe(rows.map(r=>r.diff));
  const statRow=(n,d)=>`<tr><td>${n}</td><td class="num">${d.n}</td><td class="num">${nf(d.mean)}</td><td class="num">${nf(d.median)}</td><td class="num">${nf(d.sd)}</td><td class="num">${nf(d.min)}</td><td class="num">${nf(d.max)}</td></tr>`;
  shell('Live Notebook',`<div class="lab">${title('DATA LAB / LIVE NOTEBOOK','Run the numbers.<br><em>Show the work.</em>','A reproducible, cell-by-cell analysis of team scoring and results. Each cell shows its input, source, runtime and caveats.')}
  <div class="lab-toolbar"><label>Season <select id="lab-season" class="lab-field">${SEASONS.map(y=>`<option value="${y}" ${y===L.season?'selected':''}>${seasonLabel(y)}</option>`).join('')}</select></label><label>League <select id="lab-league" class="lab-field"><option value="nba" ${L.league==='nba'?'selected':''}>NBA</option><option value="euro" ${L.league==='euro'?'selected':''}>EuroLeague</option></select></label><button class="lab-btn" id="lab-run">▶ Run all cells</button>${status()}</div>
  ${thin?`<div class="lab-warn"><b>Small sample.</b> The most games played by any team is ${maxGp}. Per-game averages and the Pythagorean comparison are dominated by noise this early — treat every number below as a first read, not a signal.</div>`:''}
  ${cell('Load standings',1,`GET /api/live?league=${L.league}&season=${L.season}`,`<div class="lab-out">${L.loading?'running…':L.error?`<span class="lab-state err">${esc(L.error)}</span>`:`${rows.length} teams · ${esc((L.payload?.sourceStatus||[]).map(s=>s.name+(s.ok?' ✓':' ✕')).join(' · ')||'—')}`}<br><small>${esc(L.payload?.notes||'')}</small></div>`)}
  ${cell('Descriptive statistics',2,'describe(team.ppg, team.oppg, team.diff)  // sample sd, n−1',`<div class="table-wrap"><table class="data-table lab-table"><thead><tr><th>Variable</th><th>n</th><th>Mean</th><th>Median</th><th>SD</th><th>Min</th><th>Max</th></tr></thead><tbody>${rows.length?statRow('Points for / G',dPf)+statRow('Points against / G',dPa)+statRow('Point diff / G',dDf):'<tr><td colspan="7" class="lab-empty">No data.</td></tr>'}</tbody></table></div>`)}
  ${cell('Scoring map',3,'scatter(x = PF/G, y = PA/G)  // up-left = elite',scatter(rows))}
  ${cell('Results vs. expectation',4,'luck = W% − PF^13.91 / (PF^13.91 + PA^13.91)',`${luckBars(rows)}<p class="lab-caption">Positive: a team won more than its scoring margin predicts (often close-game fortune). Negative: fewer. The 13.91 exponent is the commonly cited NBA fit; it is an approximation, not a law.</p>`)}
  ${cell('Provenance & limits',5,null,`<ul class="lab-notes"><li>NBA data: ESPN public site API — unofficial, uncontracted, may lag.</li><li>EuroLeague data: public EuroLeague v2/v3 endpoints, round-specific.</li><li>No value is estimated when a feed omits it; those cells show “—”.</li><li>Pythagorean expectation uses points for/against only: no schedule, injury or pace adjustment.</li></ul>`)}
  </div>`);
 }

 function download(name,mime,text){
  const url=URL.createObjectURL(new Blob([text],{type:mime}));
  const a=Object.assign(document.createElement('a'),{href:url,download:name});
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 function onClick(e){
  const t=e.target;
  const sort=t.closest?.('[data-lab-sort]');
  if(sort){const k=sort.dataset.labSort;L.sortDir=L.sortKey===k?-L.sortDir:(k==='team'||k==='group'||k==='winner'?1:-1);L.sortKey=k;render();return true}
  const ex=t.closest?.('[data-lab-export]');
  if(ex){const d=filtered(),name=`courtside-iq-${slug(d.label)}`;
   if(ex.dataset.labExport==='csv')download(name+'.csv','text/csv;charset=utf-8','﻿'+toCSV(d.rows,d.cols));
   else download(name+'.json','application/json',JSON.stringify({dataset:d.label,exportedAt:new Date().toISOString(),source:d.source,rows:d.rows},null,2));
   return true}
  if(t.closest?.('#lab-run')){load(true);return true}
  return false;
 }
 function onChange(e){
  const el=e.target;
  if(el.id==='lab-dataset'){L.dataset=el.value;L.query='';L.sortKey=L.dataset==='live'?'winPct':'year';L.sortDir=-1;render();if(L.dataset==='live')load();return true}
  if(el.id==='lab-league'){L.league=el.value;load(true);return true}
  if(el.id==='lab-season'){L.season=Number(el.value);load(true);return true}
  return false;
 }
 function onInput(e){
  if(e.target.id!=='lab-query')return false;
  L.query=e.target.value;const pos=e.target.selectionStart;render();
  const f=document.querySelector('#lab-query');f?.focus();f?.setSelectionRange(pos,pos);return true;
 }
 function whenOpened(tab){
  if(tab==='labexplorer'){if(L.dataset==='live')load();}
  if(tab==='labnotebook')load();
 }
 return {routes:{labexplorer:explorer,labnotebook:notebook},onClick,onChange,onInput,whenOpened};
}
