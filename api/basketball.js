'use strict';
const {json,cached,send}=require('../lib/shared');
const {euroCode,euroSeason,euroMetricRow,euroPlayerRow,list}=require('../lib/basketball');
async function load(league,season){
 const c=euroCode(league),s=season||euroSeason(league);
 const params=`SeasonMode=Single&SeasonCode=${s}&statisticMode=PerGame`;
 const url=mode=>`https://api-live.euroleague.net/v3/competitions/${c}/statistics/teams/${mode}?${params}`;
 const raw=await Promise.allSettled([json(url('traditional'),9000),json(url('advanced'),9000),json(`https://api-live.euroleague.net/v3/competitions/${c}/statistics/players/traditional?${params}`,9000)]);
 const [traditional,advanced,players]=raw.map(r=>r.status==='fulfilled'?list(r.value):[]);
 const byId=new Map();for(const [array,kind] of [[traditional,'traditional'],[advanced,'advanced']])for(const r of array){const item=euroMetricRow(r);if(!item.id)continue;byId.set(item.id,{...(byId.get(item.id)||{}),...Object.fromEntries(Object.entries(item).filter(([k,v])=>v!==null&&v!==''||(k==='source')))});}
 const teams=[...byId.values()].sort((a,b)=>(b.ppg??-1)-(a.ppg??-1));
 const topPlayers=players.map(euroPlayerRow).filter(p=>p.name&&p.pts!==null).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,70);
 return {league,season:s,teams,players:topPlayers,meta:{source:'EuroLeague v3 public statistics',asOf:new Date().toISOString(),available:teams.length>0||topPlayers.length>0,teamCount:teams.length,playerCount:topPlayers.length,feedStatus:{traditional:raw[0].status,advanced:raw[1].status,players:raw[2].status}}};
}
module.exports=async function(req,res){if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});const q=req.query||Object.fromEntries(new URL(req.url,'http://local').searchParams);const league=String(q.league||'euro');if(!['euro','eurocup'].includes(league))return send(res,400,{error:'League not supported for advanced Euro stats'});const season=q.season&&new RegExp(`^${euroCode(league)}20[0-4][0-9]$`).test(String(q.season))?String(q.season):euroSeason(league);try{const result=await cached('basketball-'+league+'-'+season,600000,()=>load(league,season));return send(res,200,result);}catch{return send(res,503,{league,teams:[],players:[],meta:{available:false,source:'EuroLeague v3',error:'Source unavailable; no inferred statistics'}});}};
module.exports._test={load};
