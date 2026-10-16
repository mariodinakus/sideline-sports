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

// EuroLeague standings are round-scoped; if one feed breaks, build a clearly
// labelled results-only W/L table from completed games (never from projections).
function resultStandings(raw,league,season){
 const games=list(raw),teams=new Map();
 const asTeam=side=>{
  const club=side?.club||side?.team||{};
  return {id:String(side?.clubCode||club.code||club.clubCode||side?.club?.code||'').trim(),
    name:String(side?.clubName||club.editorialName||club.name||club.clubName||side?.name||'').trim(),
    logo:firstHttpLink(club.images?.crest||club.crest||'')};
 };
 for(const game of games){
  const a=game.local||game.home,b=game.road||game.away;
  if(!a||!b)continue;
  const status=String(game.gameStatus||game.status||'').toLowerCase();
  if(!(game.played===true||game.isPlayed===true||/finish|result|played|closed|ended/.test(status)))continue;
  const x=asNumber(a.score??a.points??a.totalScore),y=asNumber(b.score??b.points??b.totalScore);
  if(x===null||y===null||x===y)continue;
  const left=asTeam(a),right=asTeam(b);if(!left.id||!right.id)continue;
  for(const t of [left,right])if(!teams.has(t.id))teams.set(t.id,{id:t.id,name:t.name||t.id,short:t.id,logo:t.logo,rank:null,played:0,wins:0,losses:0,draws:null,points:null,for:0,against:0,difference:0,pct:null});
  for(const [t,scored,conceded] of [[left,x,y],[right,y,x]]){
   const row=teams.get(t.id);row.played++;row.wins+=Number(scored>conceded);row.losses+=Number(scored<conceded);row.for+=scored;row.against+=conceded;row.difference+=scored-conceded;
  }
 }
 const rows=[...teams.values()].sort((a,b)=>b.wins-a.wins||(b.wins/Math.max(b.played,1)-a.wins/Math.max(a.played,1))||(b.difference-a.difference)).map((r,i)=>({...r,rank:i+1,pct:r.played?Math.round(r.wins/r.played*1000)/10:null,ppg:r.played?r.for/r.played:null}));
 return {league:{id:league.id,title:league.title,sport:'basketball'},season,groups:rows.length?[{name:'Αποτελέσματα σεζόν / Season results',rows}]:[],asOf:new Date().toISOString(),source:'EuroLeague v2 completed games · independently calculated W–L, not official tiebreaker ranking',status:rows.length?'derived-results':'unavailable',note:'Η κατάταξη από αποτελέσματα δεν εφαρμόζει όλους τους κανόνες ισοβαθμίας της διοργάνωσης.'};
}
async function fetchEuroStandings(league){
 const season=euroSeason(league.id),base=euroBase(league.id,season);
 let rounds=[];try{rounds=list(await json(`${base}/rounds`,8000));}catch{}
 const now=Date.now();
 const candidates=rounds.filter(r=>String(r.phaseTypeCode||r.phase_type_code||'RS')==='RS')
  .filter(r=>{const date=Date.parse(r.minGameStartDate||r.min_game_start_date||'');return Number.isFinite(date)&&date<=now;})
  .map(r=>Number(r.round??r.roundNumber)).filter(n=>Number.isInteger(n)&&n>=1).sort((a,b)=>b-a);
 // A few known round numbers are fallback probes only, never inferred standings.
 const numbers=[...new Set([...candidates.slice(0,2),6,5,4])].slice(0,4);
 const probes=numbers.flatMap(round=>[['v2',`${base}/rounds/${round}/standings`,round],['v3',`https://api-live.euroleague.net/v3/competitions/${euroCode(league.id)}/seasons/${season}/rounds/${round}/basicstandings`,round]]);
 const outcomes=await Promise.allSettled(probes.map(([,url])=>json(url,5500)));
 for(let i=0;i<outcomes.length;i++)if(outcomes[i].status==='fulfilled'){
  const groups=normalizedEuroStandings(outcomes[i].value);
  if(groups.some(g=>g.rows?.length))return {league:{id:league.id,title:league.title,sport:'basketball'},season,round:probes[i][2],groups,asOf:new Date().toISOString(),source:'EuroLeague '+probes[i][0]+' official round standings',status:'ok'};
 }
 // Last attempt: build from actual completed scores, labelled as derived data.
 try{const result=resultStandings(await json(`${base}/games?limit=600`,9500),league,season);if(result.groups.length)return result;}catch{}
 return {league:{id:league.id,title:league.title,sport:'basketball'},season,groups:[],asOf:new Date().toISOString(),source:'EuroLeague public API',status:'unavailable',note:'Standings sources did not return usable live data; no placeholder table.'};
}

module.exports=async function handler(req,res){if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});const q=req.query||Object.fromEntries(new URL(req.url,'http://local').searchParams);const id=String(q.league||'epl');const league=BY_ID[id];if(!league||!AVAILABLE.includes(league))return send(res,400,{error:'Unsupported league',supported:AVAILABLE.map(x=>({id:x.id,title:x.title}))});try{return send(res,200,await cached('standings-v4-'+id,league.external?180000:300000,()=>league.external?fetchEuroStandings(league):fetchStandings(league)));}catch(e){return send(res,503,{league:{id,title:league.title},groups:[],status:'unavailable',error:'Standings source unavailable; no data fabricated',asOf:new Date().toISOString()});}};
module.exports._test={normalizeEntry,extractGroups,getStat,asNumber,fetchEuroStandings,resultStandings};
