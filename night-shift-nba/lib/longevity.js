'use strict';
/* Historical PRA / longevity from the existing season-by-season Basketball-Reference snapshot.
   Descriptive methodology: no invented pre-rebound data; 2026-27 partial season excluded.
   Active players' most recent season is excluded until complete. */
const N=x=>x===null||x===undefined||x===''||x==='NA'||!Number.isFinite(Number(x))?null:Number(x);
const avg=(a,b)=>N(a)!==null&&N(b)>0?Number(a)/Number(b):null;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const R=x=>Math.round(x*10)/10;
const minYears=6;
function calc(seasonRows,people,teams){
 const maxima=new Map();teams.forEach(t=>{const key=t.league+':'+t.season,g=(N(t.w)||0)+(N(t.l)||0);maxima.set(key,Math.max(maxima.get(key)||0,g))});
 const clean=seasonRows.filter(x=>N(x.season)>=1951&&N(x.season)<=2026&&x.player_id&&['NBA','BAA'].includes(x.lg))
 .map(r=>{const g=N(r.g),pts=N(r.pts),trb=N(r.trb),ast=N(r.ast),m=maxima.get(r.lg+':'+r.season)||82;
  if(g===null||pts===null||trb===null||ast===null||g<Math.max(20,Math.round(m*.4)))return null;
  const pra=(pts+trb+ast)/g;
  return {id:r.player_id,name:r.player,season:Number(r.season),league:r.lg,team:r.team,g,
   pts,trb,ast,pra:R(pra),exactPra:pra,totalPRA:pts+trb+ast,ppg:avg(pts,g),rpg:avg(trb,g),apg:avg(ast,g)} }).filter(Boolean);
 const seasonMap=new Map();clean.forEach(x=>{const k=x.season+'|'+x.league;if(!seasonMap.has(k))seasonMap.set(k,[]);seasonMap.get(k).push(x.exactPra)});
 for(const a of seasonMap.values())a.sort((a,b)=>a-b);
 for(const x of clean){const a=seasonMap.get(x.season+'|'+x.league),lower=a.filter(v=>v<x.exactPra).length,ties=a.filter(v=>v===x.exactPra).length;
 x.percentile=R(100*(lower+ties*.5)/a.length)}
 const grouped=new Map();for(const x of clean){if(!grouped.has(x.id))grouped.set(x.id,[]);grouped.get(x.id).push(x)}
 const bio=new Map(people.map(x=>[x.id,x]));
 const out=[];
 for(const [id,rows] of grouped){rows.sort((a,b)=>a.season-b.season);const b=bio.get(id);
 const windows=[];for(let i=0;i<rows.length-2;i++)if(rows[i+1].season===rows[i].season+1&&rows[i+2].season===rows[i].season+2)windows.push({i,mean:(rows[i].exactPra+rows[i+1].exactPra+rows[i+2].exactPra)/3});
 windows.sort((a,b)=>b.mean-a.mean);
 const win=windows[0],peak=win?R(win.mean):null,start=win?rows[win.i].season:null,end=start===null?null:start+2;
 const primeYears=peak===null?0:rows.filter(x=>x.exactPra>=.9*peak).length;
 const eliteYears=rows.filter(x=>x.percentile>=90).length;
 const top90=rows.map(x=>x.percentile>=90?x.season:null).filter(Number.isFinite);
 let streak=0,bestStreak=0,lastYear=null;for(const y of top90){streak=lastYear!==null&&y===lastYear+1?streak+1:1;bestStreak=Math.max(bestStreak,streak);lastYear=y}
 let decline=null;
 if(win)for(let i=win.i+3;i<rows.length-1;i++){
  if(rows[i+1].season===rows[i].season+1&&rows[i].exactPra<.8*win.mean&&rows[i+1].exactPra<.8*win.mean){decline=rows[i].season;break}
 }
 const quality=rows.length>=minYears;
 const totalPRA=rows.reduce((s,x)=>s+x.totalPRA,0);
 const games=rows.reduce((s,x)=>s+x.g,0);
 const score=quality?R(100*(.55*Math.min(1,eliteYears/16)+.25*Math.min(1,rows.length/22)+.2*Math.min(1,games/1600))):null;
 out.push({id,name:b?.name||rows[0].name,from:b?.from||rows[0].season,to:b?.to||rows.at(-1).season,hof:!!b?.hof,score,
 eliteYears,eliteStreak:bestStreak,qualifiedSeasons:rows.length,games,primeYears,peakPRA:peak,
 primeStart:start,primeEnd:end,declineSeason:decline,totalPRA,missingPre1951:!!(b?.from&&b.from<1951),
 rows:rows.map((x,i)=>({...x,careerYear:i+1,phase:peak===null?'unknown':x.season>=start&&x.season<=end?'prime':decline!==null&&x.season>=decline?'decline':x.season<start?'rise':'post-prime'}))}
 );
 }
 out.sort((a,b)=>(b.score??-1)-(a.score??-1)||b.eliteYears-a.eliteYears||b.games-a.games||a.name.localeCompare(b.name));
 let rank=0;out.forEach(x=>{x.rank=x.score!==null?++rank:null});
 return {records:out,byId:new Map(out.map(x=>[x.id,x])),counts:{included:out.length,qualified:rank,availableSeasons:clean.length}};
}
function short(x){if(!x)return null;const {rows,...rest}=x;return rest}
function query(data,q){
 const selected=String(q.id||''),compare=String(q.compare||''),name=norm(q.name||''),term=norm(q.search||'');
 let p=data.byId.get(selected)||data.records.find(x=>norm(x.name)===name);
 if(!p&&name){const all=data.records.filter(x=>norm(x.name).includes(name));p=all.find(x=>x.score!==null)||all[0]}
 const c=data.byId.get(compare)||data.records.find(x=>norm(x.name)===norm(q.compareName||''))||data.records.find(x=>x.name===(p?.name==='LeBron James'?'Michael Jordan':'LeBron James'));
 const top=data.records.filter(x=>x.score!==null).slice(0,60);
 const matches=term.length>=2?data.records.filter(x=>norm(x.name).includes(term)).slice(0,24).map(short):[];
 return{source:'Basketball-Reference historical archive (2026-11-01 snapshot)',method:'PRA = points + rebounds + assists per game; percentile vs same-season qualified peers; regular season only; 2026-27 excluded',sample:data.counts,
 player:p?{...p,rows:p.rows.map(x=>({...x,ppg:R(x.ppg),rpg:R(x.rpg),apg:R(x.apg)}))}:null,
 compare:c?{...c,rows:c.rows.map(x=>({...x,ppg:R(x.ppg),rpg:R(x.rpg),apg:R(x.apg)}))}:null,top:top.map(short),matches}
}
module.exports={calc,query};
