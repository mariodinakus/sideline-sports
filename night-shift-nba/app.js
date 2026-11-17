/* NBA ATLAS v10 — single clean client. Data: own /api/* proxies (ESPN public, Polymarket, Kalshi, Courtside IQ forecasts) + atlas-data.js (history). */
(()=>{'use strict';
const A=window.ATLAS_DATA||{finals:[],teams:{},rings:{},leaders:[]};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>{if(v===null||v===undefined||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};
const f=(v,d=1)=>{const x=n(v);return x===null?'—':x.toFixed(d)};
const pc=(v,d=1)=>{const x=n(v);if(x===null)return'—';return(x<=1.5&&x>=0?x*100:x).toFixed(d)+'%'};
const HS=id=>`https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const ESPN_ABBR={NYK:'ny',GSW:'gs',SAS:'sa',NOP:'no',UTA:'utah',WAS:'wsh',PHO:'phx',BRK:'bkn'};
const LOGO=a=>`https://a.espncdn.com/i/teamlogos/nba/500/${(ESPN_ABBR[a]||String(a||'nba')).toLowerCase()}.png`;
const hideErr=`onerror="this.style.visibility='hidden'"`;
window.SILH='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><circle cx="50" cy="30" r="17" fill="#2a2f3b"/><path d="M14 80c4-22 18-32 36-32s32 10 36 32z" fill="#2a2f3b"/></svg>');
const silh=`onerror="this.onerror=null;this.src=window.SILH"`;
const tz={timeZone:'Europe/Athens'};
const time=d=>new Date(d).toLocaleTimeString('el-GR',{...tz,hour:'2-digit',minute:'2-digit'});
const day=d=>new Date(d).toLocaleDateString('el-GR',{...tz,weekday:'short',day:'numeric',month:'short'});
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’'.]/g,'').toLowerCase().trim();

/* ---------- data layer ---------- */
const cache=new Map();
function api(path){
  if(!cache.has(path)){
    const p=fetch('/api/'+path).then(async r=>{let j=null;try{j=await r.json()}catch{}if(!r.ok)throw Error(j?.error||'HTTP '+r.status);return j?.data&&!j.players&&!j.teams&&!j.stories?j.data:j}).catch(e=>{cache.delete(path);throw e});
    cache.set(path,p);
  }
  return cache.get(path);
}
const safe=p=>p.then(v=>v,()=>null);
let TEAMS=null;
async function teams(){
  if(TEAMS)return TEAMS;
  const d=await safe(api('data?type=teams'));const m={byId:{},byAbbr:{},list:[]};
  (d?.teams||[]).forEach(t=>{t.hex=teamHex(t.color);m.byId[t.id]=t;m.byAbbr[t.abbr]=t;m.list.push(t)});
  return TEAMS=m;
}
function teamHex(c){if(!c)return'#ff5a1f';const h='#'+c.replace('#','');const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);const l=(.2126*r+.7152*g+.0722*b)/255;return l<.09?'#5b6170':h}
const tColor=(id,abbr)=>TEAMS?.byId[id]?.hex||TEAMS?.byAbbr[abbr]?.hex||'#ff5a1f';
const forecasts=()=>safe(api('intel?type=forecast')).then(d=>{const m={};(d?.records||[]).forEach(r=>{m[String(r.id).split(':').pop()]=r});return{map:m,data:d}});

/* ---------- UI helpers ---------- */
const view=$('#view');let token=0;
const skel=(h=160,c=1)=>Array.from({length:c},()=>`<div class="skel" style="min-height:${h}px"></div>`).join('');
const errBox=(e,what)=>`<div class="err">${esc(what||'Η πηγή δεν απάντησε')}: ${esc(e?.message||e||'unavailable')}. Δοκίμασε ανανέωση σε λίγο.</div>`;
const secH=(eye,title,more,lede)=>`<div class="sec-h"><div><div class="eyebrow">${eye}</div><h2 class="h2">${title}</h2>${lede?`<p class="lede" style="margin-top:8px">${lede}</p>`:''}</div>${more?`<a class="more" href="${more[0]}">${more[1]} →</a>`:''}</div>`;
const fill=(sel,html)=>{const el=typeof sel==='string'?$(sel):sel;if(el)el.innerHTML=html};
const tip=document.createElement('div');tip.className='tip';document.body.appendChild(tip);
document.addEventListener('mousemove',e=>{const t=e.target.closest?.('[data-tip]');if(!t){tip.classList.remove('on');return}tip.innerHTML=t.dataset.tip;tip.classList.add('on');const x=Math.min(e.clientX+14,innerWidth-250);tip.style.left=x+'px';tip.style.top=(e.clientY+14)+'px'});

/* ---------- charts (pure SVG) ---------- */
function ticks(min,max,c=5){const span=max-min||1,step0=span/c,mag=10**Math.floor(Math.log10(step0)),step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=step0)||mag*10;const out=[];for(let v=Math.ceil(min/step)*step;v<=max+1e-9;v+=step)out.push(+v.toFixed(6));return out}
function lineChart({series,w=760,h=300,xFmt=v=>v,yFmt=v=>v,yMin,yMax,band}){
  const pts=series.flatMap(s=>s.points);if(!pts.length)return'<div class="empty">Δεν υπάρχουν δεδομένα</div>';
  const P={l:42,r:16,t:14,b:30},xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=yMin??Math.min(0,...ys),y1=yMax??Math.max(...ys)*1.08;
  const X=v=>P.l+(x1===x0?.5:(v-x0)/(x1-x0))*(w-P.l-P.r),Y=v=>h-P.b-(v-y0)/(y1-y0||1)*(h-P.t-P.b);
  let g='';ticks(y0,y1,5).forEach(t=>{g+=`<line class="gr" x1="${P.l}" x2="${w-P.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${P.l-8}" y="${Y(t)+4}" text-anchor="end">${yFmt(t)}</text>`});
  const xt=[...new Set(xs)].sort((a,b)=>a-b),every=Math.ceil(xt.length/9);
  xt.forEach((t,i)=>{if(i%every===0||i===xt.length-1)g+=`<text x="${X(t)}" y="${h-8}" text-anchor="middle">${xFmt(t)}</text>`});
  if(band)g+=`<line class="ax" x1="${P.l}" x2="${w-P.r}" y1="${Y(band)}" y2="${Y(band)}" stroke-dasharray="4 4"/>`;
  series.forEach(s=>{const p=s.points.slice().sort((a,b)=>a[0]-b[0]);if(!p.length)return;const d=p.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('');
    if(s.area)g+=`<path d="${d}L${X(p[p.length-1][0])} ${Y(y0)}L${X(p[0][0])} ${Y(y0)}Z" fill="${s.color}" opacity=".12"/>`;
    g+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width||2.6}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(!s.noDots)p.forEach(q=>{g+=`<circle cx="${X(q[0])}" cy="${Y(q[1])}" r="4" fill="var(--bg)" stroke="${s.color}" stroke-width="2.2" data-tip="<b>${esc(s.name)}</b>${esc(xFmt(q[0]))}: ${esc(yFmt(q[1]))}"/>`})});
  return`<svg class="chart" viewBox="0 0 ${w} ${h}">${g}</svg>`+(series.length>1?`<div class="legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`:'');
}
function scatter({pts,w=760,h=420,xl,yl,xf=v=>f(v,1),yf=v=>f(v,1),invertY,avg=true,diag}){
  if(!pts.length)return'<div class="empty">Δεν υπάρχουν δεδομένα</div>';
  const P={l:48,r:20,t:16,b:42},xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  let x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const px=(x1-x0)*.07||1,py=(y1-y0)*.08||1;x0-=px;x1+=px;y0-=py;y1+=py;
  if(diag){x0=y0=Math.min(x0,y0);x1=y1=Math.max(x1,y1)}
  const X=v=>P.l+(v-x0)/(x1-x0)*(w-P.l-P.r),Y=v=>{const r=(v-y0)/(y1-y0);return invertY?P.t+r*(h-P.t-P.b):h-P.b-r*(h-P.t-P.b)};
  let g='';ticks(y0,y1,5).forEach(t=>{g+=`<line class="gr" x1="${P.l}" x2="${w-P.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${P.l-8}" y="${Y(t)+4}" text-anchor="end">${yf(t)}</text>`});
  ticks(x0,x1,7).forEach(t=>{g+=`<line class="gr" y1="${P.t}" y2="${h-P.b}" x1="${X(t)}" x2="${X(t)}"/><text x="${X(t)}" y="${h-P.b+16}" text-anchor="middle">${xf(t)}</text>`});
  if(avg){const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;g+=`<line x1="${X(mx)}" x2="${X(mx)}" y1="${P.t}" y2="${h-P.b}" stroke="var(--hot)" stroke-dasharray="4 5" opacity=".55"/><line x1="${P.l}" x2="${w-P.r}" y1="${Y(my)}" y2="${Y(my)}" stroke="var(--hot)" stroke-dasharray="4 5" opacity=".55"/>`}
  if(diag)g+=`<line x1="${X(x0)}" y1="${Y(x0)}" x2="${X(x1)}" y2="${Y(x1)}" stroke="var(--hot)" stroke-dasharray="5 5" opacity=".7"/>`;
  pts.forEach(p=>{const t=`data-tip="${esc(p.tip||`<b>${esc(p.label)}</b>${xl}: ${xf(p.x)} · ${yl}: ${yf(p.y)}`)}"`;const a=p.href?`<a href="${p.href}">`:'',z=p.href?'</a>':'';
    if(p.img){const s=p.s||30;g+=`${a}<image href="${p.img}" x="${X(p.x)-s/2}" y="${Y(p.y)-s/2}" width="${s}" height="${s}" ${t}/>${z}`}
    else g+=`${a}<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r||5}" fill="${p.color||'var(--hot)'}" fill-opacity="${p.op??.75}" stroke="${p.stroke||'rgba(0,0,0,.4)'}" ${t}/>${z}`;
    if(p.tag)g+=`<text x="${X(p.x)+(p.r||5)+4}" y="${Y(p.y)+4}" style="fill:var(--text);font-weight:600">${esc(p.tag)}</text>`});
  g+=`<text x="${(w+P.l)/2}" y="${h-4}" text-anchor="middle" style="font-weight:700;letter-spacing:.08em">${esc(xl)}</text><text transform="translate(12 ${(h-P.b+P.t)/2}) rotate(-90)" text-anchor="middle" style="font-weight:700;letter-spacing:.08em">${esc(yl)}${invertY?' (↑ καλύτερα)':''}</text>`;
  return`<svg class="chart" viewBox="0 0 ${w} ${h}">${g}</svg>`;
}
function radar({axes,series,size=360}){
  const c=size/2,R=c-58,a=i=>-Math.PI/2+i*2*Math.PI/axes.length,pt=(i,v)=>[c+Math.cos(a(i))*R*v,c+Math.sin(a(i))*R*v];let g='';
  [.25,.5,.75,1].forEach(l=>{g+=`<polygon points="${axes.map((_,i)=>pt(i,l).join(',')).join(' ')}" fill="none" class="gr"/>`});
  axes.forEach((ax,i)=>{const [x,y]=pt(i,1),[lx,ly]=pt(i,1.2);g+=`<line class="gr" x1="${c}" y1="${c}" x2="${x}" y2="${y}"/><text x="${lx}" y="${ly+4}" text-anchor="middle" style="font-weight:700;font-size:10.5px">${esc(ax)}</text>`});
  series.forEach(s=>{g+=`<polygon points="${s.vals.map((v,i)=>pt(i,Math.max(.02,Math.min(1,v))).join(',')).join(' ')}" fill="${s.color}" fill-opacity=".18" stroke="${s.color}" stroke-width="2.4"/>`});
  return`<svg class="chart" viewBox="0 0 ${size} ${size}" style="max-width:${size+40}px;margin:auto">${g}</svg><div class="legend" style="justify-content:center">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}
const bar=(v,max,color)=>`<div class="bar"><i style="width:${Math.max(0,Math.min(100,(v/(max||1))*100))}%;${color?`background:${color}`:''}"></i></div>`;

/* ---------- shared fragments ---------- */
function gameCard(g,fc){
  const live=g.state==='in',fin=g.state==='post',a=g.away,h=g.home,ca=tColor(a.id,a.abbr),ch=tColor(h.id,h.abbr);
  const st=live?`<span class="pill live">${esc(g.status||'LIVE')}</span>`:fin?`<span class="pill">Τελικό</span>`:`<span class="pill hot">${time(g.date)} ATH</span>`;
  const side=(t,c)=>`<div class="side ${fin&&!t.winner?'lose':''}"><img src="${t.logo||LOGO(t.abbr)}" alt="" loading="lazy" ${hideErr}><div class="nm"><b>${esc(t.short||t.name)}</b><small>${esc(t.record||'')}</small></div><div class="sc">${t.score??''}</div></div>`;
  let model='';
  if(fc?.forecast){const p=fc.forecast.homeWinProb,hp=Math.round(p*100);
    let check='';if(fin&&n(a.score)!==null){const hw=+h.score>+a.score,ok=(p>=.5)===hw;check=`<span class="${ok?'good':'bad'}">${ok?'✓ σωστό':'✗ λάθος'}</span>`}
    model=`<div><div class="wpbar"><i style="width:${100-hp}%;background:${ca}"></i><i style="width:${hp}%;background:${ch}"></i></div><div class="wp-l"><span>${a.abbr} ${100-hp}%</span><span class="dim">Μοντέλο · ${Math.round(fc.forecast.awayPts)}–${Math.round(fc.forecast.homePts)} ${check}</span><span>${hp}% ${h.abbr}</span></div></div>`}
  return`<a class="game fade" href="#/game/${g.id}" style="--ca:${ca};--ch:${ch}"><div class="game-top">${st}<span>${esc(g.venue||'')}</span></div>${side(a,ca)}${side(h,ch)}${model}</a>`;
}
function playerCard(p,i){
  const c=tColor(p.teamId,p.team);
  return`<a class="pc fade" href="#/player/${p.id}" style="--tc:${c}"><div class="bg"></div><div class="rnk">${i+1}</div><img class="lg" src="${LOGO(p.team)}" alt="" ${hideErr}><img class="hs" src="${p.headshot||HS(p.id)}" alt="" loading="lazy" ${silh}><div class="info"><b>${esc(p.name)}</b><div class="ln"><span><em>${f(p.ppg)}</em> PTS</span><span><em>${f(p.rpg)}</em> REB</span><span><em>${f(p.apg)}</em> AST</span><span><em>${f(p.tsPct)}</em> TS%</span></div></div></a>`;
}
function standingsRows(group){
  return(group.entries||[]).map(e=>{const s={};(e.stats||[]).forEach(x=>s[x.name]=x.value);return{...e,s}}).sort((a,b)=>(n(a.s.playoffSeed)||99)-(n(b.s.playoffSeed)||99));
}
const confName=s=>/east/i.test(s)?'Ανατολή':/west/i.test(s)?'Δύση':s;

/* ---------- ticker ---------- */
async function ticker(){
  const d=await safe(api('data?type=scoreboard'));const g=d?.games||[];
  fill('#ticker',g.map(x=>{const live=x.state==='in',fin=x.state==='post';const row=t=>`<div class="tk-row ${fin&&!t.winner?'lose':''}"><span><img src="${t.logo||LOGO(t.abbr)}" alt="" ${hideErr}>${esc(t.abbr)}</span><b>${t.score??''}</b></div>`;
    return`<a class="tk" href="#/game/${x.id}"><div class="tk-st ${live?'live':''}">${live?esc(x.status):fin?'Τελικό':time(x.date)}</div>${row(x.away)}${row(x.home)}</a>`}).join(''));
}

/* ---------- views ---------- */
const V={};
V.home=async()=>{
  const t=token;
  view.innerHTML=`<section class="hero" id="hero"><div class="hero-bg"></div><div class="hero-txt"><div><div class="eyebrow">NBA ATLAS · ΣΕΖΟΝ 2026–27</div><h1 class="h1" style="margin-top:14px">The league,<br><span>decoded.</span></h1><p class="lede" style="margin-top:16px">Live σκορ, power index, MVP race, προβλέψεις αγώνων με έλεγχο ακρίβειας και GOAT ranking που ρυθμίζεις εσύ.</p></div><div class="kpis" id="kpis">${skel(50)}</div></div><div class="hero-art" id="heroart"></div></section>
  <section class="sec">${secH('Σήμερα','Το πρόγραμμα',['#/games','Όλοι οι αγώνες'],'Ώρες Ελλάδας. Η μπάρα δείχνει την πιθανότητα νίκης του μοντέλου, κλειδωμένη πριν το τζάμπολ.')}<div class="games" id="hgames">${skel(170,3)}</div></section>
  <section class="sec">${secH('MVP Race','Οι κορυφαίοι της σεζόν',['#/players','Players Lab'],'Ταξινόμηση με τον Atlas Index: παραγωγή, αποδοτικότητα (TS%) και επιτυχία ομάδας.')}<div class="pcards" id="hmvp">${skel(300,4)}</div></section>
  <section class="sec split"><div class="card">${secH('Βαθμολογία','Κορυφή ανά περιφέρεια',['#/standings','Πλήρης πίνακας'])}<div class="grid g2" id="hstand">${skel(200,2)}</div></div><div class="card">${secH('Τίτλος 2027','Ποιος παίρνει το δαχτυλίδι',['#/power','Power'])}<div id="hodds">${skel(220)}</div></div></section>
  <section class="sec">${secH('GOAT Index','Οι μεγαλύτεροι όλων των εποχών',['#/goat','Φτιάξε το δικό σου'])}<div id="hgoat">${skel(360)}</div></section>
  <section class="sec">${secH('Ειδήσεις','Τι γράφεται τώρα')}<div class="news" id="hnews">${skel(220,3)}</div></section>`;
  await teams();if(t!==token)return;
  const [sb,fc,pw]=[safe(api('data?type=scoreboard')),forecasts(),safe(api('power'))];
  Promise.all([sb,fc]).then(([s,F])=>{if(t!==token)return;const g=s?.games||[];
    fill('#hgames',g.length?g.slice(0,g.length>=8?8:g.length).map(x=>gameCard(x,F.map[x.id])).join(''):'<div class="empty">Δεν υπάρχουν αγώνες σήμερα.</div>');
    const sm=F.data?.summary;fill('#kpis',`<div class="kpi"><b>${g.length}</b><small>Αγώνες σήμερα</small></div><div class="kpi"><b class="${g.some(x=>x.state==='in')?'bad':''}">${g.filter(x=>x.state==='in').length}</b><small>Live τώρα</small></div>${sm?`<div class="kpi"><b>${pc(sm.winnerAccuracy,0)}</b><small>Ακρίβεια μοντέλου · ${sm.n} αγ.</small></div><div class="kpi"><b>${f(sm.brier,3)}</b><small>Brier score</small></div>`:''}`)});
  pw.then(p=>{if(t!==token)return;if(!p){fill('#hmvp',errBox('','Power feed'));fill('#hodds','');fill('#heroart','');return}
    const top=(p.players||[]).filter(x=>x.eligible!==false).sort((a,b)=>b.index-a.index);const lead=top[0];
    if(lead){const c=tColor(lead.teamId,lead.team);$('#hero').style.setProperty('--tc',c);fill('#heroart',`<div class="bignum">#1</div><img src="${lead.headshot||HS(lead.id)}" alt="${esc(lead.name)}" ${silh}><a class="hero-tag" href="#/player/${lead.id}"><span class="eyebrow">MVP ladder · #1</span><b>${esc(lead.name)}</b><span class="muted">${f(lead.ppg)} PTS · ${f(lead.rpg)} REB · ${f(lead.apg)} AST · TS ${f(lead.tsPct)}%</span></a>`)}
    fill('#hmvp',top.slice(0,10).map(playerCard).join(''));
    fill('#hodds',oddsBars(p,null,7));
    safe(api('markets?type=title')).then(m=>{if(t===token&&m)fill('#hodds',oddsBars(p,m,7))})});
  safe(api('data?type=standings')).then(s=>{if(t!==token)return;fill('#hstand',(s?.groups||[]).map(g=>`<div><div class="lbl">${confName(g.name)}</div><div class="mini-list">${standingsRows(g).slice(0,10).map((e,i)=>`<a href="#/team/${e.team.id}" class="${i===6?'pin':''}"><span class="rk">${i+1}</span><img src="${e.team.logo||LOGO(e.team.abbr)}" style="border-radius:0;background:none;width:30px;height:30px" ${hideErr}><span style="font-weight:700">${esc(e.team.short||e.team.abbr)}</span><span class="r"><b>${e.s.wins}-${e.s.losses}</b></span></a>`).join('')}</div></div>`).join('')||errBox('','Standings'))});
  goatData().then(G=>{if(t!==token)return;fill('#hgoat',G?podium(rankGoat(G,PRESETS.balanced).slice(0,3)):errBox('','GOAT feed'))});
  Promise.all([safe(api('data?type=news')),safe(api('sideline'))]).then(([e,d])=>{if(t!==token)return;const seen=new Set(),all=[...(e?.data?.stories||e?.stories||[]),...(d?.stories||[])].filter(x=>{const k=(x.title||'').toLowerCase().slice(0,60);if(seen.has(k))return false;seen.add(k);return true});const st=[...all.filter(x=>x.image),...all.filter(x=>!x.image)].slice(0,5);fill('#hnews',st.length?st.map((s,i)=>`<a class="nw ${i===0?'big':''} ${s.image?'':'noimg'}" href="${esc(s.url)}" target="_blank" rel="noopener"><div class="im">${s.image?`<img src="${esc(s.image)}" alt="" loading="lazy" ${hideErr}>`:''}<div class="ph" style="${s.image?'z-index:-1':''}">NBA</div></div><div class="tx"><span class="eyebrow" style="color:var(--muted)">${esc(s.source)}</span><b>${esc(s.title)}</b><small>${s.publishedAt?day(s.publishedAt)+' · '+time(s.publishedAt):''} ↗</small></div></a>`).join(''):'<div class="empty">Οι ειδήσεις δεν είναι διαθέσιμες.</div>')});
};
function oddsBars(p,m,limit=10){
  const ts=(p.teams||[]).slice().sort((a,b)=>(b.titleShare||0)-(a.titleShare||0)).slice(0,limit);
  const poly={},kal={};
  (m?.sources?.polymarket?.rows||[]).forEach(r=>poly[norm(r.name)]=r.price);
  const KC={GSW:'GS',NYK:'NY',SAS:'SA',NOP:'NO',UTA:'UTAH',WAS:'WSH',PHO:'PHX',BRK:'BKN'};
  (m?.sources?.kalshi?.rows||[]).forEach(r=>kal[KC[r.code]||r.code]=r.price);
  const max=Math.max(...ts.map(t=>Math.max(t.titleShare||0,poly[norm(t.name)]||0,kal[t.abbr]||0)),1);
  const row=(lbl,v,c)=>v==null?'':`<div style="display:grid;grid-template-columns:72px 1fr 46px;gap:10px;align-items:center;font-size:11.5px;color:var(--muted);font-weight:600"><span>${lbl}</span>${bar(v,max,c)}<span style="text-align:right;color:var(--text)">${f(v,1)}%</span></div>`;
  return`<div style="display:flex;flex-direction:column;gap:14px">${ts.map(t=>`<a href="#/team/${t.id}" style="display:grid;grid-template-columns:36px 1fr;gap:12px;align-items:center"><img src="${t.logo||LOGO(t.abbr)}" style="width:32px;height:32px" ${hideErr}><div style="display:flex;flex-direction:column;gap:4px"><b style="font-size:13.5px">${esc(t.name)} <span class="dim" style="font-weight:600">${t.wins}-${t.losses}</span></b>${row('Atlas',t.titleShare,'linear-gradient(90deg,var(--hot),var(--hot2))')}${m?row('Polymarket',poly[norm(t.name)]??null,'var(--ice)')+row('Kalshi',kal[t.abbr]??null,'var(--violet)'):''}</div></a>`).join('')}</div><p class="note">Atlas = ευρετικό μοντέλο ισχύος (όχι στοίχημα). Polymarket/Kalshi = τιμές αγορών, μόνο ενδεικτικά. Καμία συναλλαγή.</p>`;
}

V.games=async(q)=>{
  const t=token;const d=q.date||'';const date=d?new Date(+d.slice(0,4),+d.slice(4,6)-1,+d.slice(6,8)):null;
  const shift=k=>{const b=date||new Date();const x=new Date(b);x.setDate(x.getDate()+k);return x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0')};
  view.innerHTML=`${secH('Game center','Αγώνες',null,'Σκορ, ώρες Ελλάδας και πρόβλεψη μοντέλου για κάθε αγώνα. Πάτα έναν αγώνα για box score και γράφημα πιθανότητας νίκης.')}
  <div class="datebar" style="margin-bottom:20px"><button onclick="location.hash='#/games?date=${shift(-1)}'">← Προηγ.</button><span class="d">${date?date.toLocaleDateString('el-GR',{weekday:'long',day:'numeric',month:'long'}):'Σήμερα (ESPN)'}</span><button onclick="location.hash='#/games?date=${shift(1)}'">Επόμ. →</button>${d?`<button onclick="location.hash='#/games'">Σήμερα</button>`:''}</div><div class="games" id="glist">${skel(170,6)}</div>`;
  await teams();const [s,F]=await Promise.all([safe(api('data?type=scoreboard'+(d?'&date='+d:''))),forecasts()]);if(t!==token)return;
  const g=s?.games||[];fill('#glist',s?g.length?g.map(x=>gameCard(x,F.map[x.id])).join(''):'<div class="empty">Καμία αναμέτρηση αυτή τη μέρα.</div>':errBox('','Scoreboard'));
};

V.game=async(q,id)=>{
  const t=token;view.innerHTML=skel(300)+'<div style="height:16px"></div>'+skel(300);
  await teams();const [d,F]=await Promise.all([safe(api('data?type=game&id='+id)),forecasts()]);if(t!==token)return;
  if(!d){view.innerHTML=errBox('','Το game feed δεν είναι διαθέσιμο');return}
  const comp=d.header?.competitions?.[0]||{},cs=comp.competitors||[],st=comp.status?.type||{};
  const side=k=>{const c=cs.find(x=>x.homeAway===k)||{},tm=c.team||{};return{id:String(tm.id||''),abbr:tm.abbreviation||'',name:tm.displayName||'',logo:tm.logos?.[0]?.href||LOGO(tm.abbreviation),score:c.score,winner:c.winner,rec:c.record?.[0]?.summary||''}};
  const a=side('away'),h=side('home'),ca=tColor(a.id,a.abbr),ch=tColor(h.id,h.abbr),fc=F.map[id];
  const big=(s,c)=>`<a href="#/team/${s.id}" style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center"><img src="${s.logo}" style="width:120px;height:120px;filter:drop-shadow(0 10px 30px ${c}66)" ${hideErr}><b class="h3">${esc(s.name)}</b><span class="muted">${esc(s.rec)}</span></a>`;
  const per=d.periods||[],pa=per.find(p=>p.homeAway==='away'),ph=per.find(p=>p.homeAway==='home');
  const ls=pa&&ph&&pa.linescores.length?`<div class="tbl-wrap"><table><thead><tr><th></th>${pa.linescores.map(p=>`<th>${p.period>4?'OT'+(p.period-4):'Q'+p.period}</th>`).join('')}<th>T</th></tr></thead><tbody>${[[a,pa],[h,ph]].map(([s,p])=>`<tr><td><div class="tcell"><img src="${s.logo}" ${hideErr}>${esc(s.abbr)}</div></td>${p.linescores.map(x=>`<td>${x.points}</td>`).join('')}<td><b>${s.score??''}</b></td></tr>`).join('')}</tbody></table></div>`:'';
  const wp=(d.winProbability||[]);let wpc='';
  if(wp.length>5){const pts=wp.map((p,i)=>[i,p.homeWinPercentage*100]);wpc=lineChart({series:[{name:h.abbr+' πιθανότητα νίκης',color:ch,points:pts,area:true,noDots:true}],yMin:0,yMax:100,band:50,xFmt:i=>{const p=wp[i];return p?'Q'+p.period:''},yFmt:v=>Math.round(v)+'%'})}
  const box=(d.players||[]).map(tp=>{const grp=tp.groups?.[0];if(!grp)return'';const L=grp.labels||[];
    return`<div class="card flat"><div style="padding:16px 18px 0" class="tcell"><img src="${tp.team?.logo||LOGO(tp.team?.abbr)}" ${hideErr}><span class="h3">${esc(tp.team?.name)}</span></div><div class="tbl-wrap"><table><thead><tr><th>Παίκτης</th>${L.map(l=>`<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${grp.athletes.map((r,i)=>`<tr ${i===4?'class="seedline"':''}><td><a class="tcell" href="#/player/${r.athlete?.id}"><img class="hs" src="${r.athlete?.headshot||HS(r.athlete?.id)}" loading="lazy" ${silh}>${esc(r.athlete?.name)}<span class="dim" style="font-size:11px">${esc(r.athlete?.position||'')}</span></a></td>${(r.stats.length?r.stats:L.map(()=>'—')).map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`}).join('');
  let fcHtml='';if(fc?.forecast){const F2=fc.forecast;fcHtml=`<div class="card"><div class="lbl">Πρόβλεψη μοντέλου · κλειδώθηκε ${fc.lockedAt?day(fc.lockedAt)+' '+time(fc.lockedAt):''}</div><div class="kpis"><div class="kpi"><b>${Math.round(F2.awayPts)}–${Math.round(F2.homePts)}</b><small>Προβλ. σκορ ${esc(a.abbr)}–${esc(h.abbr)}</small></div><div class="kpi"><b>${Math.round(F2.homeWinProb*100)}%</b><small>Νίκη ${esc(h.abbr)}</small></div><div class="kpi"><b>${f(F2.total,0)}</b><small>Σύνολο πόντων</small></div><div class="kpi"><b>${f(F2.marginLow,0)} / +${f(F2.marginHigh,0)}</b><small>80% διάστημα διαφοράς</small></div></div>${fc.actual?`<p class="note">Τελικό: ${fc.actual.away}–${fc.actual.home}. Λάθος σκορ: ${Math.abs(fc.actual.home-F2.homePts).toFixed(1)} / ${Math.abs(fc.actual.away-F2.awayPts).toFixed(1)} πόντοι.</p>`:''}</div>`}
  view.innerHTML=`<section class="hero fade" style="grid-template-columns:1fr;min-height:0;--tc:${ch}"><div class="hero-bg" style="background:radial-gradient(500px 340px at 15% 50%,${ca}55,transparent 70%),radial-gradient(500px 340px at 85% 50%,${ch}55,transparent 70%)"></div><div class="hero-txt" style="padding:36px"><div style="text-align:center"><span class="pill ${st.state==='in'?'live':''}">${esc(st.detail||st.shortDetail||'')}</span></div><div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px">${big(a,ca)}<div class="h1" style="text-align:center;font-size:clamp(44px,8vw,96px)">${a.score??'–'}<span class="dim"> : </span>${h.score??'–'}</div>${big(h,ch)}</div></div></section>
  <section class="sec grid g2">${ls?`<div class="card"><div class="lbl">Σκορ ανά περίοδο</div>${ls}</div>`:''}${fcHtml}</section>
  ${wpc?`<section class="sec card"><div class="lbl">Win probability (ESPN) · ${esc(h.abbr)}</div>${wpc}</section>`:''}
  <section class="sec">${secH('Box score','Οι παίκτες')}<div class="grid" style="gap:16px">${box||'<div class="empty">Το box score θα εμφανιστεί όταν ξεκινήσει ο αγώνας.</div>'}</div></section>`;
};

V.standings=async()=>{
  const t=token;view.innerHTML=`${secH('2026–27','Βαθμολογία',['#/teams','Όλες οι ομάδες'],'1–6 απευθείας playoffs · 7–10 play-in. Η διακεκομμένη γραμμή δείχνει τα όρια.')}<div class="grid g2" id="st">${skel(600,2)}</div><section class="sec card">${secH('Team map','Επίθεση vs Άμυνα',null,'Πόντοι υπέρ (δεξιά = καλύτερα) και πόντοι κατά (πάνω = καλύτερα) ανά αγώνα. Πάνω δεξιά: οι πλήρεις ομάδες.')}<div id="stmap">${skel(400)}</div></section>`;
  await teams();const s=await safe(api('data?type=standings'));if(t!==token)return;if(!s){fill('#st',errBox('','Standings'));return}
  const cols=[['W','wins'],['L','losses'],['PCT','winPercent'],['GB','gamesBehind'],['PPG','avgPointsFor'],['OPP','avgPointsAgainst'],['DIFF','differential'],['HOME','Home'],['ROAD','Road'],['L10','Last Ten Games'],['STRK','streak']];
  fill('#st',s.groups.map(g=>`<div class="card flat"><div style="padding:18px 18px 4px" class="h3">${confName(g.name)}</div><div class="tbl-wrap"><table><thead><tr><th>Ομάδα</th>${cols.map(c=>`<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${standingsRows(g).map((e,i)=>`<tr class="${i===5||i===9?'seedline':''}"><td><a class="tcell" href="#/team/${e.team.id}"><span class="rk">${i+1}</span><img src="${e.team.logo||LOGO(e.team.abbr)}" ${hideErr}>${esc(e.team.short||e.team.name)}</a></td>${cols.map(c=>{let v=e.s[c[1]];if(c[1]==='differential'){const x=n(v);return`<td class="${x>0?'good':x<0?'bad':''}">${x>0?'+':''}${esc(v)}</td>`}return`<td>${esc(v??'—')}</td>`}).join('')}</tr>`).join('')}</tbody></table></div></div>`).join(''));
  const pts=s.groups.flatMap(g=>standingsRows(g)).map(e=>({x:n(e.s.avgPointsFor),y:n(e.s.avgPointsAgainst),img:e.team.logo||LOGO(e.team.abbr),s:34,href:'#/team/'+e.team.id,tip:`<b>${esc(e.team.name)}</b>${e.s.wins}-${e.s.losses} · PPG ${e.s.avgPointsFor} · OPP ${e.s.avgPointsAgainst}`})).filter(p=>p.x!==null&&p.y!==null);
  fill('#stmap',scatter({pts,xl:'Πόντοι υπέρ / αγώνα',yl:'Πόντοι κατά / αγώνα',invertY:true}));
};

V.teams=async()=>{
  const t=token;view.innerHTML=`${secH('30 franchises','Ομάδες',null,'Πάτα μια ομάδα για ρόστερ, στατιστικά και power rating.')}<div id="tg">${skel(400)}</div>`;
  const T=await teams();const s=await safe(api('data?type=standings'));if(t!==token)return;
  const rec={},conf={};(s?.groups||[]).forEach(g=>standingsRows(g).forEach(e=>{rec[e.team.id]=e.s;conf[e.team.id]=confName(g.name)}));
  const by=c=>T.list.filter(x=>conf[x.id]===c).sort((a,b)=>(n(rec[a.id]?.playoffSeed)||99)-(n(rec[b.id]?.playoffSeed)||99));
  const card=x=>`<a class="tm fade" href="#/team/${x.id}" style="--tc:${x.hex}"><img src="${x.logo||LOGO(x.abbr)}" ${hideErr}><div><b>${esc(x.name)}</b><br><small>${rec[x.id]?`${rec[x.id].wins}-${rec[x.id].losses} · #${rec[x.id].playoffSeed}`:''}</small></div></a>`;
  fill('#tg',Object.keys(conf).length?['Ανατολή','Δύση'].map(c=>`<div class="lbl" style="margin-top:22px">${c}</div><div class="teams">${by(c).map(card).join('')}</div>`).join(''):`<div class="teams">${T.list.map(card).join('')}</div>`);
};

V.team=async(q,id)=>{
  const t=token;view.innerHTML=skel(340)+'<div style="height:16px"></div>'+skel(400);
  const T=await teams();const [r,p,s]=await Promise.all([safe(api('data?type=roster&id='+id)),safe(api('power')),safe(api('data?type=standings'))]);if(t!==token)return;
  const tm=T.byId[id]||r?.team;if(!tm){view.innerHTML=errBox('','Η ομάδα δεν βρέθηκε');return}
  const c=tColor(id,tm.abbr),pt=(p?.teams||[]).find(x=>x.id===id),pr=(p?.teams||[]).slice().sort((a,b)=>b.power-a.power).findIndex(x=>x.id===id)+1;
  let srow=null;(s?.groups||[]).forEach(g=>standingsRows(g).forEach(e=>{if(e.team.id===id)srow={...e.s,conf:confName(g.name)}}));
  const ps={};(p?.players||[]).forEach(x=>ps[x.id]=x);
  const roster=(r?.players||[]).map(x=>({...x,st:ps[x.id]})).sort((a,b)=>(b.st?.ppg||0)-(a.st?.ppg||0));
  const tot=roster.reduce((a,x)=>a+(x.st?.ppg||0),0);
  view.innerHTML=`<section class="phero fade" style="--tc:${c}"><div class="bg"></div><div class="art" style="align-items:center"><img class="logo-big" src="${tm.logo||LOGO(tm.abbr)}" ${hideErr}></div><div class="txt"><div class="eyebrow">${esc(srow?.conf||'NBA')} · ${srow?'#'+srow.playoffSeed+' seed':''}</div><h1 class="h1" style="font-size:clamp(42px,6vw,80px)">${esc(tm.name)}</h1><div class="stats-row"><div class="st"><b>${srow?srow.wins+'-'+srow.losses:'—'}</b><small>Ρεκόρ</small></div><div class="st"><b class="${n(srow?.differential)>0?'good':'bad'}">${srow?.differential??'—'}</b><small>Net / αγώνα</small></div><div class="st"><b>${pr||'—'}</b><small>Power rank</small></div><div class="st"><b>${pt?f(pt.titleShare)+'%':'—'}</b><small>Τίτλος (Atlas)</small></div><div class="st"><b>${esc(srow?.['Last Ten Games']||'—')}</b><small>Τελ. 10</small></div><div class="st"><b>${esc(srow?.streak||'—')}</b><small>Σερί</small></div></div></div></section>
  <section class="sec">${secH('Ρόστερ','Οι παίκτες')}<div class="pcards">${roster.map((x,i)=>`<a class="pc fade" href="#/player/${x.id}" style="--tc:${c};min-height:270px"><div class="bg"></div><div class="rnk" style="font-size:44px">${esc(x.jersey||'')}</div><img class="hs" src="${x.headshot||HS(x.id)}" loading="lazy" ${silh}><div class="info"><b>${esc(x.name)}</b><div class="ln"><span>${esc(x.position)}</span>${x.st?`<span><em>${f(x.st.ppg)}</em> PTS</span><span><em>${f(x.st.rpg)}</em> REB</span><span><em>${f(x.st.apg)}</em> AST</span>`:`<span>${esc(x.height)}</span>`}</div></div></a>`).join('')||'<div class="empty">Το ρόστερ δεν είναι διαθέσιμο.</div>'}</div></section>
  ${tot?`<section class="sec card">${secH('Usage','Ποιος κουβαλάει το σκοράρισμα',null,'Μερίδιο του κάθε παίκτη στους πόντους της ομάδας (ανά αγώνα, σε όσους έχουν επαρκή δείγμα).')}<div style="display:flex;flex-direction:column;gap:10px">${roster.filter(x=>x.st?.ppg).map(x=>`<div style="display:grid;grid-template-columns:170px 1fr 70px;gap:12px;align-items:center;font-size:13.5px"><b>${esc(x.name)}</b>${bar(x.st.ppg,roster[0].st.ppg,c)}<span class="muted" style="text-align:right">${f(x.st.ppg/tot*100,0)}%</span></div>`).join('')}</div></section>`:''}`;
};

V.power=async()=>{
  const t=token;view.innerHTML=`${secH('Power index','Η ιεραρχία της λίγκας',null,'Συνδυασμός ρεκόρ, διαφοράς πόντων και πρόσφατης φόρμας. Δίπλα, οι αγορές για τον τίτλο.')}<div class="split"><div class="card flat" id="pw">${skel(600)}</div><div class="card" id="pwodds">${skel(600)}</div></div><section class="sec card">${secH('Δυναμική','Ισχύς vs φόρμα',null,'Οριζόντια: ποσοστό νικών σεζόν. Κάθετα: διαφορά πόντων ανά αγώνα.')}<div id="pwmap">${skel(400)}</div></section>`;
  await teams();const p=await safe(api('power'));if(t!==token)return;if(!p){fill('#pw',errBox('','Power feed'));fill('#pwodds','');return}
  const ts=p.teams.slice().sort((a,b)=>b.power-a.power),mx=Math.max(...ts.map(x=>x.power));
  fill('#pw',`<div class="tbl-wrap"><table><thead><tr><th>Ομάδα</th><th>W-L</th><th>NET</th><th>Φόρμα</th><th class="l">Power</th><th>Τίτλος</th></tr></thead><tbody>${ts.map((x,i)=>`<tr><td><a class="tcell" href="#/team/${x.id}"><span class="rk">${i+1}</span><img src="${x.logo||LOGO(x.abbr)}" ${hideErr}>${esc(x.name)}</a></td><td>${x.wins}-${x.losses}</td><td class="${x.margin>0?'good':'bad'}">${x.margin>0?'+':''}${f(x.margin)}</td><td>${esc(x.recent||'—')}</td><td class="l">${bar(x.power,mx,tColor(x.id,x.abbr))}</td><td><b>${f(x.titleShare)}%</b></td></tr>`).join('')}</tbody></table></div><p class="note" style="padding:0 18px 18px">${esc(p.method||'')}</p>`);
  fill('#pwodds',oddsBars(p,null,12));safe(api('markets?type=title')).then(m=>{if(t===token&&m)fill('#pwodds',oddsBars(p,m,12))});
  fill('#pwmap',scatter({pts:ts.map(x=>({x:x.winPct*(x.winPct<=1?100:1),y:x.margin,img:x.logo||LOGO(x.abbr),s:32,href:'#/team/'+x.id,tip:`<b>${esc(x.name)}</b>${x.wins}-${x.losses} · Net ${f(x.margin)}`})),xl:'Ποσοστό νικών %',yl:'Διαφορά πόντων',xf:v=>f(v,0)}));
};

const PSTATS=[['ppg','PTS'],['rpg','REB'],['apg','AST'],['spg','STL'],['bpg','BLK'],['tsPct','TS%'],['efgPct','eFG%'],['fg','FG%'],['astTo','AST/TO'],['mpg','MIN'],['index','INDEX']];
V.players=async(q)=>{
  const t=token;const st={sort:q.sort||'index',dir:-1,page:0,team:'',term:'',x:'ppg',y:'tsPct',elig:true};
  view.innerHTML=`${secH('Players lab','Όλοι οι παίκτες',null,'Ταξινόμησε, φίλτραρε και φτιάξε το δικό σου γράφημα. Το Atlas Index συνδυάζει παραγωγή, αποδοτικότητα και νίκες.')}
  <div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px"><span class="lbl" style="margin:0">Γράφημα</span><select id="ax">${PSTATS.map(s=>`<option value="${s[0]}">${s[1]}</option>`).join('')}</select><span class="dim">vs</span><select id="ay">${PSTATS.map(s=>`<option value="${s[0]}">${s[1]}</option>`).join('')}</select><label class="muted" style="font-size:13px;display:flex;gap:6px;align-items:center;margin-left:auto"><input type="checkbox" id="el" checked> Μόνο με επαρκές δείγμα</label></div><div id="pchart">${skel(400)}</div></div>
  <section class="sec card flat"><div style="display:flex;gap:10px;flex-wrap:wrap;padding:16px 18px"><label class="search" style="width:240px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="pf" placeholder="Φίλτρο ονόματος…"></label><select id="pt"><option value="">Όλες οι ομάδες</option></select></div><div id="ptable">${skel(500)}</div></section>`;
  await teams();const p=await safe(api('power'));if(t!==token)return;if(!p){fill('#pchart',errBox('','Power feed'));fill('#ptable','');return}
  $('#ax').value=st.x;$('#ay').value=st.y;
  $('#pt').innerHTML+=TEAMS.list.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<option value="${x.abbr}">${esc(x.name)}</option>`).join('');
  const list=()=>p.players.filter(x=>(!st.elig||x.eligible!==false)&&(!st.team||x.team===st.team)&&(!st.term||norm(x.name).includes(norm(st.term))));
  const lbl=k=>PSTATS.find(s=>s[0]===k)?.[1]||k;
  const chart=()=>{const L=list().filter(x=>n(x[st.x])!==null&&n(x[st.y])!==null);const top=new Set(L.slice().sort((a,b)=>b.index-a.index).slice(0,8).map(x=>x.id));
    fill('#pchart',scatter({pts:L.map(x=>({x:x[st.x],y:x[st.y],r:top.has(x.id)?7:4.5,color:tColor(x.teamId,x.team),op:top.has(x.id)?1:.6,stroke:top.has(x.id)?'#fff':'rgba(0,0,0,.4)',tag:top.has(x.id)?x.name.split(' ').slice(-1)[0]:'',href:'#/player/'+x.id,tip:`<b>${esc(x.name)}</b>${esc(x.team)} · ${lbl(st.x)} ${f(x[st.x])} · ${lbl(st.y)} ${f(x[st.y])}`})),xl:lbl(st.x),yl:lbl(st.y)}))};
  const table=()=>{const L=list().sort((a,b)=>st.dir*((n(a[st.sort])??-1e9)-(n(b[st.sort])??-1e9)));const pg=L.slice(st.page*40,st.page*40+40),pages=Math.ceil(L.length/40);
    fill('#ptable',`<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Παίκτης</th><th>GP</th>${PSTATS.map(s=>`<th class="s ${st.sort===s[0]?'sorted':''}" data-k="${s[0]}">${s[1]}${st.sort===s[0]?(st.dir<0?' ↓':' ↑'):''}</th>`).join('')}</tr></thead><tbody>${pg.map((x,i)=>`<tr><td class="dim">${st.page*40+i+1}</td><td class="l"><a class="tcell" href="#/player/${x.id}"><img class="hs" src="${x.headshot||HS(x.id)}" loading="lazy" ${silh}><span>${esc(x.name)}<br><small class="dim">${esc(x.teamName||x.team)}</small></span></a></td><td>${x.games??'—'}</td>${PSTATS.map(s=>`<td ${st.sort===s[0]?'style="color:var(--text);font-weight:700"':''}>${f(x[s[0]],s[0]==='index'||s[0]==='astTo'?2:1)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="pager">${st.page>0?'<button class="more" id="pp">←</button>':''}<span class="muted" style="align-self:center">Σελ. ${st.page+1}/${pages||1} · ${L.length} παίκτες</span>${st.page<pages-1?'<button class="more" id="pn">→</button>':''}</div><div style="height:14px"></div>`);
    $$('#ptable th.s').forEach(th=>th.onclick=()=>{const k=th.dataset.k;st.dir=st.sort===k?-st.dir:-1;st.sort=k;st.page=0;table()});
    $('#pp')&&($('#pp').onclick=()=>{st.page--;table()});$('#pn')&&($('#pn').onclick=()=>{st.page++;table()})};
  $('#ax').onchange=e=>{st.x=e.target.value;chart()};$('#ay').onchange=e=>{st.y=e.target.value;chart()};
  $('#el').onchange=e=>{st.elig=e.target.checked;st.page=0;chart();table()};
  $('#pt').onchange=e=>{st.team=e.target.value;st.page=0;chart();table()};
  $('#pf').oninput=e=>{st.term=e.target.value;st.page=0;table()};
  chart();table();
};

V.player=async(q,id)=>{
  const t=token;view.innerHTML=skel(360)+'<div style="height:16px"></div>'+skel(320);
  await teams();const [d,p,G]=await Promise.all([safe(api('history?type=player&id='+id)),safe(api('power')),goatData()]);if(t!==token)return;
  if(!d){view.innerHTML=errBox('','Ο παίκτης δεν είναι διαθέσιμος από το ESPN');return}
  const ath=d.athlete||{},reg=d.regular||{},rows=reg.seasonRows||[],cur=(p?.players||[]).find(x=>x.id===id);
  const bySeason={};rows.forEach(r=>{const g=n(r.stats.gamesPlayed)||0;if(!bySeason[r.season]||g>(n(bySeason[r.season].stats.gamesPlayed)||0))bySeason[r.season]=r});
  const seasons=Object.values(bySeason).sort((a,b)=>a.season-b.season);const last=seasons[seasons.length-1];
  const tid=cur?.teamId||last?.teamId,c=tColor(tid);
  const ca=reg.careerAverages||{};const s=k=>n(last?.stats?.[k]);
  const aw=(d.awards||[]).filter(x=>x.name).sort((a,b)=>(parseInt(b.count)||0)-(parseInt(a.count)||0));
  const rings=ringsOf(ath.name||'');const gp=(G||[]).find(x=>x.id===id);
  const series=[['avgPoints','Πόντοι','var(--hot)'],['avgRebounds','Ριμπάουντ','var(--ice)'],['avgAssists','Ασίστ','var(--violet)']].map(([k,nm,col])=>({name:nm,color:col,points:seasons.map(r=>[r.season,n(r.stats[k])]).filter(x=>x[1]!==null)}));
  const peak=seasons.reduce((m,r)=>(n(r.stats.avgPoints)||0)>(n(m?.stats.avgPoints)||0)?r:m,null);
  view.innerHTML=`<section class="phero fade" style="--tc:${c}"><div class="bg"></div><div class="art"><img class="hs" src="${ath.headshot||HS(id)}" alt="${esc(ath.name||cur?.name||'')}" ${silh}></div><div class="txt"><div class="eyebrow">${esc([ath.position,ath.height,ath.weight,TEAMS.byId[tid]?.name].filter(Boolean).join(' · '))}</div><h1 class="h1" style="font-size:clamp(42px,6vw,84px)">${esc(ath.name||cur?.name||'')}</h1>
  <div class="stats-row"><div class="st"><b>${f(cur?.ppg??s('avgPoints'))}</b><small>PTS ${last?esc(last.seasonLabel):''}</small></div><div class="st"><b>${f(cur?.rpg??s('avgRebounds'))}</b><small>REB</small></div><div class="st"><b>${f(cur?.apg??s('avgAssists'))}</b><small>AST</small></div>${cur?`<div class="st"><b>${f(cur.tsPct)}</b><small>TS%</small></div><div class="st"><b>${f(cur.efgPct)}</b><small>eFG%</small></div>`:`<div class="st"><b>${f(s('fieldGoalPct'))}</b><small>FG%</small></div>`}<div class="st"><b>${f(ca.avgPoints)}</b><small>Καριέρα PTS</small></div>${d.playoffs?.careerAverages?.avgPoints?`<div class="st"><b>${f(d.playoffs.careerAverages.avgPoints)}</b><small>Playoffs PTS</small></div>`:''}</div>
  <div class="awards">${rings?`<span class="aw"><b>${rings}×</b> Πρωταθλητής</span>`:''}${aw.slice(0,8).map(a=>`<span class="aw"><b>${esc(String(a.count).replace('x','×'))}</b>${esc(a.name)}</span>`).join('')}</div>
  ${gp?`<a class="more" style="align-self:flex-start" href="#/goat?a=${id}">GOAT Index: δες τη θέση του →</a>`:''}</div></section>
  ${seasons.length>1?`<section class="sec card">${secH('Καριέρα','Η τροχιά',null,peak?`Κορυφαία σεζόν σε σκοράρισμα: ${esc(peak.seasonLabel)} με ${f(peak.stats.avgPoints)} πόντους.`:'')}${lineChart({series,xFmt:v=>"'"+String(v).slice(2),yFmt:v=>f(v,0)})}</section>`:''}
  <section class="sec card flat"><div style="padding:18px 18px 0" class="lbl">Σεζόν προς σεζόν · κανονική περίοδος</div><div class="tbl-wrap"><table><thead><tr><th>Σεζόν</th><th>Ομάδα</th><th>GP</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th><th>FT%</th></tr></thead><tbody>${rows.map(r=>{const tm=TEAMS.byId[r.teamId];return`<tr><td>${esc(r.seasonLabel)}</td><td class="l"><div class="tcell">${tm?`<img src="${tm.logo}" ${hideErr}>${esc(tm.abbr)}`:esc(r.teamSlug||'—')}</div></td>${['gamesPlayed','avgMinutes','avgPoints','avgRebounds','avgAssists','avgSteals','avgBlocks','fieldGoalPct','threePointFieldGoalPct','freeThrowPct'].map(k=>`<td ${k==='avgPoints'?'style="font-weight:700;color:var(--text)"':''}>${esc(r.stats[k]??'—')}</td>`).join('')}</tr>`}).join('')}</tbody></table></div></section>`;
};

/* ---------- GOAT ---------- */
const RINGS_EXTRA={'giannis antetokounmpo':1,'shai gilgeous-alexander':1,'kawhi leonard':2,'dwyane wade':3,'hakeem olajuwon':2,'larry bird':3,'dirk nowitzki':1,'wilt chamberlain':2,'isiah thomas':2,'moses malone':1,'oscar robertson':1,'jerry west':1,'kevin garnett':1,'david robinson':2,'elgin baylor':0,'karl malone':0,'charles barkley':0,'allen iverson':0,'james harden':0,'russell westbrook':0,'chris paul':0,'john stockton':0,'luka doncic':0,'anthony edwards':0,'cooper flagg':0,'victor wembanyama':0};
const RINGS=Object.fromEntries(Object.entries(A.rings||{}).map(([k,v])=>[norm(k),v]));
const ringsOf=name=>{const k=norm(name);return RINGS[k]??RINGS_EXTRA[k]??0};
const COMP=[['rings','Δαχτυλίδια','#ff5a1f'],['mvp','MVP','#ff8a3d'],['fmvp','Finals MVP','#ffc46b'],['allnba','All-NBA','#7cc4ff'],['peak','Peak σκοράρισμα','#a98bff'],['career','Καριέρα PPG','#5ee0c1'],['versa','Ριμπ.+Ασίστ','#22d39a'],['longevity','Μακροζωία','#9aa4b5'],['dpoy','DPOY','#ff4d6a']];
const PRESETS={balanced:{rings:18,mvp:18,fmvp:14,allnba:16,peak:12,career:8,versa:6,longevity:6,dpoy:2},rings:{rings:40,mvp:12,fmvp:22,allnba:8,peak:6,career:4,versa:2,longevity:4,dpoy:2},peak:{rings:8,mvp:24,fmvp:12,allnba:12,peak:26,career:10,versa:6,longevity:0,dpoy:2},longevity:{rings:12,mvp:10,fmvp:8,allnba:24,peak:6,career:8,versa:8,longevity:22,dpoy:2},stats:{rings:4,mvp:8,fmvp:4,allnba:8,peak:28,career:26,versa:18,longevity:4,dpoy:0}};
let GOAT=null;
function goatData(){if(GOAT)return Promise.resolve(GOAT);return safe(api('goat')).then(d=>{if(!d?.players)return null;GOAT=d.players.map(p=>({...p,rings:ringsOf(p.name),allnba:(p.allNBA1||0)+.6*(p.allNBA2||0),versa:(p.careerRPG||0)+(p.careerAPG||0)}));return GOAT})}
function rankGoat(G,W){
  const raw=p=>({rings:p.rings,mvp:p.mvp||0,fmvp:p.finalsMVP||0,allnba:p.allnba,peak:p.peakPPG||0,career:p.careerPPG||0,versa:p.versa,longevity:p.games||0,dpoy:p.dpoy||0});
  const R=G.map(raw),mx={},mn={};COMP.forEach(([k])=>{const v=R.map(r=>r[k]);mx[k]=Math.max(...v);mn[k]=['peak','career','versa','longevity'].includes(k)?Math.min(...v)*.85:0});
  const tw=COMP.reduce((a,[k])=>a+(W[k]||0),0)||1;
  return G.map((p,i)=>{const parts={};let sc=0;COMP.forEach(([k])=>{const v=(R[i][k]-mn[k])/((mx[k]-mn[k])||1);parts[k]=Math.max(0,v);sc+=Math.max(0,v)*(W[k]||0)});return{...p,raw:R[i],parts,score:100*sc/tw}}).sort((a,b)=>b.score-a.score);
}
function podium(top){const o=[top[1],top[0],top[2]],cl=['p2','p1','p3'],pl=[2,1,3];return`<div class="podium">${o.map((p,i)=>p?`<a class="pod ${cl[i]} fade" href="#/player/${p.id}"><div class="bg"></div><div class="place">${pl[i]}</div><img src="${HS(p.id)}" alt="${esc(p.name)}" loading="lazy" ${silh}><div class="info"><b>${esc(p.name)}</b><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="muted" style="font-size:12.5px;font-weight:600">${p.rings}× 🏆 · ${p.mvp} MVP · ${f(p.careerPPG)} PPG</span><span class="score">${f(p.score)}</span></div></div></a>`:'').join('')}</div>`}
V.goat=async(q)=>{
  const t=token;const W={...PRESETS.balanced};let filt='all';
  view.innerHTML=`${secH('GOAT Index','Ποιος είναι ο μεγαλύτερος;',null,'Δεν υπάρχει μία απάντηση, υπάρχουν κριτήρια. Ρύθμισε τα βάρη και η κατάταξη αλλάζει ζωντανά. Δεδομένα: βραβεία ESPN, μέσοι όροι καριέρας, πρωταθλήματα NBA.com.')}
  <div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:18px"><div class="seg" id="presets">${[['balanced','Ισορροπημένο'],['rings','Ring culture'],['peak','Peak'],['longevity','Μακροζωία'],['stats','Καθαρά νούμερα']].map(([k,l],i)=>`<button data-p="${k}" class="${i?'':'on'}">${l}</button>`).join('')}</div><div class="seg" id="gf"><button data-f="all" class="on">Όλοι</button><button data-f="active">Ενεργοί</button><button data-f="retired">Θρύλοι</button></div></div><div class="sliders" id="sl"></div></div>
  <section class="sec" id="gpod">${skel(400)}</section><section class="sec card flat" id="gtab">${skel(500)}</section>
  <section class="sec card">${secH('Head to head','Σύγκριση δύο θρύλων',null,'Κάθε άξονας είναι κανονικοποιημένος στο 0–1 ως προς τον καλύτερο της λίστας.')}<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><select id="ga"></select><select id="gb"></select></div><div class="grid g2" style="align-items:center" id="gcmp"></div></section>
  <p class="note">Shortlist ${'~40'} παικτών, όχι πλήρης κάλυψη. All-NBA = 1η ομάδα + 0,6 × 2η. Τα βραβεία των παλαιότερων εποχών (π.χ. πριν το Finals MVP του 1969) μπορεί να είναι ελλιπή. Τα βάρη είναι εκδοτική επιλογή, όχι επίσημη κατάταξη.</p>`;
  const G=await goatData();if(t!==token)return;if(!G){fill('#gpod',errBox('','GOAT feed'));return}
  const sl=()=>fill('#sl',COMP.map(([k,l,c])=>`<div class="sl"><label><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-right:6px"></i>${l}</span><b>${W[k]}</b></label><input type="range" min="0" max="40" value="${W[k]}" data-k="${k}"></div>`).join(''));
  const opts=G.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('#ga').innerHTML=opts;$('#gb').innerHTML=opts;
  const render=()=>{const R=rankGoat(G,W).filter(p=>filt==='all'||(filt==='active'?p.active:!p.active));
    fill('#gpod',podium(R.slice(0,3)));
    fill('#gtab',`<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Παίκτης</th><th class="l">Σύνθεση σκορ</th><th>Score</th><th>🏆</th><th>MVP</th><th>FMVP</th><th>All-NBA 1st</th><th>Peak PPG</th><th>PPG</th><th>GP</th></tr></thead><tbody>${R.map((p,i)=>`<tr><td class="rk">${i+1}</td><td class="l"><a class="tcell" href="#/player/${p.id}"><img class="hs" src="${HS(p.id)}" alt="${esc(p.name)}" loading="lazy" ${silh}>${esc(p.name)}${p.active?' <span class="pill hot" style="padding:2px 7px;font-size:9.5px">active</span>':''}</a></td><td class="l"><div class="stack">${COMP.map(([k,l,c])=>{const w=(p.parts[k]*(W[k]||0));return w>0?`<i style="width:${w/ (COMP.reduce((a,[kk])=>a+(W[kk]||0),0)||1)*100}%;background:${c}" data-tip="<b>${l}</b>${f(p.parts[k]*100,0)}/100"></i>`:''}).join('')}</div></td><td><b style="font-family:var(--display);font-size:20px;font-weight:400;color:var(--hot)">${f(p.score)}</b></td><td>${p.rings}</td><td>${p.mvp}</td><td>${p.finalsMVP}</td><td>${p.allNBA1}</td><td>${f(p.peakPPG)}</td><td>${f(p.careerPPG)}</td><td>${p.games??'—'}</td></tr>`).join('')}</tbody></table></div>`);
    cmp(R)};
  const cmp=(R)=>{R=R||rankGoat(G,W);const A1=R.find(p=>p.id===$('#ga').value),B1=R.find(p=>p.id===$('#gb').value);if(!A1||!B1)return;
    const pos=p=>rankGoat(G,W).findIndex(x=>x.id===p.id)+1;
    const card=(p,c)=>`<a href="#/player/${p.id}" style="display:flex;align-items:center;gap:14px"><img src="${HS(p.id)}" alt="${esc(p.name)}" style="width:90px;height:66px;object-fit:cover;object-position:top;border-radius:12px;background:${c}33" ${silh}><div><b class="h3" style="color:${c}">${esc(p.name)}</b><div class="muted" style="font-size:13px">#${pos(p)} · Score ${f(p.score)} · ${p.rings}× 🏆 · ${p.mvp} MVP · ${f(p.careerPPG)} PPG</div></div></a>`;
    fill('#gcmp',`<div>${radar({axes:COMP.map(c=>c[1]),series:[{name:A1.name,color:'#ff5a1f',vals:COMP.map(([k])=>A1.parts[k])},{name:B1.name,color:'#7cc4ff',vals:COMP.map(([k])=>B1.parts[k])}]})}</div><div style="display:flex;flex-direction:column;gap:18px">${card(A1,'#ff5a1f')}${card(B1,'#7cc4ff')}<table><tbody>${[['Δαχτυλίδια','rings'],['MVP','mvp'],['Finals MVP','finalsMVP'],['All-NBA 1st','allNBA1'],['DPOY','dpoy'],['Peak PPG','peakPPG'],['Καριέρα PPG','careerPPG'],['RPG','careerRPG'],['APG','careerAPG'],['Αγώνες','games'],['Σεζόν','seasons']].map(([l,k])=>{const a=n(A1[k]),b=n(B1[k]);return`<tr><td class="l" style="color:${a>b?'#ff5a1f':'inherit'};font-weight:${a>b?800:400}">${f(a,Number.isInteger(a)?0:1)}</td><td style="text-align:center" class="muted">${l}</td><td style="color:${b>a?'#7cc4ff':'inherit'};font-weight:${b>a?800:400}">${f(b,Number.isInteger(b)?0:1)}</td></tr>`}).join('')}</tbody></table></div>`)};
  sl();
  const pre=q.a&&G.find(p=>p.id===q.a);$('#ga').value=pre?pre.id:(G.find(p=>p.name==='Michael Jordan')||G[0]).id;$('#gb').value=(G.find(p=>p.name==='LeBron James'&&p.id!==$('#ga').value)||G.find(p=>p.id!==$('#ga').value)).id;
  render();
  $('#sl').oninput=e=>{const k=e.target.dataset.k;if(!k)return;W[k]=+e.target.value;e.target.previousElementSibling.querySelector('b').textContent=W[k];$$('#presets button').forEach(b=>b.classList.remove('on'));render()};
  $('#presets').onclick=e=>{const b=e.target.closest('button');if(!b)return;Object.assign(W,PRESETS[b.dataset.p]);$$('#presets button').forEach(x=>x.classList.toggle('on',x===b));sl();render()};
  $('#gf').onclick=e=>{const b=e.target.closest('button');if(!b)return;filt=b.dataset.f;$$('#gf button').forEach(x=>x.classList.toggle('on',x===b));render()};
  $('#ga').onchange=$('#gb').onchange=()=>cmp();
};

/* ---------- HISTORY ---------- */
V.history=async()=>{
  const fr=A.finals||[],tm=A.teams||{};const cur=c=>tm[c]?.[1]||c,nm=c=>tm[c]?.[0]||c;
  const titles={};fr.forEach(r=>{const k=cur(r[1]);titles[k]=(titles[k]||0)+1});const tt=Object.entries(titles).sort((a,b)=>b[1]-a[1]);
  const rings=Object.entries(A.rings||{}).sort((a,b)=>b[1]-a[1]).slice(0,16);
  let dec='all',cat=(A.leaders[0]||{}).id;
  view.innerHTML=`${secH('1947 – 2026','Η ιστορία',null,'Κάθε τελικός, κάθε πρωταθλήτρια, οι συλλέκτες δαχτυλιδιών και οι ηγέτες όλων των εποχών.')}
  <div class="split"><div class="card">${secH('Franchises','Τίτλοι ανά ομάδα')}<div style="display:flex;flex-direction:column;gap:9px">${tt.map(([c,v])=>`<div style="display:grid;grid-template-columns:30px 150px 1fr 30px;gap:10px;align-items:center;font-size:13.5px"><img src="${LOGO(c)}" style="width:26px;height:26px" ${hideErr}><b>${esc(nm(c))}</b>${bar(v,tt[0][1])}<b style="font-family:var(--display);font-weight:400;font-size:18px;text-align:right">${v}</b></div>`).join('')}</div></div>
  <div class="card">${secH('Ring kings','Οι περισσότεροι τίτλοι')}<div class="mini-list">${rings.map(([p,v],i)=>`<a href="#/search?q=${encodeURIComponent(p)}"><span class="rk">${i+1}</span><span style="font-weight:700">${esc(p)}</span><span class="r"><b>${v}</b> <span class="dim">🏆</span></span></a>`).join('')}</div></div></div>
  <section class="sec card">${secH('All-time','Ηγέτες καριέρας',null,'Κανονική περίοδος NBA/BAA ως το 2025–26 (χωρίς ABA).')}<div class="seg" id="lc" style="margin-bottom:16px">${A.leaders.map((c,i)=>`<button data-c="${c.id}" class="${i?'':'on'}">${esc(c.en)}</button>`).join('')}</div><div id="ll"></div></section>
  <section class="sec">${secH('Finals','Όλοι οι τελικοί')}<div class="seg" id="dc" style="margin-bottom:16px">${['all','2020','2010','2000','1990','1980','1970','1960','1950','1940'].map((d,i)=>`<button data-d="${d}" class="${i?'':'on'}">${d==='all'?'Όλοι':d+'s'}</button>`).join('')}</div><div class="finals" id="fl"></div></section>`;
  const lead=()=>{const c=A.leaders.find(x=>x.id===cat);fill('#ll',`<div style="display:flex;flex-direction:column;gap:10px">${c.rows.map(([p,v],i)=>`<div style="display:grid;grid-template-columns:30px 200px 1fr 90px;gap:12px;align-items:center;font-size:14px"><span class="rk">${i+1}</span><a href="#/search?q=${encodeURIComponent(p)}" style="font-weight:700">${esc(p)}</a>${bar(v,c.rows[0][1])}<b class="num" style="text-align:right">${v.toLocaleString('el-GR')}</b></div>`).join('')}</div>`)};
  const fin=()=>fill('#fl',fr.filter(r=>dec==='all'||r[0].startsWith(dec.slice(0,3))).map(r=>`<div class="fn fade"><span class="yr">${r[0]}</span><img src="${LOGO(cur(r[1]))}" ${hideErr}><div><b>${esc(nm(r[1]))}</b><small>vs ${esc(nm(r[2]))} · ${esc(r[3])}${r[4]?` · MVP <a href="#/search?q=${encodeURIComponent(r[4].replace(/ \(.*\)/,''))}" style="color:var(--text)">${esc(r[4])}</a>`:''}</small></div></div>`).join(''));
  $('#lc').onclick=e=>{const b=e.target.closest('button');if(!b)return;cat=b.dataset.c;$$('#lc button').forEach(x=>x.classList.toggle('on',x===b));lead()};
  $('#dc').onclick=e=>{const b=e.target.closest('button');if(!b)return;dec=b.dataset.d;$$('#dc button').forEach(x=>x.classList.toggle('on',x===b));fin()};
  lead();fin();
};


/* ---------- LEGENDS ---------- */
V.legends=async(q)=>{
  const t=token;
  view.innerHTML=`${secH('Archive','Οι θρύλοι του NBA',null,'Κάθε παίκτης της ιστορίας του NBA: ψάξε οποιονδήποτε με το όνομα και δες όλη την καριέρα του, με γράφημα, σεζόν προς σεζόν και βραβεία.')}
  <div class="card"><div class="lbl">Αναζήτηση στην ιστορία</div><div style="display:flex;gap:10px;flex-wrap:wrap"><label class="search" style="width:min(420px,100%)"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="lq" placeholder="π.χ. Larry Bird, Hakeem, Drazen Petrovic…"></label></div><div id="lres" style="margin-top:12px"></div></div>
  <section class="sec">${secH('Hall of legends','Οι θρύλοι',['#/goat','GOAT Index'])}<div class="pcards" id="lgal">${skel(280,5)}</div></section>`;
  let lT;$('#lq').oninput=e=>{clearTimeout(lT);const v=e.target.value.trim();if(v.length<3){fill('#lres','');return}lT=setTimeout(async()=>{const d=await safe(api('history?type=search&query='+encodeURIComponent(v)));if(t!==token)return;const m=d?.matches||[];fill('#lres',m.length?`<div class="mini-list">${m.slice(0,12).map(p=>`<a href="#/player/${p.id}"><img src="${p.headshot||HS(p.id)}" alt="${esc(p.name)}" ${silh}><span><b>${esc(p.name)}</b><br><small class="muted">${esc(p.team)}</small></span></a>`).join('')}</div>`:'<div class="muted">Κανένα αποτέλεσμα.</div>')},300)};
  goatData().then(G=>{if(t!==token)return;const L=(G||[]).filter(p=>!p.active).sort((a,b)=>(b.rings*3+b.mvp*4+b.allNBA1)-(a.rings*3+a.mvp*4+a.allNBA1));
    fill('#lgal',L.length?L.map((p,i)=>`<a class="pc fade" href="#/player/${p.id}" style="--tc:${['#ff5a1f','#7cc4ff','#a98bff','#22d39a'][i%4]}"><div class="bg"></div><div class="rnk" style="font-size:40px">${p.rings?p.rings+'×':''}</div><img class="hs" src="${HS(p.id)}" alt="${esc(p.name)}" loading="lazy" ${silh}><div class="info"><b>${esc(p.name)}</b><div class="ln"><span><em>${p.mvp}</em> MVP</span><span><em>${f(p.careerPPG)}</em> PPG</span><span><em>${p.seasons}</em> σεζόν</span></div></div></a>`).join(''):errBox('','Legends feed'))});
};

/* ---------- MODEL ---------- */
V.model=async()=>{
  const t=token;view.innerHTML=`${secH('Forecast audit','Πόσο καλό είναι το μοντέλο;',null,'Κάθε πρόβλεψη κλειδώνει πριν το τζάμπολ και μετά συγκρίνεται με το πραγματικό αποτέλεσμα. Καμία εκ των υστέρων διόρθωση.')}<div class="grid g4" id="mk">${skel(110,4)}</div><section class="sec grid g2"><div class="card">${secH('Calibration','Λέει την αλήθεια για τις πιθανότητες;',null,'Αν το μοντέλο λέει 70%, η ομάδα πρέπει να κερδίζει ~70% των φορών. Τα σημεία πάνω στη διαγώνιο = τέλεια βαθμονόμηση.')}<div id="mcal">${skel(340)}</div></div><div class="card">${secH('Margin','Προβλεπόμενη vs πραγματική διαφορά',null,'Θετικό = νίκη γηπεδούχου.')}<div id="mmar">${skel(340)}</div></div></section><section class="sec card flat"><div class="lbl" style="padding:18px 18px 0">Τελευταίες προβλέψεις</div><div id="mrec">${skel(400)}</div></section>`;
  const F=await forecasts();if(t!==token)return;const d=F.data;if(!d){fill('#mk',errBox('','Forecast feed'));return}
  const s=d.summary||{};const k=(v,l,sub)=>`<div class="card"><div class="lbl">${l}</div><div class="h1" style="font-size:52px">${v}</div><div class="muted" style="font-size:12.5px">${sub}</div></div>`;
  fill('#mk',k(pc(s.winnerAccuracy,1),'Σωστός νικητής',`${s.n} κλειδωμένοι αγώνες`)+k(f(s.brier,3),'Brier score','0 = τέλειο · 0,25 = κορώνα-γράμματα')+k(f(s.marginMAE,1),'Λάθος διαφοράς (MAE)','πόντοι ανά αγώνα')+k(pc(s.margin80Coverage,0),'Κάλυψη 80% διαστήματος','στόχος ≈ 80%'));
  const done=(d.records||[]).filter(r=>r.actual&&r.forecast);
  const bins=Array.from({length:10},()=>({p:0,w:0,c:0}));done.forEach(r=>{const p=r.forecast.homeWinProb,b=Math.min(9,Math.floor(p*10));bins[b].p+=p;bins[b].c++;bins[b].w+=r.actual.home>r.actual.away?1:0});
  fill('#mcal',scatter({pts:bins.filter(b=>b.c>=3).map(b=>({x:b.p/b.c*100,y:b.w/b.c*100,r:4+Math.sqrt(b.c)*1.6,tip:`<b>${f(b.p/b.c*100,0)}% πρόβλεψη</b>Πραγματικό ${f(b.w/b.c*100,0)}% · ${b.c} αγώνες`})),xl:'Προβλεπόμενη πιθανότητα %',yl:'Πραγματικό ποσοστό %',xf:v=>f(v,0),yf:v=>f(v,0),avg:false,diag:true}));
  fill('#mmar',scatter({pts:done.map(r=>({x:r.forecast.margin,y:r.actual.home-r.actual.away,r:4,color:(r.forecast.margin>0)===(r.actual.home>r.actual.away)?'var(--good)':'var(--bad)',tip:`<b>${esc(r.awayCode)} @ ${esc(r.homeCode)}</b>Πρόβλ. ${f(r.forecast.margin,1)} · Πραγμ. ${r.actual.home-r.actual.away}`})),xl:'Προβλεπόμενη διαφορά',yl:'Πραγματική διαφορά',xf:v=>f(v,0),yf:v=>f(v,0),avg:false,diag:true}));
  const rec=(d.records||[]).slice().sort((a,b)=>new Date(b.tip)-new Date(a.tip)).slice(0,30);
  fill('#mrec',`<div class="tbl-wrap"><table><thead><tr><th>Ημ/νία</th><th class="l">Αγώνας</th><th>Πιθ. γηπ.</th><th>Προβλ. σκορ</th><th>Τελικό</th><th>Αποτέλεσμα</th></tr></thead><tbody>${rec.map(r=>{const F2=r.forecast||{},ok=r.actual?(F2.homeWinProb>=.5)===(r.actual.home>r.actual.away):null;return`<tr><td>${day(r.tip)}</td><td class="l"><div class="tcell"><img src="${LOGO(r.awayCode)}" ${hideErr}>${esc(r.awayCode)} <span class="dim">@</span> <img src="${LOGO(r.homeCode)}" ${hideErr}>${esc(r.homeCode)}</div></td><td>${pc(F2.homeWinProb,0)}</td><td>${Math.round(F2.awayPts)}–${Math.round(F2.homePts)}</td><td>${r.actual?r.actual.away+'–'+r.actual.home:'<span class="dim">εκκρεμεί</span>'}</td><td>${ok===null?'<span class="pill">Ανοιχτό</span>':ok?'<span class="good">✓ Σωστό</span>':'<span class="bad">✗ Λάθος</span>'}</td></tr>`}).join('')}</tbody></table></div><p class="note" style="padding:0 18px 18px">${esc(d.note||'')} Πηγή: Courtside IQ ensemble.</p>`);
};

/* ---------- search / menu ---------- */
V.search=async(q)=>{
  const t=token,term=q.q||'';view.innerHTML=`${secH('Αναζήτηση','“'+esc(term)+'”')}<div id="sr">${skel(300)}</div>`;
  const d=await safe(api('history?type=search&query='+encodeURIComponent(term)));if(t!==token)return;
  const m=d?.matches||[];if(m.length===1){location.replace('#/player/'+m[0].id);return}
  fill('#sr',m.length?`<div class="mini-list card">${m.map(p=>`<a href="#/player/${p.id}"><img src="${p.headshot||HS(p.id)}" alt="${esc(p.name)}" ${silh}><span><b>${esc(p.name)}</b><br><small class="muted">${esc(p.team)}</small></span></a>`).join('')}</div>`:'<div class="empty">Δεν βρέθηκε παίκτης.</div>');
};
V.menu=()=>{view.innerHTML=`${secH('Μενού','Όλα τα εργαλεία')}<div class="grid g2">${NAV.map(([k,l,d])=>`<a class="card" href="#/${k}"><div class="eyebrow">${esc(d)}</div><div class="h2" style="font-size:30px">${l}</div></a>`).join('')}</div>`};

/* ---------- router & chrome ---------- */
const NAV=[['home','Αρχική','Live dashboard'],['games','Αγώνες','Σκορ & προβλέψεις'],['standings','Βαθμολογία','Πίνακες & team map'],['power','Power','Ισχύς & αγορές τίτλου'],['players','Players Lab','Advanced stats & γραφήματα'],['legends','Θρύλοι','Παλιοί παίκτες & αναζήτηση'],['teams','Ομάδες','30 franchises'],['goat','GOAT','Ρυθμιζόμενη κατάταξη'],['history','Ιστορία','Τελικοί & ρεκόρ'],['model','Μοντέλο','Έλεγχος ακρίβειας']];
const ICON={home:'<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>',games:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18"/>',standings:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',goat:'<path d="M7 4h10v4a5 5 0 0 1-10 0zM5 5H3v2a3 3 0 0 0 4 3M19 5h2v2a3 3 0 0 1-4 3M12 13v4M8 21h8M9 17h6"/>',tv:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 22h8M12 19v3"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>'};
$('#links').innerHTML=NAV.map(([k,l])=>`<a href="#/${k}" data-r="${k}">${l}</a>`).join('');
$('#tabbar').innerHTML=[['home','Αρχική'],['games','Αγώνες'],['standings','Πίνακας'],['tv','TV'],['menu','Μενού']].map(([k,l])=>`<a href="#/${k}" data-r="${k}"><svg viewBox="0 0 24 24">${ICON[k]}</svg>${l}</a>`).join('');
async function route(){
  token++;const raw=location.hash.replace(/^#\/?/,'')||'home';const [path,qs]=raw.split('?');const [name,id]=path.split('/');
  const q=Object.fromEntries(new URLSearchParams(qs||''));const EXTERNAL=['shift','legacy','matchup','rotation','era','dynasty','tv'];const fn=V[name]||(EXTERNAL.includes(name)?(()=>{view.innerHTML='<div id="atlas-remote-loading"></div>'}):V.home);
  const navKey={game:'games',player:'players',team:'teams'}[name]||name;
  $$('[data-r]').forEach(a=>a.classList.toggle('on',a.dataset.r===navKey));
  document.title=(({shift:'NBA SHIFT',legacy:'Legacy Clock',matchup:'Matchup DNA',rotation:'Rotation X-Ray',era:'Era Machine',dynasty:'Dynasty Tracker',tv:'NBA on Greek TV'})[name]||NAV.find(x=>x[0]===navKey)?.[1]||'NBA')+' · NBA ATLAS';
  scrollTo({top:0,behavior:'instant'});
  try{await fn(q,id)}catch(e){console.error(e);view.innerHTML=errBox(e,'Κάτι πήγε στραβά')}
}
addEventListener('hashchange',route);

/* live search */
let sT;const qi=$('#q'),qp=$('#qpop');
qi.addEventListener('input',()=>{clearTimeout(sT);const v=qi.value.trim();if(v.length<2){qp.hidden=true;return}sT=setTimeout(async()=>{
  const T=await teams();const nv=norm(v);const tm=T.list.filter(x=>norm(x.name).includes(nv)||norm(x.abbr)===nv).slice(0,4);
  const pw=await safe(api('power'));const pl=(pw?.players||[]).filter(x=>norm(x.name).includes(nv)).slice(0,6);
  const g=(GOAT||[]).filter(x=>norm(x.name).includes(nv)&&!pl.some(p=>p.id===x.id)).slice(0,4);
  qp.innerHTML=[...tm.map(x=>`<a href="#/team/${x.id}"><img src="${x.logo}" style="border-radius:0;background:none" ${hideErr}><span><b>${esc(x.name)}</b><small>Ομάδα</small></span></a>`),...pl.map(x=>`<a href="#/player/${x.id}"><img src="${x.headshot||HS(x.id)}" ${silh}><span><b>${esc(x.name)}</b><small>${esc(x.teamName||x.team)} · ${f(x.ppg)} PPG</small></span></a>`),...g.map(x=>`<a href="#/player/${x.id}"><img src="${HS(x.id)}" ${silh}><span><b>${esc(x.name)}</b><small>Θρύλος</small></span></a>`)].join('')+`<a href="#/search?q=${encodeURIComponent(v)}"><span style="padding-left:6px"><b>Ψάξε σε όλη την ιστορία →</b><small>“${esc(v)}” στο αρχείο ESPN</small></span></a>`;
  qp.hidden=false},220)});
qi.addEventListener('keydown',e=>{if(e.key==='Enter'&&qi.value.trim().length>1){location.hash='#/search?q='+encodeURIComponent(qi.value.trim());qp.hidden=true;qi.blur()}});
document.addEventListener('click',e=>{if(!e.target.closest('.nav-tools'))qp.hidden=true;else if(e.target.closest('.search-pop a')){qp.hidden=true;qi.value=''}});

teams().then(ticker);setInterval(()=>{cache.delete('data?type=scoreboard');ticker()},90000);
route();
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();
