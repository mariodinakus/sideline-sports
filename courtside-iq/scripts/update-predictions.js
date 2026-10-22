// COURTSIDE IQ — scheduled point-in-time NBA forecast archival.
// Runs from repository Actions; only pre-tip forecasts are saved. ESPN data is unofficial.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mapNbaLive,mapNbaStandings} from '../lib/live-mappers.js';
import {blendRating,leagueAverage} from '../lib/lab-math.js';
import {forecastGame,choosePick,scoreLedger,trainForecastModel} from '../lib/forecast-engine.js';

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
   out.set(normalize(r.abbr),{abbr:normalize(r.abbr),team:r.name,ppg:r.ppg,oppg:r.oppg,games});
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
 for(const [code,p] of previous)teams.set(code,{...p,games:0});
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
 for(const g of games){
   const id=String(year)+':'+g.id,tip=Date.parse(g.date);
   if(oldIds.has(id)||g.state!=='pre'||!Number.isFinite(tip)||tip<=now.getTime()+60000||tip>now.getTime()+36*3600000)continue;
   const home=teams.get(normalize(g.homeCode)),away=teams.get(normalize(g.awayCode));
   if(!home||!away||home===away)continue;
   const p=forecastGame(home,away,leagueAvg,model);
   if(!p||![p.homePts,p.awayPts,p.homeWinProb].every(Number.isFinite))continue;
   const record={id,season:year,tip:new Date(tip).toISOString(),lockedAt:now.toISOString(),
     home:g.home,away:g.away,homeCode:g.homeCode,awayCode:g.awayCode,
     model:p.model,features:p.features,pick:choosePick(p.homeWinProb),
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
