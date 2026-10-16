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
function decodeEntities(text){
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…',laquo:'«',raquo:'»',rsquo:'’',ldquo:'“',rdquo:'”',bull:'•'};
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+);/gi,(full,key)=>{
    if(key[0]==='#'){
      const cp=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
      return cp>0&&cp<=0x10ffff&&!(cp>=0xd800&&cp<=0xdfff)?String.fromCodePoint(cp):'';
    }
    return named[key.toLowerCase()]??full;
  });
}
function clean(input){
  // RSS often contains HTML escaped twice, especially Google News summaries.
  // Decode first, then strip tags, never return markup to the client.
  let value=String(input??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,'$1');
  for(let i=0;i<3;i++){
    const next=decodeEntities(value);
    if(next===value)break;
    value=next;
  }
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt);/gi,' ')
    .replace(/\s+/g,' ').trim();
}

function tag(xmlStr, name) {
  const match=xmlStr.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));
  return match?clean(match[1]):'';
}
function firstHttpLink(v){try{const u=new URL(String(v||''));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}
module.exports={send,json,xml,cached,clean,tag,firstHttpLink,hash,normalize};
