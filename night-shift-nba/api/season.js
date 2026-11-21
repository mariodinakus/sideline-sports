const {simulate}=require('../lib/season-model');
const ROOT='https://nba-atlas.vercel.app';
async function get(path){let r=await fetch(ROOT+path,{signal:AbortSignal.timeout(19000),headers:{accept:'application/json'}});if(!r.ok)throw Error('Upstream HTTP '+r.status);return r.json()}
module.exports=async(req,res)=>{try{const now=new Date(),year=now.getUTCFullYear()+(now.getUTCMonth()>=6?1:0);
 const paths=['/api/data?type=standings','/api/schedule','/api/power','/api/data?type=injuries','/api/markets?type=title','/api/history?type=standings&year='+(year-1),'/api/history?type=standings&year='+(year-2)];
 const a=await Promise.allSettled(paths.map(get)),v=i=>a[i].status==='fulfilled'?a[i].value:null;
 const s=v(0),g=v(1);if(!s||!g)throw Error('Required standings or schedule unavailable');
 const extras={power:v(2),injuries:v(3)?.data,markets:v(4),prior:[v(5)?.data,v(6)?.data].filter(Boolean)};
 const result=simulate(s.data,g,{extras});result.standingsAsOf=s.updatedAt||null;result.sourceStatus=paths.map((path,i)=>({path,available:a[i].status==='fulfilled'}));
 res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=600');res.status(200).json(result)
 }catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}};
