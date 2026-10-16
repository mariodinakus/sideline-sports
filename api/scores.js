'use strict';
const {send,json,cached,firstHttpLink}=require('../lib/shared');
const LEAGUES=[
 {id:'euro',title:'EuroLeague',sport:'euroleague',slug:'E',accent:'#c4ff78'},
 {id:'gre',title:'Super League',sport:'soccer',slug:'gre.1',accent:'#73b4fa'},
 {id:'ucl',title:'Champions League',sport:'soccer',slug:'uefa.champions',accent:'#87aaff'},
 {id:'epl',title:'Premier League',sport:'soccer',slug:'eng.1',accent:'#bc93fb'},
 {id:'laliga',title:'La Liga',sport:'soccer',slug:'esp.1',accent:'#f3ae80'},
 {id:'nba',title:'NBA',sport:'basketball',slug:'nba',accent:'#caff80'},
 {id:'f1',title:'Formula 1',sport:'racing',slug:'f1',accent:'#ff9d85'},
];
function mappedEvent(event,league){
 const comp=event.competitions?.[0]||{};
 const teams=comp.competitors||[];
 const home=teams.find(t=>t.homeAway==='home')||teams[0];
 const away=teams.find(t=>t.homeAway==='away')||teams[1];
 const status=event.status?.type||{};
 return {id:String(event.id),league:league.id,leagueName:league.title,sport:league.sport,name:event.name||'',date:event.date||'',
  state:status.state||'pre',status:status.shortDetail||status.detail||'',clock:event.status?.displayClock||'',
  home:{name:home?.team?.shortDisplayName||home?.team?.displayName||'—',fullName:home?.team?.displayName||'',logo:firstHttpLink(home?.team?.logo),score:home?.score??null},
  away:{name:away?.team?.shortDisplayName||away?.team?.displayName||'—',fullName:away?.team?.displayName||'',logo:firstHttpLink(away?.team?.logo),score:away?.score??null},
  url:firstHttpLink(event.links?.[0]?.href||comp?.links?.[0]?.href)};
}
function athensDay(iso){
 const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Athens'}).formatToParts(d);
 const get=n=>parts.find(p=>p.type===n)?.value;
 return `${get('year')}${get('month')}${get('day')}`;
}
function euroleagueEvent(g){
 const local=g.local||g.home||{},road=g.road||g.away||{};
 const getName=obj=>obj.club?.abbreviatedName||obj.club?.name||obj.club?.editorialName||obj.clubName||obj.name||'—';
 const date=g.utcDate||g.date||g.localDate||'';
 const status=String(g.gameStatus||g.status||'').toLowerCase();
 const state=status.includes('live')||status.includes('progress')?'in':g.played||status.includes('result')||status.includes('finish')?'post':'pre';
 return {id:String(g.gameCode||g.id||''),league:'euro',leagueName:'EuroLeague',sport:'basketball',
 name:`${getName(local)} - ${getName(road)}`,date,state,status:state==='in'?'LIVE':state==='post'?'FT':'',
 home:{name:getName(local),fullName:local.club?.name||'',logo:firstHttpLink(local.club?.images?.crest||local.club?.crest),score:local.score??null},
 away:{name:getName(road),fullName:road.club?.name||'',logo:firstHttpLink(road.club?.images?.crest||road.club?.crest),score:road.score??null},url:''};
}
async function euroleagueByDate(date){
 // One season snapshot, cached more aggressively because this upstream has strict anti-abuse limits.
 const year=Number(date.slice(0,4))-(Number(date.slice(4,6))<=7?1:0);
 const season=`E${year}`;
 const data=await cached('euroseason-'+season,600000,()=>json(`https://api-live.euroleague.net/v2/competitions/E/seasons/${season}/games`,7500));
 const games=Array.isArray(data.data)?data.data:[];
 return games.filter(g=>athensDay(g.utcDate||g.date||g.localDate)===date).slice(0,22).map(euroleagueEvent);
}
async function load(date){
 const runs=await Promise.allSettled(LEAGUES.map(async league=>{
  if(league.id==='euro')return {league,events:await euroleagueByDate(date)};
  // NBA's ESPN scoreboard day is America-local; include yesterday to capture games
  // played after midnight in Athens. Never show a different Greek calendar day.
  const dates=league.id==='nba'?[date,new Date(Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8))-86400000).toISOString().slice(0,10).replaceAll('-','')]:[date];
  const payloads=await Promise.all(dates.map(d=>json(`https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.slug}/scoreboard?dates=${d}`,6500)));
  const ids=new Set();
  const events=payloads.flatMap(data=>data.events||[]).filter(ev=>{
    if(ids.has(ev.id)||athensDay(ev.date)!==date)return false;
    ids.add(ev.id);return true;
  });
  return {league,events:events.slice(0,22).map(ev=>mappedEvent(ev,league))};
 }));
 const fixtures=runs.filter(x=>x.status==='fulfilled').flatMap(x=>x.value.events);
 fixtures.sort((a,b)=> (a.state==='in'?-1:b.state==='in'?1:0) || Date.parse(a.date)-Date.parse(b.date));
 return {date,matches:fixtures,meta:{asOf:new Date().toISOString(),leaguesOnline:runs.filter(x=>x.status==='fulfilled').length,
  leaguesConfigured:LEAGUES.length,leagues:LEAGUES.map(({id,title,accent})=>({id,title,accent})),
  source:'ESPN public site API + EuroLeague public v2 (ανεπίσημα endpoints· μπορεί να αλλάξουν)',failed:runs.flatMap((x,i)=>x.status==='rejected'?[LEAGUES[i].title]:[])}};
}
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const d=typeof req.query?.date==='string'?req.query.date:typeof new URL(req.url,'http://localhost').searchParams.get('date')==='string'?new URL(req.url,'http://localhost').searchParams.get('date'):'';
 const date=/^\d{8}$/.test(d)?d:new Date().toISOString().slice(0,10).replaceAll('-','');
 try{send(res,200,await cached('score-'+date,90000,()=>load(date)));}catch(e){send(res,503,{date,matches:[],meta:{asOf:new Date().toISOString(),leaguesOnline:0,source:'ESPN',error:'Αδυναμία λήψης αποτελεσμάτων'}});}
};
module.exports._test={mappedEvent,euroleagueEvent,athensDay};
