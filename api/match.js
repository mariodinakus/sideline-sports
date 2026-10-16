'use strict';
const {json,cached,send,firstHttpLink}=require('../lib/shared');
const {BY_ID}=require('../lib/leagues');
const {euroSeason,euroBase,euroBoxScore}=require('../lib/basketball');
const {fromTeamStats}=require('../lib/metrics');
function normalize(v){const comps=(v.header?.competitions||[])[0]?.competitors||[];const teams=comps.map(t=>({id:String(t.team?.id||''),name:t.team?.displayName||t.team?.name||'',score:t.score??'',logo:firstHttpLink(t.team?.logo)}));const box=(v.boxscore?.players||[]).map(group=>({team:group.team?.displayName||group.team?.name||'',categories:(group.statistics||[]).slice(0,4).map(c=>({name:c.name||'',labels:c.labels||c.names||[],athletes:(c.athletes||[]).map(a=>({name:a.athlete?.displayName||'',stats:a.stats||[],starter:!!a.starter}))}))}));const stats=(v.boxscore?.teams||[]).map(row=>({team:row.team?.displayName||'',items:(row.statistics||[]).slice(0,28).map(x=>({name:x.label||x.name||'',value:x.displayValue??x.value??''})),advanced:fromTeamStats(row.statistics)}));const quarters=comps.map(c=>({team:c.team?.displayName||c.team?.name||'',homeAway:c.homeAway||'',periods:(c.linescores||[]).map((p,i)=>({label:p.period?String(p.period):(i<4?'Q'+(i+1):'OT'+(i-3)),score:p.value??p.displayValue??null}))}));return {teams,stats,box,quarters,details:(v.header?.competitions||[])[0]?.status?.type?.detail||'',available:!!(stats.length||box.length||quarters.some(q=>q.periods.length))};}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const q=req.query||Object.fromEntries(new URL(req.url,'http://local').searchParams);
 const l=BY_ID[q.league],id=String(q.event||'');
 if(!l||!/^[0-9]{1,15}$/.test(id))return send(res,400,{error:'Unsupported fixture'});
 if(l.external==='euroleague'){
  const season=String(q.season||euroSeason(l.id));
  if(!new RegExp(`^[EU]20[0-4][0-9]$`).test(season)||season[0]!==l.slug)return send(res,400,{error:'Invalid season'});
  try{const raw=await cached(`euro-box-${season}-${id}`,60000,()=>json(`${euroBase(l.id,season)}/games/${id}/stats`,9500));
   return send(res,200,{league:l.title,event:id,season,...euroBoxScore(raw),asOf:new Date().toISOString()});
  }catch{return send(res,503,{available:false,error:'EuroLeague game statistics unavailable'});}
 }
 try{const result=await cached('match-v4-'+l.id+'-'+id,50000,async()=>({league:l.title,event:id,...normalize(await json(`https://site.api.espn.com/apis/site/v2/sports/${l.sport}/${l.slug}/summary?event=${id}`,9500)),asOf:new Date().toISOString()}));return send(res,200,result);
 }catch{return send(res,503,{available:false,error:'Game statistics unavailable from upstream'});}
};
module.exports._test={normalize,euroBoxScore};
