/* NBA ATLAS features: playoff odds (Monte Carlo), live game centre with shot chart, statistical twins, favourites.
   Self-contained; hooks into the pages app.js renders. Data: /api/power, /api/schedule, /api/plays, /api/goat. */
(()=>{'use strict';
const view=document.getElementById('view'),$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(v,d=1)=>{const x=Number(v);return v==null||v===''||!Number.isFinite(x)?'—':x.toFixed(d)};
const HS=id=>`https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const silh=`onerror="this.onerror=null;this.src=window.SILH"`,hide=`onerror="this.style.visibility='hidden'"`;
const cache=new Map();
const api=p=>{if(!cache.has(p))cache.set(p,fetch('/api/'+p).then(r=>r.ok?r.json():null).then(j=>j&&(j.data&&!j.players&&!j.teams&&!j.games?j.data:j)).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
const fresh=p=>{cache.delete(p);return api(p)};
const route=()=>{const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[name,id]=path.split('/');return{name:name||'home',id,q:new URLSearchParams(qs||'')}};
const css=document.createElement('style');css.textContent=`
.fav-btn{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:9px 16px;border-radius:999px;border:1px solid var(--line2);font-weight:800;font-size:13px;color:var(--text);background:rgba(8,9,12,.5)}
.fav-btn.on{background:var(--hot);color:#111;border-color:var(--hot)}
.oddsbar{height:8px;border-radius:999px;background:var(--bg2);overflow:hidden;min-width:60px}.oddsbar i{display:block;height:100%;border-radius:999px}
.court text{fill:var(--dim);font-size:2px}
.pbp{display:flex;flex-direction:column}.pbp div{display:grid;grid-template-columns:62px 1fr 64px;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px}
.pbp div:last-child{border-bottom:0}.pbp .sc{font-weight:800;color:var(--hot)}
.twins{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.twin{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--card2)}
.twin img{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:top;background:var(--bg2)}
.twin b{display:block;font-size:13.5px;line-height:1.2}.twin small{color:var(--muted);font-size:12px}
.tg button{padding:6px 12px;border-radius:999px;border:1px solid var(--line2);font-weight:700;font-size:12px;color:var(--muted)}.tg button.on{background:var(--text);color:#111}`;
document.head.appendChild(css);

/* ---------- favourites ---------- */
const FK='atlas.favs';
const favs=()=>{try{return JSON.parse(localStorage.getItem(FK))||{players:{},teams:{}}}catch{return{players:{},teams:{}}}};
const saveFavs=v=>{try{localStorage.setItem(FK,JSON.stringify(v))}catch{}};
function favButton(kind,id,meta){
  const txt=document.querySelector('.phero .txt');if(!txt||txt.querySelector('.fav-btn'))return;
  const b=document.createElement('button');b.className='fav-btn';
  const paint=()=>{const on=!!favs()[kind][id];b.classList.toggle('on',on);b.textContent=on?'★ Στα αγαπημένα':'☆ Πρόσθεσε στα αγαπημένα'};
  b.onclick=()=>{const v=favs();if(v[kind][id])delete v[kind][id];else v[kind][id]=meta();saveFavs(v);paint()};
  paint();txt.appendChild(b);
}
async function favHome(){
  const anchor=document.getElementById('hgames');if(!anchor||document.getElementById('favsec'))return;
  const sec=anchor.closest('section'),v=favs(),P=Object.entries(v.players),T=Object.entries(v.teams);
  const box=document.createElement('section');box.className='sec';box.id='favsec';
  if(!P.length&&!T.length){box.innerHTML=`<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><div class="eyebrow">Τα αγαπημένα μου</div><div class="muted" style="margin-top:4px">Πάτα ☆ σε οποιονδήποτε παίκτη ή ομάδα και θα εμφανίζεται εδώ, με τα τελευταία νούμερα.</div></div><a class="more" href="#/players">Βρες παίκτες →</a></div>`;sec.before(box);return}
  box.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Τα αγαπημένα μου</div><h2 class="h2">Η δική σου λίγκα</h2></div></div><div class="twins" id="favgrid"></div>`;sec.before(box);
  const [pw,sb]=await Promise.all([api('power'),api('data?type=scoreboard')]);
  const pl=Object.fromEntries((pw?.players||[]).map(x=>[x.id,x])),tm=Object.fromEntries((pw?.teams||[]).map(x=>[x.id,x]));
  const game=id=>(sb?.games||[]).find(g=>g.home?.id===id||g.away?.id===id);
  const g=document.getElementById('favgrid');if(!g)return;
  g.innerHTML=T.map(([id,m])=>{const t=tm[id],gm=game(id);return`<a class="twin" href="#/team/${id}"><img src="${esc(m.logo)}" style="border-radius:0;background:none" ${hide}><span><b>${esc(m.name)}</b><small>${t?`${t.wins}-${t.losses} · Net ${f(t.margin)}`:''}${gm?`<br>${gm.state==='in'?'🔴 LIVE '+esc(gm.away.abbr)+' '+esc(gm.away.score)+'-'+esc(gm.home.score)+' '+esc(gm.home.abbr):gm.state==='post'?'Τελικό '+esc(gm.away.abbr)+' '+esc(gm.away.score)+'-'+esc(gm.home.score)+' '+esc(gm.home.abbr):'Σήμερα '+new Date(gm.date).toLocaleTimeString('el-GR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Athens'})}`:''}</small></span></a>`}).join('')+
   P.map(([id,m])=>{const p=pl[id];return`<a class="twin" href="#/player/${id}"><img src="${esc(m.headshot||HS(id))}" ${silh}><span><b>${esc(m.name)}</b><small>${p?`${f(p.ppg)} PTS · ${f(p.rpg)} REB · ${f(p.apg)} AST`:'Θρύλος / εκτός σεζόν'}</small></span></a>`}).join('');
}

/* ---------- statistical twins ---------- */
const KEYS=['ppg','rpg','apg','spg','bpg','tsPct','astTo'];
function zspace(rows,keys){const m={},s={};keys.forEach(k=>{const v=rows.map(r=>+r[k]).filter(Number.isFinite);m[k]=v.reduce((a,b)=>a+b,0)/v.length;s[k]=Math.sqrt(v.reduce((a,b)=>a+(b-m[k])**2,0)/v.length)||1});return r=>keys.map(k=>Number.isFinite(+r[k])?(+r[k]-m[k])/s[k]:0)}
const dist=(a,b)=>Math.sqrt(a.reduce((s,x,i)=>s+(x-b[i])**2,0));
const sim=d=>Math.round(100*Math.exp(-d/2.2));
async function twins(id){
  if(document.getElementById('twinsec'))return;const hero=document.querySelector('.phero');if(!hero)return;
  const [pw,gt]=await Promise.all([api('power'),api('goat')]);if(route().id!==id||document.getElementById('twinsec'))return;
  const cur=(pw?.players||[]),me=cur.find(x=>x.id===id),leg=(gt?.players||[]).filter(p=>!p.active),legMe=(gt?.players||[]).find(p=>p.id===id);
  let html='';
  if(me){
    const Z=zspace(cur,KEYS),zm=Z(me);
    const near=cur.filter(x=>x.id!==id).map(x=>({x,d:dist(zm,Z(x))})).sort((a,b)=>a.d-b.d).slice(0,4);
    const L3=['ppg','rpg','apg'],legRows=leg.map(p=>({p,ppg:p.careerPPG,rpg:p.careerRPG,apg:p.careerAPG})),ZL=zspace([...legRows,...cur],L3),zl=ZL(me);
    const lnear=legRows.map(r=>({p:r.p,d:dist(zl,ZL(r))})).sort((a,b)=>a.d-b.d).slice(0,3);
    html=`<div class="lbl">Παίζει σαν… (σεζόν 2026–27, 7 κατηγορίες)</div><div class="twins">${near.map(({x,d})=>`<a class="twin" href="#/player/${x.id}"><img src="${x.headshot||HS(x.id)}" ${silh}><span><b>${esc(x.name)}</b><small>${sim(d)}% ομοιότητα · ${esc(x.team||'')}</small></span></a>`).join('')}</div>
    ${lnear.length?`<div class="lbl" style="margin-top:18px">Ο θρύλος που του μοιάζει περισσότερο (πόντοι, ριμπάουντ, ασίστ)</div><div class="twins">${lnear.map(({p,d})=>`<a class="twin" href="#/player/${p.id}"><img src="${HS(p.id)}" ${silh}><span><b>${esc(p.name)}</b><small>${sim(d)}% · καριέρα ${f(p.careerPPG)}/${f(p.careerRPG)}/${f(p.careerAPG)}</small></span></a>`).join('')}</div>`:''}`;
  }else if(legMe&&cur.length){
    const L3=['ppg','rpg','apg'],mine={ppg:legMe.careerPPG,rpg:legMe.careerRPG,apg:legMe.careerAPG},Z=zspace([mine,...cur],L3),zm=Z(mine);
    const near=cur.map(x=>({x,d:dist(zm,Z(x))})).sort((a,b)=>a.d-b.d).slice(0,4);
    html=`<div class="lbl">Ο σημερινός του διάδοχος (με βάση πόντους, ριμπάουντ, ασίστ καριέρας)</div><div class="twins">${near.map(({x,d})=>`<a class="twin" href="#/player/${x.id}"><img src="${x.headshot||HS(x.id)}" ${silh}><span><b>${esc(x.name)}</b><small>${sim(d)}% · ${f(x.ppg)}/${f(x.rpg)}/${f(x.apg)}</small></span></a>`).join('')}</div>`;
  }
  if(!html)return;
  const s=document.createElement('section');s.className='sec card';s.id='twinsec';
  s.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Statistical twins</div><h2 class="h2">Δίδυμοι παίκτες</h2><p class="lede" style="margin-top:8px">Απόσταση σε τυποποιημένα στατιστικά (z-scores). Δείχνει παρόμοιο προφίλ παραγωγής, όχι ίδιο στυλ ή αξία.</p></div></div>${html}`;
  hero.after(s);
}

/* ---------- live game centre ---------- */
let liveTimer=null;
function court(shots,teams,filter){
  const W=50,H=47,tc=id=>{const t=teams.find(x=>x.id===id);return t&&t.color?'#'+t.color.replace('#',''):'#ff5a1f'};
  const pts=shots.filter(s=>(filter==='all'||s.team===filter)&&s.y<=40).map(s=>({...s,y:s.y+5.25}));
  const dots=pts.map(s=>s.made?`<circle cx="${s.x}" cy="${H-s.y}" r=".85" fill="${tc(s.team)}" stroke="#fff" stroke-width=".15" data-tip="<b>${s.pts}π · Q${s.q} ${esc(s.clock)}</b>${esc(s.text)}"/>`:`<g data-tip="<b>Άστοχο · Q${s.q} ${esc(s.clock)}</b>${esc(s.text)}"><path d="M${s.x-.6} ${H-s.y-.6}l1.2 1.2M${s.x+.6} ${H-s.y-.6}l-1.2 1.2" stroke="${tc(s.team)}" stroke-width=".3" opacity=".75"/></g>`).join('');
  const L='stroke="rgba(255,255,255,.22)" stroke-width=".25" fill="none"';
  return`<svg class="court" viewBox="-1 -1 52 49" style="width:100%;max-width:620px;display:block;margin:auto;background:linear-gradient(#141821,#0f1218);border-radius:14px">
  <rect x="0" y="0" width="50" height="47" ${L}/><rect x="17" y="28" width="16" height="19" ${L}/><circle cx="25" cy="28" r="6" ${L}/>
  <path d="M3 47V33M47 47V33M3 33A23.75 23.75 0 0 1 47 33" ${L}/><circle cx="25" cy="41.75" r=".75" ${L}/><path d="M22 43h6" ${L}/><path d="M19 0A6 6 0 0 0 31 0" ${L}/>
  ${dots}</svg>`;
}
async function liveGame(id){
  clearInterval(liveTimer);
  const ensure=()=>{let s=document.getElementById('livesec');if(s)return s;const hero=view.querySelector('section.hero');if(!hero)return null;s=document.createElement('section');s.className='sec';s.id='livesec';hero.after(s);return s};
  let filter='all';
  const draw=async(force)=>{
    if(route().name!=='game'||route().id!==id){clearInterval(liveTimer);return}
    const d=await (force?fresh:api)('plays?id='+id);const s=ensure();if(!s||!d)return;
    const made=d.shots.filter(x=>x.made).length,tot=d.shots.length;
    const per=t=>{const sh=d.shots.filter(x=>x.team===t.id),m=sh.filter(x=>x.made).length,th=sh.filter(x=>x.pts===3||/three point/i.test(x.text)||Math.hypot(x.x-25,x.y)>23.6);return`${esc(t.abbr)}: ${m}/${sh.length} (${sh.length?Math.round(100*m/sh.length):0}%) · τρίποντα ${th.filter(x=>x.made).length}/${th.length}`};
    s.innerHTML=`<div class="grid g2"><div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="lbl" style="margin:0">Shot chart · ${tot} σουτ εντός πεδιάς</div><div class="tg" style="display:flex;gap:6px">${[['all','Όλοι'],...d.teams.map(t=>[t.id,t.abbr])].map(([k,l])=>`<button data-f="${k}" class="${k===filter?'on':''}">${esc(l)}</button>`).join('')}</div></div>${tot?court(d.shots,d.teams,filter):'<div class="empty">Τα σουτ θα εμφανιστούν όταν ξεκινήσει ο αγώνας.</div>'}<div class="muted" style="font-size:12.5px;margin-top:10px">${d.teams.map(per).join('<br>')}<br>● εύστοχο · × άστοχο</div></div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="lbl" style="margin:0">Play-by-play</div>${d.state==='in'?'<span class="pill live">Live · ανανέωση 30\'\'</span>':`<span class="pill">${esc(d.detail)}</span>`}</div><div class="pbp">${d.last.length?d.last.map(p=>`<div class="${p.scoring?'sc':''}"><span class="dim">Q${p.q} ${esc(p.clock)}</span><span>${esc(p.text)}</span><span style="text-align:right">${esc(p.score)}</span></div>`).join(''):'<div class="muted">Δεν υπάρχουν φάσεις ακόμα.</div>'}</div></div></div>`;
    s.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;draw(false)});
    if(d.state!=='in')clearInterval(liveTimer);
  };
  await draw(false);liveTimer=setInterval(()=>draw(true),30000);
}

/* ---------- playoff odds (Monte Carlo) ---------- */
let simRun=0;
async function odds(){
  const t=++simRun;document.title='Playoff odds · NBA ATLAS';
  view.innerHTML=`<div id="hero" hidden></div><div class="sec-h"><div><div class="eyebrow">Monte Carlo</div><h2 class="h2">Playoff odds</h2><p class="lede" style="margin-top:8px">Παίζουμε την υπόλοιπη σεζόν χιλιάδες φορές, αγώνα προς αγώνα, με βάση τη δύναμη κάθε ομάδας. Βγαίνει η πιθανότητα για playoffs, play-in, πρώτη θέση και τίτλο.</p></div><button class="more" id="rerun">↻ Ξανατρέξε</button></div><div id="oddsbody"><div class="skel" style="min-height:500px"></div></div>`;
  const [pw,sc]=await Promise.all([api('power'),api('schedule')]);if(t!==simRun)return;
  const body=document.getElementById('oddsbody');
  if(!pw?.teams?.length||!sc?.games){body.innerHTML='<div class="err">Δεν φόρτωσαν τα δεδομένα (power ή πρόγραμμα). Δοκίμασε ανανέωση σε λίγο.</div>';return}
  const T=pw.teams.map(x=>({...x,r:(+x.margin||0)*(x.games/(x.games+12))})),idx=Object.fromEntries(T.map((x,i)=>[x.id,i]));
  const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const P=(d)=>1/(1+Math.exp(-d/6.6));
  const G=sc.games.filter(g=>idx[g.home]!=null&&idx[g.away]!=null).map(g=>[idx[g.home],idx[g.away]]);
  const conf=c=>T.map((x,i)=>i).filter(i=>/east/i.test(T[i].conference)===c);
  const E=conf(true),Wc=conf(false),N=5000,n=T.length;
  if(E.length<10||Wc.length<10){body.innerHTML='<div class="err">Λείπουν οι περιφέρειες από το power feed. Δοκίμασε ανανέωση σε λίγο.</div>';return}
  const acc={w:new Float64Array(n),po:new Float64Array(n),pi:new Float64Array(n),top:new Float64Array(n),cf:new Float64Array(n),fin:new Float64Array(n),ttl:new Float64Array(n)};
  const pg=(a,b,W,R)=>{const home=W[a]>=W[b]?a:b,away=home===a?b:a,p=P(R[home]-R[away]+2.3);return home===a?p:1-p};
  const ser=p=>{let s=0;const c=[1,4,10,20];for(let k=0;k<4;k++)s+=c[k]*p**4*(1-p)**k;return s};
  const playSeries=(a,b,W,R)=>{const ph=pg(a,b,W,R),neutral=P(R[a]-R[b]),pa=(ph*4+neutral*3)/7;return Math.random()<ser(pa)?a:b};
  const one=(a,b,W,R)=>Math.random()<pg(a,b,W,R)?a:b;
  for(let s=0;s<N;s++){
    const W=T.map(x=>x.wins),R=T.map(x=>x.r+gauss()*2.4);
    for(const [h,a] of G){if(Math.random()<P(R[h]-R[a]+2.3))W[h]++;else W[a]++}
    const champs=[];
    for(const C of [E,Wc]){
      const order=C.slice().sort((a,b)=>W[b]-W[a]||Math.random()-.5);
      order.forEach((i,k)=>{acc.w[i]+=W[i];if(k<6)acc.po[i]++;else if(k<10)acc.pi[i]++});acc.top[order[0]]++;
      const w78=one(order[6],order[7],W,R),l78=w78===order[6]?order[7]:order[6],w910=one(order[8],order[9],W,R),s8=one(l78,w910,W,R);
      acc.po[w78]++;acc.po[s8]++;
      const seeds=[order[0],order[1],order[2],order[3],order[4],order[5],w78,s8];
      const r1=[[0,7],[3,4],[2,5],[1,6]].map(([a,b])=>playSeries(seeds[a],seeds[b],W,R));
      const r2=[playSeries(r1[0],r1[1],W,R),playSeries(r1[2],r1[3],W,R)];
      const cf=playSeries(r2[0],r2[1],W,R);acc.cf[cf]++;champs.push(cf);
    }
    champs.forEach(c=>acc.fin[c]++);acc.ttl[playSeries(champs[0],champs[1],W,R)]++;
  }
  const rows=T.map((x,i)=>({...x,pw:acc.w[i]/N,po:acc.po[i]/N*100,pi:acc.pi[i]/N*100,top:acc.top[i]/N*100,fin:acc.fin[i]/N*100,ttl:acc.ttl[i]/N*100}));
  const bar=(v,c)=>`<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><span style="min-width:44px;text-align:right">${v<.1?'<0.1':f(v,1)}%</span><div class="oddsbar" style="width:70px"><i style="width:${Math.min(100,v)}%;background:${c}"></i></div></div>`;
  const table=(C,name)=>{const rs=rows.filter((_,i)=>C.includes(i)).sort((a,b)=>b.pw-a.pw);return`<div class="card flat"><div class="h3" style="padding:18px 18px 4px">${name}</div><div class="tbl-wrap"><table><thead><tr><th>Ομάδα</th><th>Τώρα</th><th>Προβλ. W</th><th>Playoffs*</th><th>Play-in (7–10)</th><th>#1</th><th>Τελικοί</th><th>Τίτλος</th></tr></thead><tbody>${rs.map((x,k)=>`<tr ${k===5||k===9?'class="seedline"':''}><td><a class="tcell" href="#/team/${x.id}"><img src="${x.logo||''}" ${hide}>${esc(x.abbr)}</a></td><td>${x.wins}-${x.losses}</td><td><b>${f(x.pw,1)}</b></td><td>${bar(x.po,'var(--good)')}</td><td>${bar(x.pi,'var(--ice)')}</td><td>${bar(x.top,'var(--violet)')}</td><td>${bar(x.fin,'var(--hot2)')}</td><td>${bar(x.ttl,'var(--hot)')}</td></tr>`).join('')}</tbody></table></div></div>`};
  const top=rows.slice().sort((a,b)=>b.ttl-a.ttl).slice(0,10),mx=top[0]?.ttl||1;
  body.innerHTML=`<div class="card" style="margin-bottom:16px"><div class="lbl">Πιθανότητα τίτλου · top 10</div><div style="display:flex;flex-direction:column;gap:9px">${top.map(x=>`<div style="display:grid;grid-template-columns:28px minmax(70px,120px) 1fr 54px;gap:10px;align-items:center;font-size:13.5px"><img src="${x.logo||''}" style="width:28px;height:28px" ${hide}><b>${esc(x.name.split(' ').slice(-1)[0])}</b><div class="oddsbar" style="height:12px"><i style="width:${x.ttl/mx*100}%;background:linear-gradient(90deg,var(--hot),var(--hot2))"></i></div><b style="text-align:right">${f(x.ttl,1)}%</b></div>`).join('')}</div></div>
  <div class="grid">${table(E,'Ανατολή')}${table(Wc,'Δύση')}</div>
  <p class="note">${N.toLocaleString('el-GR')} προσομοιώσεις · ${G.length} αγώνες που απομένουν (${esc(sc.mode)}). Δύναμη = διαφορά πόντων ανά αγώνα με συρρίκνωση για μικρό δείγμα, +2,3 πλεονέκτημα έδρας, λογιστική καμπύλη πιθανότητας. Κάθε προσομοίωση δίνει και τυχαία απόκλιση στη δύναμη κάθε ομάδας, γιατί 14 αγώνες είναι μικρό δείγμα. *Playoffs = πρόκριση, μαζί με όσες περνούν μέσα από το play-in. Play-in 7–10 και σειρές best-of-7 προσομοιώνονται κανονικά. Εκτίμηση μοντέλου, όχι στοίχημα. Δεν λαμβάνει υπόψη τραυματισμούς ή μεταγραφές.</p>`;
  document.getElementById('rerun').onclick=()=>odds();
}

/* ---------- router hooks ---------- */
const navAdd=()=>{const after=document.querySelector('#links [data-r="power"]');if(after&&!document.querySelector('#links [data-r="odds"]'))after.insertAdjacentHTML('afterend','<a href="#/odds" data-r="odds">Odds</a>')};
function hook(){
  const r=route();navAdd();
  document.querySelectorAll('#links [data-r="odds"]').forEach(a=>a.classList.toggle('on',r.name==='odds'));
  if(r.name!=='game')clearInterval(liveTimer);
  if(r.name==='odds'){document.querySelectorAll('[data-r]').forEach(a=>{if(a.dataset.r!=='odds')a.classList.remove('on')});setTimeout(odds,0);return}
  if(r.name==='menu')setTimeout(()=>{if(!document.getElementById('oddscard'))view.insertAdjacentHTML('afterbegin','<a id="oddscard" class="card" href="#/odds" style="display:block;margin-bottom:16px"><div class="eyebrow">Monte Carlo · προσομοίωση σεζόν</div><div class="h2" style="font-size:30px">Playoff odds</div></a>')},0);
}
let pending=null;
new MutationObserver(()=>{clearTimeout(pending);pending=setTimeout(()=>{const r=route();
  if(r.name==='home'||r.name==='')favHome();
  if(r.name==='player'&&r.id&&document.querySelector('.phero')){favButton('players',r.id,()=>({name:document.querySelector('.phero h1')?.textContent||'',headshot:document.querySelector('.phero img.hs')?.src||HS(r.id)}))}
  if(r.name==='team'&&r.id&&document.querySelector('.phero'))favButton('teams',r.id,()=>({name:document.querySelector('.phero h1')?.textContent||'',logo:document.querySelector('.phero img.logo-big')?.src||''}));
  if(r.name==='game'&&r.id&&view.querySelector('section.hero')&&!document.getElementById('livesec'))liveGame(r.id);
},120)}).observe(view,{childList:true});
addEventListener('hashchange',hook);hook();
})();
