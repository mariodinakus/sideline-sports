// MONO BASKET shared NBA forecast backend for Render and Vercel.
import {mapNbaLive,mapNbaStandings} from './live-mappers.js';
import {blendRating,leagueAverage} from './lab-math.js';
import {predictEnsemble,teamKey} from './ensemble-engine.js';
import {scoreLedger} from './forecast-engine.js';
const USER_AGENT='CourtsideIQ/MonoBasket-integrated';
const ESPN='https://site.api.espn.com';
const LEDGER_URL='https://raw.githubusercontent.com/mariodinakus/sideline-sports/main/courtside-iq/data/prediction-ledger.json';
const cache=new Map();
const fmtDay=d=>d.toISOString().slice(0,10).replaceAll('-','');
const plusDays=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export const isoOk=x=>/^20\d{2}-\d{2}-\d{2}$/.test(x||'')&&Number.isFinite(Date.parse(x+'T12:00:00Z'));
const alias=x=>teamKey(x);
const limit=(v,l,h)=>Math.min(h,Math.max(l,v));
const smallReason=e=>String(e?.message||e||'unavailable').slice(0,110);
function cached(key,ttl,load){
 const now=Date.now(),c=cache.get(key);
 if(c&&(c.exp>now||c.pending))return c.pending||Promise.resolve(c.value);
 const record={exp:0,value:null,pending:null};
 const pending=Promise.resolve().then(load).then(value=>{record.value=value;record.exp=Date.now()+ttl;record.pending=null;return value}).catch(err=>{cache.delete(key);throw err});
 record.pending=pending;cache.set(key,record);return pending;
}
async function fetchJson(url) {
 const r=await fetch(url,{headers:{accept:'application/json','user-agent':USER_AGENT},signal:AbortSignal.timeout(11500)});
 if(!r.ok)throw Error('HTTP '+r.status);
 return r.json();
}
const scoreboard=day=>cached('games:'+day,75000,()=>fetchJson(ESPN+'/apis/site/v2/sports/basketball/nba/scoreboard?dates='+fmtDay(plusDays(day,0))+'&limit=120'));
const standings=year=>cached('standings:'+year,1200000,async()=>{
 const raw=await fetchJson(ESPN+'/apis/v2/sports/basketball/nba/standings?season='+(year+1));
 const out=new Map();
 for(const group of mapNbaStandings(raw))for(const r of group.rows){
  const code=alias(r.abbr);if(!code||out.has(code))continue;
  out.set(code,{abbr:code,team:r.name,ppg:r.ppg==null?null:Number(r.ppg),oppg:r.oppg==null?null:Number(r.oppg),games:Number(r.wins||0)+Number(r.losses||0),wins:Number(r.wins||0),losses:Number(r.losses||0)});
 }
 if(out.size<15)throw Error('Standings unavailable');
 return out;
});
const ledger=()=>cached('ledger',120000,async()=>{
 const d=await fetchJson(LEDGER_URL+'?t='+Math.floor(Date.now()/120000));
 if(!Array.isArray(d.records))throw Error('Invalid forecast archive');
 return d;
});
function contextFor(g,h,a,data){
 const k1=alias(g.homeCode),k2=alias(g.awayCode),s=data.contextCache||{};
 return {tip:g.date,homeGames:s.homeGames?.[k1],awayGames:s.homeGames?.[k2],
  homeRoster:s.rosters?.[k1],awayRoster:s.rosters?.[k2],
  homePriorRoster:s.priorRosters?.[k1],awayPriorRoster:s.priorRosters?.[k2],
  homeInjuries:s.injuries?.[k1],awayInjuries:s.injuries?.[k2],
  elo:s.elo,historicalModel:s.historicalModel};
}
function ratings(cur,prev){
 const teams=new Map();
 for(const [code,p] of prev||[])if(finite(p.ppg)&&finite(p.oppg))teams.set(code,{...p,games:0,wins:0,losses:0});
 for(const [code,c] of cur||[]){
  const p=prev?.get(code);
  const b=blendRating(c,p);
  if(finite(b.ppg)&&finite(b.oppg))teams.set(code,{...c,...b});
 }
 return teams;
}
function compactForecast(q){
 if(!q)return null;
 return {homePts:q.homePts,awayPts:q.awayPts,total:q.total,margin:q.margin,
  homeWinProb:q.homeWinProb,marginLow:q.marginLow,marginHigh:q.marginHigh,totalLow:q.totalLow,totalHigh:q.totalHigh};
}
function compactRecord(r){
 return {id:r.id,tip:r.tip,lockedAt:r.lockedAt,home:r.home,away:r.away,
  homeCode:r.homeCode,awayCode:r.awayCode,pick:r.pick,forecast:r.forecast,actual:r.actual||null,
  modelVotes:r.modelVotes||[],conditions:r.conditions||null};
}
function compactGame(g,teamMap,league,data,rec){
 const home=teamMap.get(alias(g.homeCode)),away=teamMap.get(alias(g.awayCode));
 const locked=rec&&Date.parse(rec.lockedAt)<Date.parse(g.date)?rec:null;
 let q=null;
 if(g.state==='pre'&&home&&away&&finite(league)&&league>0){
  try{q=predictEnsemble(home,away,league,data.model||{},contextFor(g,home,away,data),data.records||[])}
  catch(e){console.warn('One matchup skipped:',smallReason(e))}
 }
 return {id:g.id,date:g.date,state:g.state,home:g.home,away:g.away,
  homeCode:alias(g.homeCode),awayCode:alias(g.awayCode),
  homeScore:g.homeScore,awayScore:g.awayScore,
  forecast:locked?.forecast||compactForecast(q),origin:locked?'locked':q?'provisional':'unavailable',
  lockedAt:locked?.lockedAt||null,pick:locked?.pick||(q?.homeWinProb>=.58?'HOME':q?.homeWinProb<=.42?'AWAY':'NO_PICK'),
  votes:locked?.modelVotes?.length?locked.modelVotes:(q?.modelVotes||[]),
  coverage:locked?.conditions?.sourceCoverage||q?.conditions?.sourceCoverage||{},
  activeModels:locked?.modelVotes?.length||q?.activeModels||0};
}
export async function dashboard(day){
 const y=Number(day.slice(0,4))+(Number(day.slice(5,7))<9?-1:0);
 const out=await Promise.allSettled([ledger(),standings(y),standings(y-1),scoreboard(day),scoreboard(plusDays(day,-1).toISOString().slice(0,10))]);
 const [lr,cur,prev,board,priorBoard]=out;
 const warnings=[];
 out.forEach((v,i)=>{if(v.status==='rejected')warnings.push(['Archive','Current standings','Previous standings','ESPN scoreboard','Previous day scoreboard'][i]+': '+smallReason(v.reason))});
 const data=lr.status==='fulfilled'?lr.value:{records:[],summary:{n:0},model:{status:'unavailable'}};
 const teamMap=ratings(cur.status==='fulfilled'?cur.value:null,prev.status==='fulfilled'?prev.value:null);
 const league=leagueAverage([...teamMap.values()],'ppg');
 const byId=new Map(data.records.map(r=>[String(r.id).split(':').at(-1),r]));
 const localDay=date=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
 const rawGames=[...(board.status==='fulfilled'?mapNbaLive(board.value):[]),...(priorBoard.status==='fulfilled'?mapNbaLive(priorBoard.value):[])];
 const games=[...new Map(rawGames.filter(g=>g.id&&g.date&&localDay(g.date)===day).map(g=>[String(g.id),g])).values()]
  .map(g=>compactGame(g,teamMap,league,data,byId.get(String(g.id))));
 const audit=scoreLedger(data.records||[]);
 const historical=data.contextCache?.historicalModel||{};
 const last=(data.records||[]).filter(r=>r.actual).sort((a,b)=>String(b.tip).localeCompare(String(a.tip))).slice(0,36).map(compactRecord);
 const future=(data.records||[]).filter(r=>!r.actual&&Date.parse(r.tip)>Date.now()-7200000).sort((a,b)=>String(a.tip).localeCompare(String(b.tip))).slice(0,25).map(compactRecord);
 return {brand:'MONO BASKET',day,generatedAt:new Date().toISOString(),archiveUpdatedAt:data.updatedAt||null,
  games,stats:{...audit,records:data.records.length,upcoming:future.length},history:historical,
  models:{archivedTraining:data.model?.status||'baseline',trainingCount:data.model?.sample||0,sourceCounts:data.contextCache?.diagnostics||{}},
  records:{recent:last,upcoming:future},warnings};
}
