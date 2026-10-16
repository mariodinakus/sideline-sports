'use strict';
const {json,cached,send,firstHttpLink}=require('../lib/shared');
const {BY_ID,LEAGUES}=require('../lib/leagues');
const {euroCode,euroSeason,euroBase,normalizedEuroStandings,list}=require('../lib/basketball');
const AVAILABLE=LEAGUES.filter(x=>!['racing'].includes(x.sport)&&(!x.external||x.external==='euroleague'));
function asNumber(x){if(typeof x==='number')return Number.isFinite(x)?x:null;if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null;}
function getStat(stats,...names){for(const name of names){const found=(stats||[]).find(s=>String(s.name||s.abbreviation||s.displayName||'').toLowerCase()===name.toLowerCase());if(found)return asNumber(found.value??found.displayValue);}return null;}
function normalizeEntry(e,index){const t=e.team||e;const stats=e.stats||e.statistics||[];return {id:String(t.id||''),name:String(t.displayName||t.name||t.shortDisplayName||'—'),short:String(t.shortDisplayName||t.abbreviation||t.displayName||'—'),logo:firstHttpLink(t.logos?.[0]?.href||t.logo),rank:asNumber(getStat(stats,'rank','playoffSeed')??index+1),played:getStat(stats,'gamesPlayed','games','gp'),wins:getStat(stats,'wins','w'),draws:getStat(stats,'ties','draws','d'),losses:getStat(stats,'losses','l'),points:getStat(stats,'points','point','pts'),for:getStat(stats,'pointsFor','goalsFor','gf','pf'),against:getStat(stats,'pointsAgainst','goalsAgainst','ga','pa'),difference:getStat(stats,'pointDifferential','goalDifference','gd','diff'),pct:getStat(stats,'winPercent','winPct','percentage','pct'),form:String(e.note?.description||'').slice(0,75),ppg:getStat(stats,'avgPointsFor','averagePointsFor','pointsPerGame'),oppg:getStat(stats,'avgPointsAgainst','averagePointsAgainst','opponentPointsPerGame'),lastTen:String((stats||[]).find(s=>s.name==='lastTen')?.displayValue||''),streak:String((stats||[]).find(s=>s.name==='streak')?.displayValue||'')};}
function extractGroups(payload){const output=[];const seen=new Set();function scan(node,label,depth){if(!node||depth>7||typeof node!=='object')return;const standings=node.standings;const entries=Array.isArray(standings?.entries)?standings.entries:Array.isArray(node.entries)?node.entries:null;if(entries?.length){const rows=entries.map(normalizeEntry);const key=rows.map(x=>x.id||x.name).join('|');if(!seen.has(key)){seen.add(key);output.push({name:String(node.name||node.abbreviation||label||'League'),rows});}}for(const child of [...(Array.isArray(node.children)?node.children:[]),...(Array.isArray(node.groups)?node.groups:[])])scan(child,child.name||label,depth+1);}scan(payload,payload.name||'',0);return output;}
async function fetchStandings(league){const url=`https://site.api.espn.com/apis/v2/sports/${league.sport}/${league.slug}/standings`;const raw=await json(url,9500);return {league:{id:league.id,title:league.title,sport:league.sport},groups:extractGroups(raw),asOf:new Date().toISOString(),source:'ESPN public standings (unofficial)',status:'ok'};}

async function fetchEuroStandings(league){
 const season=euroSeason(league.id),base=euroBase(league.id,season);
 const rounds=list(await json(`${base}/rounds`,9000));
 const now=Date.now();
 const eligible=rounds.filter(r=>String(r.phaseTypeCode||r.phase_type_code||'RS')==='RS')
   .filter(r=>{const date=Date.parse(r.minGameStartDate||r.min_game_start_date||'');return Number.isFinite(date)&&date<=now;})
   .sort((a,b)=>Number(b.round??b.roundNumber??0)-Number(a.round??a.roundNumber??0));
 const round=Number((eligible[0]||{}).round??(eligible[0]||{}).roundNumber);
 if(!Number.isInteger(round)||round<1)return {league:{id:league.id,title:league.title,sport:'basketball'},season,groups:[],asOf:new Date().toISOString(),source:'EuroLeague public standings v3',status:'not-started',note:'No played round in current season'};
 let groups=[],which='v3';
 try{const raw=await json(`https://api-live.euroleague.net/v3/competitions/${euroCode(league.id)}/seasons/${season}/rounds/${round}/basicstandings`,9000);groups=normalizedEuroStandings(raw);}catch{}
 if(!groups.length){const fallback=await json(`${base}/rounds/${round}/standings`,9000);groups=normalizedEuroStandings(fallback);which='v2';}
 return {league:{id:league.id,title:league.title,sport:'basketball'},season,round,groups,asOf:new Date().toISOString(),source:'EuroLeague public standings '+which,status:groups.length?'ok':'empty'};
}
module.exports=async function handler(req,res){if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});const q=req.query||Object.fromEntries(new URL(req.url,'http://local').searchParams);const id=String(q.league||'epl');const league=BY_ID[id];if(!league||!AVAILABLE.includes(league))return send(res,400,{error:'Unsupported league',supported:AVAILABLE.map(x=>({id:x.id,title:x.title}))});try{return send(res,200,await cached('standings-v4-'+id,league.external?180000:300000,()=>league.external?fetchEuroStandings(league):fetchStandings(league)));}catch(e){return send(res,503,{league:{id,title:league.title},groups:[],status:'unavailable',error:'Standings source unavailable; no data fabricated',asOf:new Date().toISOString()});}};
module.exports._test={normalizeEntry,extractGroups,getStat,asNumber,fetchEuroStandings};
