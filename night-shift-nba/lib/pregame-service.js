'use strict';
const {predict}=require('./pregame-engine');
const BASE='https://nba-atlas.vercel.app';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const ymd=t=>new Date(t).toISOString().slice(0,10).replace(/-/g,'');
async function get(url,ms=13000){const r=await fetch(url,{signal:AbortSignal.timeout(ms),headers:{accept:'application/json'},next:{revalidate:75}});if(!r.ok)throw Error('Upstream '+r.status+' '+url.split('?')[0]);return r.json()}
const n=x=>x!=null&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
function game(e){
 const c=e.competitions?.[0]||{},t=e.status?.type||c.status?.type||{},cs=c.competitors||[];
 const side=type=>{const k=cs.find(x=>x.homeAway===type)?.team||{};return{id:String(k.id||''),abbr:k.abbreviation||'',name:k.displayName||k.name||'',logo:k.logo||k.logos?.[0]?.href||null}};
 return {id:String(e.id||''),date:e.date||'',state:t.state||'',home:side('home'),away:side('away')};
}
function past(e){const x=game(e);return{...x,ids:[x.home.id,x.away.id]}}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const now=Date.now(),from=ymd(now-4*86400000),to=ymd(now+3*86400000);
 try{
  const f=await Promise.allSettled([get(ESPN+'?dates='+from+'-'+to+'&limit=500',11500),get(BASE+'/api/power',13000),get(BASE+'/api/data?type=injuries',11000),get(BASE+'/api/intel?type=forecast',11000)]);
  const val=i=>f[i].status==='fulfilled'?f[i].value:null;
  const b=val(0);if(!b?.events?.length)throw Error('Scoreboard unavailable');
  const power=val(1),injuries=val(2)?.data,arch=val(3)?.data;
  const history=b.events.map(past).filter(g=>g.state==='post');
  const ledger=new Map((arch?.records||[]).map(r=>[String(r.id).split(':').pop(),r]));
  const events=b.events.map(game).filter(e=>e.state==='pre'&&Date.parse(e.date)>=now-300000&&Date.parse(e.date)<=now+72*3600000);
  const games=events.map(e=>predict(e,{power,injuries,ledger:ledger.get(e.id),history,ml:arch?.learning,now})).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));
  const refreshed={asOf:new Date(now).toISOString(),nextRefreshSeconds:120,freezeMinutes:5,source:'ESPN public scoreboard/power/injuries + Courtside IQ archived forecast',coverage:{
   scoreboard:true,power:!!power?.teams?.length,injuries:!!injuries?.teams?.length,lockedLedger:!!arch?.records?.length,ml:!!arch?.learning,
   games:games.length,live:games.filter(x=>x.state==='live').length,locked:games.filter(x=>x.state==='archive-only').length},
  ml:{active:!!arch?.learning?.active,status:arch?.learning?.status||'unavailable',samples:arch?.learning?.sample||0},games,
  disclaimer:'Read-time dynamic projection. Recomputes on requests every ~120 seconds while clients are open. Stops five minutes before tipoff. Global persistent final locked snapshots of this new model are not stored; only the original Courtside ledger is auditable.'};
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=30');
  res.status(200).json(refreshed);
 }catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}
};
