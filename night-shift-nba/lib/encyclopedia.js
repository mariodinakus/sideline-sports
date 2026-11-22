'use strict';
// Historical snapshot, independently sourced from the live ESPN feeds.
const ROOT='https://raw.githubusercontent.com/sumitrodatta/bball-reference-datasets/3981e43c07e963db539c527beb8a7b4b99ec8716/Data/';
const source='Basketball-Reference historical dataset compiled by sumitrodatta · 2026-11-01 snapshot';
const N=x=>x==null||x===''||x==='NA'||!Number.isFinite(Number(x))?null:Number(x);
function parse(s){
 const rows=[];let row=[],v='',quote=false;for(let i=0;i<s.length;i++){let c=s[i];if(c==='"'){if(quote&&s[i+1]==='"'){v+='"';i++}else quote=!quote}else if(c===','&&!quote){row.push(v);v=''}else if(c==='\n'&&!quote){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v=''}else v+=c}if(row.length||v){row.push(v.replace(/\r$/,''));rows.push(row)}
 const h=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,''));return rows.filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));
}
const cache=new Map();function load(file){if(!cache.has(file)){const p=fetch(ROOT+encodeURIComponent(file),{signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error('Archive upstream '+r.status);return parse(await r.text())}).catch(e=>{cache.delete(file);throw e});cache.set(file,p)}return cache.get(file)}
const NBA=x=>x.lg==='NBA'||x.lg==='BAA';
const agg=x=>/^(TOT|[2-9]\d?TM)$/.test(x.team||'');
const klist=['g','gs','mp','fg','fga','x3p','x3pa','ft','fta','orb','drb','trb','ast','stl','blk','tov','pf','pts'];
const st=x=>Object.fromEntries(klist.map(k=>[k,N(x[k])]));
const val=(r,k)=>N(r[k]);
const total=(rows,k)=>rows.length&&rows.every(r=>N(r[k])!==null)?rows.reduce((a,r)=>a+N(r[k]),0):null;
function collapse(rows){
 const groups=new Map();for(const x of rows){const k=x.player_id+'|'+x.season+'|'+x.lg;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}
 return Array.from(groups.values()).map(a=>{const t=a.find(agg);if(t)return t;if(a.length===1)return a[0];return {...a[0],team:a.map(x=>x.team).join('/'),...Object.fromEntries(klist.map(k=>[k,total(a,k)]))};});
}
function row(x){return {id:x.player_id,name:x.player,season:N(x.season),league:x.lg,team:x.team,pos:x.pos,age:N(x.age),...st(x),fgPct:N(x.fg_percent),threePct:N(x.x3p_percent),ftPct:N(x.ft_percent)}}
function career(x,rs){const seasons=collapse(rs);return {id:x.player_id,name:x.player,pos:x.pos,from:N(x.from),to:N(x.to),hof:x.hof==='TRUE',seasons:new Set(seasons.map(r=>r.season)).size,...Object.fromEntries(klist.map(k=>[k,total(seasons,k)])),teams:[...new Set(rs.filter(r=>!agg(r)).map(r=>r.team))]}}
function team(x){return {season:N(x.season),league:x.lg,name:x.team,code:x.abbreviation,w:N(x.w),l:N(x.l),mov:N(x.mov),srs:N(x.srs),ortg:N(x.o_rtg),drtg:N(x.d_rtg),net:N(x.n_rtg),pace:N(x.pace),ts:N(x.ts_percent),three:N(x.x3p_ar),tov:N(x.tov_percent),playoffs:x.playoffs==='TRUE',arena:x.arena==='NA'?null:x.arena}}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function page(rows,q){const p=Math.max(0,Math.min(1000,Math.floor(N(q.page)||0))),limit=40;return {rows:rows.slice(p*limit,(p+1)*limit),total:rows.length,page:p,limit}}
let dbPromise;function database(){if(!dbPromise)dbPromise=Promise.all([load('Player Career Info.csv'),load('Player Totals.csv'),load('Team Summaries.csv')]).then(([bios,stats,ts])=>{
 if(!stats.length||!stats[0].player_id||!stats[0].season||!stats[0].team||!('pts' in stats[0]))throw Error('Unexpected player schema');
 const all=stats.filter(r=>NBA(r)&&r.player_id&&N(r.season)>=1947);
 const teams=ts.filter(x=>NBA(x)&&x.team!=='League Average'&&x.abbreviation&&x.abbreviation!=='NA').map(team);
 const groups=new Map();for(const x of all){if(!groups.has(x.player_id))groups.set(x.player_id,[]);groups.get(x.player_id).push(x)}
 const bioMap=new Map(bios.map(x=>[x.player_id,x]));const people=Array.from(groups,([id,rs])=>career(bioMap.get(id)||{player_id:id,player:rs[0].player,pos:rs[0].pos,from:Math.min(...rs.map(r=>N(r.season))),to:Math.max(...rs.map(r=>N(r.season)))},rs));
 return {all,teams,groups,people,seasons:[...new Set(teams.map(x=>x.season))].sort((a,b)=>b-a)};
 }).catch(e=>{dbPromise=null;throw e});return dbPromise}
let eraDb;
async function query(q){
 const d=await database(),mode=String(q.mode||'meta'),y=N(q.year),search=norm(q.q).slice(0,90),code=String(q.code||'').slice(0,8),league=String(q.lg||'').slice(0,6),id=String(q.id||'').slice(0,30);
 const meta={source,snapshot:'2026-11-01',players:d.people.length,playerSeasonRows:collapse(d.all).length,teamSeasonRows:d.teams.length,teamIdentities:new Set(d.teams.map(t=>t.league+'|'+t.name)).size,seasons:d.seasons,first:d.seasons.at(-1),last:d.seasons[0]};
 if(mode==='eraRank'){const r=require('./era-rank');if(!eraDb)eraDb=r.build(collapse(d.all).map(row),d.teams);return {...r.query(eraDb,q),source,snapshot:meta.snapshot};}
 if(mode==='meta')return meta;
 if(mode==='players'){let a=d.people.filter(p=>!search||norm(p.name).includes(search));const sort=['pts','g','ast','trb','stl','blk','x3p','name'].includes(q.sort)?q.sort:'pts';a.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):(N(b[sort])??-1)-(N(a[sort])??-1)||a.name.localeCompare(b.name));return {...page(a,q),source}}
 if(mode==='player'){const rs=d.groups.get(id),p=d.people.find(x=>x.id===id);if(!rs||!p)return {notFound:true};return {player:p,seasons:collapse(rs).map(row).sort((a,b)=>b.season-a.season),stints:rs.filter(x=>!agg(x)).map(row).sort((a,b)=>b.season-a.season),source}}
 if(mode==='season'){let rs=d.all.filter(r=>N(r.season)===y&&(!code||r.team===code)&&(!league||r.lg===league));if(!code)rs=collapse(rs);const players=rs.map(row).filter(p=>!search||norm(p.name).includes(search)).sort((a,b)=>(b.pts??-1)-(a.pts??-1));return {...page(players,q),teams:d.teams.filter(t=>t.season===y).sort((a,b)=>(b.w/(b.w+b.l)||0)-(a.w/(a.w+a.l)||0)),year:y,source}}
 if(mode==='teams'){const m=new Map();for(const x of d.teams){const key=x.league+'|'+x.code+'|'+x.name;if(!m.has(key))m.set(key,{name:x.name,code:x.code,league:x.league,first:x.season,last:x.season,seasons:0,w:0,l:0});const a=m.get(key);a.first=Math.min(a.first,x.season);a.last=Math.max(a.last,x.season);a.seasons++;a.w+=x.w||0;a.l+=x.l||0}const rows=[...m.values()].filter(x=>!search||norm(x.name).includes(search)).sort((a,b)=>b.last-a.last||a.name.localeCompare(b.name));return {...page(rows,q),source}}
 if(mode==='team'){const name=String(q.name||'').slice(0,100),ts=d.teams.filter(x=>x.code===code&&(!league||x.league===league)&&(!name||x.name===name)).sort((a,b)=>b.season-a.season);return {teams:ts,source}}
 throw Error('Unknown encyclopedia mode');
}
module.exports={query,parse,collapse,career};