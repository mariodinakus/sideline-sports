/* NBA 2026–27 prediction-market snapshots. Read-only. Not an odds service or a betting recommendation.
 * Prices may differ due to venue rules, spreads, illiquidity, fees and update times.
 */
const P='https://gamma-api.polymarket.com/events?slug=';
const K='https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=';
const BOARDS={title:{polymarket:'nba-2027-champion',kalshi:'KXNBA-27'},mvp:{polymarket:'nba-2026-27-mvp',kalshi:'KXNBAMVP-27'}};
const KURL={title:'https://kalshi.com/markets/kxnba/pro-basketball-champion',mvp:'https://kalshi.com/markets/kxnbamvp/pro-basketball-mvp'};
const bounded=(x)=>{let n=Number(x);return Number.isFinite(n)&&n>=0&&n<=1?Math.round(n*10000)/100:null};
const nums=x=>x===null||x===undefined?null:Number.isFinite(Number(x))?Number(x):null;
function parseArray(x){try{return Array.isArray(x)?x:JSON.parse(x||'[]')}catch{return []}}
function normalize(x){return String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase()}
async function get(url){let r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{accept:'application/json'},next:{revalidate:180}});if(!r.ok)throw Error('Source HTTP '+r.status);return r.json()}
function poly(d,type){let ev=d?.[0];if(!ev?.markets)throw Error('Polymarket event unavailable');
let values=(ev.markets||[]).filter(m=>m.active&&!m.closed).map(m=>{
 const labels=parseArray(m.outcomes),prices=parseArray(m.outcomePrices),i=labels.findIndex(x=>String(x).toLowerCase()==='yes');
 const name=String(m.groupItemTitle||'');
 const price=i>=0?bounded(prices[i]):null;
 if(!name||/^team [a-z]$|^other$/i.test(name)||price===null)return null;
 return {name,normalizedName:normalize(name),price,liquidity:nums(m.liquidityNum),volume:nums(m.volumeNum),slug:m.slug||null};
}).filter(Boolean);
return {name:'Polymarket',event:ev.title,eventSlug:ev.slug,url:'https://polymarket.com/event/'+ev.slug,kind:'outcome YES price',rows:values,coverage:values.length}};
function kalshi(d,type){let mk=d?.markets;if(!Array.isArray(mk))throw Error('Kalshi event unavailable');const rows=mk.filter(x=>x.status==='active'&&!x.result||x.status==='open').map(m=>{
const ticker=String(m.ticker||'');const last=bounded(m.last_price_dollars),bid=bounded(m.yes_bid_dollars),ask=bounded(m.yes_ask_dollars);
return {name:m.yes_sub_title||m.subtitle||m.title||ticker,ticker,code:ticker.split('-').at(-1),price:last,yesBid:bid,yesAsk:ask,volume:nums(m.volume_fp)||nums(m.volume),openInterest:nums(m.open_interest_fp)};}).filter(x=>x.price!==null);
return {name:'Kalshi',event:type==='title'?'2027 Pro Basketball Champion':'2026–27 Pro Basketball MVP',url:KURL[type],kind:'last traded YES price',rows,coverage:rows.length}};
module.exports=async(req,res)=>{if(req.method!=='GET')return res.status(405).json({error:'GET only'});const type=req.query?.type==='mvp'?'mvp':'title',b=BOARDS[type];
const [p,k]=await Promise.allSettled([get(P+encodeURIComponent(b.polymarket)),get(K+encodeURIComponent(b.kalshi)+'&limit=100')]);
const data={type,season:'2026-27',retrievedAt:new Date().toISOString(),sources:{},notes:'Read-only public contract prices. They are not calibrated NBA championship or MVP probabilities, forecasts guaranteed to win, or betting advice. Independent YES outcomes may sum over 100%, especially with spreads/fees.'};
for(const [label,o,fn] of [['polymarket',p,poly],['kalshi',k,kalshi]]){if(o.status==='fulfilled'){try{data.sources[label]=fn(o.value,type)}catch(e){data.sources[label]={error:String(e.message)}}}else data.sources[label]={error:String(o.reason?.message||o.reason)}}
const success=Object.values(data.sources).some(s=>s.rows?.length);
res.setHeader('Cache-Control',success?'public, s-maxage=180, stale-while-revalidate=360':'no-store');
res.status(success?200:503).json(data);
};