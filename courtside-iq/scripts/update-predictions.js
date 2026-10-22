// COURTSIDE IQ — scheduled point-in-time NBA forecast archival.
// Runs from repository Actions; only pre-tip forecasts are saved. ESPN data is unofficial.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mapNbaLive,mapNbaStandings} from '../lib/live-mappers.js';
import {blendRating,leagueAverage} from '../lib/lab-math.js';
import {forecastGame,choosePick,scoreLedger,trainForecastModel} from '../lib/forecast-engine.js';
import {predictEnsemble,elosFromSchedules,teamKey,trainHistoricalOnline} from '../lib/ensemble-engine.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const filename=path.join(root,'data','prediction-ledger.json');
const now=new Date();
const year=now.getUTCMonth()>=8?now.getUTCFullYear():now.getUTCFullYear()-1;
const alias={WSH:'WAS',GS:'GSW',NY:'NYK',SA:'SAS',NO:'NOP',UTAH:'UTA',PHO:'PHX',BRK:'BKN',CHO:'CHA'};
const normalize=x=>alias[String(x||'').toUpperCase()]||String(x||'').toUpperCase();
const dateCode=x=>x.toISOString().slice(0,10).replaceAll('-','');
async function espn(url) {
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'CourtsideIQ/1.0 research forecast evaluator'},signal:AbortSignal.timeout(13000)});
  if(!r.ok)throw Error('ESPN HTTP '+r.status);
  return r.json();
}
const host='https://site.api.espn.com';
async function standingRows(season) {
 const raw=await espn(host+'/apis/v2/sports/basketball/nba/standings?season='+String(season+1));
 const out=new Map();
 for(const group of mapNbaStandings(raw))for(const r of group.rows) {
   if(!r.abbr||out.has(normalize(r.abbr)))continue;
   const games=Number(r.wins||0)+Number(r.losses||0);
   out.set(normalize(r.abbr),{abbr:normalize(r.abbr),team:r.name,ppg:r.ppg,oppg:r.oppg,games,wins:r.wins,losses:r.losses});
 }
 return out;
}
async function loadLedger() {
 try{
  const input=JSON.parse(await fs.readFile(filename,'utf8'));
  if(input.version!==1||!Array.isArray(input.records))throw Error('Bad ledger version');
  return input;
 }catch(e){
  if(e.code==='ENOENT')return {version:1,league:'NBA',records:[],updatedAt:null,model:{status:'baseline',sample:0},summary:{n:0}};
  throw e;
 }
}

/** Optional public ESPN context. Every source can fail without manufacturing a signal. */
const site='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
async function safeGet(url){try{return await espn(url)}catch(e){return null}}
function historicalRoster(raw){
 if(!raw||!Array.isArray(raw.items))return null;
 const athletes=raw.items.map(x=>{const ref=String(x.$ref||x.href||'');const id=(ref.match(/\/athletes\/(\d+)(?:[/?]|$)/)||[])[1];return id?{id,name:id}:null}).filter(Boolean);
 return athletes.length>=8?{athletes}:null;
}
function roster(raw){
 if(!raw)return null;
 const entries=(raw.athletes||[]).flatMap(x=>Array.isArray(x.items)?x.items:[x]);
 const athletes=entries.map(x=>({id:String(x.id||x.athlete?.id||''),name:String(x.displayName||x.athlete?.displayName||'')})).filter(x=>x.id);
 return athletes.length>=8?{athletes}:null;
}
function playerInjuries(payload) {
 if(!payload)return null;
 const groups=payload.injuries||payload.teams||payload.items||[];
 if(!Array.isArray(groups))return null;
 const out={};
 for(const group of groups){
  const k=teamKey(group.team?.abbreviation||group.abbreviation||group.team?.shortDisplayName);
  if(!k)continue;
  const people=group.injuries||group.items||group.athletes||[];
  out[k]=(out[k]||[]).concat((Array.isArray(people)?people:[]).map(x=>({
   name:String(x.athlete?.displayName||x.displayName||x.name||'').slice(0,90),
   status:String(x.status?.type||x.status?.name||x.status||x.type?.name||'').slice(0,50)
  })).filter(x=>x.name&&x.status));
 }
 return out;
}
function scheduleEvents(raw){
 if(!raw||!Array.isArray(raw.events))return [];
 return raw.events.map(e=>{
  const c=e.competitions?.[0]||{},teams=c.competitors||[];
  const h=teams.find(x=>x.homeAway==='home'),a=teams.find(x=>x.homeAway==='away');
  const val=x=>{const n=Number(typeof x==='object'?(x?.value??x?.displayValue):x);return Number.isFinite(n)?n:null};
  if(!h?.team?.abbreviation||!a?.team?.abbreviation)return null;
  const state=e.status?.type||c.status?.type||{};
  const final=state.state==='post'||state.completed===true;
  return {id:String(e.id||''),date:e.date||null,homeCode:teamKey(h.team.abbreviation),awayCode:teamKey(a.team.abbreviation),
   homeScore:val(h.score),awayScore:val(a.score),final};
 }).filter(x=>x&&x.date&&x.id);
}
async function contextSnapshot(games,rawBoards,old){
 const idByCode=new Map();
 for(const b of rawBoards)for(const e of b?.events||[])
  for(const c of e.competitions?.[0]?.competitors||[])if(c?.team?.abbreviation&&c?.team?.id)
   idByCode.set(teamKey(c.team.abbreviation),String(c.team.id));
 const needed=[...new Set(games.filter(g=>g.state==='pre').flatMap(g=>[teamKey(g.homeCode),teamKey(g.awayCode)]))]
 .filter(k=>idByCode.has(k));
 const snapshot={schema:3,updatedAt:now.toISOString(),homeGames:{},rosters:{},priorRosters:{},injuries:null,elo:{}};
 // Limit upstream calls and re-use the previous snapshot for six hours.
 const priorTime=Date.parse(old?.updatedAt||'');
 if(old?.schema===3&&Number.isFinite(priorTime)&&now.getTime()-priorTime<6*3600000)return old;
 const injuryRaw=await safeGet(site+'/injuries');
 snapshot.injuries=playerInjuries(injuryRaw);
 const matches=[];
 for(let i=0;i<needed.length;i+=5){
  const batch=needed.slice(i,i+5);
  const results=await Promise.all(batch.map(async key=>{
   const id=idByCode.get(key);
   const [currentSchedule,previousSchedule,currentRoster,previousRoster]=await Promise.all([
    safeGet(site+'/teams/'+id+'/schedule?season='+(year+1)),
    safeGet(site+'/teams/'+id+'/schedule?season='+year),
    safeGet(site+'/teams/'+id+'/roster?season='+(year+1)),
    safeGet('https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/'+year+'/teams/'+id+'/athletes?limit=100')
   ]);
   const recent=[...scheduleEvents(previousSchedule),...scheduleEvents(currentSchedule)];
   const cr=roster(currentRoster),pr=historicalRoster(previousRoster);
   const same=cr&&pr&&cr.athletes.length===pr.athletes.length&&
      cr.athletes.every(p=>pr.athletes.some(q=>q.id===p.id));
   return {key,events:recent,cr,pr:same?null:pr};
  }));
  for(const item of results){
   matches.push(...item.events);
   snapshot.homeGames[item.key]=item.events.filter(e=>e.final&&e.homeScore!==null&&e.awayScore!==null).map(e=>({
    date:e.date,final:true,for:e.homeCode===item.key?e.homeScore:e.awayScore,
    against:e.homeCode===item.key?e.awayScore:e.homeScore}));
   if(item.cr)snapshot.rosters[item.key]=item.cr;
   if(item.pr)snapshot.priorRosters[item.key]=item.pr;
  }
 }
 // A league-wide seasonal range helps when per-team schedules are sparse or omit game results.
 if(matches.filter(g=>g.final&&g.homeScore!==null).length<40){
   const prevStart=String(year-1)+'1001',prevEnd=String(year)+'0630';
   const currStart=String(year)+'1001',currEnd=dateCode(now);
   const boards=await Promise.all([
    safeGet(site+'/scoreboard?dates='+prevStart+'-'+prevEnd+'&limit=2000'),
    safeGet(site+'/scoreboard?dates='+currStart+'-'+currEnd+'&limit=700')
   ]);
   const backfill=boards.flatMap(x=>scheduleEvents(x)).filter(g=>g.final&&g.homeScore!==null&&g.awayScore!==null);
   matches.push(...backfill);
   for(const [key,list] of Object.entries(snapshot.homeGames)){
     const extraGames=backfill.filter(g=>g.homeCode===key||g.awayCode===key).map(e=>({
      date:e.date,final:true,for:e.homeCode===key?e.homeScore:e.awayScore,against:e.homeCode===key?e.awayScore:e.homeScore
     }));
     snapshot.homeGames[key]=[...new Map([...list,...extraGames].map(v=>[v.date+':'+v.for+':'+v.against,v])).values()];
   }
 }
 snapshot.elo=elosFromSchedules(matches);
 snapshot.historicalModel=trainHistoricalOnline(matches);
 snapshot.diagnostics={historicalFinals:[...new Set(matches.filter(g=>g.final&&g.homeScore!==null).map(g=>g.id))].length,
  rosterTeams:Object.keys(snapshot.rosters).length,previousRosterTeams:Object.keys(snapshot.priorRosters).length,
  injuryTeams:Object.keys(snapshot.injuries||{}).length};
 return snapshot;
}

async function main() {
 const ledger=await loadLedger();
 const oldIds=new Set(ledger.records.map(r=>r.id));
 // Catch finals from recent days plus any missed final within the past 14 days.
 const dateOffsets=new Set([-3,-2,-1,0,1,2]);
 for(const rec of ledger.records.filter(r=>!r.actual).slice(-120)){
  const age=(now-Date.parse(rec.tip))/86400000;
  if(age>=0&&age<=14){
   const day=new Date(rec.tip);day.setUTCHours(12,0,0,0);
   const offset=Math.round((day-now)/86400000);
   if(offset>=-14&&offset<=2)dateOffsets.add(offset);
  }
 }
 const dates=[...dateOffsets].sort((a,b)=>a-b).map(delta=>{
   const day=new Date(now);day.setUTCDate(day.getUTCDate()+delta);return dateCode(day);
 });
 const [current,previous,scoreboards]=await Promise.all([
  standingRows(year),standingRows(year-1),
  Promise.all(dates.map(date=>espn(host+'/apis/site/v2/sports/basketball/nba/scoreboard?dates='+date+'&limit=100')))
 ]);
 if(current.size<20&&previous.size<20)throw Error('ESPN standings incomplete; no forecasts saved');
 const teams=new Map();
 for(const [code,p] of previous)teams.set(code,{...p,games:0,wins:0,losses:0});
 for(const [code,c] of current){
  const p=previous.get(code);
  const b=blendRating(c,p);
  if(Number.isFinite(b.ppg)&&Number.isFinite(b.oppg))teams.set(code,{...c,...b});
 }
 const leagueAvg=leagueAverage([...teams.values()],'ppg');
 if(!Number.isFinite(leagueAvg)||leagueAvg<=0)throw Error('No valid league-average scoring data');
 const games=[...new Map(scoreboards.flatMap(x=>mapNbaLive(x)).filter(g=>g.id)
   .map(g=>[g.id,g])).values()];
 let changed=false,settled=0,created=0;
 const byId=new Map(ledger.records.map(r=>[r.id,r]));
 // Resolve locked pre-game records FIRST. Never re-forecast a completed game.
 for(const g of games){
  const id=String(year)+':'+g.id,record=byId.get(id);
  if(record&&!record.actual&&g.state==='post'&&Number.isFinite(g.homeScore)&&Number.isFinite(g.awayScore)){
    record.actual={home:g.homeScore,away:g.awayScore};
    record.settledAt=now.toISOString();changed=true;settled++;
  }
 }
 const model=trainForecastModel(ledger.records);
 const context=await contextSnapshot(games,scoreboards,ledger.contextCache);
 if(context.updatedAt!==ledger.contextCache?.updatedAt){ledger.contextCache=context;changed=true;}
 for(const g of games){
   const id=String(year)+':'+g.id,tip=Date.parse(g.date);
   if(oldIds.has(id)||g.state!=='pre'||!Number.isFinite(tip)||tip<=now.getTime()+60000||tip>now.getTime()+36*3600000)continue;
   const home=teams.get(normalize(g.homeCode)),away=teams.get(normalize(g.awayCode));
   if(!home||!away||home===away)continue;
   const hk=teamKey(g.homeCode),ak=teamKey(g.awayCode);
   const p=predictEnsemble(home,away,leagueAvg,model,{
     tip:g.date,homeGames:context.homeGames?.[hk],awayGames:context.homeGames?.[ak],
     homeRoster:context.rosters?.[hk],awayRoster:context.rosters?.[ak],
     homePriorRoster:context.priorRosters?.[hk],awayPriorRoster:context.priorRosters?.[ak],
     homeInjuries:context.injuries?.[hk],awayInjuries:context.injuries?.[ak],elo:context.elo,historicalModel:context.historicalModel
   },ledger.records);
   if(!p||![p.homePts,p.awayPts,p.homeWinProb].every(Number.isFinite))continue;
   const record={id,season:year,tip:new Date(tip).toISOString(),lockedAt:now.toISOString(),
     home:g.home,away:g.away,homeCode:g.homeCode,awayCode:g.awayCode,
     model:p.model,features:p.features,pick:choosePick(p.homeWinProb),modelVotes:p.modelVotes||[],conditions:p.conditions||null,
     forecast:{homePts:p.homePts,awayPts:p.awayPts,margin:p.margin,total:p.total,
       homeWinProb:p.homeWinProb,marginLow:p.marginLow,marginHigh:p.marginHigh,
       totalLow:p.totalLow,totalHigh:p.totalHigh}};
   ledger.records.push(record);byId.set(id,record);changed=true;created++;
 }
 if(!changed){console.log('No new predictions/results; ledger unchanged.');return}
 ledger.records=ledger.records.sort((a,b)=>String(a.tip).localeCompare(String(b.tip))).slice(-1500);
 ledger.model=trainForecastModel(ledger.records);
 ledger.summary=scoreLedger(ledger.records);
 ledger.updatedAt=now.toISOString();
 await fs.mkdir(path.dirname(filename),{recursive:true});
 await fs.writeFile(filename,JSON.stringify(ledger,null,2)+'\n','utf8');
 console.log('Archived '+created+' pregame forecasts; settled '+settled+'; verified '+ledger.summary.n+' predictions; model '+ledger.model.status);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
