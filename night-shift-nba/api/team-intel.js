/* NBA ATLAS — team intelligence and ESPN transaction feed. Public ESPN endpoints; no synthetic records. */
const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const WEB='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
const SEASON=2027;
async function pull(url,ms=6500){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json','User-Agent':'NBA-Atlas/1.0 public basketball data viewer'}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return await r.json()}
  finally{clearTimeout(timer)}
}
const txt=v=>v===null||v===undefined?'':typeof v==='string'?v:typeof v==='number'?String(v):v.displayName||v.name||v.description||v.value||'';
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace('%','').replace(',','.'));return Number.isFinite(n)?n:null};
const pct=v=>{const n=num(v);return n===null?null:(Math.abs(n)<=1.01?n*100:n)};
const img=v=>typeof v==='string'&&v.startsWith('https://')?v:null;
function athlete(a){
  const x=a?.athlete||a?.player||a||{},p=x.position||{};
  return{id:String(x.id||''),name:x.displayName||x.fullName||x.name||'',position:p.abbreviation||p.name||txt(p),jersey:x.jersey||'',headshot:img(x.headshot?.href)||img(x.headshot)||null,status:txt(x.status?.type)||txt(x.status?.description)||txt(x.status)||''};
}
function mapLimit(items,limit,fn){
  const out=new Array(items.length);let next=0;
  return Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;try{out[i]=await fn(items[i],i)}catch(e){out[i]=null}}})).then(()=>out);
}
function statMap(raw){
  const root=raw?.statistics||raw?.stats?.statistics||raw?.stats||raw||{},values={};
  if(Array.isArray(root.names)&&Array.isArray(root.splits)&&root.splits.length){
    const split=root.splits.find(x=>/regular/i.test(txt(x.displayName||x.name))&&(!x.season?.year||Number(x.season.year)===SEASON))||root.splits.find(x=>Number(x.season?.year)===SEASON)||root.splits[0];
    const arr=split?.stats||split?.values||[];
    root.names.forEach((k,i)=>{values[k]=arr[i]??null});
  }
  const cats=root.categories||raw?.categories||raw?.results?.stats?.categories||[];
  for(const c of cats)for(const s of c.stats||[])if(s?.name)values[s.name]=s.displayValue??s.value??null;
  if(root.names&&Array.isArray(root.values))root.names.forEach((k,i)=>{if(values[k]===undefined)values[k]=root.values[i]});
  return values;
}
function seasonStats(raw){
  const v=statMap(raw),get=(...keys)=>{for(const k of keys)if(v[k]!==undefined&&v[k]!==null&&v[k]!=='')return num(v[k]);return null};
  const gp=get('gamesPlayed','GP'),min=get('avgMinutes','minutes','MIN'),pts=get('avgPoints','PTS'),reb=get('avgRebounds','REB'),ast=get('avgAssists','AST'),stl=get('avgSteals','STL'),blk=get('avgBlocks','BLK'),tov=get('avgTurnovers','TOV');
  const fgm=get('avgFieldGoalsMade','fieldGoalsMade'),fga=get('avgFieldGoalsAttempted','fieldGoalsAttempted'),tpm=get('avgThreePointFieldGoalsMade','threePointFieldGoalsMade'),fta=get('avgFreeThrowsAttempted','freeThrowsAttempted');
  let fg=pct(get('fieldGoalPct','fieldGoalPercentage','FG%')),three=pct(get('threePointFieldGoalPct','threePointFieldGoalPercentage','3P%')),ft=pct(get('freeThrowPct','freeThrowPercentage','FT%'));
  if(fg===null&&fgm!==null&&fga>0)fg=fgm/fga*100;
  if(three===null&&tpm!==null){const a=get('avgThreePointFieldGoalsAttempted','threePointFieldGoalsAttempted');if(a>0)three=tpm/a*100}
  const efg=fgm!==null&&tpm!==null&&fga>0?(fgm+.5*tpm)/fga*100:null;
  const ts=pts!==null&&fga!==null&&fta!==null&&fga+.44*fta>0?pts/(2*(fga+.44*fta))*100:null;
  const any=[gp,min,pts,reb,ast,stl,blk,tov,fg,three,ft,efg,ts].some(x=>x!==null);
  return any?{gp,min,pts,reb,ast,stl,blk,tov,fg,three,ft,efg,ts}:null;
}
function boxStats(labels,values){
  const m={};(labels||[]).forEach((k,i)=>{m[String(k).toUpperCase().replace(/[^A-Z0-9]/g,'')]=values?.[i]??null});
  const get=(...keys)=>{for(const k of keys){const v=m[k];if(v!==null&&v!==undefined&&v!=='')return v}return null};
  const fraction=v=>{if(typeof v!=='string')return null;const z=v.match(/(\d+)\s*[-/]\s*(\d+)/);return z&&Number(z[2])?Number(z[1])/Number(z[2])*100:null};
  return{min:get('MIN','MINUTES'),pts:num(get('PTS','POINTS')),reb:num(get('REB','REBOUNDS')),ast:num(get('AST','ASSISTS')),stl:num(get('STL','STEALS')),blk:num(get('BLK','BLOCKS')),tov:num(get('TO','TOV','TURNOVERS')),fg:fraction(get('FG','FGM-A')),three:fraction(get('3PT','3PM-A')),ft:fraction(get('FT','FTM-A'))};
}
function extractTransactions(raw){
  if(!raw)return{rows:[],refs:[]};
  let rows=[];
  function walk(x,depth){
    if(depth>5||!x)return;
    if(Array.isArray(x)){rows=rows.concat(x);return}
    if(typeof x!=='object')return;
    for(const k of ['items','transactions','events','results','entries','data'])if(Array.isArray(x[k])&&x[k].length){rows=rows.concat(x[k]);return}
    for(const v of Object.values(x))if(v&&typeof v==='object')walk(v,depth+1);
  }
  walk(raw,0);
  const refs=rows.filter(x=>x&&x.$ref).slice(0,70);
  return{rows:rows.filter(x=>x&&!x.$ref),refs};
}
function transactionRow(x,scopeTeamId){
  if(!x||typeof x!=='object')return null;
  const typeObj=x.transactionType||x.type||x.category||x.kind||'';
  const type=txt(typeObj.displayName||typeObj.name||typeObj.description||typeObj);
  const description=txt(x.description||x.headline||x.displayName||x.text||x.summary||x.shortText||x.details?.description||x.note||x.name);
  const people=x.athletes||x.players||x.participants||(x.athlete?[x.athlete]:[]);
  const playerRows=(Array.isArray(people)?people:[people]).filter(Boolean).map(p=>athlete(p)).filter(p=>p.name);
  const teamItems=[...(Array.isArray(x.teams)?x.teams:[]),x.team,x.fromTeam,x.toTeam,x.sourceTeam,x.destinationTeam].filter(Boolean);
  const teams=teamItems.map(t=>({id:String(t.id||t.teamId||''),name:txt(t.displayName||t.name||t.abbreviation||t)})).filter(t=>t.name);
  const teamIds=[...new Set(teams.map(t=>t.id).filter(Boolean).concat(scopeTeamId?[String(scopeTeamId)]:[]))];
  const textValue=description||([playerRows.map(p=>p.name).join(', '),type].filter(Boolean).join(' · '));
  if(!textValue)return null;
  const hay=(type+' '+textValue).toLowerCase();
  const category=/trade|traded|trade to|swap|exchange/.test(hay)?'TRADE':/sign|signed|waiv|release|claim|contract|10.day|assign|convert/.test(hay)?'MOVE':'TRANSACTION';
  let date=x.date||x.transactionDate||x.created||x.createdAt||x.timestamp||x.dateCreated||'';
  if(typeof date==='object')date=date.date||date.value||date.iso||'';
  const url=x.links?.web?.href||x.links?.source?.href||x.link?.href||x.url||'';
  return{id:String(x.id||x.uid||x.guid||textValue+'-'+date),date:String(date||''),type:type||category,category,description:textValue,players:playerRows.map(p=>p.name),playerIds:playerRows.map(p=>p.id).filter(Boolean),teams,teamIds,url:typeof url==='string'&&url.startsWith('https://')?url:'',source:'ESPN public transactions feed'};
}
async function transactionFeed(url,scopeTeamId){
  const raw=await pull(url,7000),parts=extractTransactions(raw);
  const resolved=await mapLimit(parts.refs,8,async r=>{
    const u=new URL(r.$ref);if(!/(^|\.)espn\.com$/i.test(u.hostname))return null;
    return pull(r.$ref,4500);
  });
  const list=parts.rows.concat(resolved.filter(Boolean));
  const seen=new Set();
  return list.map(x=>transactionRow(x,scopeTeamId)).filter(x=>x&&!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
}
function rosterList(raw){
  const list=(raw?.athletes||raw?.players||[]).flatMap(x=>Array.isArray(x.items)?x.items:Array.isArray(x.athletes)?x.athletes:[x]);
  return list.map(athlete).filter(p=>p.id&&p.name);
}
function completedEvents(raw,id){
  return(raw?.events||raw?.items||[]).filter(e=>{
    const comp=e.competitions?.[0]||{},has=(comp.competitors||[]).some(c=>String(c.team?.id||'')===String(id));
    const status=e.status?.type||{};
    return has&&(status.completed===true||status.state==='post'||/final/i.test(txt(status.detail||status.description)));
  }).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
}
function lastGamePlayers(summary,id){
  const groups=summary?.boxscore?.players||[],out=new Map();
  for(const g of groups){
    if(String(g.team?.id||'')!==String(id))continue;
    for(const sg of g.statistics||[])for(const row of sg.athletes||[]){
      const p=athlete(row.athlete||row);if(!p.id)continue;
      const prior=out.get(p.id)||{};
      out.set(p.id,{...prior,...p,starter:!!row.starter,gameStats:boxStats(sg.labels||sg.names,row.stats||[])});
    }
  }
  return[...out.values()];
}
async function teamData(id){
  if(!/^\d{1,6}$/.test(String(id||'')))throw Error('Invalid team ID');
  const urls=[ROOT+'/teams/'+id+'/roster',ROOT+'/teams/'+id+'/schedule?season='+SEASON,ROOT+'/teams/'+id+'/depthcharts',ROOT+'/teams/'+id+'/transactions'];
  const base=await Promise.allSettled(urls.map(u=>pull(u,6500)));
  const rosterRaw=base[0].status==='fulfilled'?base[0].value:null;
  const scheduleRaw=base[1].status==='fulfilled'?base[1].value:null;
  const depthRaw=base[2].status==='fulfilled'?base[2].value:null;
  const txRaw=base[3].status==='fulfilled'?base[3].value:null;
  if(!rosterRaw&&!scheduleRaw)throw Error('ESPN team roster and schedule are unavailable');
  const roster=rosterList(rosterRaw);
  const statResults=await mapLimit(roster,10,async p=>{
    const raw=await pull(WEB+'/athletes/'+p.id+'/stats?season='+SEASON+'&seasontype=2',5500);
    return seasonStats(raw);
  });
  roster.forEach((p,i)=>{p.stats=statResults[i]||null;p.statsSeason='2026–27'});
  let lastGame=null,starters=[];
  const events=completedEvents(scheduleRaw,id);
  if(events.length){
    const e=events[0],summary=await pull(ROOT+'/summary?event='+encodeURIComponent(e.id),6500);
    const comp=e.competitions?.[0]||{},sides=comp.competitors||[],mine=sides.find(x=>String(x.team?.id||'')===String(id)),opponent=sides.find(x=>String(x.team?.id||'')!==String(id));
    const gamePlayers=lastGamePlayers(summary,id);
    starters=gamePlayers.filter(p=>p.starter).sort((a,b)=>{const order=['PG','SG','SF','PF','C'];return (order.indexOf(a.position)<0?99:order.indexOf(a.position))-(order.indexOf(b.position)<0?99:order.indexOf(b.position))});
    lastGame={id:String(e.id),date:e.date||'',name:e.name||'',status:txt(e.status?.type?.detail||e.status?.type?.shortDetail),opponent:opponent?.team?.displayName||opponent?.team?.name||'',homeAway:mine?.homeAway||'',startersCount:starters.length,boxScoreAvailable:gamePlayers.length>0};
  }
  let teamTransactions=[];
  if(txRaw){const parts=extractTransactions(txRaw);const resolved=await mapLimit(parts.refs,6,async r=>{const u=new URL(r.$ref);if(!/(^|\.)espn\.com$/i.test(u.hostname))return null;return pull(r.$ref,4500)});const seen=new Set();teamTransactions=parts.rows.concat(resolved.filter(Boolean)).map(x=>transactionRow(x,id)).filter(x=>x&&!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))}
  const depthAvailable=!!(depthRaw&&(depthRaw.depthchart||depthRaw.depthChart||depthRaw.depthcharts||depthRaw.items||depthRaw.positions));
  return{teamId:String(id),season:SEASON,roster,lastGame,starters,transactions:teamTransactions,depthChartAvailable:depthAvailable,availability:{roster:!!rosterRaw,schedule:!!scheduleRaw,depthChart:!!depthRaw,transactions:!!txRaw},updatedAt:new Date().toISOString(),sources:['ESPN public team roster','ESPN team schedule and game summary','ESPN athlete season statistics','ESPN team transactions']};
}
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  const q=req.query||{};
  try{
    if(q.type==='team'){const data=await teamData(q.id);res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');return res.status(200).json({data})}
    if(q.type==='transactions'){const transactions=await transactionFeed(ROOT+'/transactions?limit=100','');res.setHeader('Cache-Control','s-maxage=180, stale-while-revalidate=360');return res.status(200).json({data:{transactions,updatedAt:new Date().toISOString(),source:'ESPN public NBA transactions feed',note:'This feed contains ESPN-listed transactions only; rumors are not included.'}})}
    return res.status(400).json({error:'Unknown type'});
  }catch(e){res.setHeader('Cache-Control','no-store');return res.status(503).json({error:String(e.message||e),source:'ESPN public feeds'})}
};