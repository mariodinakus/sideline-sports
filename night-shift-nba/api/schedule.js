/* Remaining 2026-27 NBA regular-season schedule (ESPN public, unofficial). Used by the playoff-odds simulation. */
const B='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
async function get(u,ms=12000){const r=await fetch(u,{signal:AbortSignal.timeout(ms),headers:{accept:'application/json'}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return r.json()}
const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,'');
module.exports=async(req,res)=>{
 try{
  const now=new Date(),seasonEnd=new Date(Date.UTC(now.getUTCFullYear()+(now.getUTCMonth()>=6?1:0),3,13));
  const games=new Map();
  const push=e=>{const c=e.competitions?.[0]||{},st=e.status?.type?.state||c.status?.type?.state||'pre',type=e.season?.type??c.type?.id;
   if(st==='post'||String(type)==='3')return;const cs=c.competitors||[],h=cs.find(x=>x.homeAway==='home'),a=cs.find(x=>x.homeAway==='away');
   const hid=String(h?.team?.id||h?.id||''),aid=String(a?.team?.id||a?.id||'');if(e.id&&hid&&aid)games.set(String(e.id),{id:String(e.id),date:e.date,home:hid,away:aid})};
  let mode='range';
  try{const j=await get(`${B}/scoreboard?dates=${ymd(now)}-${ymd(seasonEnd)}&limit=1500`);(j.events||[]).forEach(push)}catch{}
  if(games.size<150){
   mode='team-schedules';
   const t=await get(`${B}/teams`);const ids=(t.sports?.[0]?.leagues?.[0]?.teams||[]).map(x=>String(x.team?.id)).filter(Boolean);
   for(let i=0;i<ids.length;i+=6){const r=await Promise.allSettled(ids.slice(i,i+6).map(id=>get(`${B}/teams/${id}/schedule`,9000)));r.forEach(x=>{if(x.status==='fulfilled')(x.value.events||[]).forEach(push)})}
  }
  const list=[...games.values()].filter(g=>new Date(g.date)>=new Date(now.getTime()-6*3600e3)).sort((a,b)=>a.date.localeCompare(b.date));
  res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=43200');
  res.status(200).json({source:'ESPN public schedule (unofficial)',mode,count:list.length,games:list,updatedAt:new Date().toISOString()});
 }catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}
};
