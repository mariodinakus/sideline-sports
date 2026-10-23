/** MONO BASKET server: Render runtime + shared forecasting backend. */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dashboard,isoOk} from './lib/dashboard-core.js';
const ROOT=dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const smallReason=e=>String(e?.message||e||'unavailable').slice(0,110);
function send(res,status,obj){
 const body=JSON.stringify(obj);
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',
  'vary':'accept'});res.end(body);
}
const assets=new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/style.css','style.css']]);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/', 'http://localhost');
  if(req.method!=='GET'){send(res,405,{error:'Method not allowed'});return}
  if(url.pathname==='/health'){send(res,200,{ok:true,service:'MONO BASKET',time:new Date().toISOString()});return}
  if(url.pathname==='/api/dashboard'){
   const day=url.searchParams.get('date')||new Date().toISOString().slice(0,10);
   if(!isoOk(day)||Math.abs(Date.parse(day+'T12:00:00Z')-Date.now())>366*86400000){send(res,400,{error:'Choose a date within one year'});return}
   send(res,200,await dashboard(day));return
  }
  const file=assets.get(url.pathname);
  if(!file){send(res,404,{error:'Page not found'});return}
  const data=await readFile(join(ROOT,file));
  const type=mime[file.slice(file.lastIndexOf('.'))]||'application/octet-stream';
  res.writeHead(200,{'content-type':type,'cache-control':file==='index.html'?'no-store':'public, max-age=180',
   'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; base-uri 'none'; object-src 'none'"});
  res.end(data);
 }catch(e){console.error('Request error',smallReason(e));send(res,500,{error:'Temporary data error',detail:smallReason(e)})}
}).listen(PORT,'0.0.0.0',()=>console.log('MONO BASKET listening on '+PORT));
