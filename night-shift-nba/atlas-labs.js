/* NBA ATLAS Lab: spoiler-free replay guide, "watch this now" tension ranking, shock-o-meter (comebacks),
   what-if simulator, model vs markets, Player DNA art, and monogram fallback for missing headshots.
   Self-contained; same hook pattern as atlas-features.js. Data: /api/insight, /api/power, /api/schedule,
   /api/markets, /api/goat, /api/data. */
(()=>{'use strict';
const view=document.getElementById('view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(v,d=1)=>{const x=Number(v);return v==null||v===''||!Number.isFinite(x)?'—':x.toFixed(d)};
const hide=`onerror="this.style.visibility='hidden'"`;
const cache=new Map();
const api=p=>{if(!cache.has(p))cache.set(p,fetch('/api/'+p).then(r=>r.ok?r.json():null).then(j=>j&&(j.data&&!j.players&&!j.teams&&!j.games?j.data:j)).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
const route=()=>{const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[name,id]=path.split('/');return{name:name||'home',id,q:new URLSearchParams(qs||'')}};
const hex=c=>{c=String(c||'').replace('#','');return /^[0-9a-f]{6}$/i.test(c)?'#'+c:'#ff5a1f'};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[^a-z]/g,'');
let teamCol={};api('data?type=teams').then(d=>{(d?.teams||[]).forEach(t=>{teamCol[t.id]=hex(t.color);teamCol[t.abbr]=hex(t.color)})});

const css=document.createElement('style');css.textContent=`
.lab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.lab-tile{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:8px;min-height:170px;padding:22px;border-radius:var(--r);border:1px solid var(--line);background:var(--card)}
.lab-tile:hover{border-color:var(--line2);transform:translateY(-2px)}
.lab-tile .ic{font-size:30px}.lab-tile b{font-family:var(--display);font-size:28px;letter-spacing:.01em;line-height:1}.lab-tile p{color:var(--muted);font-size:14px;margin:0}
.lab-tile:after{content:"";position:absolute;inset:auto -40px -60px auto;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,var(--glow,rgba(255,90,31,.22)),transparent 70%)}
.wcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.wcard{padding:18px;border-radius:var(--r);border:1px solid var(--line);background:var(--card);display:flex;flex-direction:column;gap:12px}
.wcard .mu{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;text-align:center}
.wcard .mu img{width:54px;height:54px}.wcard .mu b{display:block;font-size:13px;margin-top:4px}
.rate{font-family:var(--display);font-size:46px;line-height:1;text-align:center}.rate small{font-size:16px;color:var(--dim)}
.tags{display:flex;flex-wrap:wrap;gap:6px}.tags span{font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;background:var(--bg2);border:1px solid var(--line);color:var(--text)}
.spoil{border-top:1px dashed var(--line2);padding-top:12px;font-size:13px;color:var(--muted)}
.reveal{align-self:flex-start;padding:7px 14px;border-radius:999px;border:1px solid var(--line2);font-weight:800;font-size:12px;color:var(--muted)}
.reveal:hover{color:var(--text);border-color:var(--text)}
.tension{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:var(--card2)}
.tension .tb{height:10px;border-radius:999px;background:var(--bg2);overflow:hidden}.tension .tb i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--ice),var(--hot))}
.pulse{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--bad);box-shadow:0 0 0 0 rgba(255,77,106,.6);animation:lpulse 1.6s infinite}
@keyframes lpulse{70%{box-shadow:0 0 0 10px rgba(255,77,106,0)}100%{box-shadow:0 0 0 0 rgba(255,77,106,0)}}
.shock{display:grid;grid-template-columns:64px 1fr;gap:16px;padding:18px;border-radius:var(--r);border:1px solid var(--line);background:var(--card)}
.shock .pct{font-family:var(--display);font-size:38px;line-height:1;color:var(--hot)}
.wf{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));align-items:end}
.wf label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:var(--muted)}
.wf input,.wf select{padding:10px 12px;border-radius:12px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);font:inherit;font-size:14px}
.btn-hot{padding:11px 18px;border-radius:12px;background:var(--hot);color:#111;font-weight:900;font-size:14px}
.scn{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.scn span{display:inline-flex;gap:8px;align-items:center;padding:6px 12px;border-radius:999px;background:var(--bg2);border:1px solid var(--line2);font-size:12.5px;font-weight:700}
.scn button{color:var(--dim);font-weight:900}
.delta{font-weight:800}.delta.up{color:var(--good)}.delta.dn{color:var(--bad)}
.edge{display:grid;grid-template-columns:30px minmax(80px,140px) 1fr 64px;gap:10px;align-items:center;font-size:13px;padding:7px 0;border-bottom:1px solid var(--line)}
.edge .ax{position:relative;height:14px}.edge .ax:before{content:"";position:absolute;left:50%;top:-4px;bottom:-4px;width:1px;background:var(--line2)}
.edge .ax i{position:absolute;top:2px;height:10px;border-radius:4px}
.dna-wrap{display:grid;grid-template-columns:minmax(0,520px) 1fr;gap:24px;align-items:start}
.dna-wrap canvas{width:100%;height:auto;border-radius:var(--r);border:1px solid var(--line);background:#08090c}
@media (max-width:520px){.shock{grid-template-columns:1fr;gap:8px}.shock>div:first-child{display:flex;gap:10px;align-items:center}.shock>div:first-child img{width:34px!important;height:34px!important}.shock .pct{font-size:28px}.wcard .mu img{width:44px;height:44px}}
@media (max-width:860px){.dna-wrap{grid-template-columns:1fr}.edge{grid-template-columns:26px 70px 1fr 54px}}
.dna-btn{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:9px 16px;border-radius:999px;border:1px solid var(--line2);font-weight:800;font-size:13px;color:var(--text);background:rgba(8,9,12,.5);margin-top:8px}`;
document.head.appendChild(css);

/* ---------- monogram fallback for missing headshots ---------- */
const isHS=s=>/headshots|^data:image\/svg\+xml.*2a2f3b/i.test(decodeURIComponent(s||''))||(window.SILH&&s===window.SILH);
function nameFor(img){
  if(img.alt&&img.alt.length>2)return img.alt;
  const ph=img.closest('.phero');if(ph)return(ph.querySelector('h1')?.textContent||'').trim();
  let n=img.parentElement;for(let i=0;n&&i<5;i++,n=n.parentElement){const el=n.querySelector('h1,b,strong,.nm,.name,h3,span');const t=(el?.textContent||'').trim();if(t&&/\p{L}{2}/u.test(t))return t}
  return'';
}
function mono(img){
  const nm=nameFor(img).replace(/[^\p{L}\s.'’-]/gu,' ').trim(),parts=nm.split(/\s+/).filter(Boolean);
  const ini=((parts[0]||'?')[0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase();
  let c=getComputedStyle(img).getPropertyValue('--tc').trim();c=/^#?[0-9a-f]{3,8}$/i.test(c)?(c[0]==='#'?c:'#'+c):'#ff5a1f';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#14161c"/></linearGradient></defs><rect width="100" height="80" fill="url(#g)"/><circle cx="50" cy="40" r="27" fill="rgba(0,0,0,.28)" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/><text x="50" y="49" text-anchor="middle" font-family="Anton,Impact,Arial Black,sans-serif" font-size="25" fill="#fff" letter-spacing="1">${esc(ini)}</text></svg>`;
  img.onerror=null;img.dataset.mono='1';img.src='data:image/svg+xml,'+encodeURIComponent(svg);
}
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&!t.dataset.mono&&isHS(t.getAttribute('src')))mono(t)},true);
document.addEventListener('load',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&!t.dataset.mono&&window.SILH&&t.getAttribute('src')===window.SILH)mono(t)},true);

/* ---------- shared: tiny charts ---------- */
function curve(pts,home,away,w=600,h=150){
  if(!pts||pts.length<2)return'';const T=Math.max(2880,pts[pts.length-1][0]),M=Math.max(8,...pts.map(p=>Math.abs(p[1])));
  const x=t=>t/T*w,y=d=>h/2-d/M*(h/2-8);
  const line=pts.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(1)+','+y(p[1]).toFixed(1)).join('');
  const area=`M0,${h/2}${pts.map(p=>'L'+x(p[0]).toFixed(1)+','+y(p[1]).toFixed(1)).join('')}L${x(pts[pts.length-1][0]).toFixed(1)},${h/2}Z`;
  const qs=[720,1440,2160,2880].map(t=>`<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${h}" stroke="var(--line)"/>`).join('');
  const hc=teamCol[home.abbr]||hex(home.color),ac=teamCol[away.abbr]||hex(away.color);
  return`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="Διαφορά σκορ στη διάρκεια του αγώνα"><defs><clipPath id="up${w}${pts.length}"><rect width="${w}" height="${h/2}"/></clipPath><clipPath id="dn${w}${pts.length}"><rect y="${h/2}" width="${w}" height="${h/2}"/></clipPath></defs>${qs}<line x1="0" x2="${w}" y1="${h/2}" y2="${h/2}" stroke="var(--line2)"/>
  <path d="${area}" fill="${hc}" opacity=".55" clip-path="url(#up${w}${pts.length})"/><path d="${area}" fill="${ac}" opacity=".55" clip-path="url(#dn${w}${pts.length})"/><path d="${line}" fill="none" stroke="var(--text)" stroke-width="1.4"/>
  <text x="6" y="14" fill="var(--muted)" font-size="11" font-weight="700">▲ ${esc(home.abbr)}</text><text x="6" y="${h-6}" fill="var(--muted)" font-size="11" font-weight="700">▼ ${esc(away.abbr)}</text></svg>`;
}
const rateCol=s=>s>=8?'var(--hot)':s>=6?'var(--hot2)':s>=4?'var(--ice)':'var(--dim)';
const when=d=>{try{return new Date(d).toLocaleDateString('el-GR',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Athens'})}catch{return''}};
const shell=(eyebrow,title,lede,extra='')=>`<div id="hero" hidden></div><a class="more" href="#/lab" style="display:inline-block;margin-bottom:14px">← Lab</a><div class="sec-h"><div><div class="eyebrow">${eyebrow}</div><h2 class="h2">${title}</h2>${lede?`<p class="lede" style="margin-top:8px">${lede}</p>`:''}</div>${extra}</div>`;

/* ---------- 0. hub ---------- */
function hub(){
  document.title='Lab · NBA ATLAS';
  const T=[['watch','🍿','Αξίζει το replay;','Βαθμός 1–10 για κάθε χθεσινό αγώνα, χωρίς να σου πει το σκορ. Και ποιο ματς να ανοίξεις τώρα.','rgba(255,90,31,.25)'],
    ['shock','⚡','Shock-o-meter','Οι πιο απίθανες ανατροπές των τελευταίων εβδομάδων, με την πιθανότητα νίκης στο χειρότερο σημείο.','rgba(255,77,106,.25)'],
    ['whatif','🌀','Παράλληλο σύμπαν','Βγάλε έναν σταρ για Ν αγώνες ή κάνε μια μεταγραφή και δες πώς αλλάζουν playoffs και τίτλος.','rgba(124,92,255,.28)'],
    ['edge','📡','Μοντέλο vs αγορές','Πού διαφωνεί η προσομοίωσή μας με τις αγορές πρόβλεψης (Polymarket, Kalshi).','rgba(70,200,255,.25)'],
    ['dna','🧬','Player DNA','Τα στατιστικά ενός παίκτη γίνονται μοναδικό έργο τέχνης. Κατέβασέ το ως εικόνα.','rgba(60,220,140,.22)']];
  view.innerHTML=`<div id="hero" hidden></div><div class="sec-h"><div><div class="eyebrow">NBA ATLAS Lab</div><h2 class="h2">Πειράματα</h2><p class="lede" style="margin-top:8px">Νέοι τρόποι να βλέπεις το NBA. Όλα τρέχουν πάνω σε δημόσια δεδομένα ESPN και στα μοντέλα του Atlas.</p></div></div>
  <div class="lab-grid">${T.map(([r,ic,t,p,g])=>`<a class="lab-tile" href="#/${r}" style="--glow:${g}"><span class="ic">${ic}</span><b>${t}</b><p>${p}</p></a>`).join('')}</div>`;
}

/* ---------- 1+6. watch guide + live tension ---------- */
function parseLive(g){
  const s=String(g.status||g.detail||'');let q=1;const m=s.match(/Q(\d)|(\d)(?:st|nd|rd|th)/i);if(m)q=+(m[1]||m[2]);if(/OT/i.test(s)){const o=s.match(/(\d)\s*OT/i);q=4+(o?+o[1]:1)}
  if(/half/i.test(s))q=2;const c=s.match(/(\d{1,2}):(\d{2})/);let left=c?+c[1]*60+ +c[2]:(/end|half/i.test(s)?0:720);
  const len=q>4?300:720,elapsed=q<=4?(q-1)*720+(len-left):2880+(q-5)*300+(len-left);
  return{q,left,elapsed,frac:Math.min(1,elapsed/2880),ot:q>4}
}
function tension(g){
  const a=+g.away?.score||0,h=+g.home?.score||0,m=Math.abs(a-h),L=parseLive(g);
  const close=Math.exp(-m/(L.frac>.85?5:8)),late=.3+.7*L.frac**2;
  return{v:Math.round(Math.min(100,100*close*late+(L.ot?12:0))),m,L}
}
let wTok=0;
async function watch(){
  const t=++wTok,days=+(route().q.get('d')||1);document.title='Αξίζει το replay; · NBA ATLAS';
  view.innerHTML=shell('Spoiler-free','Αξίζει το replay;','Βαθμός θεάματος χωρίς σκορ και νικητή. Μετράει πόσο κλειστό ήταν το τέλος, αλλαγές προβαδίσματος, ανατροπές, παράταση και ατομικά σόου. Το σκορ το βλέπεις μόνο αν το ζητήσεις.',
   `<div class="tg">${[1,3,7].map(d=>`<a href="#/watch?d=${d}"><button class="${d===days?'on':''}">${d===1?'Χθες':d+' μέρες'}</button></a>`).join(' ')}</div>`)+
   `<section class="sec" id="nowsec"><div class="lbl">🔴 Δες αυτό ΤΩΡΑ · ένταση live αγώνων</div><div id="nowbox"><div class="skel" style="min-height:80px"></div></div></section>
    <section class="sec"><div class="lbl">Ολοκληρωμένοι αγώνες</div><div id="wbox"><div class="skel" style="min-height:300px"></div></div></section>`;
  liveNow(t);
  const d=await api('insight?days='+days);if(t!==wTok)return;
  const box=document.getElementById('wbox');
  if(!d?.games){box.innerHTML='<div class="err">Δεν φόρτωσαν τα στοιχεία των αγώνων. Δοκίμασε ξανά σε λίγο.</div>';return}
  if(!d.games.length){box.innerHTML='<div class="card muted">Δεν υπάρχουν ολοκληρωμένοι αγώνες σε αυτό το διάστημα.</div>';return}
  const G=d.games.slice().sort((a,b)=>b.score-a.score);
  box.innerHTML=`<div class="wcards">${G.map((g,i)=>`<div class="wcard"><div class="mu"><div><img src="${esc(g.away.logo||'')}" ${hide}><b>${esc(g.away.name.split(' ').slice(-1)[0])}</b></div><div><div class="rate" style="color:${rateCol(g.score)}">${f(g.score,1)}<small>/10</small></div><div class="dim" style="font-size:11px;font-weight:700">${esc(when(g.date))}</div></div><div><img src="${esc(g.home.logo||'')}" ${hide}><b>${esc(g.home.name.split(' ').slice(-1)[0])}</b></div></div>
   <div class="tags">${g.tags.map(x=>`<span>${esc(x)}</span>`).join('')||'<span>Κανονικό ματς</span>'}</div>
   <button class="reveal" data-i="${i}">👁 Δείξε σκορ</button><div class="spoil" id="sp${i}" hidden></div></div>`).join('')}</div>
   <p class="note">Ο βαθμός βγαίνει από το play-by-play και την πιθανότητα νίκης του ESPN: τελική διαφορά, χρόνος με διαφορά ≤5 στα τελευταία 5 λεπτά, αλλαγές προβαδίσματος, πόσο χαμηλά έπεσε ο νικητής, παράταση και 40άρες/triple-doubles. Η ετικέτα «Ίσως κάτι παραπάνω…» σημαίνει παράταση, χωρίς να λέει ποιος κέρδισε.</p>`;
  box.querySelectorAll('.reveal').forEach(b=>b.onclick=()=>{const g=G[+b.dataset.i],s=g.spoiler,el=document.getElementById('sp'+b.dataset.i);
    if(!el.hidden){el.hidden=true;b.textContent='👁 Δείξε σκορ';return}
    el.innerHTML=`<div style="display:flex;justify-content:space-between;font-weight:800;color:var(--text);font-size:15px"><span>${esc(g.away.abbr)} ${s.awayScore}</span><span>${s.homeScore} ${esc(g.home.abbr)}</span></div>
     ${curve(s.curve,g.home,g.away,600,120)}<div style="margin-top:6px">${s.leadChanges} αλλαγές προβαδίσματος${s.ot?` · ${s.ot}× παράταση`:''}${s.maxDeficit>=8?` · ο νικητής βρέθηκε πίσω με ${s.maxDeficit}`:''}${s.top?` · ${esc(s.top.name)} ${s.top.pts} π.`:''}</div>
     <a class="more" href="#/game/${g.id}" style="display:inline-block;margin-top:8px">Box score →</a>`;el.hidden=false;b.textContent='🙈 Κρύψε';});
}
let nowTimer=null;
async function liveNow(t){
  clearTimeout(nowTimer);
  const sb=await fetch('/api/data?type=scoreboard').then(r=>r.ok?r.json():null).then(j=>j?.data||j).catch(()=>null);if(t!==wTok||!document.getElementById('nowbox'))return;
  const box=document.getElementById('nowbox'),g=sb?.games||[],live=g.filter(x=>x.state==='in').map(x=>({g:x,...tension(x)})).sort((a,b)=>b.v-a.v);
  if(!live.length){const next=g.filter(x=>x.state==='pre').sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
    box.innerHTML=`<div class="card muted" style="font-size:14px">Κανένας αγώνας σε εξέλιξη αυτή τη στιγμή.${next?` Επόμενος: <b style="color:var(--text)">${esc(next.away.abbr)} @ ${esc(next.home.abbr)}</b>, ${new Date(next.date).toLocaleString('el-GR',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Athens'})}.`:''} Η κατάταξη ανανεώνεται αυτόματα όταν αρχίσουν.</div>`}
  else box.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px">${live.map((x,i)=>`<a class="tension" href="#/game/${x.g.id}"><span style="display:flex;align-items:center;gap:8px;font-weight:900">${i===0?'<span class="pulse"></span>':''}${esc(x.g.away.abbr)} ${esc(x.g.away.score)}–${esc(x.g.home.score)} ${esc(x.g.home.abbr)}</span><div><div class="tb"><i style="width:${x.v}%"></i></div><small class="dim">${esc(x.g.status||'')}${x.L.ot?' · παράταση':''}</small></div><b style="font-family:var(--display);font-size:26px;color:${x.v>=70?'var(--hot)':'var(--text)'}">${x.v}</b></a>`).join('')}</div>
   <p class="note">Ένταση 0–100: πόσο κοντά είναι το σκορ, βαρύτερα όσο πλησιάζει το τέλος, με μπόνους για παράταση. ${live[0].v>=70?'Το πρώτο είναι το ματς που αξίζει να ανοίξεις τώρα.':''} Ανανέωση κάθε 30″.</p>`;
  nowTimer=setTimeout(()=>{if(route().name==='watch')liveNow(t)},30000);
}

/* ---------- 2. shock-o-meter ---------- */
let sTok=0;
async function shock(){
  const t=++sTok;document.title='Shock-o-meter · NBA ATLAS';
  view.innerHTML=shell('Τελευταίες 3 εβδομάδες','Shock-o-meter','Οι νίκες που ήταν σχεδόν αδύνατες. Κατάταξη με βάση πόσο χαμηλά έπεσε η πιθανότητα νίκης του τελικού νικητή (ESPN win probability). ⚠ Περιέχει αποτελέσματα.')+'<div id="shbox"><div class="skel" style="min-height:400px"></div></div>';
  const d=await api('insight?days=21');if(t!==sTok)return;const box=document.getElementById('shbox');
  if(!d?.games?.length){box.innerHTML='<div class="err">Δεν φόρτωσαν οι αγώνες. Δοκίμασε ξανά σε λίγο.</div>';return}
  const key=g=>g.spoiler.minWinnerWP!=null?g.spoiler.minWinnerWP:Math.max(0,.5-g.spoiler.maxDeficit/40);
  const G=d.games.filter(g=>g.spoiler.maxDeficit>=6).sort((a,b)=>key(a)-key(b)).slice(0,12);
  box.innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">${G.map((g,i)=>{const s=g.spoiler,wn=s.winner===g.home.abbr?g.home:g.away,ls=wn===g.home?g.away:g.home,p=s.minWinnerWP;
   return`<a class="shock" href="#/game/${g.id}"><div style="text-align:center"><div class="dim" style="font-weight:900;font-size:12px">#${i+1}</div><img src="${esc(wn.logo||'')}" style="width:52px;height:52px" ${hide}></div>
   <div><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><b style="font-size:16px">${esc(wn.name)} ${Math.max(s.homeScore,s.awayScore)}–${Math.min(s.homeScore,s.awayScore)} ${esc(ls.abbr)}</b><span class="dim" style="font-size:12px">${esc(when(g.date))}</span></div>
   <div style="display:flex;gap:22px;flex-wrap:wrap;margin:8px 0"><div><div class="pct">${p!=null?(p*100<1?'<1':f(p*100,0))+'%':'—'}</div><small class="dim">χαμηλότερη πιθ. νίκης</small></div><div><div class="pct" style="color:var(--text)">−${s.maxDeficit}</div><small class="dim">μεγαλύτερη διαφορά</small></div><div><div class="pct" style="color:var(--ice)">${s.leadChanges}</div><small class="dim">αλλαγές προβαδίσματος</small></div></div>
   ${curve(s.curve,g.home,g.away,600,110)}</div></a>`}).join('')||'<div class="card muted">Καμία μεγάλη ανατροπή στο διάστημα.</div>'}</div>
   <p class="note">Αναλύθηκαν ${d.count} αγώνες. Όταν το ESPN δεν δίνει πιθανότητα νίκης, η κατάταξη χρησιμοποιεί τη μεγαλύτερη διαφορά που ανέτρεψε ο νικητής.</p>`;
}

/* ---------- shared Monte Carlo with adjustments (seeded, common random numbers) ---------- */
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function simulate(pw,sc,{gameAdj=null,poAdj=null,N=3000,seed=7}={}){
  const R0=rng(seed),rand=()=>R0();
  const T=pw.teams.map(x=>({...x,r:(+x.margin||0)*(x.games/(x.games+12))})),idx=Object.fromEntries(T.map((x,i)=>[x.id,i]));
  const gauss=()=>{let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const P=d=>1/(1+Math.exp(-d/6.6));
  const G=sc.games.filter(g=>idx[g.home]!=null&&idx[g.away]!=null).map((g,k)=>[idx[g.home],idx[g.away],gameAdj?gameAdj[k]?.[0]||0:0,gameAdj?gameAdj[k]?.[1]||0:0]);
  const conf=c=>T.map((x,i)=>i).filter(i=>/east/i.test(T[i].conference)===c);const E=conf(true),W=conf(false),n=T.length;
  if(E.length<10||W.length<10)return null;
  const acc={w:new Float64Array(n),po:new Float64Array(n),ttl:new Float64Array(n),fin:new Float64Array(n)};
  const PA=T.map(x=>poAdj?.[x.id]||0);
  const pg=(a,b,Wn,R)=>{const home=Wn[a]>=Wn[b]?a:b,away=home===a?b:a,p=P(R[home]+PA[home]-R[away]-PA[away]+2.3);return home===a?p:1-p};
  const ser=p=>{let s=0;const c=[1,4,10,20];for(let k=0;k<4;k++)s+=c[k]*p**4*(1-p)**k;return s};
  const series=(a,b,Wn,R)=>{const ph=pg(a,b,Wn,R),nt=P(R[a]+PA[a]-R[b]-PA[b]),pa=(ph*4+nt*3)/7;return rand()<ser(pa)?a:b};
  const one=(a,b,Wn,R)=>rand()<pg(a,b,Wn,R)?a:b;
  for(let s=0;s<N;s++){
    const Wn=T.map(x=>x.wins),R=T.map(x=>x.r+gauss()*2.4);
    for(const [h,a,ah,aa] of G){if(rand()<P(R[h]+ah-R[a]-aa+2.3))Wn[h]++;else Wn[a]++}
    const ch=[];
    for(const C of [E,W]){const o=C.slice().sort((a,b)=>Wn[b]-Wn[a]||rand()-.5);o.forEach((i,k)=>{acc.w[i]+=Wn[i];if(k<6)acc.po[i]++});
      const w78=one(o[6],o[7],Wn,R),l78=w78===o[6]?o[7]:o[6],w910=one(o[8],o[9],Wn,R),s8=one(l78,w910,Wn,R);acc.po[w78]++;acc.po[s8]++;
      const sd=[o[0],o[1],o[2],o[3],o[4],o[5],w78,s8],r1=[[0,7],[3,4],[2,5],[1,6]].map(([a,b])=>series(sd[a],sd[b],Wn,R)),r2=[series(r1[0],r1[1],Wn,R),series(r1[2],r1[3],Wn,R)];
      ch.push(series(r2[0],r2[1],Wn,R))}
    ch.forEach(c=>acc.fin[c]++);acc.ttl[series(ch[0],ch[1],Wn,R)]++;
  }
  return{G:G.length,rows:T.map((x,i)=>({id:x.id,abbr:x.abbr,name:x.name,logo:x.logo,wins:x.wins,losses:x.losses,pw:acc.w[i]/N,po:acc.po[i]/N*100,fin:acc.fin[i]/N*100,ttl:acc.ttl[i]/N*100}))};
}
const impact=p=>Math.max(0,Math.min(8,((+p.index||0)-38)/5.5));

/* ---------- 3. what-if ---------- */
let scen=[],wiTok=0;
async function whatif(){
  const t=++wiTok;document.title='Παράλληλο σύμπαν · NBA ATLAS';
  view.innerHTML=shell('What-if simulator','Παράλληλο σύμπαν','Άλλαξε την πραγματικότητα και ξανάπαιξε τη σεζόν 3.000 φορές. Βγάλε έναν παίκτη για κάποιους αγώνες ή στείλ’ τον σε άλλη ομάδα.')+'<div id="wibox"><div class="skel" style="min-height:300px"></div></div>';
  const [pw,sc]=await Promise.all([api('power'),api('schedule')]);if(t!==wiTok)return;const box=document.getElementById('wibox');
  if(!pw?.teams?.length||!pw?.players?.length||!sc?.games){box.innerHTML='<div class="err">Δεν φόρτωσαν τα δεδομένα. Δοκίμασε ξανά σε λίγο.</div>';return}
  const PL=pw.players.filter(p=>p.teamId).sort((a,b)=>(b.index||0)-(a.index||0)),TM=pw.teams.slice().sort((a,b)=>a.name.localeCompare(b.name));
  box.innerHTML=`<div class="card"><div class="wf">
   <label>Παίκτης<input id="wp" list="wpl" placeholder="π.χ. Nikola Jokić"><datalist id="wpl">${PL.map(p=>`<option value="${esc(p.name)}">${esc(p.team)}</option>`).join('')}</datalist></label>
   <label>Σενάριο<select id="wk"><option value="out">Εκτός για αγώνες</option><option value="season">Εκτός όλη τη σεζόν + playoffs</option><option value="trade">Μεταγραφή σε…</option></select></label>
   <label id="wnl">Αγώνες εκτός: <span id="wnv">10</span><input id="wn" type="range" min="1" max="60" value="10"></label>
   <label id="wtl" hidden>Νέα ομάδα<select id="wt">${TM.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
   <button class="btn-hot" id="wadd">+ Πρόσθεσε</button></div><div class="scn" id="wscn"></div>
   <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn-hot" id="wrun">▶ Τρέξε το σύμπαν</button><button class="more" id="wclr">Καθάρισε</button></div></div>
   <div id="wires" style="margin-top:16px"></div>
   <p class="note">Αξία παίκτη = (Atlas index − 38) / 5,5 πόντοι διαφοράς ανά αγώνα, έως 8. Ο παίκτης εκτός κοστίζει στην ομάδα το 90% της αξίας του. Σε μεταγραφή η νέα ομάδα κερδίζει το 75% (χρόνος προσαρμογής, επικάλυψη ρόλων). Ίδιοι τυχαίοι αριθμοί και στα δύο σύμπαντα, ώστε η διαφορά να οφείλεται στο σενάριο. Χονδρική εκτίμηση, όχι πρόβλεψη.</p>`;
  const $=id=>document.getElementById(id),kind=$('wk');
  kind.onchange=()=>{$('wnl').hidden=kind.value!=='out';$('wtl').hidden=kind.value!=='trade'};$('wn').oninput=()=>$('wnv').textContent=$('wn').value;
  const paint=()=>{$('wscn').innerHTML=scen.map((s,i)=>`<span>${esc(s.p.name)} · ${s.k==='out'?`εκτός ${s.n} αγ.`:s.k==='season'?'εκτός σεζόν':'→ '+esc(TM.find(x=>x.id===s.to)?.abbr||'')}<button data-i="${i}" aria-label="Αφαίρεση">✕</button></span>`).join('')||'<span class="dim" style="background:none;border:0;font-weight:600">Κανένα σενάριο ακόμα. Διάλεξε παίκτη και πάτα «Πρόσθεσε».</span>';
    $('wscn').querySelectorAll('button').forEach(b=>b.onclick=()=>{scen.splice(+b.dataset.i,1);paint()})};
  $('wadd').onclick=()=>{const q=norm($('wp').value),p=PL.find(x=>norm(x.name)===q)||PL.find(x=>norm(x.name).includes(q)&&q.length>2);if(!p){$('wp').focus();$('wp').style.borderColor='var(--bad)';return}
    $('wp').style.borderColor='';scen.push({p,k:kind.value,n:+$('wn').value,to:$('wt').value});$('wp').value='';paint()};
  $('wclr').onclick=()=>{scen=[];paint();$('wires').innerHTML=''};
  $('wrun').onclick=()=>run(pw,sc);paint();
  const pre=route().q.get('p');if(pre){const p=PL.find(x=>x.id===pre);if(p&&!scen.some(s=>s.p.id===p.id)){scen.push({p,k:'season',n:10,to:TM[0].id});paint()}}
}
function run(pw,sc){
  const out=document.getElementById('wires');if(!scen.length){out.innerHTML='<div class="card muted">Πρόσθεσε πρώτα ένα σενάριο.</div>';return}
  out.innerHTML='<div class="skel" style="min-height:240px"></div>';
  setTimeout(()=>{
    const tIds=new Set(pw.teams.map(x=>x.id)),games=sc.games.filter(g=>tIds.has(g.home)&&tIds.has(g.away));
    const adj=games.map(()=>[0,0]),po={};
    for(const s of scen){const v=impact(s.p),from=s.p.teamId;
      if(s.k==='trade'){games.forEach((g,k)=>{if(g.home===from)adj[k][0]-=.9*v;if(g.away===from)adj[k][1]-=.9*v;if(g.home===s.to)adj[k][0]+=.75*v;if(g.away===s.to)adj[k][1]+=.75*v});po[from]=(po[from]||0)-.9*v;po[s.to]=(po[s.to]||0)+.75*v}
      else{let c=0;games.forEach((g,k)=>{if(s.k==='out'&&c>=s.n)return;if(g.home===from){adj[k][0]-=.9*v;c++}else if(g.away===from){adj[k][1]-=.9*v;c++}});if(s.k==='season')po[from]=(po[from]||0)-.9*v}}
    const sc2={games};const A=simulate(pw,sc2,{seed:11}),B=simulate(pw,sc2,{seed:11,gameAdj:adj,poAdj:po});
    if(!A||!B){out.innerHTML='<div class="err">Η προσομοίωση δεν έτρεξε (λείπουν περιφέρειες).</div>';return}
    const rows=A.rows.map((a,i)=>({...a,b:B.rows[i],dW:B.rows[i].pw-a.pw,dP:B.rows[i].po-a.po,dT:B.rows[i].ttl-a.ttl}));
    const involved=new Set(scen.flatMap(s=>[s.p.teamId,s.k==='trade'?s.to:null]).filter(Boolean));
    const list=rows.filter(r=>involved.has(r.id)).concat(rows.filter(r=>!involved.has(r.id)).sort((a,b)=>Math.abs(b.dT)+Math.abs(b.dP)/4-Math.abs(a.dT)-Math.abs(a.dP)/4).slice(0,6));
    const d=(v,u='%',dg=1)=>{const s=Math.abs(v)<.05?'±0':(v>0?'+':'−')+f(Math.abs(v),dg);return`<span class="delta ${v>.05?'up':v<-.05?'dn':''}">${s}${Math.abs(v)<.05?'':u}</span>`};
    const champ=r=>r.slice().sort((a,b)=>b.ttl-a.ttl)[0];const cA=champ(A.rows),cB=champ(B.rows);
    out.innerHTML=`<div class="card"><div style="display:flex;gap:28px;flex-wrap:wrap;margin-bottom:16px"><div><div class="lbl">Φαβορί, πραγματικότητα</div><b style="font-size:18px">${esc(cA.name)} ${f(cA.ttl,1)}%</b></div><div><div class="lbl">Φαβορί, παράλληλο σύμπαν</div><b style="font-size:18px;color:var(--violet)">${esc(cB.name)} ${f(cB.ttl,1)}%</b></div></div>
     <div class="tbl-wrap"><table><thead><tr><th>Ομάδα</th><th>Προβλ. W</th><th>Δ</th><th>Playoffs</th><th>Δ</th><th>Τίτλος</th><th>Δ</th></tr></thead><tbody>${list.map(r=>`<tr ${involved.has(r.id)?'style="background:rgba(124,92,255,.08)"':''}><td><a class="tcell" href="#/team/${r.id}"><img src="${esc(r.logo||'')}" ${hide}>${esc(r.abbr)}</a></td><td>${f(r.pw,1)} → <b>${f(r.b.pw,1)}</b></td><td>${d(r.dW,'',1)}</td><td>${f(r.po,0)}% → <b>${f(r.b.po,0)}%</b></td><td>${d(r.dP)}</td><td>${f(r.ttl,1)}% → <b>${f(r.b.ttl,1)}%</b></td><td>${d(r.dT)}</td></tr>`).join('')}</tbody></table></div>
     <p class="note">${A.G} αγώνες που απομένουν · 3.000 σεζόν σε κάθε σύμπαν. Με μωβ οι ομάδες του σεναρίου, από κάτω όσες επηρεάζονται περισσότερο έμμεσα.</p></div>`;
  },30);
}

/* ---------- 4. model vs markets ---------- */
let eTok=0;
async function edge(){
  const t=++eTok;document.title='Μοντέλο vs αγορές · NBA ATLAS';
  view.innerHTML=shell('Edge radar','Μοντέλο vs αγορές','Η προσομοίωση Monte Carlo του Atlas απέναντι στις αγορές πρόβλεψης για τον τίτλο. Οι τιμές των αγορών κανονικοποιούνται ώστε να αθροίζουν 100%.')+'<div id="edbox"><div class="skel" style="min-height:400px"></div></div>';
  const [pw,sc,m]=await Promise.all([api('power'),api('schedule'),api('markets?type=title')]);if(t!==eTok)return;const box=document.getElementById('edbox');
  if(!pw?.teams?.length||!sc?.games){box.innerHTML='<div class="err">Δεν φόρτωσαν τα δεδομένα του μοντέλου.</div>';return}
  await new Promise(r=>setTimeout(r,20));const S=simulate(pw,sc,{N:4000,seed:3});if(!S){box.innerHTML='<div class="err">Η προσομοίωση δεν έτρεξε.</div>';return}
  const KC={GSW:'GS',NYK:'NY',SAS:'SA',NOP:'NO',UTA:'UTAH',WAS:'WSH',PHO:'PHX',BRK:'BKN'};
  const poly={},kal={};(m?.sources?.polymarket?.rows||[]).forEach(r=>{if(+r.price>0)poly[norm(r.name)]=+r.price});(m?.sources?.kalshi?.rows||[]).forEach(r=>{if(+r.price>0)kal[KC[r.code]||r.code]=+r.price});
  const sum=o=>Object.values(o).reduce((a,b)=>a+b,0),ps=sum(poly),ks=sum(kal);
  const rows=S.rows.map(r=>{const p=poly[norm(r.name)],k=kal[r.abbr];const pn=p!=null&&ps?p/ps*100:null,kn=k!=null&&ks?k/ks*100:null;const mk=[pn,kn].filter(v=>v!=null);return{...r,pn,kn,mkt:mk.length?mk.reduce((a,b)=>a+b,0)/mk.length:null}}).filter(r=>r.mkt!=null||r.ttl>=1);
  if(!rows.some(r=>r.mkt!=null)){box.innerHTML='<div class="err">Οι αγορές πρόβλεψης δεν απάντησαν αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.</div>';return}
  rows.forEach(r=>r.e=r.mkt==null?null:r.ttl-r.mkt);
  const R=rows.filter(r=>r.e!=null).sort((a,b)=>b.e-a.e),mx=Math.max(4,...R.map(r=>Math.abs(r.e)));
  const lineFor=r=>`<a class="edge" href="#/team/${r.id}"><img src="${esc(r.logo||'')}" style="width:26px;height:26px" ${hide}><b>${esc(r.abbr)} <span class="dim" style="font-weight:600;font-size:11.5px">${f(r.ttl,1)} vs ${f(r.mkt,1)}</span></b><div class="ax"><i style="${r.e>=0?`left:50%;width:${r.e/mx*50}%;background:var(--good)`:`right:50%;width:${-r.e/mx*50}%;background:var(--bad)`}"></i></div><span class="delta ${r.e>=0?'up':'dn'}" style="text-align:right">${r.e>=0?'+':'−'}${f(Math.abs(r.e),1)}</span></a>`;
  const top=R[0],bot=R[R.length-1];
  box.innerHTML=`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:16px">
   <div class="card"><div class="lbl">Το μοντέλο τους βλέπει ψηλότερα</div><b style="font-size:20px;color:var(--good)">${esc(top.name)}</b><div class="muted" style="margin-top:6px">Atlas ${f(top.ttl,1)}% · αγορές ${f(top.mkt,1)}%</div></div>
   <div class="card"><div class="lbl">Το μοντέλο τους βλέπει χαμηλότερα</div><b style="font-size:20px;color:var(--bad)">${esc(bot.name)}</b><div class="muted" style="margin-top:6px">Atlas ${f(bot.ttl,1)}% · αγορές ${f(bot.mkt,1)}%</div></div></div>
   <div class="card"><div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px"><span>← αγορές πιο αισιόδοξες</span><span>μοντέλο πιο αισιόδοξο →</span></div>${R.map(lineFor).join('')}</div>
   <p class="note">Δ = πιθανότητα τίτλου Atlas μείον μέσος όρος αγορών (σε ποσοστιαίες μονάδες). Polymarket ${ps?'✓':'—'} · Kalshi ${ks?'✓':'—'}. Οι αγορές ενσωματώνουν τραυματισμούς, μεταγραφές και ειδήσεις που το μοντέλο δεν βλέπει, άρα μια μεγάλη απόκλιση συχνά σημαίνει κάτι που λείπει από το μοντέλο. Δεν είναι συμβουλή στοιχήματος.</p>`;
}

/* ---------- 5. Player DNA ---------- */
let dTok=0;
async function dna(id){
  const t=++dTok;document.title='Player DNA · NBA ATLAS';
  if(!id){view.innerHTML=shell('Generative art','Player DNA','Διάλεξε παίκτη. Κάθε κάρτα είναι μοναδική: τα στατιστικά του ορίζουν σχήμα, πυκνότητα και ρυθμό.')+`<div class="card"><div class="wf"><label>Παίκτης<input id="dq" list="dql" placeholder="Γράψε όνομα…"><datalist id="dql"></datalist></label><button class="btn-hot" id="dgo">🧬 Φτιάξε DNA</button></div><div class="twins" id="dsug" style="margin-top:16px"></div></div>`;
    const [pw,gt]=await Promise.all([api('power'),api('goat')]);if(t!==dTok)return;const all=[...(pw?.players||[]).sort((a,b)=>(b.index||0)-(a.index||0)),...(gt?.players||[]).filter(p=>!(pw?.players||[]).some(x=>x.id===p.id))];
    document.getElementById('dql').innerHTML=all.map(p=>`<option value="${esc(p.name)}">`).join('');
    document.getElementById('dsug').innerHTML=all.slice(0,8).concat((gt?.players||[]).filter(p=>!p.active).slice(0,4)).map(p=>`<a class="twin" href="#/dna/${p.id}"><img src="${esc(p.headshot||`https://a.espncdn.com/i/headshots/nba/players/full/${p.id}.png`)}" alt="${esc(p.name)}"><span><b>${esc(p.name)}</b><small>${p.active===false?'Θρύλος':esc(p.team||'')}</small></span></a>`).join('');
    const go=()=>{const q=norm(document.getElementById('dq').value),p=all.find(x=>norm(x.name)===q)||all.find(x=>norm(x.name).includes(q)&&q.length>2);if(p)location.hash='#/dna/'+p.id};
    document.getElementById('dgo').onclick=go;document.getElementById('dq').onkeydown=e=>{if(e.key==='Enter')go()};return}
  view.innerHTML=shell('Generative art','Player DNA','')+'<div id="dnabox"><div class="skel" style="min-height:500px"></div></div>';
  const [pw,gt,tm]=await Promise.all([api('power'),api('goat'),api('data?type=teams')]);if(t!==dTok)return;
  const cur=(pw?.players||[]).find(p=>p.id===id),lg=(gt?.players||[]).find(p=>p.id===id),box=document.getElementById('dnabox');
  if(!cur&&!lg){box.innerHTML='<div class="err">Δεν βρέθηκαν στατιστικά για αυτόν τον παίκτη. Το DNA υπάρχει για τους παίκτες της τρέχουσας σεζόν και τους θρύλους της GOAT λίστας.</div>';return}
  (tm?.teams||[]).forEach(x=>{teamCol[x.id]=hex(x.color)});
  const s=cur?{name:cur.name,sub:`${cur.teamName||cur.team} · σεζόν 2026–27`,ppg:cur.ppg,rpg:cur.rpg,apg:cur.apg,spg:cur.spg,bpg:cur.bpg,ts:cur.tsPct,col:teamCol[cur.teamId]||'#ff5a1f'}
                :{name:lg.name,sub:`Καριέρα · ${lg.games||''} αγώνες`,ppg:lg.careerPPG,rpg:lg.careerRPG,apg:lg.careerAPG,spg:lg.careerSPG??1,bpg:lg.careerBPG??.8,ts:lg.careerTS??56,col:'#ffb347'};
  box.innerHTML=`<div class="dna-wrap"><canvas id="dnac" width="1080" height="1350" aria-label="Player DNA του ${esc(s.name)}"></canvas><div class="card"><div class="eyebrow">${esc(s.sub)}</div><h2 class="h2" style="margin:6px 0 14px">${esc(s.name)}</h2>
   <div class="lbl">Πώς διαβάζεται</div><div class="muted" style="font-size:14px;line-height:1.7">🔥 <b style="color:var(--text)">Ακτίνες</b> = πόντοι (${f(s.ppg)})<br>⭕ <b style="color:var(--text)">Δακτύλιοι</b> = ριμπάουντ (${f(s.rpg)})<br>✳️ <b style="color:var(--text)">Κορυφές του αστεριού</b> = ασίστ (${f(s.apg)})<br>✨ <b style="color:var(--text)">Σπίθες</b> = κλεψίματα + τάπες (${f((+s.spg||0)+(+s.bpg||0))})<br>〰️ <b style="color:var(--text)">Ομαλότητα γραμμών</b> = εύστοχία TS% (${f(s.ts)})</div>
   <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="btn-hot" id="dsave">⬇ Κατέβασε PNG</button>${navigator.share?'<button class="more" id="dshare">Κοινοποίηση</button>':''}<a class="more" href="#/player/${id}">Προφίλ →</a></div>
   <p class="note">Ίδιος παίκτης, ίδια στατιστικά → ίδια εικόνα. Όσο αλλάζουν τα νούμερα στη σεζόν, αλλάζει και το DNA.</p></div></div>`;
  try{await Promise.race([Promise.all([document.fonts.load('80px Anton'),document.fonts.load('800 30px Inter')]),new Promise(r=>setTimeout(r,1500))])}catch{}
  if(t!==dTok)return;const cv=document.getElementById('dnac');draw(cv,s,id);
  const blob=()=>new Promise(r=>cv.toBlob(r,'image/png')),fn=`atlas-dna-${norm(s.name)||id}.png`;
  document.getElementById('dsave').onclick=async()=>{const b=await blob();if(!b)return;const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
  const sh=document.getElementById('dshare');if(sh)sh.onclick=async()=>{try{const b=await blob(),file=new File([b],fn,{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Player DNA · '+s.name});else await navigator.share({title:'Player DNA · '+s.name,url:location.href})}catch{}};
}
function draw(cv,s,id){
  const c=cv.getContext('2d'),W=1080,H=1350,cx=W/2,cy=600,R=rng([...String(id)].reduce((a,ch)=>a*31+ch.charCodeAt(0)|0,7));
  const col=s.col,acc='#ff5a1f',ppg=+s.ppg||0,rpg=+s.rpg||0,apg=+s.apg||0,stk=(+s.spg||0)+(+s.bpg||0),ts=+s.ts||55;
  c.fillStyle='#08090c';c.fillRect(0,0,W,H);
  let g=c.createRadialGradient(cx,cy,40,cx,cy,620);g.addColorStop(0,col+'66');g.addColorStop(.55,col+'14');g.addColorStop(1,'#08090c00');c.fillStyle=g;c.fillRect(0,0,W,H);
  c.globalCompositeOperation='lighter';
  const rays=Math.round(40+ppg*7),smooth=Math.max(0,Math.min(1,(ts-48)/20));
  for(let i=0;i<rays;i++){const a=i/rays*Math.PI*2+R()*.05,len=150+R()*(120+ppg*9),wob=(1-smooth)*28+4;c.beginPath();let x=cx+Math.cos(a)*70,y=cy+Math.sin(a)*70;c.moveTo(x,y);
    for(let k=1;k<=24;k++){const d=70+len*k/24,ang=a+Math.sin(k*.6+i)*wob/d;x=cx+Math.cos(ang)*d;y=cy+Math.sin(ang)*d;c.lineTo(x,y)}
    c.strokeStyle=(i%3?col:acc)+(i%3?'55':'88');c.lineWidth=1.2+R()*1.8;c.stroke()}
  const rings=Math.max(1,Math.round(rpg));for(let i=0;i<rings;i++){const r=90+i*(330/Math.max(rings,1))+R()*8;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.strokeStyle=`rgba(255,255,255,${.06+.1*(1-i/rings)})`;c.lineWidth=i%2?1:2.2;c.setLineDash(i%3===0?[]:[2+R()*10,6+R()*12]);c.stroke()}c.setLineDash([]);
  const pts=Math.max(3,Math.round(apg*1.6)),step=Math.max(2,Math.round(pts/2.6)),sr=250+apg*8;c.beginPath();for(let i=0;i<=pts;i++){const k=(i*step)%pts,a=k/pts*Math.PI*2-Math.PI/2;const x=cx+Math.cos(a)*sr,y=cy+Math.sin(a)*sr;i?c.lineTo(x,y):c.moveTo(x,y)}
  c.strokeStyle=acc+'cc';c.lineWidth=2.4;c.stroke();
  for(let i=0;i<pts;i++){const a=i/pts*Math.PI*2-Math.PI/2;c.beginPath();c.arc(cx+Math.cos(a)*sr,cy+Math.sin(a)*sr,7,0,Math.PI*2);c.fillStyle='#fff';c.fill()}
  const sparks=Math.round(30+stk*70);for(let i=0;i<sparks;i++){const a=R()*Math.PI*2,d=120+R()*440,r=R()*2.6+.6;c.beginPath();c.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,r,0,Math.PI*2);c.fillStyle=R()<.3?acc:'#ffffff';c.globalAlpha=.35+R()*.6;c.fill()}c.globalAlpha=1;
  c.globalCompositeOperation='source-over';
  g=c.createRadialGradient(cx,cy,0,cx,cy,78);g.addColorStop(0,'#ffffff');g.addColorStop(.35,acc);g.addColorStop(1,col);c.beginPath();c.arc(cx,cy,64,0,Math.PI*2);c.fillStyle=g;c.fill();
  g=c.createLinearGradient(0,H-420,0,H);g.addColorStop(0,'#08090c00');g.addColorStop(.45,'#08090cee');g.addColorStop(1,'#08090c');c.fillStyle=g;c.fillRect(0,H-420,W,420);
  c.fillStyle='#ff5a1f';c.font='800 26px Inter, sans-serif';c.textAlign='left';c.fillText('PLAYER DNA',70,90);c.fillStyle='rgba(255,255,255,.55)';c.textAlign='right';c.fillText('NBA ATLAS',W-70,90);
  c.textAlign='left';c.fillStyle='#fff';let fs=118;c.font=`${fs}px Anton, Impact, sans-serif`;const nm=s.name.toUpperCase();while(c.measureText(nm).width>W-140&&fs>50){fs-=4;c.font=`${fs}px Anton, Impact, sans-serif`}c.fillText(nm,70,H-235);
  c.font='600 28px Inter, sans-serif';c.fillStyle='rgba(255,255,255,.6)';c.fillText(s.sub,70,H-185);
  const st=[['PTS',ppg],['REB',rpg],['AST',apg],['STK',stk],['TS%',ts]];st.forEach(([k,v],i)=>{const x=70+i*190;c.fillStyle='#fff';c.font='64px Anton, Impact, sans-serif';c.fillText(f(v,1),x,H-90);c.fillStyle=i===0?acc:'rgba(255,255,255,.5)';c.font='800 22px Inter, sans-serif';c.fillText(k,x,H-55)});
}

/* ---------- router hooks ---------- */
const LAB=['lab','watch','shock','whatif','edge','dna'];
const navAdd=()=>{const after=document.querySelector('#links [data-r="odds"]')||document.querySelector('#links [data-r="power"]');if(after&&!document.querySelector('#links [data-r="lab"]'))after.insertAdjacentHTML('afterend','<a href="#/lab" data-r="lab">Atlas Lab</a>')};
function hook(){
  const r=route();navAdd();if(r.name!=='watch')clearTimeout(nowTimer);
  document.querySelectorAll('#links [data-r="lab"]').forEach(a=>a.classList.toggle('on',LAB.includes(r.name)));
  if(LAB.includes(r.name)){document.querySelectorAll('#links [data-r]').forEach(a=>{if(a.dataset.r!=='lab')a.classList.remove('on')});
    setTimeout(()=>({lab:hub,watch,shock,whatif,edge,dna:()=>dna(r.id)})[r.name](),0);return}
  if(r.name==='menu')setTimeout(()=>{if(!document.getElementById('atlas-menu-page')&&!document.getElementById('labcard'))view.insertAdjacentHTML('afterbegin','<a id="labcard" class="card" href="#/lab" style="display:block;margin-bottom:16px;background:linear-gradient(135deg,rgba(124,92,255,.18),rgba(255,90,31,.12))"><div class="eyebrow">Νέο · πειράματα</div><div class="h2" style="font-size:30px">NBA ATLAS Lab</div><div class="muted" style="margin-top:4px">Replay χωρίς spoilers · ανατροπές · what-if · αγορές · Player DNA</div></a>')},30);
}
let pend=null;
new MutationObserver(()=>{clearTimeout(pend);pend=setTimeout(()=>{const r=route();navAdd();
  if(r.name==='player'&&r.id){const txt=document.querySelector('.phero .txt');if(txt&&!txt.querySelector('.dna-btn'))txt.insertAdjacentHTML('beforeend',`<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="dna-btn" href="#/dna/${r.id}">🧬 Player DNA</a><a class="dna-btn" href="#/whatif?p=${r.id}">🌀 Τι θα γινόταν χωρίς αυτόν;</a></div>`)}
  if((r.name==='home'||r.name==='')&&!document.getElementById('labhome')){const a=document.getElementById('hgames')?.closest('section');if(a)a.insertAdjacentHTML('afterend',`<section class="sec" id="labhome"><a class="card" href="#/watch" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:linear-gradient(135deg,rgba(255,90,31,.14),rgba(124,92,255,.12))"><div><div class="eyebrow">Lab · χωρίς spoilers</div><div class="h3" style="margin-top:4px">🍿 Ποια χθεσινά ματς αξίζουν replay;</div></div><span class="more">Δες τη λίστα →</span></a></section>`)}
},150)}).observe(view,{childList:true});
addEventListener('hashchange',hook);hook();
})();
