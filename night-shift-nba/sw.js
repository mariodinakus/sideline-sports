const VERSION='nba-atlas-mobile-v35';
const CORE=['/','/style.css?v=13','/mobile.css','/app.js?v=13','/atlas-data.js','/atlas-features.js?v=2','/atlas-labs.js?v=2','/atlas-pro.js','/atlas-plus.js?v=2','/atlas-stats.js','/mobile.js','/atlas-intelligence.js?v=16','/atlas-intelligence.css?v=15','/atlas-tv.js?v=2','/atlas-tv.css?v=2','/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nba-atlas-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/downloads/'))return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(request,copy)).catch(()=>{}))}
    return response;
  }).catch(async()=>await caches.match(request)||((request.mode==='navigate')?await caches.match('/'):Response.error())));
});
