const {simulate}=require('../lib/season-model');
const ROOT='https://nba-atlas.vercel.app';
async function get(path){let r=await fetch(ROOT+path,{signal:AbortSignal.timeout(18000),headers:{accept:'application/json'}});if(!r.ok)throw Error('Upstream HTTP '+r.status);return r.json()}
module.exports=async(req,res)=>{try{const [s,g]=await Promise.all([get('/api/data?type=standings'),get('/api/schedule')]);const result=simulate(s.data,g);result.standingsAsOf=s.updatedAt||null;res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=600');res.status(200).json(result)}catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}};
