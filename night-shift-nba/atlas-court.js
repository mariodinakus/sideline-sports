/* ATLAS Courtside — actual feed values only; derived box-score metrics labelled. */
(()=>{
'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>{if(v===null||v===undefined||String(v).trim()===''||typeof v==='boolean')return null;const x=Number(String(v).replace(/,/g,'').replace(/%$/,''));return Number.isFinite(x)?x:null};
const F=(v,d=1,s='')=>N(v)===null?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})+s;
const pick=(o,...keys)=>{for(const k of keys){const x=N(o?.[k]);if(x!==null)return x}return null};
const ratio=(a,b,k=1)=>a!==null&&b!==null&&b>0?k*a/b:null;
const calc=(fn,...v)=>v.every(x=>x!==null&&Number.isFinite(x))?fn(...v):null;
const pct=(v)=>v===null?null:v*100;
const tile=(label,v,d=1,s='',sub='')=>'<div class="ac-tile"><small>'+E(label)+'</small><strong>'+F(v,d,s)+'</strong>'+(sub?'<span>'+E(sub)+'</span>':'')+'</div>';
const head=(k,t,sub)=>'<header class="ac-head"><div><div class="ac-kicker">'+E(k)+'</div><h2>'+E(t)+'</h2></div><span>'+E(sub||'')+'</span></header>';
const sum=(a,b)=>calc((x,y)=>x+y,a,b);
const shooting=(a,t)=>{let fg=pick(t,'fieldGoalsMade','totalFieldGoalsMade'),fa=pick(t,'fieldGoalsAttempted','totalFieldGoalsAttempted'),three=pick(t,'threePointFieldGoalsMade','threePointFieldGoalsMadeTotal'),fta=pick(t,'freeThrowsAttempted','totalFreeThrowsAttempted'),pts=pick(t,'points','totalPoints');
return {ts:ratio(pts,calc((x,y)=>2*(x+.44*y),fa,fta),100),efg:ratio(calc((x,y)=>x+.5*y,fg,three),fa,100),astTo:ratio(pick(t,'assists','totalAssists'),pick(t,'turnovers','totalTurnovers'))}};
function career(d,peak,rings){
 const hero=document.querySelector('.phero .txt'),anchor=hero?.querySelector('.stats-row');if(!anchor||document.getElementById('ac-career'))return;
 const panel=document.createElement('section');panel.id='ac-career';panel.className='ac-career';anchor.before(panel);
 let mode='regular';
 function render(){
  const r=d[mode]||{},a=r.careerAverages||{},t=r.careerTotals||{},s=shooting(a,t),gp=pick(t,'gamesPlayed','games')??pick(a,'gamesPlayed','games');
  panel.innerHTML='<div class="ac-career-head"><b>CAREER OVERVIEW</b><div class="ac-tabs"><button type="button" data-mode="regular" aria-pressed="'+(mode==='regular')+'">Regular season</button><button type="button" data-mode="playoffs" aria-pressed="'+(mode==='playoffs')+'">Playoffs</button></div></div>'+
  '<div class="ac-grid ac-core">'+[['PPG',pick(a,'avgPoints')],['RPG',pick(a,'avgRebounds')],['APG',pick(a,'avgAssists')],['SPG',pick(a,'avgSteals')],['BPG',pick(a,'avgBlocks')],['MPG',pick(a,'avgMinutes')]].map(x=>tile(...x)).join('')+'</div>'+
  '<div class="ac-grid ac-extra">'+tile('Games',gp,0)+tile('Seasons',pick(r,'yearCount'),0)+tile('Total points',pick(t,'points','totalPoints'),0)+tile('Total rebounds',pick(t,'rebounds','totalRebounds'),0)+tile('Total assists',pick(t,'assists','totalAssists'),0)+tile('FG%',pick(a,'fieldGoalPct'),1,'%')+tile('3P%',pick(a,'threePointFieldGoalPct'),1,'%')+tile('FT%',pick(a,'freeThrowPct'),1,'%')+tile('TS%',s.ts,1,'%')+tile('eFG%',s.efg,1,'%')+tile('AST/TO',s.astTo,2)+'</div>'+
  '<div class="ac-note">'+(mode==='regular'&&peak?'Peak scoring: '+E(peak.seasonLabel)+' · '+F(pick(peak.stats,'avgPoints'))+' PPG · ':'')+'ESPN career totals · — = unavailable</div>';
  panel.querySelectorAll('button').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
 }
 render();anchor.insertAdjacentHTML('beforebegin','<div class="ac-kicker ac-current">CURRENT / LAST SEASON</div>');
}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function box(d,id){
 const item=(d.teamStats||[]).find(x=>String(x.team?.id)===String(id));
 const map=new Map();(item?.statistics||[]).forEach(s=>{map.set(norm(s.name),s.value);map.set(norm(s.label),s.value)});
 const read=(...keys)=>{for(const k of keys){const v=map.get(norm(k));if(v!=null)return v}return null};
 const pair=(...k)=>{const m=String(read(...k)||'').match(/^(\d+)\s*[-/]\s*(\d+)$/);return m?[+m[1],+m[2]]:[null,null]};
 const num=(...keys)=>N(read(...keys));
 const [fgm,fga]=pair('fieldGoalsMade-fieldGoalsAttempted','FG','fieldGoals');
 const [tpm,tpa]=pair('threePointFieldGoalsMade-threePointFieldGoalsAttempted','3PT','threePointFieldGoals');
 const [ftm,fta]=pair('freeThrowsMade-freeThrowsAttempted','FT','freeThrows');
 const orb=num('offensiveRebounds','OREB'),drb=num('defensiveRebounds','DREB'),to=num('totalTurnovers','turnovers','TO');
 return {fgm,fga,tpm,tpa,ftm,fta,orb,drb,to,reb:num('totalRebounds','rebounds','REB'),ast:num('assists','AST'),stl:num('steals','STL'),blk:num('blocks','BLK'),paint:num('pointsInPaint'),fast:num('fastBreakPoints'),offto:num('turnoverPoints','pointsOffTurnovers'),second:num('secondChancePoints'),bench:num('benchPoints'),fouls:num('fouls','personalFouls'),lead:num('largestLead'),poss:calc((a,b,c,e)=>a-b+c+.44*e,fga,orb,to,fta)};
}
function score(d,id){const c=d.header?.competitions?.[0]?.competitors?.find(x=>String(x.team?.id)===String(id));return N(c?.score)}
function gameMetrics(x,y,p,opp){
 const pos=x.poss!==null&&y.poss!==null?(x.poss+y.poss)/2:null;
 const o=ratio(p,pos,100),def=ratio(opp,pos,100);
 return {pts:p,ortg:o,drtg:def,net:calc((a,b)=>a-b,o,def),ts:ratio(p,calc((a,b)=>2*(a+.44*b),x.fga,x.fta),100),efg:ratio(calc((a,b)=>a+.5*b,x.fgm,x.tpm),x.fga,100),fg:ratio(x.fgm,x.fga,100),three:ratio(x.tpm,x.tpa,100),ft:ratio(x.ftm,x.fta,100),tov:ratio(x.to,calc((a,b,c)=>a+.44*b+c,x.fga,x.fta,x.to),100),orb:ratio(x.orb,sum(x.orb,y.drb),100),drb:ratio(x.drb,sum(y.orb,x.drb),100),ftr:ratio(x.ftm,x.fga),astTo:ratio(x.ast,x.to),poss:pos,...Object.fromEntries(['reb','ast','stl','blk','paint','fast','offto','second','bench','fouls','lead','to','fga','tpa','fta'].map(k=>[k,x[k]]))};
}
const groups=[
 ['Efficiency',[['ortg','Offensive rating',1],['drtg','Defensive rating',-1],['net','Net rating',1],['ts','True shooting %',1,'%'],['efg','Effective FG %',1,'%'],['poss','Estimated possessions',0]]],
 ['Four factors',[['efg','eFG%',1,'%'],['tov','Turnover %',-1,'%'],['orb','Off. rebound %',1,'%'],['ftr','FT made / FGA',1,'',3]]],
 ['Shooting & control',[['fg','FG%',1,'%'],['three','3P%',1,'%'],['ft','FT%',1,'%'],['fga','FGA',0],['tpa','3PA',0],['fta','FTA',0],['astTo','AST / TO',1,'',2],['drb','Def. rebound %',1,'%'],['reb','Rebounds',1],['ast','Assists',1],['to','Turnovers',-1],['stl','Steals',1],['blk','Blocks',1],['fouls','Fouls',-1]]],
 ['Game flow',[['paint','Points in paint',1],['fast','Fast break points',1],['offto','Points off turnovers',1],['second','Second chance points',1],['bench','Bench points',1],['lead','Largest lead',1]]]
];
function compare(k,a,b){
 const [key,label,dir,suffix='',digits=1]=k,x=a[key]??null,y=b[key]??null;
 if(x===null&&y===null)return '';
 const same=x===y,aw=x!==null&&y!==null&&!same&&dir!==0&&(dir>0?x>y:x<y),hw=x!==null&&y!==null&&!same&&dir!==0&&!aw,scale=Math.max(Math.abs(x||0),Math.abs(y||0),1);
 return '<div class="ac-compare"><strong class="'+(aw?'ac-win':'')+'">'+F(x,digits,suffix)+'</strong><span>'+E(label)+'</span><strong class="'+(hw?'ac-win':'')+'">'+F(y,digits,suffix)+'</strong><div class="ac-left"><i style="width:'+Math.round(Math.abs(x||0)/scale*100)+'%"></i></div><div class="ac-right"><i style="width:'+Math.round(Math.abs(y||0)/scale*100)+'%"></i></div></div>';
}
function probability(d,h,a){
 const p=(d.winProbability||[]).map(x=>N(x.homeWinPercentage)).filter(x=>x!==null&&x>=0&&x<=1);if(!p.length)return '';
 const last=p.at(-1),x=p.map((v,i)=>(12+296*i/Math.max(1,p.length-1)).toFixed(1)+','+(88-76*v).toFixed(1)).join(' ');
 const shift=p.length>1?100*(last-p[Math.max(0,p.length-11)]):null;
 return '<div class="ac-prob"><div><b>'+E(a.abbr)+' '+F(100*(1-last),0,'%')+'</b><span>WIN PROBABILITY · ESPN</span><b>'+E(h.abbr)+' '+F(100*last,0,'%')+'</b></div><div class="ac-split"><i style="width:'+100*(1-last)+'%"></i></div><svg viewBox="0 0 320 100" role="img" aria-label="Home win probability history"><path d="M12 50H308" stroke="currentColor" opacity=".25" stroke-dasharray="4 4"/><polyline points="'+x+'" fill="none" stroke="var(--ice,#76cffb)" stroke-width="2.5" stroke-linejoin="round"/></svg><small>'+E(h.abbr)+' probability change over last 10 observations: '+(shift===null?'—':(shift>0?'+':'')+F(shift,1,' pp'))+'</small></div>';
}
function periods(d,a,h){
 const x=d.periods?.find(p=>p.homeAway==='away')?.linescores||[],y=d.periods?.find(p=>p.homeAway==='home')?.linescores||[];
 const rows=x.map((p,i)=>{const av=N(p.points),hv=N(y[i]?.points);if(av===null||hv===null)return '';const diff=av-hv;return '<div class="ac-period"><span>'+E(p.period>4?'OT'+(p.period-4):'Q'+p.period)+'</span><b>'+av+' : '+hv+'</b><small>'+E(diff===0?'Even':(diff>0?a.abbr:h.abbr)+' +'+Math.abs(diff))+'</small></div>'}).join('');
 return rows?'<div class="ac-periods">'+rows+'</div>':'';
}
function impact(d){
 const list=[];(d.players||[]).forEach(t=>{(t.groups||[]).slice(0,1).forEach(g=>{const ix=k=>g.labels?.indexOf(k)??-1;(g.athletes||[]).forEach(r=>{const p=N(r.stats?.[ix('PTS')]),reb=N(r.stats?.[ix('REB')]),ast=N(r.stats?.[ix('AST')]);if(p===null||reb===null||ast===null||!r.athlete?.id)return;list.push({p,reb,ast,a:r.athlete,t:t.team?.abbr,score:p+reb+ast})})})});
 return list.length?'<div class="ac-impact">'+list.sort((a,b)=>b.score-a.score).slice(0,4).map(x=>'<a href="#/player/'+E(x.a.id)+'"><img src="https://a.espncdn.com/i/headshots/nba/players/full/'+E(x.a.id)+'.png" alt="" loading="lazy"><div><b>'+E(x.a.name)+'</b><small>'+E(x.t)+' · '+x.p+' PTS · '+x.reb+' REB · '+x.ast+' AST</small></div><strong>'+x.score+' <small>PRA</small></strong></a>').join('')+'</div>':'';
}
function game(c){
 const anchor=document.getElementById('game-insight');if(!anchor||document.getElementById('ac-game'))return;
 const el=document.createElement('section');el.id='ac-game';el.className='sec card ac-panel';anchor.before(el);
 let timer=null,active=c.state,mode=0,last=c.d,stamp=null,failed=false;
 const on=()=>el.isConnected&&c.token();
 function paint(){if(!on())return;
  const a=c.a,h=c.h,d=last,pa=score(d,a.id),ph=score(d,h.id),x=gameMetrics(box(d,a.id),box(d,h.id),pa,ph),y=gameMetrics(box(d,h.id),box(d,a.id),ph,pa);
  const rows=groups[mode][1].map(k=>compare(k,x,y)).join(''),best=groups[0][1].filter(k=>['ortg','ts','efg'].includes(k[0])).map(k=>({k,x:x[k[0]],y:y[k[0]]})).filter(k=>k.x!==null&&k.y!==null&&k.x!==k.y).sort((a,b)=>Math.abs(b.x-b.y)-Math.abs(a.x-a.y))[0];
  el.innerHTML=head('MATCH DNA / COURTSIDE','Game center',(active==='in'?'LIVE · 30s refresh':active==='post'?'FINAL':'PREGAME')+(failed?' · feed unavailable':''))+
  '<div class="ac-score"><div><img src="'+E(a.logo)+'" alt=""><b>'+E(a.abbr)+'</b></div><strong>'+F(pa,0)+' <small>–</small> '+F(ph,0)+'</strong><div><img src="'+E(h.logo)+'" alt=""><b>'+E(h.abbr)+'</b></div></div>'+
  probability(d,h,a)+periods(d,a,h)+(best?'<div class="ac-observation"><b>'+E(best.x>best.y?a.abbr:h.abbr)+'</b> leads in '+E(best.k[1])+' · '+F(Math.abs(best.x-best.y),1)+(best.k[3]?' pp':'')+' difference</div>':'')+
  '<div class="ac-tabs ac-game-tabs">'+groups.map((g,i)=>'<button type="button" data-i="'+i+'" aria-pressed="'+(mode===i)+'">'+E(g[0])+'</button>').join('')+'</div><div class="ac-comphead"><b>'+E(a.abbr)+'</b><span>TEAM COMPARISON</span><b>'+E(h.abbr)+'</b></div>'+
  (rows||'<p class="ac-note">No team box-score data yet.</p>')+
  (impact(d)?'<h3 class="ac-subtitle">Players to watch · PRA</h3>'+impact(d):'')+
  '<p class="ac-note">ESPN team box score (unofficial). Ratings use estimated shared possessions; FT rate = FTM/FGA. Missing fields stay blank. PRA = points + rebounds + assists; not an impact model. '+(stamp?'Updated '+E(stamp.toLocaleTimeString('el-GR')):'')+'</p>';
  el.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{mode=+b.dataset.i;paint()});
 }
 async function refresh(){if(!on())return;if(document.hidden){timer=setTimeout(refresh,30000);return}try{const r=await fetch('/api/data?type=game&id='+encodeURIComponent(c.id),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(!j.data)throw Error('Missing data');if(!on())return;last=j.data;active=last.header?.competitions?.[0]?.status?.type?.state||active;stamp=new Date(j.updatedAt||Date.now());failed=false}catch{failed=true}if(!on())return;paint();if(active==='in'||active==='pre')timer=setTimeout(refresh,30000)}
 paint();if(active==='in'||active==='pre')timer=setTimeout(refresh,30000);
}
const seasonFields=[['net','Net rating',1],['ortg','Offensive rating',1],['drtg','Defensive rating',-1],['pace','Pace',0],['efg','eFG%',1,100,'%'],['tovPct','Turnover %',-1,100,'%'],['orbPct','OREB%',1,100,'%'],['drbPct','DREB%',1,100,'%'],['ftr','FTM / FGA',1,1,'',3],['oefg','Opponent eFG%',-1,100,'%'],['otovPct','Opponent TOV%',1,100,'%'],['oftr','Opponent FTM / FGA',-1,1,'',3],['tpPct','3P%',1,100,'%'],['tpaPg','3PA / game',0],['opp3Pct','Opponent 3P%',-1,100,'%'],['opp3paPg','Opponent 3PA / game',0],['ppg','Points / game',1],['oppg','Opponent points / game',-1],['margin','Margin / game',1],['closePct','Close-game win %',1,100,'%']];
const seValue=(x,k)=>k==='net'?calc((a,b)=>a-b,N(x.ortg),N(x.drtg)):k==='closePct'?ratio(N(x.closeW),sum(N(x.closeW),N(x.closeL))):N(x[k]);
async function team(id,promise,valid){
 const anchor=document.getElementById('team-schedule')?.closest('section');if(!anchor)return;
 const el=document.createElement('section');el.id='ac-team';el.className='sec card ac-panel';anchor.before(el);el.innerHTML=head('TEAM ANALYTICS','Advanced dashboard','Loading');
 const s=await promise;if(!valid()||!el.isConnected)return;const list=s?.teams||[],x=list.find(t=>String(t.id)===String(id));if(!x){el.innerHTML=head('TEAM ANALYTICS','Advanced dashboard','Unavailable');return}
 const vals=(k)=>list.map(t=>seValue(t,k)).filter(v=>v!==null);
 const rows=seasonFields.map(([k,l,dir,m=1,suffix='',digits=1])=>{const v=seValue(x,k),a=vals(k),mean=a.length?a.reduce((q,w)=>q+w,0)/a.length:null,rank=dir&&v!==null?1+a.filter(y=>dir>0?y>v:y<v).length:null;return tile(l,v===null?null:v*m,digits,suffix,(rank?'#'+rank+'/'+a.length+' · ':'')+'NBA avg '+F(mean===null?null:mean*m,digits,suffix))}).join('');
 const form=(x.log||[]).slice(-10),max=Math.max(1,...form.map(g=>Math.abs(N(g.m)||0)));
 el.innerHTML=head('TEAM ANALYTICS','Advanced dashboard',E(s.season||'')+' · '+(x.boxGames??'—')+'/'+(x.g??'—')+' box scores')+'<div class="ac-grid ac-team-grid">'+rows+'</div>'+
 (form.length?'<h3 class="ac-subtitle">Last '+form.length+' games · point differential</h3><div class="ac-form">'+form.map(g=>'<a href="#/game/'+E(g.id)+'" title="'+E(g.date)+'"><b class="'+(g.m>0?'ac-win':'')+'">'+(g.m>0?'+':'')+F(N(g.m),0)+'</b><i style="height:'+Math.max(4,Math.abs(g.m)/max*45)+'px;background:'+(g.m>0?'var(--good)':'var(--bad)')+'"></i><small>'+E(g.opp)+'</small></a>').join('')+'</div>':'')+
 '<p class="ac-note">ESPN box-score sample. Rankings among teams with observations; NBA avg = unweighted team mean. Net rating = ORtg − DRtg. Close games are as defined by the season feed. Tracking / lineup statistics are not inferred from box scores.</p>';
}
window.AtlasCourt={career,game,team};
})();