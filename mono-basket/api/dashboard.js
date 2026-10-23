// Vercel Serverless Function — the same forecasting backend as Render.
import {dashboard,isoOk} from '../lib/dashboard-core.js';
const send=(res,status,value)=>{
 res.statusCode=status;
 res.setHeader('content-type','application/json; charset=utf-8');
 res.setHeader('cache-control','no-store');
 res.setHeader('x-content-type-options','nosniff');
 res.end(JSON.stringify(value));
};
export default async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const url=new URL(req.url||'/', 'http://localhost');
 const day=url.searchParams.get('date')||new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!isoOk(day)||Math.abs(Date.parse(day+'T12:00:00Z')-Date.now())>366*86400000) return send(res,400,{error:'Choose a valid date within one year'});
 try{return send(res,200,await dashboard(day))}
 catch(e){console.error('MONO BASKET dashboard error:',String(e?.message||e).slice(0,200));return send(res,502,{error:'Data temporarily unavailable'})}
}
