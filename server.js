'use strict';
// Optional local zero-dependency development server. Vercel deploys /api as serverless functions.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8'};
const port=Number(process.env.PORT||3000);
// Never expose backend sources, configuration files or credentials via the local server.
const BLOCKED_SEGMENTS=new Set(['api','tests','node_modules','.git','.github','private']);
const BLOCKED_FILES=new Set(['server.js','package.json','package-lock.json','vercel.json','render.yaml','README.md','.gitignore','.env','.env.local']);
function safeStaticPath(pathname){
 let segments;
 try{segments=decodeURIComponent(pathname).split('/').filter(Boolean);}catch{return false;}
 if(segments.some(s=>s==='.'||s==='..'||s.startsWith('.')||BLOCKED_SEGMENTS.has(s)||BLOCKED_FILES.has(s)))return false;
 const file=segments.at(-1)||'index.html';
 if(segments.length>0&&!/\.(html|js|css|svg|png|jpg|jpeg|webp|ico|webmanifest|json|txt)$/i.test(file))return false;
 return true;
}
http.createServer((req,res)=>{
 const parsed=new URL(req.url,`http://localhost:${port}`);
 res.setHeader('X-Content-Type-Options','nosniff');
 if(parsed.pathname==='/api/news'||parsed.pathname==='/api/scores'||parsed.pathname==='/api/markets'||parsed.pathname==='/api/teams'||parsed.pathname==='/api/standings'||parsed.pathname==='/api/match'||parsed.pathname==='/api/basketball'||parsed.pathname==='/api/translate'){
  req.query=Object.fromEntries(parsed.searchParams.entries());return require('.'+parsed.pathname+'.js')(req,res);
 }
 if(!safeStaticPath(parsed.pathname)){res.writeHead(404);return res.end('Not found');}
 const file=path.resolve(root,'.'+(parsed.pathname==='/'?'/index.html':parsed.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,contents)=>{if(error){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(contents);
 });
}).listen(port,()=>console.log(`SIDELINE running at http://localhost:${port}`));
