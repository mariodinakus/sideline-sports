// COURTSIDE IQ — zero-dependency Node server for Render (or any Node host).
// Serves the static app and runs the Vercel-style handlers in /api as HTTP routes.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const hidden=/^\/(api|tests|node_modules|\.git)(\/|$)|^\/(server\.js|package\.json|package-lock\.json|render\.yaml|vercel\.json|README\.md)$/i;

const handlers=new Map();
async function handlerFor(name){
 if(!/^[a-z0-9_-]+$/i.test(name))return null;
 if(!handlers.has(name)){
  try{handlers.set(name,(await import(pathToFileURL(path.join(root,'api',name+'.js')).href)).default)}
  catch{handlers.set(name,null)}
 }
 return handlers.get(name);
}
function shim(res){            // minimal Express-like helpers the handlers expect
 res.status=code=>{res.statusCode=code;return res};
 res.json=body=>{if(!res.getHeader('Content-Type'))res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));return res};
 return res;
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  const pathname=decodeURIComponent(url.pathname);
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(pathname==='/healthz'){res.setHeader('Content-Type','text/plain');return res.end('ok')}
  if(pathname.startsWith('/api/')){
   const fn=await handlerFor(pathname.slice(5));
   if(!fn){res.statusCode=404;res.setHeader('Content-Type','application/json');return res.end('{"error":"Unknown endpoint"}')}
   req.query=Object.fromEntries(url.searchParams.entries());
   return await fn(req,shim(res));
  }
  if(hidden.test(pathname)){res.statusCode=404;return res.end('Not found')}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.statusCode=403;return res.end('Forbidden')}
  const body=await fs.readFile(file);
  res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');
  res.setHeader('Cache-Control',path.extname(file)==='.html'?'no-cache':'public, max-age=300');
  res.end(body);
 }catch(error){
  if(error?.code==='ENOENT'||error?.code==='EISDIR'){res.statusCode=404;return res.end('Not found')}
  console.error(error);if(!res.headersSent){res.statusCode=500;res.setHeader('Content-Type','application/json')}res.end('{"error":"Server error"}');
 }
});
server.listen(port,'0.0.0.0',()=>console.log(`COURTSIDE IQ listening on :${port}`));
