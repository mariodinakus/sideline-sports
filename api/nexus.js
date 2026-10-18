'use strict';
// Read-only NEXUS sports bridge. Consumes SIDELINE's existing public scores endpoint.
const BASE='https://sideline-sports-gilt.vercel.app';
let memo={at:0,value:null};
function athensDay(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const n=x=>parts.find(p=>p.type===x).value;return n('year')+n('month')+n('day')}
const blank=()=>({schema:'nexus.v1',appId:'sidelinesports',name:'SIDELINE',url:BASE,source:'SIDELINE / ESPN & EuroLeague public data',capabilities:['sports-scores','basketball-scores'],notifications:[],status:'unavailable',data:null});
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=60');if(memo.value&&Date.now()-memo.at<90000)return res.status(200).json(memo.value);
 const result=blank();
 try{
  const controller=new AbortController(),t=setTimeout(()=>controller.abort(),10500);let response;
  try{response=await fetch(`${BASE}/api/scores?date=${athensDay()}`,{signal:controller.signal,headers:{Accept:'application/json'},redirect:'error'})}finally{clearTimeout(t)}
  if(!response.ok)throw Error('Scores unavailable');const payload=await response.json();if(!Array.isArray(payload.matches)||payload.meta?.error)throw Error('Scores invalid');
  const games=payload.matches.filter(g=>g&&typeof g==='object');const live=games.filter(g=>g.state==='in');const liveBasket=live.filter(g=>g.sport==='basketball');
  result.status='ok';result.data={summary:live.length?`${live.length} live games across tracked competitions`:'No live games in the current feed',liveGames:live.length,basketballLive:liveBasket.length,scheduledOrFinished:games.length-live.length,asOf:payload.meta?.asOf||new Date().toISOString(),source:'ESPN/EuroLeague through SIDELINE; coverage varies'};
  result.notifications=[...liveBasket,...live.filter(g=>g.sport!=='basketball')].slice(0,4).map(g=>{const home=String(g.home?.name||'Home').slice(0,38),away=String(g.away?.name||'Away').slice(0,38);const hs=g.home?.score??'—',as=g.away?.score??'—';return {id:`live:${g.league}:${g.id}:${hs}-${as}`,title:`LIVE · ${home} ${hs}–${as} ${away}`,message:`${String(g.leagueName||g.league||'Sports').slice(0,55)} · ${String(g.status||g.clock||'in progress').slice(0,60)} · SIDELINE`,severity:'info',time:payload.meta?.asOf||new Date().toISOString()}});
 }catch{result.note='Live scores unavailable; no simulated or historical scores used as live notifications.'}
 memo={at:Date.now(),value:result};return res.status(200).json(result);
};