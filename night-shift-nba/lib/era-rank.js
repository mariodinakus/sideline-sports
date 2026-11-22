'use strict';
// Descriptive season rankings; no hypothetical box scores. All weights are editorial.
const N=x=>x==null||x===''||x==='NA'||!Number.isFinite(Number(x))?null:Number(x);
const div=(a,b)=>N(a)!==null&&N(b)>0?Number(a)/Number(b):null;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const sig=(a,b)=>N(a)===null||N(b)===null?null:a-b;
const TS=x=>{const p=N(x.pts),f=N(x.fga),t=N(x.fta);return p!==null&&f!==null&&t!==null?div(p,2*(f+.44*t)):null};
const pct=(a,v,dir=1)=>{if(v===null||!a||a.length<5)return null;let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<v)lo=m+1;else hi=m}const first=lo;hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<=v)lo=m+1;else hi=m}const last=lo;const p=(first+(last-first)/2)/a.length;return dir===1?p:1-p};
const P_E=[['ppg','Πόντοι/αγ.',30],['apg','Ασίστ/αγ.',15],['rpg','Ριμπάουντ/αγ.',15],['rts','Σχετικό TS%',25],['avail','Συμμετοχή',15]];
const P_M=[['p36','Πόντοι/36',20],['a36','Ασίστ/36',13],['r36','Ριμπάουντ/36',9],['rts','Σχετικό TS%',20],['threevol','3PA/36',12],['threepct','3P%',10],['astto','AST/TO',8],['stocks','STL+BLK/36',8]];
const T_E=[['wp','Win%',40],['srs','SRS',35],['mov','Διαφορά πόντων',25]];
const T_M=[['wp','Win%',15],['srs','SRS',15],['ro','Σχετική επίθεση',15],['rd','Σχετική άμυνα',15],['rts','Σχετικό TS%',15],['three','3PA/FGA',15],['tov','TOV%',10,-1]];
function dist(rows,defs){return Object.fromEntries(defs.map(([k])=>[k,rows.map(x=>N(x[k])).filter(v=>v!==null).sort((a,b)=>a-b)]))}
function score(x,defs,ref){let sum=0,weight=0;const factors=[];for(const [k,label,w,dir] of defs){const v=N(x[k]),p=pct(ref[k],v,dir||1);if(p===null)continue;sum+=p*w;weight+=w;factors.push({key:k,label,weight:w,value:v,percentile:Math.round(p*1000)/10})}return {score:weight?Math.round(sum/weight*1000)/10:null,coverage:weight,components:factors}}
const group=(rows,key)=>{const g=new Map();for(const x of rows){const k=key(x);if(!g.has(k))g.set(k,[]);g.get(k).push(x)}return g};
function build(players,teams){
 const byY=group(teams,t=>t.season+'|'+t.league),maxGames=new Map(),base=new Map();
 for(const [k,a] of byY){maxGames.set(k,Math.max(...a.map(t=>(t.w||0)+(t.l||0))));base.set(k,{ts:mean(a.map(t=>N(t.ts)).filter(v=>v!==null)),ortg:mean(a.map(t=>N(t.ortg)).filter(v=>v!==null)),drtg:mean(a.map(t=>N(t.drtg)).filter(v=>v!==null))})}
 const pr=players.filter(x=>x.season<=2026&&N(x.g)>=Math.max(20,.5*(maxGames.get(x.season+'|'+x.league)||82))&&N(x.pts)!==null).map(x=>{
 const b=base.get(x.season+'|'+x.league)||{},ts=TS(x),pg=div(x.pts,x.g),per=k=>{const v=div(x[k],x.mp);return v===null?null:36*v},stocks=N(x.stl)!==null&&N(x.blk)!==null&&N(x.mp)>0?36*(x.stl+x.blk)/x.mp:null;
 return {...x,ppg:pg,apg:div(x.ast,x.g),rpg:div(x.trb,x.g),ts,rts:sig(ts,b.ts),avail:div(x.g,maxGames.get(x.season+'|'+x.league)),p36:per('pts'),a36:per('ast'),r36:per('trb'),threevol:per('x3pa'),threepct:N(x.x3pa)>=50?div(x.x3p,x.x3pa):null,astto:div(x.ast,x.tov),stocks};
 });
 const tr=teams.filter(x=>x.season<=2026&&N(x.w)!==null&&N(x.l)!==null&&x.w+x.l>=20).map(x=>{const b=base.get(x.season+'|'+x.league)||{};return {...x,wp:div(x.w,x.w+x.l),ro:sig(x.ortg,b.ortg),rd:sig(b.drtg,x.drtg),rts:sig(x.ts,b.ts),three:N(x.three),tov:N(x.tov)}});
 function rankRows(rows,era,modern){
 const dists=new Map();for(const [k,a] of group(rows,x=>x.season+'|'+x.league))dists.set(k,dist(a,era));
 const modernRows=rows.filter(x=>x.league==='NBA'&&x.season>=2024&&x.season<=2026),mref=dist(modernRows,modern);
 return rows.map(x=>({...x,era:score(x,era,dists.get(x.season+'|'+x.league)),modern:score(x,modern,mref)}));
 }
 return{players:rankRows(pr,P_E,P_M),teams:rankRows(tr,T_E,T_M),reference:{start:2024,end:2026,players:pr.filter(x=>x.season>=2024&&x.league==='NBA').length,teams:tr.filter(x=>x.season>=2024&&x.league==='NBA').length}};
}
function query(db,q){
 const kind=q.kind==='teams'?'teams':'players',mode=q.metric==='modern'?'modern':'era',min=q.incomplete==='1'?0:mode==='modern'?75:75;
 const term=String(q.q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().slice(0,90),norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const from=N(q.from)||1947,to=Math.min(N(q.to)||2026,2026),page=Math.max(0,Math.min(1000,Math.floor(N(q.page)||0)));
 const all=db[kind].filter(x=>x[mode].score!==null).sort((a,b)=>b[mode].score-a[mode].score||b[mode].coverage-a[mode].coverage||b.season-a.season||a.name.localeCompare(b.name));
 // Official ranking only among rows with at least 75% measured model weight.
 let rank=0;const ranked=all.map(x=>({...x,rank:x[mode].coverage>=75?++rank:null}));
 const list=ranked.filter(x=>x[mode].coverage>=min&&x.season>=from&&x.season<=to&&(!term||norm(x.name).includes(term)||norm(x.team||x.code).includes(term)));
 const seen=new Set();const filtered=q.unique==='1'?list.filter(x=>{const k=kind==='players'?x.id:x.league+'|'+x.name;if(seen.has(k))return false;seen.add(k);return true}):list;
 return{kind,metric:mode,rows:filtered.slice(page*30,page*30+30),total:filtered.length,page,limit:30,reference:db.reference,qualified:all.filter(x=>x[mode].coverage>=75).length,available:all.length,weights:kind==='players'?(mode==='era'?P_E:P_M):(mode==='era'?T_E:T_M)};
}
module.exports={build,query,score,TS};