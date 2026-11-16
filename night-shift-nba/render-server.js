'use strict';
/* Standalone Render adapter for NIGHT SHIFT NBA.
 * Uses Node's built-in HTTP server and the existing Vercel API handler modules.
 * Run with: node night-shift-nba/render-server.js
 */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {URL}=require('node:url');

const ROOT=__dirname;
const PORT=Number(process.env.PORT)||10000;
const API_NAMES=new Set(['data','history','advanced','goat','power','intel','markets','sideline']);
const STATIC_FILES=new Set(['index.html','style.css','app.js','atlas-data.js','icon.svg','manifest.webmanifest','sw.js']);
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.apk':'application/vnd.android.package-archive'};
function sendJSON(res,code,data){
 if(res.writableEnded)return;
 res.statusCode=code;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.end(JSON.stringify(data));
}
function handleAPI(req,res,pathname,searchParams){
 const name=pathname.slice('/api/'.length);
 if(!API_NAMES.has(name))return sendJSON(res,404,{error:'Unknown API'});
 let mod;
 try{mod=require(path.join(ROOT,'api',name+'.js'))}
 catch(e){console.error('Failed to load API '+name,e);return sendJSON(res,500,{error:'API unavailable'})}
 const query=Object.fromEntries(searchParams.entries());
 const adapter={
  method:req.method,url:req.url,headers:req.headers,query,
 };
 const response={
  status(code){res.statusCode=code;return this},
  setHeader(name,value){if(!res.headersSent)res.setHeader(name,value);return this},
  json(data){sendJSON(res,res.statusCode||200,data);return this},
  end(text){if(!res.writableEnded)res.end(text);return this},
 };
 Promise.resolve().then(()=>mod(adapter,response)).catch(e=>{
  console.error('API '+name+' error',e);
  if(!res.headersSent)sendJSON(res,502,{error:'Remote data unavailable'});
  else if(!res.writableEnded)res.end();
 });
}
function handleStatic(req,res,pathname){
 let name=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
 try{name=decodeURIComponent(name)}
 catch{return sendJSON(res,400,{error:'Invalid path'})}
 if(!STATIC_FILES.has(name))return sendJSON(res,404,{error:'Not found'});
 const filename=path.join(ROOT,name);
 fs.stat(filename,(err,stat)=>{
  if(err||!stat.isFile())return sendJSON(res,404,{error:'Not found'});
  res.statusCode=200;
  const ext=path.extname(filename);
  res.setHeader('Content-Type',TYPES[ext]||'application/octet-stream');
  res.setHeader('Cache-Control',ext==='.html'||name==='sw.js'?'no-store':'public, max-age=180, must-revalidate');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(ext==='.apk')res.setHeader('Content-Disposition','attachment; filename="night-shift-nba.apk"');
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(filename).on('error',e=>{
   console.error('Static read error',e);
   if(!res.headersSent)sendJSON(res,500,{error:'Could not read file'});
   else res.destroy();
  }).pipe(res);
 });
}
const server=http.createServer((req,res)=>{
 const method=req.method||'GET';
 if(!['GET','HEAD'].includes(method))return sendJSON(res,405,{error:'Method not allowed'});
 let target;
 try{target=new URL(req.url||'/', 'http://localhost')}
 catch{return sendJSON(res,400,{error:'Invalid URL'})}
 const pathname=target.pathname;
 if(pathname==='/healthz')return sendJSON(res,200,{status:'ok',app:'NIGHT SHIFT NBA',runtime:'Render Node'});
 if(pathname.startsWith('/api/'))return handleAPI(req,res,pathname,target.searchParams);
 return handleStatic(req,res,pathname);
});
server.listen(PORT,'0.0.0.0',()=>console.log('NIGHT SHIFT NBA Render preview listening on '+PORT));
