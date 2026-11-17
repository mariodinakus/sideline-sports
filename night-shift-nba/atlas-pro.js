/* NBA ATLAS Pro: luck index, fatigue radar (+ fatigue-aware game model), replay movie, player points ranges with
   walk-forward track record, pick'em vs the model, advanced team/player stats, jersey art for legends without photos.
   Data: /api/lab (season|gamelog|replay), /api/power, /api/schedule, /api/data, /api/insight. */
(()=>{'use strict';
const view=document.getElementById('view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(v,d=1)=>{const x=Number(v);return v==null||v===''||!Number.isFinite(x)?'—':x.toFixed(d)};
const pc=(v,d=1)=>v==null||!Number.isFinite(+v)?'—':(v*100).toFixed(d)+'%';
const sg=(v,d=1)=>v==null||!Number.isFinite(+v)?'—':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d);
const hide=`onerror="this.style.visibility='hidden'"`;
const HS=id=>`https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const cache=new Map();
const api=p=>{if(!cache.has(p))cache.set(p,fetch('/api/'+p).then(r=>r.ok?r.json():null).then(j=>j&&(j.data&&!j.players&&!j.teams&&!j.games&&!j.plays?j.data:j)).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
const route=()=>{const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[name,id]=path.split('/');return{name:name||'home',id,q:new URLSearchParams(qs||'')}};
const hex=c=>{c=String(c||'').replace('#','');return /^[0-9a-f]{6}$/i.test(c)?'#'+c:'#ff5a1f'};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[^a-z]/g,'');
const ath=d=>{try{return new Date(d).toLocaleString('el-GR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Athens'})}catch{return''}};
const shell=(eb,t,lede,extra='')=>`<div id="hero" hidden></div><a class="more" href="#/lab" style="display:inline-block;margin-bottom:14px">← Lab</a><div class="sec-h"><div><div class="eyebrow">${eb}</div><h2 class="h2">${t}</h2>${lede?`<p class="lede" style="margin-top:8px">${lede}</p>`:''}</div>${extra}</div>`;
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};

const css=document.createElement('style');css.textContent=`
.pro-tbl td,.pro-tbl th{white-space:nowrap}.pro-tbl th[data-k]{cursor:pointer}.pro-tbl th[data-k]:hover{color:var(--text)}
.heat{border-radius:6px;padding:3px 7px;font-weight:700}
.chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:var(--bg2);border:1px solid var(--line2);color:var(--muted);white-space:nowrap}
.chip.bad{color:#ffc2cd;border-color:rgba(255,77,106,.45);background:rgba(255,77,106,.08)}.chip.good{color:#b5f5cf;border-color:rgba(60,220,140,.4);background:rgba(60,220,140,.08)}.chip.hot{color:#111;background:var(--hot);border-color:var(--hot)}
.frow{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--card);margin-bottom:10px}
.frow .fr-s{display:flex;flex-direction:column;gap:6px}.frow .fr-s.r{align-items:flex-end;text-align:right}.frow .fr-t{display:flex;align-items:center;gap:8px;font-weight:900}.frow .fr-s.r .fr-t{flex-direction:row-reverse}
.frow img{width:30px;height:30px}.fbar{height:6px;border-radius:99px;background:var(--bg2);overflow:hidden;width:120px}.fbar i{display:block;height:100%;background:linear-gradient(90deg,var(--good),var(--hot),var(--bad))}
.fr-m{text-align:center;font-size:12px;color:var(--muted)}.fr-m b{display:block;font-family:var(--display);font-size:24px;color:var(--text)}
.rp-stage{position:relative;border:1px solid var(--line);border-radius:var(--r);background:var(--card);padding:18px;overflow:hidden}
.rp-score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:12px}
.rp-score .t{display:flex;align-items:center;gap:10px;font-weight:900;font-size:15px}.rp-score .t.r{justify-content:flex-end}
.rp-score img{width:46px;height:46px}.rp-score .num{font-family:var(--display);font-size:52px;line-height:1;min-width:84px;text-align:center}
.rp-clock{text-align:center;font-weight:800;color:var(--hot);font-size:13px;letter-spacing:.06em}
.rp-feed{display:flex;flex-direction:column;gap:4px;margin-top:10px;min-height:66px;font-size:13px;color:var(--muted)}.rp-feed div:first-child{color:var(--text);font-weight:700}
.rp-ctrl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}.rp-ctrl input[type=range]{flex:1;min-width:160px;accent-color:var(--hot)}
.pcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.pcard{border:1px solid var(--line);border-radius:var(--r);background:var(--card);padding:16px;display:flex;flex-direction:column;gap:10px}
.pcard .top{display:flex;gap:12px;align-items:center}.pcard .top img{width:64px;height:52px;object-fit:cover;object-position:top;border-radius:10px;background:var(--bg2)}
.rng{font-family:var(--display);font-size:38px;line-height:1}.rng small{font-size:14px;color:var(--dim);font-family:var(--body,inherit)}
.pk{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--card);margin-bottom:10px}
.pk button.tb{display:flex;align-items:center;gap:8px;justify-content:center;padding:10px;border-radius:12px;border:1px solid var(--line2);font-weight:900;width:100%;color:var(--text)}
.pk button.tb img{width:28px;height:28px}.pk button.tb.on{background:var(--hot);color:#111;border-color:var(--hot)}.pk button.tb:disabled{cursor:default}
.pk .ok{color:var(--good)}.pk .no{color:var(--bad)}
.pctl{display:grid;grid-template-columns:110px 1fr 56px;gap:10px;align-items:center;font-size:12.5px;padding:4px 0}.pctl .bar{height:9px;border-radius:99px;background:var(--bg2);overflow:hidden}.pctl .bar i{display:block;height:100%;border-radius:99px}
.tabs2{display:flex;gap:8px;margin-bottom:14px}.tabs2 a{padding:8px 16px;border-radius:999px;border:1px solid var(--line2);font-weight:800;font-size:13px;color:var(--muted)}.tabs2 a.on{background:var(--text);color:#111}
@media (max-width:600px){.frow{grid-template-columns:1fr;gap:8px}.frow .fr-s.r{align-items:flex-start;text-align:left}.frow .fr-s.r .fr-t{flex-direction:row}.fbar{width:100%}.rp-score .num{font-size:38px;min-width:60px}.rp-score img{width:34px;height:34px}}`;
document.head.appendChild(css);

/* ---------- jersey art for players without an ESPN photo ---------- */
const TC={CHI:['#CE1141','#111111'],LAL:['#552583','#FDB927'],BOS:['#007A33','#FFFFFF'],PHI:['#006BB6','#ED174C'],HOU:['#CE1141','#C4CED4'],UTA:['#002B5C','#F9A01B'],PHO:['#1D1160','#E56020'],SA:['#111111','#C4CED4'],DET:['#C8102E','#1D42BA'],NYK:['#006BB6','#F58426'],CIN:['#002D62','#E03A3E'],ATL:['#E03A3E','#FFFFFF'],POR:['#E03A3E','#111111'],SEA:['#00653A','#FFC200'],IND:['#002D62','#FDBB30'],ORL:['#0077C0','#111111'],TOR:['#CE1141','#111111'],MIL:['#00471B','#EEE1C6'],DAL:['#00538C','#B8C4CA'],GSW:['#1D428A','#FFC72C'],MIA:['#98002E','#F9A01B'],WAS:['#002B5C','#E31837'],DEN:['#0E2240','#FEC524'],MIN:['#0C2340','#78BE20'],SAC:['#5A2D81','#63727A'],NOJ:['#4B2D7F','#00843D'],STL:['#C8102E','#002B5C'],CLE:['#860038','#FDBB30']};
const LEG={'michaeljordan':[23,'CHI'],'magicjohnson':[32,'LAL'],'kareemabduljabbar':[33,'LAL'],'alleniverson':[3,'PHI'],'hakeemolajuwon':[34,'HOU'],'billrussell':[6,'BOS'],'wiltchamberlain':[13,'PHI'],'oscarrobertson':[14,'CIN'],'karlmalone':[32,'UTA'],'charlesbarkley':[34,'PHO'],'davidrobinson':[50,'SA'],'isiahthomas':[11,'DET'],'johnstockton':[12,'UTA'],'mosesmalone':[2,'PHI'],'elginbaylor':[22,'LAL'],'jerrywest':[44,'LAL'],'larrybird':[33,'BOS'],'juliuserving':[6,'PHI'],'kevinmchale':[32,'BOS'],'patrickewing':[33,'NYK'],'bobpettit':[9,'STL'],'johnhavlicek':[17,'BOS'],'elvinhayes':[11,'WAS'],'jasonkidd':[5,'DAL'],'stevenash':[13,'PHO'],'reggiemiller':[31,'IND'],'dominiquewilkins':[21,'ATL'],'clydedrexler':[22,'POR'],'georgegervin':[44,'SA'],'garypayton':[20,'SEA'],'rayallen':[34,'MIL'],'paulpierce':[34,'BOS'],'paugasol':[16,'LAL'],'tonyparker':[9,'SA'],'manuginobili':[20,'SA'],'billwalton':[32,'POR'],'waltfrazier':[10,'NYK'],'willisreed':[19,'NYK'],'davecowens':[18,'BOS'],'rickbarry':[24,'GSW'],'petemaravich':[7,'NOJ'],'vincecarter':[15,'TOR'],'tracymcgrady':[1,'ORL'],'yaoming':[11,'HOU'],'dennisrodman':[91,'CHI'],'kobebryant':[24,'LAL'],'timduncan':[21,'SA'],'shaquilleoneal':[34,'LAL'],'dirknowitzki':[41,'DAL'],'dwyanewade':[3,'MIA'],'kevingarnett':[21,'MIN'],'scottiepippen':[33,'CHI'],'bobcousy':[14,'BOS'],'georgemikan':[99,'LAL'],'natethurmond':[42,'GSW'],'wesunseld':[41,'WAS'],'jamesworthy':[42,'LAL'],'chriswebber':[4,'SAC'],'alonzomourning':[33,'MIA'],'dikembemutombo':[55,'DEN'],'carmeloanthony':[15,'DEN'],'dwighthoward':[12,'ORL'],'vladedivac':[21,'SAC'],'granthill':[33,'DET'],'pennyhardaway':[1,'ORL'],'shawnkemp':[40,'SEA'],'dennisjohnson':[3,'BOS'],'samjones':[24,'BOS'],'halgreer':[15,'PHI'],'dolphschayes':[4,'PHI'],'earlmonroe':[15,'NYK'],'robertparish':['00','BOS'],'bernardking':[30,'NYK'],'adriandantley':[4,'UTA'],'alexenglish':[2,'DEN'],'kevinjohnson':[7,'PHO'],'timhardaway':[10,'GSW'],'mitchrichmond':[2,'SAC'],'chrismullin':[17,'GSW'],'joedumars':[4,'DET'],'benwallace':[3,'DET'],'chaunceybillups':[1,'DET'],'rasheedwallace':[30,'DET'],'amarestoudemire':[1,'PHO'],'tonikukoc':[7,'CHI'],'paulgeorge':[13,'IND'],'markjackson':[13,'IND']};
function nameFor(img){if(img.alt&&img.alt.length>2)return img.alt;const ph=img.closest('.phero');if(ph)return(ph.querySelector('h1')?.textContent||'').trim();
  let n=img.parentElement;for(let i=0;n&&i<5;i++,n=n.parentElement){const el=n.querySelector('h1,b,strong,.nm,.name,h3,span');const t=(el?.textContent||'').trim();if(t&&/\p{L}{2}/u.test(t))return t}return''}
function jersey(img){
  const nm=nameFor(img),key=norm(nm),leg=LEG[key],parts=nm.split(/\s+/).filter(Boolean),last=(parts[parts.length-1]||'').toUpperCase().slice(0,12);
  let c1,c2,num,lab='';
  if(leg){[c1,c2]=TC[leg[1]]||['#ff5a1f','#fff'];num=String(leg[0]);lab=leg[1]}
  else{let c=getComputedStyle(img).getPropertyValue('--tc').trim();c1=/^#?[0-9a-f]{6}$/i.test(c)?(c[0]==='#'?c:'#'+c):'#2a2f3b';c2='#ffffff';num=((parts[0]||'?')[0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase()}
  const dark=c1==='#111111'||c1==='#0E2240'||c1==='#002B5C',ink=leg&&c2!=='#FFFFFF'&&!dark?'#ffffff':c2;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><defs><radialGradient id="b" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#2a2f3b"/><stop offset="1" stop-color="#0d0f14"/></radialGradient><linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs><rect width="100" height="80" fill="url(#b)"/><path d="M33 8 C36 16 44 20 50 20 C56 20 64 16 67 8 L77 11 C76 20 78 26 82 30 L82 80 L18 80 L18 30 C22 26 24 20 23 11 Z" fill="${c1}" stroke="${c2}" stroke-width="2.4"/><path d="M33 8 C36 16 44 20 50 20 C56 20 64 16 67 8" fill="none" stroke="${c2}" stroke-width="3.2"/><rect x="18" y="8" width="64" height="72" fill="url(#s)" opacity=".8" clip-path="none"/>${leg?`<text x="50" y="35" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="${last.length>9?5:6.5}" fill="${ink}" letter-spacing="1">${esc(last)}</text>`:''}<text x="50" y="${leg?66:60}" text-anchor="middle" font-family="Anton,Impact,Arial Black,sans-serif" font-size="${num.length>2?22:28}" fill="${ink}" stroke="${c2===ink?'#000':c2}" stroke-width=".6">${esc(num)}</text>${lab?`<text x="95" y="76" text-anchor="end" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="5" fill="rgba(255,255,255,.55)">${esc(lab)}</text>`:''}</svg>`;
  img.dataset.mono='2';img.onerror=null;img.src='data:image/svg+xml,'+encodeURIComponent(svg);
}
const isHS=s=>/headshots/i.test(s||'')||(window.SILH&&s===window.SILH);
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.dataset.mono!=='2'&&isHS(t.getAttribute('src')))jersey(t)},true);
document.addEventListener('load',e=>{const t=e.target;if(!t||t.tagName!=='IMG'||t.dataset.mono==='2')return;if(t.dataset.mono==='1'||(window.SILH&&t.getAttribute('src')===window.SILH))jersey(t)},true);

/* ---------- shared model: strength, fatigue ---------- */
const AR={1:[33.757,-84.396,-5],2:[42.366,-71.062,-5],3:[29.949,-90.082,-6],4:[41.881,-87.674,-6],5:[41.496,-81.688,-5],6:[32.790,-96.810,-6],7:[39.749,-105.008,-7],8:[42.341,-83.055,-5],9:[37.768,-122.388,-8],10:[29.751,-95.362,-6],11:[39.764,-86.155,-5],12:[33.945,-118.341,-8],13:[34.043,-118.267,-8],14:[25.781,-80.188,-5],15:[43.045,-87.917,-6],16:[44.979,-93.276,-6],17:[40.683,-73.975,-5],18:[40.751,-73.993,-5],19:[28.539,-81.384,-5],20:[39.901,-75.172,-5],21:[33.446,-112.071,-7],22:[45.532,-122.667,-8],23:[38.580,-121.500,-8],24:[29.427,-98.437,-6],25:[35.463,-97.515,-6],26:[40.768,-111.901,-7],27:[38.898,-77.021,-5],28:[43.643,-79.379,-5],29:[35.138,-90.051,-6],30:[35.225,-80.839,-5]};
const km=(a,b)=>{if(!a||!b)return 0;const R=6371,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r,x=Math.sin(dl/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const P=d=>1/(1+Math.exp(-d/6.6));
const rating=t=>t?(+t.margin||0)*(t.games/(t.games+12)):0;
let TL=null;
async function timelines(){
  if(TL)return TL;const [se,sc]=await Promise.all([api('lab?type=season'),api('schedule')]);const m={};
  for(const t of se?.teams||[])m[t.id]=(t.log||[]).map(g=>({id:g.id,date:g.date,loc:g.neutral?null:(g.home?t.id:g.opp),home:g.home,opp:g.opp,past:true}));
  for(const g of sc?.games||[])for(const [me,op,h] of [[g.home,g.away,true],[g.away,g.home,false]]){(m[me]=m[me]||[]);if(!m[me].some(x=>x.id===g.id))m[me].push({id:g.id,date:g.date,loc:g.home,home:h,opp:op,past:false})}
  for(const k in m)m[k].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  TL={m,se,sc};return TL;
}
function fatigue(tl,team,gameId,dateISO,locId){
  const L=tl.m[team]||[],t=new Date(dateISO).getTime(),before=L.filter(x=>x.id!==gameId&&new Date(x.date).getTime()<t-3600e3);
  const prev=before[before.length-1];if(!prev)return{score:0,adj:0,b2b:false,four:false,three:false,km:0,tz:0,rest:null};
  const hrs=(t-new Date(prev.date).getTime())/3.6e6,b2b=hrs<30,in6=before.filter(x=>t-new Date(x.date).getTime()<5.75*864e5).length+1,in4=before.filter(x=>t-new Date(x.date).getTime()<3.75*864e5).length+1;
  const a=AR[prev.loc||prev.opp],b=AR[locId],d=a&&b?km(a,b):0,tz=a&&b?b[2]-a[2]:0,road=String(locId)!==String(team);
  const score=2*b2b+1.2*(in6>=4)+.5*(in4>=3&&!b2b)+d/1500+.4*Math.max(0,tz)+.2*Math.max(0,-tz)+(b2b&&road?.5:0);
  const adj=-(1.6*b2b+.8*(in6>=4)+.25*d/1000+.3*Math.max(0,tz));
  return{score:Math.round(score*10)/10,adj,b2b,four:in6>=4,three:in4>=3,km:Math.round(d),tz,rest:Math.max(0,Math.round(hrs/24-1))};
}
const fchips=x=>[x.b2b?'<span class="chip bad">B2B</span>':'',x.four?'<span class="chip bad">4 σε 6</span>':x.three?'<span class="chip">3 σε 4</span>':'',x.km>=800?`<span class="chip ${x.km>=2000?'bad':''}">✈ ${x.km.toLocaleString('el-GR')} km</span>`:'',x.tz?`<span class="chip">🕒 ${x.tz>0?'+':''}${x.tz}h</span>`:'',x.rest>=2?`<span class="chip good">${x.rest} μέρες ξεκούραση</span>`:''].join('');
async function modelGame(g){
  const [tl,pw]=await Promise.all([timelines(),api('power')]);const T=Object.fromEntries((pw?.teams||[]).map(t=>[t.id,t]));
  const fh=fatigue(tl,g.home,g.id,g.date,g.home),fa=fatigue(tl,g.away,g.id,g.date,g.home);
  const d=rating(T[g.home])-rating(T[g.away])+2.3;
  return{fh,fa,base:P(d),adj:P(d+fh.adj-fa.adj),T};
}

/* ---------- 1. luck index ---------- */
let tok=0;
async function luck(){
  const t=++tok;document.title='Δείκτης τύχης · NBA ATLAS';
  view.innerHTML=shell('Luck index','Δείκτης τύχης','Ποιες ομάδες έχουν καλύτερο ρεκόρ απ’ όσο δικαιολογεί το παιχνίδι τους, και ποιες χειρότερο. Η τύχη δεν διαρκεί: οι τυχερές συνήθως πέφτουν, οι άτυχες ανεβαίνουν.')+'<div id="lkbox"><div class="skel" style="min-height:500px"></div></div>';
  const [se,tm]=await Promise.all([api('lab?type=season'),api('data?type=teams')]);if(t!==tok)return;const box=document.getElementById('lkbox');
  if(!se?.teams?.length){box.innerHTML='<div class="err">Δεν φόρτωσαν τα στατιστικά της σεζόν. Δοκίμασε ξανά σε λίγο.</div>';return}
  const meta=Object.fromEntries((tm?.teams||[]).map(x=>[x.id,x]));
  const R=se.teams.map(x=>({...x,m:meta[x.id]||{}})).sort((a,b)=>b.luckWins-a.luckWins),mx=Math.max(2,...R.map(r=>Math.abs(r.luckWins)));
  const down=R.filter(r=>r.luckWins>=1.5),up=R.filter(r=>r.luckWins<=-1.5).reverse();
  const card=(r,dir)=>`<a href="#/team/${r.id}" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><img src="${esc(r.m.logo||'')}" style="width:30px;height:30px" ${hide}><b style="flex:1">${esc(r.m.name||r.id)}</b><span class="dim">${r.w}-${r.l} → αναμενόμενο ${f(r.pythW,1)}-${f(r.g-r.pythW,1)}</span><span class="delta ${dir}" style="min-width:48px;text-align:right">${sg(r.luckWins)}</span></a>`;
  box.innerHTML=`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-bottom:16px">
   <div class="card"><div class="lbl">📉 Μάλλον θα πέσουν</div>${down.map(r=>card(r,'dn')).join('')||'<div class="muted">Καμία ομάδα δεν ξεχωρίζει ακόμα.</div>'}</div>
   <div class="card"><div class="lbl">📈 Μάλλον θα ανέβουν</div>${up.map(r=>card(r,'up')).join('')||'<div class="muted">Καμία ομάδα δεν ξεχωρίζει ακόμα.</div>'}</div></div>
   <div class="card flat"><div class="tbl-wrap"><table class="pro-tbl"><thead><tr><th>Ομάδα</th><th>Ρεκόρ</th><th>Αναμενόμενες νίκες</th><th>Κλειστά ματς</th><th>3P% αντιπάλων</th><th>Πόντοι από 3P τύχη</th><th>Τύχη (νίκες)</th></tr></thead><tbody>${R.map(r=>`<tr><td><a class="tcell" href="#/team/${r.id}"><img src="${esc(r.m.logo||'')}" ${hide}>${esc(r.m.abbr||r.id)}</a></td><td>${r.w}-${r.l}</td><td>${f(r.pythW,1)}</td><td>${r.closeW}-${r.closeL}</td><td>${pc(r.opp3Pct)}</td><td>${sg(r.threeLuckPts)}/αγ.</td><td><div style="display:flex;align-items:center;gap:8px"><div style="position:relative;width:110px;height:10px;background:var(--bg2);border-radius:99px"><i style="position:absolute;top:0;height:10px;border-radius:99px;${r.luckWins>=0?`left:50%;width:${r.luckWins/mx*50}%;background:var(--hot)`:`right:50%;width:${-r.luckWins/mx*50}%;background:var(--ice)`}"></i></div><b>${sg(r.luckWins)}</b></div></td></tr>`).join('')}</tbody></table></div></div>
   <p class="note">Αναμενόμενες νίκες = τύπος Pythagoras (πόντοι υπέρ/κατά, εκθέτης 14). Τύχη = πραγματικές νίκες μείον αναμενόμενες, συν τους πόντους που «χάρισαν» οι αντίπαλοι σουτάροντας τρίποντα κάτω από τον μέσο όρο της λίγκας (${pc(se.league?.three)}). Το 3P% των αντιπάλων είναι κυρίως θόρυβος, ενώ η καλή άμυνα φαίνεται στο πόσα τρίποντα επιτρέπεις. Κλειστά ματς = διαφορά ≤5 ή παράταση. ${se.games} αγώνες, ESPN. Με ~15 αγώνες το δείγμα είναι μικρό.</p>`;
}

/* ---------- 2. fatigue radar ---------- */
async function fatiguePage(){
  const t=++tok;document.title='Ραντάρ κούρασης · NBA ATLAS';
  view.innerHTML=shell('Fatigue radar','Ραντάρ κούρασης','Back-to-backs, χιλιόμετρα, αλλαγές ώρας και πυκνό πρόγραμμα για κάθε αγώνα των επόμενων 3 ημερών. «Παγίδα» = το φαβορί είναι αισθητά πιο κουρασμένο από τον αντίπαλο.')+'<div id="fgbox"><div class="skel" style="min-height:500px"></div></div>';
  const [tl,pw,tm]=await Promise.all([timelines(),api('power'),api('data?type=teams')]);if(t!==tok)return;const box=document.getElementById('fgbox');
  if(!tl.sc?.games||!pw?.teams){box.innerHTML='<div class="err">Δεν φόρτωσε το πρόγραμμα. Δοκίμασε ξανά σε λίγο.</div>';return}
  const meta=Object.fromEntries((tm?.teams||[]).map(x=>[x.id,x])),now=Date.now();
  const G=tl.sc.games.filter(g=>{const d=new Date(g.date).getTime();return d>now-3*3600e3&&d<now+72*3600e3}).slice(0,40);
  const rows=await Promise.all(G.map(async g=>({g,...await modelGame(g)})));
  const traps=rows.filter(r=>{const favH=r.base>=.5,ff=favH?r.fh:r.fa,fd=favH?r.fa:r.fh;return ff.score>=2.2&&ff.score-fd.score>=1.5});
  const side=(id,x,r)=>{const m=meta[id]||{};return`<div class="fr-s ${r?'r':''}"><div class="fr-t"><img src="${esc(m.logo||'')}" ${hide}>${esc(m.abbr||id)}</div><div style="display:flex;gap:4px;flex-wrap:wrap;${r?'justify-content:flex-end':''}">${fchips(x)||'<span class="chip good">Φρέσκοι</span>'}</div><div class="fbar"><i style="width:${Math.min(100,x.score/5*100)}%"></i></div></div>`};
  box.innerHTML=(traps.length?`<div class="card" style="margin-bottom:16px;border-color:rgba(255,77,106,.4)"><div class="lbl">⚠ Αγώνες-παγίδα</div>${traps.map(r=>{const favH=r.base>=.5,fav=meta[favH?r.g.home:r.g.away]||{};return`<div style="padding:6px 0">${esc(fav.name||'')} φαβορί με ${pc(Math.max(r.base,1-r.base),0)}, αλλά μετά την κούραση <b>${pc(favH?r.adj:1-r.adj,0)}</b> · ${esc(ath(r.g.date))}</div>`}).join('')}</div>`:'')+
   rows.map(r=>`<div class="frow">${side(r.g.away,r.fa,false)}<div class="fr-m">${esc(ath(r.g.date))}<b>${pc(r.adj,0)}</b>γηπεδούχος νίκη<br><span class="dim">χωρίς κούραση ${pc(r.base,0)}</span>${(traps.includes(r))?'<div><span class="chip hot">ΠΑΓΙΔΑ</span></div>':''}</div>${side(r.g.home,r.fh,true)}</div>`).join('')+
   `<p class="note">Κούραση: B2B (<30 ώρες από τον προηγούμενο αγώνα), 4 αγώνες σε 6 μέρες, χιλιόμετρα από την πόλη του προηγούμενου αγώνα, ζώνες ώρας (προς τα ανατολικά χειρότερα). Επίδραση στο μοντέλο: B2B −1,6 πόντοι, 4 σε 6 −0,8, −0,25 ανά 1.000 km, −0,3 ανά ώρα προς ανατολικά (εκτιμήσεις από τη βιβλιογραφία). Βάση: διαφορά πόντων με συρρίκνωση, +2,3 έδρα. Δεν βλέπει τραυματισμούς ή ξεκούραση σταρ.</p>`;
}

/* ---------- 3. replay movie ---------- */
let rpStop=null;
async function replayList(){
  const t=++tok;document.title='Replay · NBA ATLAS';
  view.innerHTML=shell('Replay','Ο αγώνας σε 60 δευτερόλεπτα','Διάλεξε αγώνα. Η πιθανότητα νίκης ζωντανεύει, τα σερί και τα καλάθια που άλλαξαν το ματς σημειώνονται πάνω της. Χωρίς spoiler: το σκορ το βλέπεις όσο παίζει.')+'<div id="rlbox"><div class="skel" style="min-height:300px"></div></div>';
  const d=await api('insight?days=3');if(t!==tok)return;const box=document.getElementById('rlbox');
  if(!d?.games?.length){box.innerHTML='<div class="err">Δεν βρέθηκαν πρόσφατοι αγώνες.</div>';return}
  box.innerHTML=`<div class="wcards">${d.games.map(g=>`<a class="wcard" href="#/replay/${g.id}" style="flex-direction:row;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:8px;font-weight:900"><img src="${esc(g.away.logo||'')}" style="width:34px;height:34px" ${hide}>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}<img src="${esc(g.home.logo||'')}" style="width:34px;height:34px" ${hide}></span><span class="chip hot">▶ ${f(g.score,1)}/10</span></a>`).join('')}</div>`;
}
async function replay(id){
  if(rpStop)rpStop();const t=++tok;document.title='Replay · NBA ATLAS';
  view.innerHTML=shell('Replay','Ο αγώνας σε 60″','','<a class="more" href="#/replay">Άλλος αγώνας</a>')+'<div id="rpbox"><div class="skel" style="min-height:420px"></div></div>';
  const d=await api('lab?type=replay&id='+id);if(t!==tok)return;const box=document.getElementById('rpbox');
  if(!d?.plays?.length){box.innerHTML='<div class="err">Δεν υπάρχει play-by-play για αυτόν τον αγώνα (ίσως δεν έχει αρχίσει).</div>';return}
  const H=d.home,A=d.away,hc=hex(H.color),ac=hex(A.color),pl=d.plays,TT=Math.max(2880,pl[pl.length-1][0]),W=1000,HH=300;
  const useWP=d.hasWP,val=p=>useWP?p[3]:Math.max(0,Math.min(1,.5+(p[1]-p[2])/40));
  const X=s=>s/TT*W,Y=v=>HH-v*HH;
  // runs >= 10-0
  const runs=[];let cur=null;for(const p of pl){if(!p[4])continue;if(cur&&cur.team===p[5]){cur.pts+=p[4];cur.end=p[0]}else{if(cur&&cur.pts>=10)runs.push(cur);cur={team:p[5],pts:p[4],start:p[0],end:p[0]}}}if(cur&&cur.pts>=10)runs.push(cur);
  // biggest swings
  const sw=[];for(let i=1;i<pl.length;i++){if(!pl[i][4])continue;sw.push({i,d:Math.abs(val(pl[i])-val(pl[i-1])),p:pl[i]})}sw.sort((a,b)=>b.d-a.d);const keys=sw.slice(0,5).sort((a,b)=>a.p[0]-b.p[0]);
  const qx=[720,1440,2160,2880,...Array.from({length:Math.max(0,Math.ceil((TT-2880)/300))},(_,k)=>2880+300*(k+1))];
  box.innerHTML=`<div class="rp-stage"><div class="rp-score"><div class="t"><img src="${esc(A.logo||'')}" ${hide}>${esc(A.abbr)}</div><div style="display:flex;align-items:center;gap:6px"><span class="num" id="rpa">0</span><span class="dim">–</span><span class="num" id="rph">0</span></div><div class="t r">${esc(H.abbr)}<img src="${esc(H.logo||'')}" ${hide}></div></div>
   <div class="rp-clock" id="rpc">Q1 12:00</div>
   <svg viewBox="0 0 ${W} ${HH+24}" style="width:100%;height:auto;display:block;margin-top:8px" id="rpsvg"><defs><clipPath id="rpup"><rect width="${W}" height="${HH/2}"/></clipPath><clipPath id="rpdn"><rect y="${HH/2}" width="${W}" height="${HH/2}"/></clipPath></defs>
   ${qx.map(s=>`<line x1="${X(s)}" x2="${X(s)}" y1="0" y2="${HH}" stroke="var(--line)"/>`).join('')}<line x1="0" x2="${W}" y1="${HH/2}" y2="${HH/2}" stroke="var(--line2)" stroke-dasharray="4 4"/>
   <g id="rpruns"></g><path id="rparea1" fill="${hc}" opacity=".45" clip-path="url(#rpup)"/><path id="rparea2" fill="${ac}" opacity=".45" clip-path="url(#rpdn)"/><path id="rpline" fill="none" stroke="#fff" stroke-width="2.4"/><g id="rpkeys"></g><circle id="rpdot" r="6" fill="var(--hot)" stroke="#fff" stroke-width="2"/>
   <text x="8" y="18" fill="var(--muted)" font-size="14" font-weight="800">${esc(H.abbr)} ${useWP?'100%':'+20'}</text><text x="8" y="${HH-8}" fill="var(--muted)" font-size="14" font-weight="800">${esc(A.abbr)} ${useWP?'100%':'+20'}</text>
   ${['Q1','Q2','Q3','Q4'].map((q,i)=>`<text x="${X(i*720+360)}" y="${HH+18}" text-anchor="middle" fill="var(--dim)" font-size="12" font-weight="700">${q}</text>`).join('')}</svg>
   <div class="rp-feed" id="rpfeed"></div>
   <div class="rp-ctrl"><button class="btn-hot" id="rpplay">▶ Play</button><input type="range" id="rpscrub" min="0" max="1000" value="0"><select id="rpspd" class="chip" style="padding:8px 10px"><option value="30">30″</option><option value="60" selected>60″</option><option value="120">2′</option></select></div></div>
   <p class="note">${useWP?'Γραμμή = πιθανότητα νίκης γηπεδούχου (ESPN).':'Χωρίς δεδομένα πιθανότητας νίκης: η γραμμή δείχνει τη διαφορά σκορ.'} Σκιασμένες ζώνες = σερί 10+ πόντων χωρίς απάντηση. ★ = τα 5 καλάθια που άλλαξαν περισσότερο την πιθανότητα νίκης.</p>`;
  const $=i=>document.getElementById(i),line=$('rpline'),a1=$('rparea1'),a2=$('rparea2'),dot=$('rpdot'),gR=$('rpruns'),gK=$('rpkeys');
  let pos=0,playing=false,raf=0,lastTs=0;const shown=new Set();
  const draw=()=>{const s=pos*TT;let k=0;while(k<pl.length-1&&pl[k+1][0]<=s)k++;const vis=pl.slice(0,k+1);
    const pts=vis.map(p=>[X(p[0]),Y(val(p))]);const dpath=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join('');
    line.setAttribute('d',dpath);const ar=pts.length?`M0,${HH/2}${pts.map(p=>'L'+p[0].toFixed(1)+','+p[1].toFixed(1)).join('')}L${pts[pts.length-1][0].toFixed(1)},${HH/2}Z`:'';a1.setAttribute('d',ar);a2.setAttribute('d',ar);
    const lp=pl[k];dot.setAttribute('cx',X(lp[0]));dot.setAttribute('cy',Y(val(lp)));$('rph').textContent=lp[1];$('rpa').textContent=lp[2];
    $('rpc').textContent=(lp[6]>4?'OT'+(lp[6]-4>1?lp[6]-4:''):'Q'+lp[6])+' '+lp[7]+(useWP?` · ${H.abbr} ${Math.round(val(lp)*100)}%`:'');
    gR.innerHTML=runs.filter(r=>r.start<=s).map(r=>{const tmA=r.team===H.id?H:A;return`<rect x="${X(r.start)}" y="0" width="${Math.max(3,X(Math.min(r.end,s))-X(r.start))}" height="${HH}" fill="${r.team===H.id?hc:ac}" opacity=".16"/><text x="${X(r.start)+3}" y="${r.team===H.id?34:HH-24}" fill="#fff" font-size="13" font-weight="900">${r.pts}-0 ${esc(tmA.abbr)}</text>`}).join('');
    gK.innerHTML=keys.filter(x=>x.p[0]<=s).map(x=>`<text x="${X(x.p[0])}" y="${Y(val(x.p))-10}" text-anchor="middle" font-size="16" fill="var(--hot)">★</text>`).join('');
    const recent=vis.filter(p=>p[4]||keys.some(x=>x.p===p)).slice(-3).reverse();$('rpfeed').innerHTML=recent.map(p=>`<div>${p[6]>4?'OT':'Q'+p[6]} ${esc(p[7])} · ${esc(p[8])}</div>`).join('');
    $('rpscrub').value=Math.round(pos*1000)};
  const step=ts=>{if(!playing)return;if(!lastTs)lastTs=ts;const dur=+$('rpspd').value*1000;pos=Math.min(1,pos+(ts-lastTs)/dur);lastTs=ts;draw();if(pos>=1){playing=false;$('rpplay').textContent='↻ Ξανά';return}raf=requestAnimationFrame(step)};
  $('rpplay').onclick=()=>{if(pos>=1)pos=0;playing=!playing;$('rpplay').textContent=playing?'⏸ Παύση':'▶ Play';lastTs=0;if(playing)raf=requestAnimationFrame(step)};
  $('rpscrub').oninput=e=>{pos=e.target.value/1000;draw()};
  rpStop=()=>{playing=false;cancelAnimationFrame(raf)};draw();
}

/* ---------- 4. player points ranges (walk-forward) ---------- */
function predict(prev,oppF=1){
  const n=prev.length;if(n<4)return null;const L=prev.slice(-20);let sw=0,sm=0;L.forEach((g,i)=>{const w=.5**((L.length-1-i)/6);sw+=w;sm+=w*g.pts});const mean=sm/sw;
  let sv=0;L.forEach((g,i)=>{const w=.5**((L.length-1-i)/6);sv+=w*(g.pts-mean)**2});const sd=Math.max(4.5,Math.sqrt((sv/sw*L.length+49*3)/(L.length+3)));
  const mu=mean*oppF;return{mu,sd,lo:Math.max(0,Math.round(mu-1.2816*sd)),hi:Math.round(mu+1.2816*sd)}}
async function propsFor(p,se,sc){
  const gl=await api('lab?type=gamelog&id='+p.id);const G=(gl?.games||[]).filter(g=>g.min>0);
  const D=Object.fromEntries((se?.teams||[]).map(t=>[t.id,t])),lgD=(se?.teams||[]).reduce((a,t)=>a+(t.drtg||0),0)/Math.max(1,(se?.teams||[]).length);
  const oppF=id=>D[id]?.drtg&&lgD?Math.pow(D[id].drtg/lgD,1):1;
  const hist=[];for(let k=4;k<G.length;k++){const pr=predict(G.slice(0,k),oppF(G[k].opp));if(pr)hist.push({g:G[k],...pr,hit:G[k].pts>=pr.lo&&G[k].pts<=pr.hi})}
  const nx=(sc?.games||[]).find(g=>(g.home===p.teamId||g.away===p.teamId)&&new Date(g.date).getTime()>Date.now()-2*3600e3);
  const opp=nx?(nx.home===p.teamId?nx.away:nx.home):null,next=predict(G,opp?oppF(opp):1);
  return{p,G,hist,next,nx,opp}}
const spark=(hist,w=280,h=70)=>{const H=hist.slice(-10);if(!H.length)return'';const mx=Math.max(...H.map(x=>Math.max(x.hi,x.g.pts)))+3,bw=w/H.length,Yv=v=>h-v/mx*h;
  return`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">${H.map((x,i)=>`<rect x="${i*bw+bw*.2}" y="${Yv(x.hi)}" width="${bw*.6}" height="${Yv(x.lo)-Yv(x.hi)}" rx="3" fill="rgba(255,255,255,.1)"/><circle cx="${i*bw+bw/2}" cy="${Yv(x.g.pts)}" r="4" fill="${x.hit?'var(--good)':'var(--bad)'}"/>`).join('')}</svg>`};
function propCard(r,meta){const {p,hist,next,opp,nx}=r,hits=hist.filter(x=>x.hit).length,om=meta[opp]||{};
  return`<div class="pcard"><div class="top"><img src="${esc(p.headshot||HS(p.id))}" alt="${esc(p.name)}"><div><b style="font-size:15px">${esc(p.name)}</b><div class="dim" style="font-size:12px">${nx?`Επόμενο: ${nx.home===p.teamId?'vs':'@'} ${esc(om.abbr||'')} · ${esc(ath(nx.date))}`:'Χωρίς προγραμματισμένο αγώνα'}</div></div></div>
   ${next?`<div><div class="rng">${next.lo}–${next.hi} <small>πόντοι · 80%</small></div><div class="dim" style="font-size:12px">κεντρική εκτίμηση ${f(next.mu,1)}</div></div>`:'<div class="muted">Λίγοι αγώνες για εκτίμηση.</div>'}
   ${spark(hist)}<div style="font-size:12.5px">${hist.length?`Μέσα στο εύρος <b class="${hits/hist.length>=.7?'ok':'no'}" style="color:${hits/hist.length>=.7?'var(--good)':'var(--bad)'}">${hits}/${hist.length}</b> φορές (στόχος 80%)`:'Δεν υπάρχει ακόμα ιστορικό.'}</div></div>`}
async function props(){
  const t=++tok;document.title='Πρόβλεψη πόντων · NBA ATLAS';
  view.innerHTML=shell('Player ranges','Πρόβλεψη πόντων','Για κάθε παίκτη: εύρος πόντων με 80% πιθανότητα για τον επόμενο αγώνα. Από κάτω, πώς τα πήγε το ίδιο μοντέλο σε κάθε προηγούμενο ματς, με δεδομένα μόνο μέχρι την ημέρα εκείνη.',
   `<label class="search" style="width:240px"><input id="ppq" list="ppl" placeholder="Πρόσθεσε παίκτη…"><datalist id="ppl"></datalist></label>`)+'<div id="ppsum"></div><div class="pcards" id="ppbox"><div class="skel" style="min-height:300px"></div></div>';
  const [pw,se,sc,tm]=await Promise.all([api('power'),api('lab?type=season'),api('schedule'),api('data?type=teams')]);if(t!==tok)return;
  const box=document.getElementById('ppbox');if(!pw?.players?.length){box.innerHTML='<div class="err">Δεν φόρτωσαν οι παίκτες.</div>';return}
  const meta=Object.fromEntries((tm?.teams||[]).map(x=>[x.id,x]));
  const PL=pw.players.filter(p=>p.teamId).sort((a,b)=>(b.index||0)-(a.index||0));document.getElementById('ppl').innerHTML=PL.map(p=>`<option value="${esc(p.name)}">`).join('');
  const extra=LS.get('atlas.props',[]);const list=[...PL.filter(p=>extra.includes(p.id)),...PL.slice(0,12)].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i);
  box.innerHTML='';const all=[];
  for(let i=0;i<list.length;i+=4){const rs=await Promise.all(list.slice(i,i+4).map(p=>propsFor(p,se,sc).catch(()=>null)));if(t!==tok)return;rs.filter(Boolean).forEach(r=>{all.push(r);box.insertAdjacentHTML('beforeend',propCard(r,meta))})}
  const H=all.flatMap(r=>r.hist),hit=H.filter(x=>x.hit).length,w=H.reduce((a,x)=>a+(x.hi-x.lo),0)/Math.max(1,H.length);
  document.getElementById('ppsum').innerHTML=H.length?`<div class="card" style="margin-bottom:16px;display:flex;gap:28px;flex-wrap:wrap"><div><div class="lbl">Ιστορικό μοντέλου</div><b style="font-family:var(--display);font-size:34px">${pc(hit/H.length,0)}</b><div class="dim" style="font-size:12px">${hit}/${H.length} προβλέψεις μέσα στο εύρος · στόχος 80%</div></div><div><div class="lbl">Μέσο πλάτος εύρους</div><b style="font-family:var(--display);font-size:34px">${f(w,1)}</b><div class="dim" style="font-size:12px">πόντοι</div></div></div>`:'';
  box.insertAdjacentHTML('afterend',`<p class="note">Μοντέλο: σταθμισμένος μέσος όρος των τελευταίων 20 αγώνων (ημιζωή 6 αγώνες), διασπορά με συρρίκνωση, προσαρμογή για την άμυνα του αντιπάλου (Defensive Rating φετινής σεζόν, άρα ελαφρά «γνωρίζει το μέλλον» στο backtest). Πράσινη τελεία = ο παίκτης έπεσε μέσα στο εύρος, κόκκινη = έξω. Δεν βλέπει τραυματισμούς ή λεπτά συμμετοχής. Δεν είναι συμβουλή στοιχήματος.</p>`);
  document.getElementById('ppq').onchange=e=>{const q=norm(e.target.value),p=PL.find(x=>norm(x.name)===q);if(!p)return;const x=LS.get('atlas.props',[]);if(!x.includes(p.id)){x.unshift(p.id);LS.set('atlas.props',x.slice(0,8))}props()};
}

/* ---------- 5. pick'em vs the model ---------- */
async function pickem(){
  const t=++tok;document.title='Μάντεψε · NBA ATLAS';
  view.innerHTML=shell('Pick’em','Μάντεψε και κέρδισε το μοντέλο','Διάλεξε νικητή σε κάθε σημερινό αγώνα. Η επιλογή του μοντέλου (με κούραση) εμφανίζεται μόλις κλειδώσεις τη δική σου, για να μην σε επηρεάσει.')+'<div id="pkscore"></div><div id="pkbox"><div class="skel" style="min-height:300px"></div></div>';
  const [sb,ins]=await Promise.all([fetch('/api/data?type=scoreboard').then(r=>r.ok?r.json():null).then(j=>j?.data||j).catch(()=>null),api('insight?days=7')]);if(t!==tok)return;
  const picks=LS.get('atlas.picks',{});
  const res={};(ins?.games||[]).forEach(g=>res[g.id]=g.spoiler?.winner===g.home.abbr?g.home.id:g.away.id);(sb?.games||[]).filter(g=>g.state==='post').forEach(g=>res[g.id]=g.home.winner?g.home.id:g.away.winner?g.away.id:(+g.home.score>+g.away.score?g.home.id:g.away.id));
  const G=sb?.games||[];const box=document.getElementById('pkbox');
  if(!G.length)box.innerHTML='<div class="card muted">Δεν υπάρχουν αγώνες σήμερα.</div>';
  else{const rows=await Promise.all(G.map(async g=>({g,m:await modelGame({id:g.id,date:g.date,home:g.home.id,away:g.away.id})})));if(t!==tok)return;
    box.innerHTML=rows.map(({g,m})=>{const pk=picks[g.id],locked=g.state!=='pre',mp=m.adj>=.5?g.home.id:g.away.id,w=res[g.id];
      const btn=(s)=>`<button class="tb ${pk?.pick===s.id?'on':''}" data-g="${g.id}" data-t="${s.id}" ${locked||pk?'disabled':''}><img src="${esc(s.logo||'')}" ${hide}>${esc(s.abbr)}</button>`;
      const verdict=w&&pk?`<div style="font-size:12px;margin-top:4px">${pk.pick===w?'<b class="ok">✓ Σωστά</b>':'<b class="no">✗ Λάθος</b>'} · μοντέλο ${pk.model===w?'<b class="ok">✓</b>':'<b class="no">✗</b>'}</div>`:'';
      return`<div class="pk">${btn(g.away)}<div class="fr-m" style="min-width:120px">${g.state==='pre'?esc(ath(g.date)):esc(g.status||'')}${pk||locked?`<div style="font-size:12px;margin-top:4px">Μοντέλο: <b style="color:var(--text)">${esc(mp===g.home.id?g.home.abbr:g.away.abbr)}</b> ${pc(Math.max(m.adj,1-m.adj),0)}</div>`:'<div style="font-size:12px;margin-top:4px">Πάτα την ομάδα σου</div>'}${verdict}</div>${btn(g.home)}</div>`}).join('');
    box.querySelectorAll('button.tb').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.g.id===b.dataset.g);const p=LS.get('atlas.picks',{});p[b.dataset.g]={pick:b.dataset.t,model:r.m.adj>=.5?r.g.home.id:r.g.away.id,mp:Math.max(r.m.adj,1-r.m.adj),date:r.g.date,label:`${r.g.away.abbr} @ ${r.g.home.abbr}`};LS.set('atlas.picks',p);pickem()})}
  const graded=Object.entries(picks).filter(([id])=>res[id]).map(([id,p])=>({...p,w:res[id]}));const me=graded.filter(x=>x.pick===x.w).length,mo=graded.filter(x=>x.model===x.w).length;
  document.getElementById('pkscore').innerHTML=`<div class="card" style="margin-bottom:16px;display:flex;gap:28px;flex-wrap:wrap;align-items:center"><div><div class="lbl">Εσύ</div><b style="font-family:var(--display);font-size:40px;color:${me>mo?'var(--good)':'var(--text)'}">${me}/${graded.length}</b></div><div class="dim" style="font-size:20px;font-weight:900">vs</div><div><div class="lbl">Μοντέλο Atlas</div><b style="font-family:var(--display);font-size:40px;color:${mo>me?'var(--good)':'var(--text)'}">${mo}/${graded.length}</b></div><div class="muted" style="font-size:13px;max-width:360px">${graded.length?(me>mo?'Νικάς το μοντέλο. 🔥':me===mo?'Ισοπαλία με το μοντέλο.':'Το μοντέλο προηγείται. Ακόμα.'):'Οι επιλογές βαθμολογούνται αυτόματα όταν τελειώσουν οι αγώνες.'}</div></div>`;
  box.insertAdjacentHTML('afterend','<p class="note">Οι επιλογές σου αποθηκεύονται σε αυτή τη συσκευή. Πίνακας κατάταξης με φίλους χρειάζεται μια μικρή βάση δεδομένων στο Vercel. Μοντέλο: διαφορά πόντων με συρρίκνωση, +2,3 έδρα, προσαρμογή κούρασης.</p>');
}

/* ---------- 6. advanced stats ---------- */
function heat(vals,v,hi=true){const s=vals.filter(Number.isFinite).sort((a,b)=>a-b);if(!Number.isFinite(v)||!s.length)return'';const q=s.filter(x=>x<=v).length/s.length,z=hi?q:1-q;
  return`background:rgba(${z>.5?'60,220,140':'255,77,106'},${(Math.abs(z-.5)*.5).toFixed(2)})`}
let advSort={k:'net',d:-1};
async function adv(){
  const t=++tok,tab=route().q.get('t')||'teams';document.title='Advanced stats · NBA ATLAS';
  view.innerHTML=shell('Advanced stats','Προχωρημένα στατιστικά','',`<div class="tabs2"><a href="#/adv?t=teams" class="${tab==='teams'?'on':''}">Ομάδες</a><a href="#/adv?t=players" class="${tab==='players'?'on':''}">Παίκτες</a></div>`)+'<div id="advbox"><div class="skel" style="min-height:500px"></div></div>';
  const [se,pw,tm]=await Promise.all([tab==='teams'?api('lab?type=season'):null,api('power'),api('data?type=teams')]);if(t!==tok)return;const box=document.getElementById('advbox');
  const meta=Object.fromEntries((tm?.teams||[]).map(x=>[x.id,x]));
  if(tab==='teams'){if(!se?.teams?.length){box.innerHTML='<div class="err">Δεν φόρτωσαν τα στατιστικά.</div>';return}
    const C=[['net','Net',x=>x.ortg-x.drtg,1,1],['ortg','ORtg',x=>x.ortg,1,1],['drtg','DRtg',x=>x.drtg,1,0],['pace','Pace',x=>x.pace,1,null],['efg','eFG%',x=>x.efg,'%',1],['tov','TOV%',x=>x.tovPct,'%',0],['orb','ORB%',x=>x.orbPct,'%',1],['ftr','FT/FGA',x=>x.ftr,3,1],['oefg','Opp eFG%',x=>x.oefg,'%',0],['otov','Opp TOV%',x=>x.otovPct,'%',1],['drb','DRB%',x=>x.drbPct,'%',1],['tp','3P%',x=>x.tpPct,'%',1],['tpa','3PA/αγ.',x=>x.tpaPg,1,null],['luck','Τύχη',x=>x.luckWins,1,null]];
    const R=se.teams.map(x=>({x,v:Object.fromEntries(C.map(c=>[c[0],c[2](x)]))}));
    const paint=()=>{const c=C.find(c=>c[0]===advSort.k)||C[0];R.sort((a,b)=>advSort.d*((a.v[c[0]]??-1e9)-(b.v[c[0]]??-1e9)));
      box.innerHTML=`<div class="card flat"><div class="tbl-wrap"><table class="pro-tbl"><thead><tr><th>#</th><th>Ομάδα</th><th>W-L</th>${C.map(c=>`<th data-k="${c[0]}">${c[1]}${advSort.k===c[0]?(advSort.d<0?' ↓':' ↑'):''}</th>`).join('')}</tr></thead><tbody>${R.map((r,i)=>`<tr><td class="dim">${i+1}</td><td><a class="tcell" href="#/team/${r.x.id}"><img src="${esc(meta[r.x.id]?.logo||'')}" ${hide}>${esc(meta[r.x.id]?.abbr||r.x.id)}</a></td><td>${r.x.w}-${r.x.l}</td>${C.map(c=>{const v=r.v[c[0]];const s=c[4]==null?'':heat(R.map(q=>q.v[c[0]]),v,c[4]===1);return`<td><span class="heat" style="${s}">${c[3]==='%'?pc(v):c[0]==='net'||c[0]==='luck'?sg(v):f(v,c[3])}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div></div>
      <p class="note">Κατοχές = FGA − OREB + TOV + 0,44·FTA (μέσος όρος ομάδας και αντιπάλου). ORtg/DRtg = πόντοι υπέρ/κατά ανά 100 κατοχές, Pace = κατοχές ανά 48′. Four factors: eFG%, TOV%, ORB%, FT/FGA, και τα ίδια για τους αντιπάλους. Πράσινο = καλύτερο της λίγκας, κόκκινο = χειρότερο. Από τα box scores ${se.games} αγώνων (ESPN).</p>`;
      box.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{advSort={k:th.dataset.k,d:advSort.k===th.dataset.k?-advSort.d:-1};paint()})};paint();return}
  const PL=(pw?.players||[]).filter(p=>p.eligible!==false&&p.mpg>=12);if(!PL.length){box.innerHTML='<div class="err">Δεν φόρτωσαν οι παίκτες.</div>';return}
  const per=(p,k)=>p.mpg?p[k]/p.mpg*36:null;
  const C=[['index','Index',p=>p.index,1],['mpg','MPG',p=>p.mpg,1],['p36','PTS/36',p=>per(p,'ppg'),1],['r36','REB/36',p=>per(p,'rpg'),1],['a36','AST/36',p=>per(p,'apg'),1],['s36','STK/36',p=>p.mpg?(p.spg+p.bpg)/p.mpg*36:null,1],['ts','TS%',p=>p.tsPct,1],['efg','eFG%',p=>p.efgPct,1],['ato','AST/TO',p=>p.astTo,2],['pra','PRA',p=>p.ppg+p.rpg+p.apg,1]];
  const R=PL.map(p=>({p,v:Object.fromEntries(C.map(c=>[c[0],c[2](p)]))}));if(!C.some(c=>c[0]===advSort.k))advSort={k:'index',d:-1};
  const paint=()=>{R.sort((a,b)=>advSort.d*((a.v[advSort.k]??-1e9)-(b.v[advSort.k]??-1e9)));
    box.innerHTML=`<div class="card flat"><div class="tbl-wrap"><table class="pro-tbl"><thead><tr><th>#</th><th>Παίκτης</th><th>GP</th>${C.map(c=>`<th data-k="${c[0]}">${c[1]}${advSort.k===c[0]?(advSort.d<0?' ↓':' ↑'):''}</th>`).join('')}</tr></thead><tbody>${R.slice(0,150).map((r,i)=>`<tr><td class="dim">${i+1}</td><td class="l"><a class="tcell" href="#/player/${r.p.id}"><img class="hs" src="${esc(r.p.headshot||HS(r.p.id))}" alt="${esc(r.p.name)}" loading="lazy">${esc(r.p.name)} <span class="dim" style="font-size:11px">${esc(r.p.team||'')}</span></a></td><td>${r.p.games}</td>${C.map(c=>`<td><span class="heat" style="${heat(R.map(q=>q.v[c[0]]),r.v[c[0]])}">${f(r.v[c[0]],c[3])}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
    <p class="note">Ανά 36 λεπτά για σύγκριση παικτών με διαφορετικό χρόνο. STK = κλεψίματα + τάπες. TS% = αποτελεσματικότητα σουτ με βολές και τρίποντα. Παίκτες με ≥12 λεπτά. Index = Atlas power index.</p>`;
    box.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{advSort={k:th.dataset.k,d:advSort.k===th.dataset.k?-advSort.d:-1};paint()})};paint();
}

/* ---------- player & team page panels ---------- */
async function playerPanel(id){
  if(document.getElementById('advpl'))return;const hero=document.querySelector('.phero');if(!hero)return;
  const sec=document.createElement('section');sec.className='sec card';sec.id='advpl';sec.innerHTML='<div class="skel" style="min-height:200px"></div>';hero.after(sec);
  const [pw,se,sc]=await Promise.all([api('power'),api('lab?type=season'),api('schedule')]);if(route().id!==id)return;
  const p=(pw?.players||[]).find(x=>x.id===id);if(!p){sec.remove();return}
  const E=(pw.players||[]).filter(x=>x.mpg>=12),q=(k,v,hi=true)=>{const a=E.map(x=>typeof k==='function'?k(x):x[k]).filter(Number.isFinite);const r=a.filter(x=>x<=v).length/Math.max(1,a.length);return hi?r:1-r};
  const per=(x,k)=>x.mpg?x[k]/x.mpg*36:null;
  const rows=[['Πόντοι/36',per(p,'ppg'),x=>per(x,'ppg')],['Ριμπάουντ/36',per(p,'rpg'),x=>per(x,'rpg')],['Ασίστ/36',per(p,'apg'),x=>per(x,'apg')],['Κλεψ.+τάπες/36',p.mpg?(p.spg+p.bpg)/p.mpg*36:null,x=>x.mpg?(x.spg+x.bpg)/x.mpg*36:null],['TS%',p.tsPct,'tsPct'],['eFG%',p.efgPct,'efgPct'],['AST/TO',p.astTo,'astTo'],['Atlas index',p.index,'index']];
  let pr=null;try{pr=await propsFor(p,se,sc)}catch{}
  const G=pr?.G||[],L10=G.slice(-10);
  const gs=g=>g.pts+.4*g.fgm-.7*g.fga-.4*(g.fta-g.ftm)+.39*g.reb+g.stl+.7*g.ast+.7*g.blk-.4*g.pf-g.tov;
  const tot=k=>G.reduce((a,g)=>a+(g[k]||0),0),min=tot('min')||1,usg=(tot('fga')+.44*tot('fta')+tot('tov'))/min*36,mean=G.length?tot('pts')/G.length:0,sdv=G.length?Math.sqrt(G.reduce((a,g)=>a+(g.pts-mean)**2,0)/G.length):0;
  const mx=Math.max(10,...L10.map(g=>Math.max(g.pts,gs(g))));
  const bars=L10.length?`<svg viewBox="0 0 300 110" style="width:100%;height:auto">${L10.map((g,i)=>{const w=300/L10.length,h=g.pts/mx*90;return`<rect x="${i*w+w*.18}" y="${95-h}" width="${w*.64}" height="${h}" rx="3" fill="${g.res==='W'?'var(--hot)':'rgba(255,255,255,.25)'}"/><text x="${i*w+w/2}" y="${92-h}" text-anchor="middle" font-size="8" fill="var(--muted)">${g.pts}</text><text x="${i*w+w/2}" y="106" text-anchor="middle" font-size="7" fill="var(--dim)">${esc(g.oppAbbr)}</text>`}).join('')}<path d="${L10.map((g,i)=>{const w=300/L10.length;return(i?'L':'M')+(i*w+w/2).toFixed(1)+','+(95-Math.max(0,gs(g))/mx*90).toFixed(1)}).join('')}" fill="none" stroke="var(--ice)" stroke-width="1.6"/></svg>`:'';
  sec.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Advanced</div><h2 class="h2">Προχωρημένα στατιστικά</h2></div><a class="more" href="#/adv?t=players">Όλοι οι παίκτες →</a></div>
   <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
   <div><div class="lbl">Εκατοστημόριο στη λίγκα (≥12 λεπτά)</div>${rows.map(([l,v,k])=>{const z=Number.isFinite(v)?q(k,v):null;return`<div class="pctl"><span>${l}</span><div class="bar"><i style="width:${z==null?0:Math.max(3,z*100)}%;background:${z>=.8?'var(--good)':z>=.5?'var(--ice)':z>=.25?'var(--hot2)':'var(--bad)'}"></i></div><b style="text-align:right">${z==null?'—':Math.round(z*100)}</b></div>`}).join('')}</div>
   <div><div class="lbl">Τελευταίοι 10 αγώνες · πόντοι (πορτοκαλί = νίκη) και Game Score (γραμμή)</div>${bars||'<div class="muted">Δεν υπάρχει game log.</div>'}
    <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:10px;font-size:13px"><div><div class="lbl" style="margin:0">Usage/36</div><b>${G.length?f(usg,1):'—'}</b></div><div><div class="lbl" style="margin:0">Game Score</div><b>${G.length?f(G.reduce((a,g)=>a+gs(g),0)/G.length,1):'—'}</b></div><div><div class="lbl" style="margin:0">Σταθερότητα (σ πόντων)</div><b>${G.length?f(sdv,1):'—'}</b></div><div><div class="lbl" style="margin:0">3PA ανά FGA</div><b>${tot('fga')?pc(tot('tpa')/tot('fga'),0):'—'}</b></div></div></div>
   <div><div class="lbl">🎯 Επόμενος αγώνας</div>${pr?.next?`<div class="rng">${pr.next.lo}–${pr.next.hi} <small>πόντοι · 80%</small></div><div class="dim" style="font-size:12px;margin:4px 0 8px">${pr.nx?esc(ath(pr.nx.date)):''}</div>${spark(pr.hist)}<div style="font-size:12.5px">Μέσα στο εύρος ${pr.hist.filter(x=>x.hit).length}/${pr.hist.length} φορές</div>`:'<div class="muted">Δεν υπάρχει αρκετό δείγμα.</div>'}<a class="more" href="#/props" style="display:inline-block;margin-top:10px">Όλες οι προβλέψεις →</a></div></div>
   <p class="note">Game Score (Hollinger, με συνολικά ριμπάουντ). Usage/36 = (FGA + 0,44·FTA + TOV) ανά 36 λεπτά.</p>`;
}
async function teamPanel(id){
  if(document.getElementById('advtm'))return;const hero=document.querySelector('.phero');if(!hero)return;
  const se=await api('lab?type=season');if(route().id!==id||document.getElementById('advtm'))return;const T=se?.teams||[],x=T.find(t=>t.id===id);if(!x)return;
  const rk=(k,hi=true)=>{const v=x[k];if(!Number.isFinite(v))return'—';return 1+T.filter(t=>Number.isFinite(t[k])&&(hi?t[k]>v:t[k]<v)).length};
  const net=x.ortg-x.drtg;const it=(l,v,r)=>`<div class="kpi"><b>${v}</b><span>${l}${r!=null?` · #${r}`:''}</span></div>`;
  const sec=document.createElement('section');sec.className='sec card';sec.id='advtm';
  sec.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Advanced</div><h2 class="h2">Ταυτότητα ομάδας</h2></div><a class="more" href="#/adv">Όλες οι ομάδες →</a></div>
   <div class="kpis">${it('Net Rating',sg(net),1+T.filter(t=>t.ortg-t.drtg>net).length)}${it('ORtg',f(x.ortg),rk('ortg'))}${it('DRtg',f(x.drtg),rk('drtg',false))}${it('Pace',f(x.pace),rk('pace'))}${it('eFG%',pc(x.efg),rk('efg'))}${it('TOV%',pc(x.tovPct),rk('tovPct',false))}${it('ORB%',pc(x.orbPct),rk('orbPct'))}${it('Opp eFG%',pc(x.oefg),rk('oefg',false))}</div>
   <div style="margin-top:14px;font-size:14px" class="muted">🍀 Τύχη: <b style="color:var(--text)">${sg(x.luckWins)} νίκες</b> (${x.w}-${x.l}, αναμενόμενο ${f(x.pythW,1)}-${f(x.g-x.pythW,1)}, κλειστά ${x.closeW}-${x.closeL}). ${x.luckWins>=1.5?'Μάλλον θα πέσει.':x.luckWins<=-1.5?'Μάλλον θα ανέβει.':'Το ρεκόρ αντιστοιχεί στο παιχνίδι της.'} <a href="#/luck" style="color:var(--hot)">Δείκτης τύχης →</a></div>`;
  hero.after(sec);
}

/* ---------- hub tiles + router ---------- */
const TILES=[['luck','🍀','Δείκτης τύχης','Ποιες ομάδες κερδίζουν περισσότερο απ’ όσο αξίζουν, και ποιες θα ανέβουν.','rgba(60,220,140,.22)'],['fatigue','😴','Ραντάρ κούρασης','B2B, χιλιόμετρα, ζώνες ώρας και αγώνες-παγίδα για φαβορί.','rgba(70,200,255,.22)'],['replay','🎬','Replay σε 60″','Ο αγώνας ξαναπαίζει: πιθανότητα νίκης, σερί και κρίσιμα καλάθια.','rgba(255,90,31,.25)'],['props','🎯','Πρόβλεψη πόντων','Εύρος πόντων για τον επόμενο αγώνα και το ιστορικό του μοντέλου.','rgba(255,179,71,.25)'],['pickem','🏆','Μάντεψε vs μοντέλο','Διάλεξε νικητές και δες αν νικάς το Atlas.','rgba(124,92,255,.28)'],['adv','📊','Advanced stats','ORtg, DRtg, Pace, four factors και ανά-36 για όλους.','rgba(255,77,106,.22)']];
const ROUTES={luck,fatigue:fatiguePage,replay:r=>r.id?replay(r.id):replayList(),props,pickem,adv};
function hook(){const r=route();if(r.name!=='replay'&&rpStop)rpStop();
  if(ROUTES[r.name]){document.querySelectorAll('#links [data-r]').forEach(a=>a.classList.toggle('on',a.dataset.r==='lab'));setTimeout(()=>ROUTES[r.name](r),0);return}
  if(r.name==='lab')setTimeout(()=>{const g=view.querySelector('.lab-grid');if(g&&!g.querySelector('[data-pro]'))g.insertAdjacentHTML('beforeend',TILES.map(([k,ic,t,p,c])=>`<a class="lab-tile" data-pro href="#/${k}" style="--glow:${c}"><span class="ic">${ic}</span><b>${t}</b><p>${p}</p></a>`).join(''))},40);
}
let pend=null;
new MutationObserver(()=>{clearTimeout(pend);pend=setTimeout(()=>{const r=route();
  if(r.name==='lab'){const g=view.querySelector('.lab-grid');if(g&&!g.querySelector('[data-pro]'))hook()}
  if(r.name==='player'&&r.id&&document.querySelector('.phero'))playerPanel(r.id);
  if(r.name==='team'&&r.id&&document.querySelector('.phero'))teamPanel(r.id);
  if(r.name==='game'&&r.id&&!document.getElementById('rpbtn')){const h=view.querySelector('section.hero');if(h)h.insertAdjacentHTML('afterend',`<div id="rpbtn" style="margin:14px 0;display:flex;gap:10px;flex-wrap:wrap"><a class="btn-hot" href="#/replay/${r.id}" style="display:inline-block">🎬 Replay του αγώνα σε 60″</a></div>`)}
},170)}).observe(view,{childList:true});
addEventListener('hashchange',hook);hook();
})();
