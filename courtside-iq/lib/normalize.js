/* Defensive adapters for unofficial feeds. Never fill missing metrics with invented results. */
export const N = (v) => {if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace('%','').replace(',','.'));return Number.isFinite(n)?n:null;};
const array=(v)=>Array.isArray(v)?v:[];
export const first=(...v)=>v.find(x=>x!==undefined&&x!==null&&x!=='');
const num=(obj,...keys)=>N(first(...keys.map(k=>obj?.[k])));
const str=(obj,...keys)=>String(first(...keys.map(k=>obj?.[k]),'')??'').trim();
const unwrap=(x,k)=>Array.isArray(x)?x:array(x?.[k]??x?.data?.[k]??x?.data?.data?.[k]??x?.data??x?.items??x?.results);
const metric=(r,fields)=>num(r,...fields);
function percent(raw){const v=N(raw);return v===null?null:(Math.abs(v)<=1?v*100:v);}
export function euroPlayers(raw,rawAdvanced){
  const adv=new Map(unwrap(rawAdvanced,'players').map(x=>[String(first(x.personCode,x.playerCode,x.player?.code,x.player?.personCode,x.person?.code,x.player,x.name)),x]));
  const rows=unwrap(raw,'players');
  return rows.map((r,i)=>{
    const person=r.person??r.playerDetails??r.player??r.details??{}, p=typeof person==='object'?person:{};
    const id=String(first(r.personCode,r.playerCode,p.code,p.personCode,r.id,r.player,i));
    const name=String(first(p.name,r.player,r.name,p.fullName,`${p.firstName??''} ${p.lastName??''}`.trim())).trim();
    const a=adv.get(id)||adv.get(String(first(r.player,name)))||{};
    const pts=metric(r,['pointsScored','points','pts','averagePoints']);
    const games=metric(r,['gamesPlayed','games']);
    const fgm=metric(r,['fieldGoalsMade','fieldGoalsScored']);
    const fga=metric(r,['fieldGoalsAttempted']);
    const m2=metric(r,['twoPointersMade','twoPointsMade','twoPointersScored']);
    const a2=metric(r,['twoPointersAttempted','twoPointsAttempted']);
    const m3=metric(r,['threePointersMade','threePointsMade','threePointersScored']);
    const a3=metric(r,['threePointersAttempted','threePointsAttempted']);
    const ftm=metric(r,['freeThrowsMade','freeThrowsScored']);
    const fta=metric(r,['freeThrowsAttempted']);
    const efg=first(percent(a.effectiveFieldGoalPercentage),percent(a.efgPercentage),percent(a.efg),fga?((fgm??((m2??0)+(m3??0)))+.5*(m3??0))/fga*100:null,(a2+a3)>0?((m2??0)+1.5*(m3??0))/(a2+a3)*100:null);
    const ts=first(percent(a.trueShootingPercentage),percent(a.tsPercentage),percent(a.ts),((a2??0)+(a3??0)+.44*(fta??0))>0?pts/(2*((a2??0)+(a3??0)+.44*(fta??0)))*100:null);
    return {id,name,team:String(first(r.clubName,r.teamName,r.team,r.club?.name,p.teamName,'—')),teamCode:String(first(r.clubCode,r.teamCode,r.club?.code,'')).toUpperCase(),position:str(r,'position')||'—',games,mins:metric(r,['minutesPlayed','minutes']),pts,reb:metric(r,['totalRebounds','rebounds','reb']),ast:metric(r,['assistances','assists','ast']),stl:metric(r,['steals']),blk:metric(r,['blocks','blocksMade']),tov:metric(r,['turnovers']),pir:metric(r,['valuation','performanceIndexRating','pir']),ts,efg,usg:first(percent(a.usagePercentage),percent(a.usageRate),percent(a.usage)),ortg:metric(a,['offensiveRating','offRating']),drtg:metric(a,['defensiveRating','defRating']),source:'EuroLeague v3',kind:'season'};
  }).filter(x=>x.name&&x.name!=='[object Object]'&&x.name!=='undefined'&&x.name!=='—');
}
export function euroTeams(raw,rawAdvanced){
  const adv=unwrap(rawAdvanced,'teams');const aMap=new Map(adv.map(x=>[String(first(x.clubCode,x.teamCode,x.team?.code,x.club?.code,x.team,x.name)),x]));
  return unwrap(raw,'teams').map((r,i)=>{
    const t=r.team??r.club??{}, o=typeof t==='object'?t:{};
    const code=String(first(r.clubCode,r.teamCode,o.code,r.code,'T'+i));
    const a=aMap.get(code)||aMap.get(String(first(r.team,r.club,r.teamName)))||{};
    const games=metric(r,['gamesPlayed','games']);
    const pointsFor=metric(r,['pointsScored','points','avgPoints','pointsFor']);
    const pointsAgainst=metric(r,['pointsAgainst','opponentPoints','pointsConceded']);
    const wins=metric(r,['gamesWon','wins']);
    const losses=metric(r,['gamesLost','losses']);
    const offRtg=metric(a,['offensiveRating','offRating','offensiveEfficiency']);
    const defRtg=metric(a,['defensiveRating','defRating','defensiveEfficiency']);
    const pace=metric(a,['pace','possessionsPerGame']);
    return {id:code,code,name:String(first(o.name,r.teamName,r.clubName,r.name,t,'—')),wins,losses,games,pointsFor,pointsAgainst,offRtg,defRtg,pace,netRtg:offRtg!==null&&defRtg!==null?offRtg-defRtg:metric(a,['netRating']),efg:percent(first(a.effectiveFieldGoalPercentage,a.efg)),tov:percent(first(a.turnoverPercentage,a.turnoverRate)),oreb:percent(first(a.offensiveReboundPercentage,a.offensiveReboundRate)),ftr:percent(first(a.freeThrowRate,a.freeThrowRatio)),source:'EuroLeague v3'};
  }).filter(x=>x.name&&x.name!=='[object Object]');
}
export function euroGames(raw){
  return unwrap(raw,'games').map((r,i)=>{
    const home=r.home??r.local??r.localTeam??r.homeTeam??{},away=r.away??r.road??r.roadTeam??r.awayTeam??{};
    const obj=(t)=>typeof t==='object'&&t!==null?t:{name:String(t??'')};
    const h=obj(home),a=obj(away);
    const hs=first(r.homeScore,r.localScore,r.home?.score,r.local?.score,r.score?.home);
    const as=first(r.awayScore,r.roadScore,r.away?.score,r.road?.score,r.score?.away);
    const d=first(r.date,r.gameDate,r.startDate,r.startDateTime,r.dateTime);
    const hn=String(first(h.name,h.clubName,h.teamName,h.code,r.homeTeamName,r.localTeamName,'Home'));
    const an=String(first(a.name,a.clubName,a.teamName,a.code,r.awayTeamName,r.roadTeamName,'Away'));
    return {id:String(first(r.gameCode,r.code,r.id,i)),date:d??null,home:hn,away:an,homeCode:String(first(h.code,h.clubCode,r.homeClubCode,'')),awayCode:String(first(a.code,a.clubCode,r.awayClubCode,'')),homeScore:N(hs),awayScore:N(as),status:str(r,'status')||str(r,'gameStatus')||'scheduled'};
  }).filter(g=>g.home!=='Home'||g.away!=='Away');
}
export function nbaTeams(raw,standings){
  const fromTeams=array(raw?.sports?.[0]?.leagues?.[0]?.teams).map(x=>x.team??x);
  const ids=new Map(fromTeams.map(x=>[String(x.id),x]));
  const entries=[];
  function recurse(x){if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(recurse);return;}if(x.team&&x.stats||x.team&&x.statistics)entries.push(x);else if(x.entries||x.children||x.groups)recurse(x.entries??x.children??x.groups);else if(x.standings)recurse(x.standings);}
  recurse(standings?.children??standings?.standings??standings);
  const byId=new Map(entries.map(e=>[String(first(e.team?.id,e.id)),e]));
  return fromTeams.map(x=>{
    const e=byId.get(String(x.id))??{};
    const stats=array(e.stats??e.statistics);
    const stat=(...names)=>{const s=stats.find(v=>names.some(n=>String(first(v.name,v.abbreviation,v.displayName,'')).toLowerCase()===n.toLowerCase()));return N(first(s?.value,s?.displayValue));};
    const wins=stat('wins','W'),losses=stat('losses','L');
    const games=wins!==null&&losses!==null?wins+losses:null;
    const pointsFor=stat('avgPointsFor','pointsFor','ppg','avgPoints');
    const pointsAgainst=stat('avgPointsAgainst','pointsAgainst','oppPointsPerGame','opg');
    return {id:String(x.id),code:String(x.abbreviation??''),name:String(x.displayName??x.name??x.abbreviation),logo:x.logos?.[0]?.href??null,color:/^[a-fA-F0-9]{6}$/.test(x.color??'')?'#'+x.color:null,wins,losses,games,pointsFor,pointsAgainst,offRtg:null,defRtg:null,netRtg:null,pace:null,efg:null,tov:null,oreb:null,ftr:null,source:'ESPN standings'};
  });
}
function findStat(obj,keys){if(!obj)return null;for(const k of keys){const v=first(obj[k],obj.stats?.[k]);if(v!==undefined)return N(v);}return null;}
export function nbaPlayers(raw){
  let list=unwrap(raw,'athletes');
  if(!list.length){list=array(raw?.leaders).flatMap(l=>array(l.leaders));}
  if(!list.length){list=array(raw?.categories).flatMap(c=>array(c.leaders));}
  return list.map((a,i)=>{
    const p=a.athlete??a.player??a;
    const stats=a.stats??a.statistics??{};
    const cats=array(stats?.categories??a.categories);
    const map=Array.isArray(stats)?{}:{...stats};
    for(const s of array(stats))map[s.name??s.abbreviation]=first(s.value,s.displayValue);
    for(const c of cats)for(const s of array(c.stats))map[s.name??s.abbreviation]=first(s.value,s.displayValue);
    const val=(...aliases)=>findStat(map,aliases);
    const name=String(first(p.displayName,p.fullName,p.name,p.firstName?`${p.firstName} ${p.lastName??''}`:undefined,''));
    return {id:String(first(p.id,a.id,i)),name,team:String(first(p.team?.displayName,p.team?.name,a.team?.name,p.team?.abbreviation,'—')),teamCode:String(first(p.team?.abbreviation,a.team?.abbreviation,'')),position:String(first(p.position?.abbreviation,p.position?.name,'—')),games:val('gamesPlayed','GP'),mins:val('avgMinutes','minutes'),pts:first(val('avgPoints','pointsPerGame','points','offensive.avgPoints'),N(a.value)),reb:val('avgRebounds','reboundsPerGame','rebounds'),ast:val('avgAssists','assistsPerGame','assists'),stl:val('avgSteals','stealsPerGame'),blk:val('avgBlocks','blocksPerGame'),tov:val('avgTurnovers','turnoversPerGame'),pir:null,ts:val('trueShootingPercentage'),efg:val('effectiveFieldGoalPercentage'),usg:val('usageRate'),ortg:null,drtg:null,source:'ESPN',kind:'season'};
  }).filter(p=>p.name&&p.name!=='undefined'&&p.name!=='[object Object]');
}
export function nbaGames(raw){return array(raw?.events).map(e=>{const c=array(e.competitions)[0]??{}, cs=array(c.competitors);const h=cs.find(x=>x.homeAway==='home')??{},a=cs.find(x=>x.homeAway==='away')??{};return {id:String(e.id),date:e.date,home:h.team?.displayName??'Home',away:a.team?.displayName??'Away',homeCode:h.team?.abbreviation??'',awayCode:a.team?.abbreviation??'',homeScore:N(h.score),awayScore:N(a.score),status:String(e.status?.type?.description??e.status?.type?.name??'Scheduled')};});}
export function computeTeamRatingsFromGames(teams,games,league){
 const min=league==='nba'?78:54;const played=games.filter(g=>g.homeScore!==null&&g.awayScore!==null);
 return teams.map(t=>{
   const mine=played.filter(g=>g.homeCode===t.code||g.awayCode===t.code||g.home===t.name||g.away===t.name);
   if(mine.length<1)return t;
   let forSum=0,againstSum=0,won=0;for(const g of mine){const home=g.homeCode===t.code||g.home===t.name;const me=home?g.homeScore:g.awayScore;const opp=home?g.awayScore:g.homeScore;forSum+=me;againstSum+=opp;if(me>opp)won++;}
   return {...t,pointsFor:t.pointsFor??forSum/mine.length,pointsAgainst:t.pointsAgainst??againstSum/mine.length,wins:t.wins??won,losses:t.losses??(mine.length-won),games:t.games??mine.length,sampleGames:mine.length};
 });
}
export function nbaPublicPlayers(basic,advanced){
  const base=unwrap(basic,'data');const adv=unwrap(advanced,'data');
  const key=r=>String(first(r.playerId,r.playerName,r.id,''))+'|'+String(r.team??'');
  const amap=new Map(adv.map(a=>[key(a),a]));
  return base.map((r,i)=>{
    const a=amap.get(key(r))??adv.find(v=>v.playerId===r.playerId&&v.season===r.season)??{};
    const gp=num(r,'games'),m=num(r,'minutesPg'),pts=num(r,'points');
    const ts=percent(first(a.tsPercent,a.trueShootingPercentage));
    return {id:String(first(r.playerId,r.id,i)),name:String(first(r.playerName,r.name,'')),team:String(first(r.team,'—')),teamCode:String(first(r.team,'')),position:String(first(r.position,'—')),games:gp,mins:m,pts,reb:num(r,'totalRb'),ast:num(r,'assists'),stl:num(r,'steals'),blk:num(r,'blocks'),tov:num(r,'turnovers'),pir:null,ts,efg:percent(r.effectFgPercent),usg:percent(a.usagePercent),ortg:null,drtg:null,per:num(a,'per'),bpm:num(a,'box'),vorp:num(a,'vorp'),ws:num(a,'winShares'),source:'NBA-Go API (unofficial)',kind:'season'};
  }).filter(p=>p.name);
}
