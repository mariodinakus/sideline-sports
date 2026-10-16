'use strict';
const USER_AGENT = 'SidelineSports/1.0 (+public RSS reader; contact site operator)';
const memory = new Map();
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}
async function json(url, ms=6500) {
  const response = await fetch(url, {headers: {'User-Agent': USER_AGENT, Accept:'application/json'},signal:AbortSignal.timeout(ms)});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function xml(url, ms=6500) {
  const response = await fetch(url, {headers: {'User-Agent':USER_AGENT, Accept:'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(ms)});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 2000000) throw new Error('Feed too large');
  return text;
}
function cached(key, ttl, cb) {
  const now=Date.now(), stored=memory.get(key);
  if(stored && stored.exp>now) return stored.promise;
  const promise=Promise.resolve().then(cb).catch(err=>{ if (stored?.value) return stored.value; throw err; });
  memory.set(key,{exp:now+ttl,promise,value:stored?.value});
  promise.then(v => {const s=memory.get(key); if(s?.promise===promise) s.value=v;}).catch(()=>{const s=memory.get(key); if(s?.promise===promise) memory.delete(key);});
  return promise;
}
function clean(input) {
  return String(input??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,'$1')
    .replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip);/gi,(full,k)=>{
      const map={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…'};
      if(k[0]==='#') {const n=k[1]==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return n>0 && n<=0x10ffff?String.fromCodePoint(n):'';}
      return map[k]||full;
    }).replace(/\s+/g,' ').trim();
}
function tag(xmlStr, name) {
  const match=xmlStr.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));
  return match?clean(match[1]):'';
}
function firstHttpLink(v){try{const u=new URL(String(v||''));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}
module.exports={send,json,xml,cached,clean,tag,firstHttpLink,hash,normalize};
