'use strict';
const {send,json,cached,firstHttpLink}=require('../lib/shared');
const SPORTS_PATTERN=/\b(sport|soccer|football|basketball|baseball|tennis|nba|wnba|nfl|nhl|mlb|ncaa|ufc|f1|formula 1|premier league|champions league|world cup|la liga|serie a|bundesliga|europa league|euroleague|olympic|golf|cricket|mma|hockey|super bowl|rugby|race|match|atp|wta|pga|epl)\b/i;
const polyBase='https://gamma-api.polymarket.com/events?active=true&closed=false&limit=80&order=volume_24hr&ascending=false';
function array(value){if(Array.isArray(value))return value;try{const p=JSON.parse(value);return Array.isArray(p)?p:[];}catch{return [];}}
function category(text){const v=String(text||'').toLowerCase();if(/nba|basketball|euroleague|wnba/.test(v))return 'basketball';if(/tennis|atp|wta|wimbledon/.test(v))return 'tennis';if(/formula|formula 1|\bf1\b|grand prix/.test(v))return 'motorsport';if(/football|soccer|premier league|champions league|bundesliga|la liga|epl|serie a|world cup/.test(v))return 'football';return 'other';}
function price(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1?Math.round(n*1000)/10:null;}
function polyEvent(e){const title=String(e.title||'').slice(0,200),slug=String(e.slug||'');
 const selected=(Array.isArray(e.markets)?e.markets:[]).filter(x=>x.closed!==true&&x.active!==false).slice(0,8);
 const outcomes=[];
 for(const m of selected){const labels=array(m.outcomes),prices=array(m.outcomePrices);for(let i=0;i<Math.min(labels.length,prices.length,3);i++){
 const p=price(prices[i]);if(p===null)continue;outcomes.push({name:labels[i]==='Yes'?String(m.question||title):String(labels[i]||''),value:p});}}
 const cleanOutcomes=outcomes.slice(0,6);if(!cleanOutcomes.length)return null;
 return {id:'poly-'+String(e.id||slug),provider:'Polymarket',title,sport:category(title+' '+(e.tags||[]).map(x=>x.label||x.slug||'').join(' ')),outcomes:cleanOutcomes,volume:Number(e.volume24hr||e.volume||0)||0,url:firstHttpLink('https://polymarket.com/event/'+encodeURIComponent(slug)),asOf:new Date().toISOString()};
}
function kalshiProbability(m){
 const bid=price(m.yes_bid_dollars),ask=price(m.yes_ask_dollars);
 if(bid!==null&&ask!==null&&ask>=bid)return Math.round((bid+ask)*5)/10;
 const last=price(m.last_price_dollars);if(last!==null)return last;
 const legacy=Number(m.yes_bid),legacyAsk=Number(m.yes_ask);
 if(Number.isFinite(legacy)&&Number.isFinite(legacyAsk)&&legacyAsk>=legacy&&legacy>=0&&legacyAsk<=100)return Math.round((legacy+legacyAsk)*5)/10;
 if(Number.isFinite(Number(m.last_price))&&Number(m.last_price)>=0&&Number(m.last_price)<=100)return Number(m.last_price);
 return null;
}
function kalshiEvent(e){const title=String(e.title||''),market=(e.markets||[]).filter(m=>m.status!=='closed').map(m=>({name:String(m.yes_sub_title||m.title||'Yes'),value:kalshiProbability(m)})).filter(m=>m.value!==null).slice(0,5);if(!market.length)return null;
 return {id:'kalshi-'+String(e.event_ticker||e.title),provider:'Kalshi',title:title.slice(0,200),sport:e.sportCategory||category(title),outcomes:market,volume:Number(e.volume||0),url:'https://kalshi.com/markets',asOf:new Date().toISOString()};}
async function kalshiSportsEvents(){
 const base='https://api.elections.kalshi.com/trade-api/v2';
 try{
  const catalog=await json(base+'/series?category=Sports&include_volume=true',10500);
  const series=(Array.isArray(catalog.series)?catalog.series:[]).filter(x=>x.ticker&&SPORTS_PATTERN.test(x.title||'')).sort((a,b)=>Number(b.volume||b.total_volume||0)-Number(a.volume||a.total_volume||0));
  const selected=[];
  for(const sport of ['football','basketball','tennis','motorsport','other']){
   selected.push(...series.filter(x=>category(x.title)===sport).slice(0,sport==='football'||sport==='basketball'?2:1));
  }
  if(!selected.length)throw Error('Kalshi sports series not found');
  const records=await Promise.allSettled(selected.slice(0,8).map(x=>json(base+'/events?limit=100&status=open&with_nested_markets=true&series_ticker='+encodeURIComponent(x.ticker),8500)));
  const gathered=[];
  records.forEach((r,i)=>{if(r.status==='fulfilled')for(const e of (Array.isArray(r.value.events)?r.value.events:[]))gathered.push({...e,category:'Sports',sportCategory:category(selected[i].title)});});
  if(gathered.length)return gathered;
 }catch{}
 const data=await json(base+'/events?limit=200&status=open&with_nested_markets=true',9000);
 return Array.isArray(data.events)?data.events:[];
}
async function pull(){
 const polyUrls=[polyBase+'&tag_slug=sports',polyBase+'&tag_slug=soccer',polyBase+'&tag_slug=nba'];
 const result=await Promise.allSettled([
  ...polyUrls.map(url=>json(url,8000)),
  kalshiSportsEvents()
 ]);
 const notes=[];const poly=[];
 for(let i=0;i<3;i++){if(result[i].status==='fulfilled'){for(const e of (Array.isArray(result[i].value)?result[i].value:[])){
 const haystack=[e.title,...(e.tags||[]).map(t=>t.label||t.slug||'')].join(' ');if(!SPORTS_PATTERN.test(haystack))continue;const row=polyEvent(e);if(row)poly.push(row);
 }}else notes.push(`Polymarket feed ${i+1} unavailable`);}
 const unique=[...new Map(poly.map(x=>[x.id,x])).values()].sort((a,b)=>b.volume-a.volume).slice(0,45);
 let kalshi=[];
 if(result[3].status==='fulfilled'){const d=result[3].value;kalshi=(Array.isArray(d.events)?d.events:[]).filter(e=>String(e.category||'').toLowerCase()==='sports'||SPORTS_PATTERN.test(e.title||'')).map(kalshiEvent).filter(Boolean).slice(0,45);}
 else notes.push('Kalshi feed unavailable');
 return {markets:[...unique,...kalshi],meta:{asOf:new Date().toISOString(),providerCounts:{Polymarket:unique.length,Kalshi:kalshi.length},warnings:notes,note:'Indicative market-implied prices, not validated real-world probabilities. Liquidity, fees and spreads matter. Read-only; no trading.'}};
}
module.exports=async function handler(req,res){if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});try{send(res,200,await cached('markets-v1',150000,pull));}catch{send(res,503,{markets:[],meta:{asOf:new Date().toISOString(),providerCounts:{Polymarket:0,Kalshi:0},warnings:['Market feeds unavailable']}});}};
module.exports._test={price,array,polyEvent,kalshiEvent,kalshiProbability,category};
