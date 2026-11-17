/* NBA ATLAS stats: leaderboards (players & teams), player splits / shot zones / shot types / clutch,
   team deep-dive (rotation, margins, splits, schedule difficulty) and play-style profiles (offence & defence).
   Self-contained; hooks into pages app.js renders. Data: /api/power, /api/data, /api/lab (season, shots, gamelog), /api/schedule. */
(()=>{'use strict';
const view=document.getElementById('view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v==null||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};
const f=(v,d=1)=>{const x=num(v);return x===null?'—':x.toFixed(d)};
const pct=(v,d=1)=>{const x=num(v);return x===null?'—':(x*100).toFixed(d)+'%'};
const HS=id=>`https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const silh=`onerror="this.onerror=null;this.src=window.SILH"`,hide=`onerror="this.style.visibility='hidden'"`;
const tz={timeZone:'Europe/Athens'};
const cache=new Map();
const api=p=>{if(!cache.has(p))cache.set(p,fetch('/api/'+p).then(r=>r.ok?r.json():null).then(j=>j&&(j.data&&!j.players&&!j.teams&&!j.games&&!j.records?j.data:j)).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
const route=()=>{const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[name,id]=path.split('/');return{name:name||'home',id,q:new URLSearchParams(qs||'')}};
const pctile=(arr,v)=>{if(v==null||!arr.length)return null;let lo=0;for(const x of arr)if(x<v)lo++;return lo/arr.length};
const ZN={rim:'Στο καλάθι (0–4 πόδια)',short:'Κοντινό (5–14)',mid:'Μέση απόσταση',c3:'Τρίποντο γωνίας',ab3:'Τρίποντο κορυφής'};
const ZS={rim:'Καλάθι',short:'Κοντινό',mid:'Μέση',c3:'Γωνία 3',ab3:'Κορυφή 3'};
const TN={dunk:'Κάρφωμα',alley:'Alley-oop',putback:'Putback / τάπα-καλάθι',layup:'Λέι-απ',floater:'Floater / hook',pullup:'Pull-up σουτ',iso:'Step-back / fadeaway',catch:'Catch & shoot',other:'Άλλο'};
const Z5=['rim','short','mid','c3','ab3'];
const sum=(o,i)=>Object.values(o||{}).reduce((s,x)=>s+(x?.[i]||0),0);

const css=document.createElement('style');css.textContent=`
.st-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.st-tabs button,.st-tabs a{padding:8px 15px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--muted);font:inherit;font-weight:800;font-size:13px;cursor:pointer}.st-tabs .on{background:var(--text);color:#111;border-color:var(--text)}
.st-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px;font-size:13px;color:var(--muted)}.st-filters select,.st-filters input[type=search]{background:var(--card2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:7px 10px;font:inherit}
.st-filters label{display:flex;align-items:center;gap:8px;font-weight:700}.st-filters input[type=range]{accent-color:var(--hot)}
.lb-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r);background:var(--card)}
.lb{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.lb th{position:sticky;top:0;background:var(--card2);text-align:right;padding:10px 9px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);cursor:pointer;white-space:nowrap;user-select:none}
.lb th.on{color:var(--hot)}.lb th:first-child,.lb td:first-child{text-align:left;position:sticky;left:0;background:var(--card);z-index:1}.lb th:first-child{background:var(--card2)}
.lb td{padding:8px 9px;border-top:1px solid var(--line);text-align:right;white-space:nowrap}
.lb td .pl{display:flex;align-items:center;gap:9px;font-weight:800}.lb td .pl img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:top;background:var(--bg2)}.lb td .pl small{color:var(--dim);font-weight:700}
.lb td.h{border-radius:6px}
.sp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
.sp-tab{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}.sp-tab th{text-align:right;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;padding:6px 7px}.sp-tab td{text-align:right;padding:7px;border-top:1px solid var(--line)}.sp-tab th:first-child,.sp-tab td:first-child{text-align:left;font-weight:800}
.sp-tab tr.sep td{border-top:2px solid var(--line2)}
.zbars{display:flex;flex-direction:column;gap:9px}.zb{display:grid;grid-template-columns:130px 1fr 92px;gap:10px;align-items:center;font-size:13px}.zb .bar{height:10px;border-radius:99px;background:var(--bg2);overflow:hidden;position:relative}.zb .bar i{position:absolute;inset:0 auto 0 0;border-radius:99px}.zb .bar em{position:absolute;top:-3px;bottom:-3px;width:2px;background:#fff;opacity:.7}
.zb b{font-weight:800}.zb small{color:var(--muted);text-align:right}
.kpi4{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.kpi4 div{padding:12px 14px;border-radius:14px;background:var(--card2);border:1px solid var(--line)}.kpi4 b{display:block;font-family:var(--display);font-size:28px;line-height:1.1}.kpi4 small{color:var(--muted);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.stags{display:flex;flex-wrap:wrap;gap:8px}.stag{padding:8px 12px;border-radius:12px;border:1px solid var(--line2);background:var(--card2);font-size:13px;max-width:100%}.stag b{display:block;font-size:13.5px}.stag small{color:var(--muted)}
.stag.o{border-color:rgba(255,90,31,.35)}.stag.d{border-color:rgba(124,196,255,.35)}
.sty-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.sty{padding:16px;border-radius:var(--r);border:1px solid var(--line);background:var(--card);display:flex;flex-direction:column;gap:10px}.sty h3{display:flex;align-items:center;gap:10px;margin:0;font-family:var(--cond);font-size:21px;font-weight:900}.sty h3 img{width:30px;height:30px}
.chip{display:inline-block;padding:4px 9px;border-radius:999px;font-size:11.5px;font-weight:800;margin:0 4px 4px 0}.chip.o{background:rgba(255,90,31,.12);color:var(--hot2)}.chip.d{background:rgba(124,196,255,.12);color:var(--ice)}
.rot{display:flex;flex-direction:column;gap:7px}.rot .r{display:grid;grid-template-columns:150px 1fr 120px;gap:10px;align-items:center;font-size:13px}.rot .r a{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rot .bar{height:12px;border-radius:99px;background:var(--bg2);overflow:hidden;display:flex}.rot .bar i{display:block;height:100%}
.court2 text{font-family:var(--body);font-weight:800}
@media (max-width:860px){.sp-grid{grid-template-columns:1fr}.zb{grid-template-columns:96px 1fr 84px}.rot .r{grid-template-columns:110px 1fr 90px}}
`;document.head.appendChild(css);

/* ---------- shared data ---------- */
let BASE=null;
async function base(){
  if(BASE)return BASE;
  const [pw,bio,sh,se,tm]=await Promise.all([api('power'),api('data?type=players'),api('lab?type=shots'),api('lab?type=season'),api('data?type=teams')]);
  const B={};(bio?.players||[]).forEach(b=>{B[b.id]=b});const T={};(tm?.teams||[]).forEach(t=>{T[t.id]=t});
  const L=sh?.league;const lz=k=>L?.z?.[k];
  const P=(pw?.players||[]).map(p=>{const b=B[p.id]||{},s=sh?.players?.[p.id],m=num(p.mpg)||0,per=v=>m>0&&v!=null?v/m*36:null,fga=num(p.fga),fta=num(p.fta),tov=num(p.turnovers);
    const zf=s?sum(s.z,1):0,z=k=>s?.z?.[k]||[0,0];
    return{...p,pos:b.position||'',age:num(b.age),h:num(b.heightIn),
      p36:per(p.ppg),r36:per(p.rpg),a36:per(p.apg),stk36:per((num(p.spg)||0)+(num(p.bpg)||0)),
      use36:m>0&&fga!=null&&fta!=null&&tov!=null?(fga+.44*fta+tov)/m*36:null,
      tp:p.fg3a>0?p.fg3m/p.fg3a:null,ft:num(p.ftPct)!=null?p.ftPct/100:null,r3:fga>0&&p.fg3a!=null?p.fg3a/fga:null,ftr:fga>0&&fta!=null?fta/fga:null,
      zf,rimF:zf?z('rim')[1]/zf:null,rimP:z('rim')[1]>=8?z('rim')[0]/z('rim')[1]:null,midF:zf?z('mid')[1]/zf:null,midP:z('mid')[1]>=8?z('mid')[0]/z('mid')[1]:null,
      c3F:zf?z('c3')[1]/zf:null,c3P:z('c3')[1]>=6?z('c3')[0]/z('c3')[1]:null,astd:s?.fgm>=10?s.ast/s.fgm:null,
      clPts:s?.cl?.pts??null,clFg:s?.cl?.fga>=4?s.cl.fgm/s.cl.fga:null,clG:s?.cl?.g??null,sh:s}});
  BASE={P,byId:Object.fromEntries(P.map(p=>[p.id,p])),bio:B,T,sh,se,L,ok:!!pw};
  return BASE;
}
const zoneLg=(L,k)=>{const z=L?.z?.[k];return z&&z[1]?z[0]/z[1]:null};
const zoneLgF=(L,k)=>{const t=sum(L?.z,1);return t?(L.z[k]?.[1]||0)/t:null};

/* ---------- team style profile ---------- */
function teamProfiles(sh,se){
  if(!sh?.teams)return{};const out={};
  const seT={};(se?.teams||[]).forEach(t=>{seT[t.id]=t});
  for(const [id,t] of Object.entries(sh.teams)){const o=t.off,d=t.def,of=sum(o.z,1)||1,df=sum(d.z,1)||1,ot=sum(o.ty,1)||1,s=seT[id]||{};
    out[id]={id,g:t.g,
      o:{rim:o.z.rim[1]/of,short:o.z.short[1]/of,mid:o.z.mid[1]/of,c3:o.z.c3[1]/of,ab3:o.z.ab3[1]/of,three:(o.z.c3[1]+o.z.ab3[1])/of,ast:o.fgm?o.ast/o.fgm:null,ftr:o.fga?o.fta/o.fga:null,iso:(o.ty.iso[1]+o.ty.pullup[1])/ot,alley:o.ty.alley[1]/ot,catch:o.ty.catch[1]/ot,put:o.ty.putback[1]/ot,rimP:o.z.rim[1]?o.z.rim[0]/o.z.rim[1]:null},
      d:{rim:d.z.rim[1]/df,mid:d.z.mid[1]/df,three:(d.z.c3[1]+d.z.ab3[1])/df,c3:d.z.c3[1]/df,rimP:d.z.rim[1]?d.z.rim[0]/d.z.rim[1]:null,threeP:(d.z.c3[1]+d.z.ab3[1])?(d.z.c3[0]+d.z.ab3[0])/(d.z.c3[1]+d.z.ab3[1]):null,ftr:d.fga?d.fta/d.fga:null},
      pace:s.pace,orb:s.orbPct,drb:s.drbPct,otov:s.otovPct,tov:s.tovPct,ortg:s.ortg,drtg:s.drtg,cl:t.cl}}
  return out;
}
function styleTags(prof){
  const all=Object.values(prof);if(!all.length)return{};
  const D={};const col=(fn)=>all.map(fn).filter(v=>v!=null).sort((a,b)=>a-b);
  const K={pace:p=>p.pace,three:p=>p.o.three,rim:p=>p.o.rim,mid:p=>p.o.mid,ast:p=>p.o.ast,iso:p=>p.o.iso,alley:p=>p.o.alley,orb:p=>p.orb,ftr:p=>p.o.ftr,c3:p=>p.o.c3,put:p=>p.o.put,
    drim:p=>p.d.rim,drimP:p=>p.d.rimP,dthree:p=>p.d.three,dthreeP:p=>p.d.threeP,dmid:p=>p.d.mid,otov:p=>p.otov,drb:p=>p.drb,dftr:p=>p.d.ftr,tov:p=>p.tov};
  const S={};for(const k in K)S[k]=col(K[k]);
  for(const p of all){const q=k=>{const v=K[k](p);return v==null?.5:pctile(S[k],v)};const O=[],Df=[];
    if(q('pace')>.66&&q('three')>.6)O.push(['Pace & space','Γρήγορο τέμπο και πολλά τρίποντα: ανοίγουν το γήπεδο και τρέχουν.']);
    else if(q('three')>.8)O.push(['Ομάδα του τριπόντου','Από τις ομάδες με το μεγαλύτερο ποσοστό σουτ πίσω από τη γραμμή.']);
    if(q('pace')<.2)O.push(['Αργό, μεθοδικό τέμπο','Λίγες κατοχές· στήνουν επίθεση αντί να τρέχουν.']);
    if(q('rim')>.75)O.push(['Επίθεση στο καλάθι','Πολλά σουτ στο καλάθι: drives, κοψίματα, παιχνίδι στη ρακέτα.']);
    if(q('mid')>.8)O.push(['Μέση απόσταση','Ζουν με pull-up δίποντα: παλιά σχολή ή σταρ που φτιάχνουν μόνοι τους.']);
    if(q('ast')>.75)O.push(['Κίνηση της μπάλας','Υψηλό ποσοστό καλαθιών από ασίστ: σύστημα με πάσες και off-ball κίνηση.']);
    else if(q('ast')<.25&&q('iso')>.6)O.push(['Isolation / ένας-εναντίον-ενός','Λίγες ασίστ, πολλά pull-up και step-back: η μπάλα στα χέρια των σταρ.']);
    if(q('alley')>.8)O.push(['Pick-and-roll με lob','Πολλά alley-oop: ο ψηλός «βουτάει» στο καλάθι μετά το σκριν.']);
    if(q('c3')>.8)O.push(['Γωνίες','Πολλά τρίποντα από τις γωνίες: drive-and-kick με σουτέρ στις άκρες.']);
    if(q('orb')>.8||q('put')>.85)O.push(['Επιθετικά ριμπάουντ','Κυνηγούν τη δεύτερη ευκαιρία.']);
    if(q('ftr')>.8)O.push(['Κερδίζουν βολές','Επιτίθενται στην επαφή και πάνε συχνά στη γραμμή.']);
    if(q('tov')<.2)O.push(['Προσεγμένη μπάλα','Από τα χαμηλότερα ποσοστά λαθών.']);
    if(q('drim')<.25||q('drimP')<.2)Df.push(['Κλειστή ρακέτα','Οι αντίπαλοι δύσκολα φτάνουν ή τελειώνουν στο καλάθι.']);
    if(q('drim')>.78)Df.push(['Ανοιχτή ρακέτα','Επιτρέπουν πολλά σουτ στο καλάθι.']);
    if(q('dthree')<.25)Df.push(['Βγαίνουν στο τρίποντο','Κλείνουν τη γραμμή: οι αντίπαλοι σουτάρουν λίγα τρίποντα.']);
    if(q('dthree')>.78)Df.push(['Παραχωρούν τρίποντα','Μαζεύονται μέσα και αφήνουν σουτ από έξω.']);
    if(q('dmid')>.75)Df.push(['«Drop» άμυνα','Οι αντίπαλοι παίρνουν πολλά δίποντα μέσης: ο ψηλός μένει πίσω στο pick-and-roll.']);
    if(q('otov')>.75)Df.push(['Πίεση & κλεψίματα','Προκαλούν πολλά λάθη: επιθετική, «ενοχλητική» άμυνα.']);
    if(q('drb')>.8)Df.push(['Κλείνουν το ριμπάουντ','Δεν δίνουν δεύτερες ευκαιρίες.']);
    if(q('dftr')>.8)Df.push(['Κάνουν πολλά φάουλ','Στέλνουν συχνά τον αντίπαλο στη γραμμή.']);
    if(q('dthreeP')<.2)Df.push(['Δυσκολεύουν το σουτ','Χαμηλό ποσοστό αντιπάλων στο τρίποντο (εν μέρει και τύχη).']);
    if(!O.length)O.push(['Ισορροπημένη επίθεση','Χωρίς ακραίο προφίλ: κοντά στον μέσο όρο σε όλα.']);
    if(!Df.length)Df.push(['Ισορροπημένη άμυνα','Χωρίς ακραίο προφίλ.']);
    D[p.id]={o:O,d:Df}}
  return D;
}

/* ---------- small charts ---------- */
function court(z,L){
  const lg=k=>zoneLg(L,k),fr=sum(z,1)||1;
  const col=k=>{const [m,a]=z[k]||[0,0];if(a<5)return'rgba(255,255,255,.05)';const d=m/a-(lg(k)??m/a);const t=Math.max(-1,Math.min(1,d/.08));return t>=0?`rgba(34,211,154,${.15+.55*t})`:`rgba(255,77,106,${.15+.55*-t})`};
  const lab=(k,x,y)=>{const [m,a]=z[k]||[0,0];return`<text x="${x}" y="${y}" text-anchor="middle" font-size="2.6" fill="#fff">${a?Math.round(100*m/a)+'%':'—'}</text><text x="${x}" y="${y+2.6}" text-anchor="middle" font-size="1.8" fill="rgba(255,255,255,.7)">${Math.round(100*a/fr)}% σουτ</text>`};
  const H=[25,5.25],R=23.75,y14=H[1]+Math.sqrt(R*R-22*22);
  return`<svg class="court2" viewBox="0 0 50 40" style="width:100%;max-width:520px;display:block;margin:auto;border-radius:12px;background:#10131a">
  <rect x="0" y="0" width="50" height="40" fill="${col('ab3')}"/>
  <path d="M3 0 V${y14} A${R} ${R} 0 0 0 47 ${y14} V0 Z" fill="${col('mid')}" stroke="rgba(255,255,255,.35)" stroke-width=".2"/>
  <rect x="0" y="0" width="3" height="${y14}" fill="${col('c3')}"/><rect x="47" y="0" width="3" height="${y14}" fill="${col('c3')}"/>
  <rect x="17" y="0" width="16" height="19" fill="${col('short')}" stroke="rgba(255,255,255,.35)" stroke-width=".2"/>
  <circle cx="25" cy="${H[1]}" r="4" fill="${col('rim')}" stroke="rgba(255,255,255,.4)" stroke-width=".2"/>
  <line x1="22" y1="4" x2="28" y2="4" stroke="#fff" stroke-width=".3"/><circle cx="25" cy="${H[1]}" r=".75" fill="none" stroke="#ff8a3d" stroke-width=".25"/>
  ${lab('rim',25,7.2)}${lab('short',25,15)}${lab('mid',11,20)}${lab('c3',1.6,9)}${lab('ab3',25,33)}
  </svg><div class="legend-k" style="display:flex;gap:14px;justify-content:center;font-size:12px;color:var(--muted);margin-top:6px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(34,211,154,.6);margin-right:5px"></i>πάνω από τον μ.ό. της λίγκας</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(255,77,106,.6);margin-right:5px"></i>κάτω</span></div>`;
}
function zbars(z,L,labels=ZN){const fr=sum(z,1)||1;return`<div class="zbars">${Z5.map(k=>{const [m,a]=z[k]||[0,0],sh=a/fr,lf=zoneLgF(L,k);return`<div class="zb"><b>${labels[k]}</b><div class="bar"><i style="width:${Math.round(sh*100)}%;background:linear-gradient(90deg,var(--hot),var(--hot2))"></i>${lf!=null?`<em style="left:${Math.round(lf*100)}%" title="μ.ό. λίγκας"></em>`:''}</div><small>${Math.round(sh*100)}% · ${a?Math.round(100*m/a)+'%':'—'} εύστ.</small></div>`}).join('')}</div>`}
function tbars(ty,L){const fr=sum(ty,1)||1,lf=sum(L?.ty,1)||1;const K=Object.keys(TN).filter(k=>(ty[k]?.[1]||0)>0).sort((a,b)=>ty[b][1]-ty[a][1]);
  return`<div class="zbars">${K.map(k=>{const [m,a]=ty[k],sh=a/fr,lg=(L?.ty?.[k]?.[1]||0)/lf;return`<div class="zb"><b>${TN[k]}</b><div class="bar"><i style="width:${Math.round(sh*100)}%;background:linear-gradient(90deg,#7cc4ff,#a98bff)"></i><em style="left:${Math.round(lg*100)}%"></em></div><small>${Math.round(sh*100)}% · ${Math.round(100*m/a)}% εύστ.</small></div>`}).join('')}</div>`}
function line(series,{w=720,h=220,yfmt=v=>v.toFixed(0),ref}={}){
  const pts=series.flatMap(s=>s.pts.map(p=>p[1])).filter(Number.isFinite);if(!pts.length)return'';const n=Math.max(...series.map(s=>s.pts.length));
  const lo=Math.min(...pts,ref??Infinity)*.92,hi=Math.max(...pts,ref??-Infinity)*1.06,P={l:38,r:10,t:10,b:22},X=i=>P.l+i/(Math.max(1,n-1))*(w-P.l-P.r),Y=v=>h-P.b-(v-lo)/((hi-lo)||1)*(h-P.t-P.b);
  let g='';for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;g+=`<line x1="${P.l}" x2="${w-P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.06)"/><text x="${P.l-6}" y="${Y(v)+3}" text-anchor="end" font-size="10" fill="var(--dim)">${yfmt(v)}</text>`}
  if(ref!=null)g+=`<line x1="${P.l}" x2="${w-P.r}" y1="${Y(ref)}" y2="${Y(ref)}" stroke="var(--dim)" stroke-dasharray="4 4"/>`;
  series.forEach(s=>{if(s.dots)s.pts.forEach(([i,v])=>{g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="2.4" fill="${s.color}" opacity=".45"/>`});else g+=`<polyline fill="none" stroke="${s.color}" stroke-width="2.4" points="${s.pts.filter(p=>Number.isFinite(p[1])).map(([i,v])=>X(i)+','+Y(v)).join(' ')}"/>`});
  return`<svg viewBox="0 0 ${w} ${h}" style="width:100%">${g}</svg>`;
}
function marginBars(log,w=720,h=180){if(!log?.length)return'';const n=log.length,mx=Math.max(10,...log.map(g=>Math.abs(g.m))),bw=(w-20)/n;const Y=v=>h/2-v/mx*(h/2-10);
  return`<svg viewBox="0 0 ${w} ${h}" style="width:100%"><line x1="0" x2="${w}" y1="${h/2}" y2="${h/2}" stroke="rgba(255,255,255,.15)"/>${log.map((g,i)=>`<rect x="${10+i*bw+1}" y="${Math.min(Y(g.m),h/2)}" width="${Math.max(1,bw-2)}" height="${Math.abs(Y(g.m)-h/2)}" rx="1.5" fill="${g.m>0?'var(--good)':'var(--bad)'}"><title>${new Date(g.date).toLocaleDateString('el-GR',{...tz,day:'numeric',month:'short'})} · ${g.home?'vs':'@'} · ${g.m>0?'+':''}${g.m}</title></rect>`).join('')}</svg>`}

/* ---------- player page: splits, zones, types, clutch ---------- */
async function playerStats(id){
  if(document.getElementById('pstats'))return;const hero=document.querySelector('.phero');if(!hero)return;
  const sec=document.createElement('section');sec.className='sec card';sec.id='pstats';sec.innerHTML='<div class="skel" style="min-height:300px"></div>';
  (document.getElementById('tw2sec')||document.getElementById('advpl')||hero).after(sec);
  const [B,gl]=await Promise.all([base(),api('lab?type=gamelog&id='+id)]);if(route().id!==id||!document.body.contains(sec))return;
  const G=(gl?.games||[]).filter(g=>g.min>0);const p=B.byId[id],s=p?.sh||B.sh?.players?.[id];
  if(!G.length&&!s){sec.remove();return}
  const agg=rows=>{const n=rows.length;if(!n)return null;const t=k=>rows.reduce((a,r)=>a+(r[k]||0),0);const fga=t('fga'),fta=t('fta'),pts=t('pts');
    return{n,min:t('min')/n,pts:pts/n,reb:t('reb')/n,ast:t('ast')/n,stl:t('stl')/n,blk:t('blk')/n,tov:t('tov')/n,tpm:t('tpm')/n,tpa:t('tpa')/n,fg:fga?t('fgm')/fga:null,tp:t('tpa')?t('tpm')/t('tpa'):null,ft:fta?t('ftm')/fta:null,ts:(fga+.44*fta)?pts/(2*(fga+.44*fta)):null,w:rows.filter(r=>/^W/i.test(r.res)).length}};
  const rest=G.map((g,i)=>i?Math.round((new Date(g.date)-new Date(G[i-1].date))/864e5)-1:null);
  const S=[['Σεζόν',G],['Τελευταία 5',G.slice(-5)],['Τελευταία 10',G.slice(-10)],null,['Εντός',G.filter(g=>g.home)],['Εκτός',G.filter(g=>!g.home)],null,['Νίκες',G.filter(g=>/^W/i.test(g.res))],['Ήττες',G.filter(g=>/^L/i.test(g.res))],null,['Back-to-back',G.filter((g,i)=>rest[i]===0)],['1 μέρα ξεκούραση',G.filter((g,i)=>rest[i]===1)],['2+ μέρες',G.filter((g,i)=>rest[i]>=2)]];
  const months={};G.forEach(g=>{const k=new Date(g.date).toLocaleDateString('el-GR',{...tz,month:'long'});(months[k]=months[k]||[]).push(g)});
  if(Object.keys(months).length>1){S.push(null);Object.entries(months).forEach(([k,v])=>S.push([k[0].toUpperCase()+k.slice(1),v]))}
  const row=(l,rows)=>{const a=agg(rows);if(!a)return'';return`<tr><td>${l}</td><td>${a.n}</td><td>${f(a.min,1)}</td><td>${f(a.pts)}</td><td>${f(a.reb)}</td><td>${f(a.ast)}</td><td>${f(a.tpm)}</td><td>${pct(a.fg)}</td><td>${pct(a.tp)}</td><td>${pct(a.ts)}</td></tr>`};
  let sep=false;const tbody=S.map(x=>{if(!x){sep=true;return''}const r=row(x[0],x[1]);if(!r)return'';const out=sep?r.replace('<tr>','<tr class="sep">'):r;sep=false;return out}).join('');
  const opp={};G.forEach(g=>{(opp[g.oppAbbr]=opp[g.oppAbbr]||[]).push(g)});
  const oppRows=Object.entries(opp).map(([k,v])=>({k,a:agg(v)})).sort((a,b)=>b.a.pts-a.a.pts);
  const roll=(k,n=5)=>G.map((g,i)=>{const w=G.slice(Math.max(0,i-n+1),i+1);return[i,w.reduce((a,r)=>a+r[k],0)/w.length]});
  const rollTS=G.map((g,i)=>{const w=G.slice(Math.max(0,i-4),i+1),pts=w.reduce((a,r)=>a+r.pts,0),den=w.reduce((a,r)=>a+r.fga+.44*r.fta,0);return[i,den?100*pts/(2*den):NaN]});
  const season=agg(G);
  const L=B.sh?.league;
  const cl=s?.cl;
  sec.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Splits · shot chart · clutch</div><h2 class="h2">Τα νούμερα σε βάθος</h2><p class="lede" style="margin-top:8px">Όλα από το game log της σεζόν${s?` και το play-by-play των τελευταίων ${B.sh.games} αγώνων της λίγκας`:''}.</p></div><a class="more" href="#/leaders">Όλοι οι πίνακες →</a></div>
  ${G.length?`<div style="overflow-x:auto"><table class="sp-tab"><tr><th></th><th>Αγ.</th><th>Λεπτά</th><th>Π</th><th>Ρ</th><th>Α</th><th>3ΠΕ</th><th>FG%</th><th>3P%</th><th>TS%</th></tr>${tbody}</table></div>
  <div class="lbl" style="margin-top:20px">Φόρμα: κυλιόμενος μ.ό. 5 αγώνων</div>
  ${line([{color:'rgba(255,138,61,.6)',dots:1,pts:G.map((g,i)=>[i,g.pts])},{color:'#ff5a1f',pts:roll('pts')}],{ref:season.pts})}
  <div class="legend-k" style="display:flex;gap:14px;justify-content:center;font-size:12px;color:var(--muted)"><span>● πόντοι ανά αγώνα</span><span style="color:#ff5a1f">━ μ.ό. 5 αγώνων</span><span>┄ μ.ό. σεζόν ${f(season.pts)}</span></div>
  ${line([{color:'#7cc4ff',pts:rollTS}],{ref:season.ts!=null?season.ts*100:null,h:150,yfmt:v=>v.toFixed(0)+'%'})}
  <div class="legend-k" style="display:flex;gap:14px;justify-content:center;font-size:12px;color:var(--muted)"><span style="color:#7cc4ff">━ TS% (κυλιόμενο 5)</span></div>`:''}
  ${s?`<div class="sp-grid" style="margin-top:22px"><div><div class="lbl">Από πού σουτάρει (${sum(s.z,1)} σουτ, ${s.g} αγώνες)</div>${court(s.z,L)}</div><div><div class="lbl">Κατανομή σουτ · η λευκή γραμμή = μ.ό. λίγκας</div>${zbars(s.z,L)}<div class="lbl" style="margin-top:16px">Τύπος σουτ</div>${tbars(s.ty,L)}${s.fgm>=10?`<p class="muted" style="font-size:12.5px;margin-top:10px"><b style="color:var(--text)">${Math.round(100*s.ast/s.fgm)}%</b> των καλαθιών του ήρθαν από ασίστ (λίγκα: ${L?.fgm?Math.round(100*L.ast/L.fgm):'—'}%).</p>`:''}</div></div>`:''}
  ${cl&&(cl.fga||cl.fta)?`<div class="lbl" style="margin-top:22px">Clutch · τελευταία 5′ με διαφορά ≤5</div><div class="kpi4"><div><b>${cl.pts}</b><small>πόντοι σε ${cl.g} αγ.</small></div><div><b>${cl.fgm}/${cl.fga}</b><small>σουτ (${cl.fga?Math.round(100*cl.fgm/cl.fga):'—'}%)</small></div><div><b>${cl.tpm}/${cl.tpa}</b><small>τρίποντα</small></div><div><b>${cl.ftm}/${cl.fta}</b><small>βολές</small></div></div>`:''}
  ${oppRows.length>2?`<details style="margin-top:18px"><summary class="lbl" style="cursor:pointer">Απέναντι σε κάθε αντίπαλο (${oppRows.length})</summary><div style="overflow-x:auto"><table class="sp-tab"><tr><th>Αντίπ.</th><th>Αγ.</th><th>Π</th><th>Ρ</th><th>Α</th><th>FG%</th><th>TS%</th><th>Ν-Η</th></tr>${oppRows.map(({k,a})=>`<tr><td>${esc(k)}</td><td>${a.n}</td><td>${f(a.pts)}</td><td>${f(a.reb)}</td><td>${f(a.ast)}</td><td>${pct(a.fg)}</td><td>${pct(a.ts)}</td><td>${a.w}-${a.n-a.w}</td></tr>`).join('')}</table></div></details>`:''}`;
}

/* ---------- team page: depth ---------- */
async function teamStats(id){
  if(document.getElementById('tstats'))return;const hero=document.querySelector('.phero');if(!hero)return;
  const sec=document.createElement('section');sec.className='sec card';sec.id='tstats';sec.innerHTML='<div class="skel" style="min-height:300px"></div>';
  (document.getElementById('tinj')||hero).after(sec);
  const [B,sc]=await Promise.all([base(),api('schedule')]);if(route().id!==id||!document.body.contains(sec))return;
  const se=B.se,st=(se?.teams||[]).find(t=>t.id===String(id)),prof=teamProfiles(B.sh,se),tags=styleTags(prof),pr=prof[id],tg=tags[id];
  if(!st&&!pr){sec.remove();return}
  const net=Object.fromEntries((se?.teams||[]).map(t=>[t.id,(t.ortg??0)-(t.drtg??0)]));const wpct=Object.fromEntries((se?.teams||[]).map(t=>[t.id,t.w/Math.max(1,t.g)]));
  const log=st?.log||[];
  const rec=a=>{const w=a.filter(g=>g.m>0).length;return`${w}-${a.length-w}`},mg=a=>a.length?(a.reduce((s,g)=>s+g.m,0)/a.length):null;
  const splits=[['Σύνολο',log],['Εντός',log.filter(g=>g.home)],['Εκτός',log.filter(g=>!g.home)],['Τελευταία 10',log.slice(-10)],['vs ομάδες >.500',log.filter(g=>wpct[g.opp]>.5)],['vs ομάδες ≤.500',log.filter(g=>wpct[g.opp]<=.5)],['Κλειστά (≤5 ή παράταση)',log.filter(g=>Math.abs(g.m)<=5||g.ot)]];
  const playedN=log.map(g=>net[g.opp]).filter(Number.isFinite),sos=playedN.length?playedN.reduce((a,b)=>a+b,0)/playedN.length:null;
  const now=Date.now(),rem=(sc?.games||[]).filter(g=>new Date(g.date)>now&&(g.home===String(id)||g.away===String(id))).map(g=>net[g.home===String(id)?g.away:g.home]).filter(Number.isFinite);
  const sosR=rem.length?rem.reduce((a,b)=>a+b,0)/rem.length:null;
  const allSos=(se?.teams||[]).map(t=>{const a=(t.log||[]).map(g=>net[g.opp]).filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null}).filter(v=>v!=null).sort((a,b)=>b-a);
  const sosRank=sos!=null?allSos.findIndex(v=>v<=sos)+1:null;
  const rot=B.P.filter(p=>p.teamId===String(id)&&p.games>0).sort((a,b)=>(b.mpg||0)-(a.mpg||0)).slice(0,11);const tp=rot.reduce((a,p)=>a+(p.ppg||0)*(p.games||0),0)||1;
  const L=B.sh?.league;
  sec.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Team lab</div><h2 class="h2">Η ομάδα σε βάθος</h2><p class="lede" style="margin-top:8px">Rotation, διαφορά πόντων σε κάθε αγώνα, splits, δυσκολία προγράμματος και στυλ παιχνιδιού.</p></div><a class="more" href="#/styles">Στυλ όλων των ομάδων →</a></div>
  ${tg?`<div class="sp-grid"><div><div class="lbl">Επίθεση · πώς παίζουν</div><div class="stags">${tg.o.map(([t,d])=>`<div class="stag o"><b>${esc(t)}</b><small>${esc(d)}</small></div>`).join('')}</div></div><div><div class="lbl">Άμυνα · πώς αμύνονται</div><div class="stags">${tg.d.map(([t,d])=>`<div class="stag d"><b>${esc(t)}</b><small>${esc(d)}</small></div>`).join('')}</div></div></div>`:''}
  ${st?`<div class="kpi4" style="margin-top:18px"><div><b>${f(st.ortg)}</b><small>Επιθ. rating</small></div><div><b>${f(st.drtg)}</b><small>Αμυντ. rating</small></div><div><b style="color:${st.ortg-st.drtg>=0?'var(--good)':'var(--bad)'}">${st.ortg-st.drtg>=0?'+':''}${f(st.ortg-st.drtg)}</b><small>Net rating</small></div><div><b>${f(st.pace)}</b><small>Pace</small></div>${pr?.cl?`<div><b style="color:${pr.cl.pf-pr.cl.pa>=0?'var(--good)':'var(--bad)'}">${pr.cl.pf-pr.cl.pa>=0?'+':''}${pr.cl.pf-pr.cl.pa}</b><small>Clutch πόντοι (${pr.cl.g} αγ.)</small></div>`:''}</div>`:''}
  ${log.length?`<div class="lbl" style="margin-top:20px">Διαφορά πόντων αγώνα-αγώνα</div>${marginBars(log)}`:''}
  <div class="sp-grid" style="margin-top:14px">
   <div>${log.length?`<div class="lbl">Splits</div><table class="sp-tab"><tr><th></th><th>Ρεκόρ</th><th>Διαφορά</th></tr>${splits.filter(x=>x[1].length).map(([l,a])=>`<tr><td>${l}</td><td>${rec(a)}</td><td style="color:${mg(a)>=0?'var(--good)':'var(--bad)'}">${mg(a)>=0?'+':''}${f(mg(a))}</td></tr>`).join('')}</table>`:''}
   ${sos!=null?`<div class="lbl" style="margin-top:16px">Δυσκολία προγράμματος</div><div class="kpi4"><div><b>${sos>=0?'+':''}${f(sos)}</b><small>μ.ό. net αντιπάλων μέχρι τώρα${sosRank?` · ${sosRank}ο δυσκολότερο`:''}</small></div>${sosR!=null?`<div><b>${sosR>=0?'+':''}${f(sosR)}</b><small>υπόλοιπο πρόγραμμα (${rem.length} αγ.)</small></div>`:''}</div>`:''}</div>
   <div>${rot.length?`<div class="lbl">Rotation · λεπτά και μερίδιο πόντων</div><div class="rot">${rot.map(p=>`<div class="r"><a href="#/player/${p.id}">${esc(p.name)}</a><div class="bar"><i style="width:${Math.min(100,(p.mpg||0)/48*100)}%;background:var(--hot)"></i></div><small class="muted">${f(p.mpg,0)}′ · ${Math.round(100*(p.ppg||0)*(p.games||0)/tp)}% των πόντων</small></div>`).join('')}</div>`:''}</div>
  </div>
  ${pr?`<div class="sp-grid" style="margin-top:20px"><div><div class="lbl">Από πού σουτάρουν</div>${zbars(B.sh.teams[id].off.z,L,ZS)}<div class="lbl" style="margin-top:14px">Τύποι σουτ</div>${tbars(B.sh.teams[id].off.ty,L)}</div><div><div class="lbl">Τι αφήνουν στους αντιπάλους</div>${zbars(B.sh.teams[id].def.z,L,ZS)}<p class="muted" style="font-size:12.5px;margin-top:10px">Ασίστ: <b style="color:var(--text)">${pct(pr.o.ast,0)}</b> των καλαθιών · Βολές ανά σουτ: <b style="color:var(--text)">${f(pr.o.ftr,2)}</b> · Αντίπαλοι στο καλάθι: <b style="color:var(--text)">${pct(pr.d.rimP,0)}</b> εύστοχοι</p></div></div>
  <p class="muted" style="font-size:12px;margin-top:12px">Το «στυλ» προκύπτει από τα στατιστικά (κατανομή σουτ, ασίστ, τύποι σουτ, ρυθμός, λάθη) σε σύγκριση με τις άλλες 29 ομάδες, στους τελευταίους ${pr.g} αγώνες. Δεν είναι επίσημη περιγραφή τακτικής.</p>`:''}`;
}

/* ---------- leaderboards ---------- */
const PCOLS={
  basic:[['ppg','Π',1],['rpg','Ρ',1],['apg','Α',1],['spg','Κλ',1],['bpg','Κοψ',1],['mpg','Λεπτά',1],['games','Αγ.',0],['index','Atlas',1]],
  eff:[['tsPct','TS%',1],['efgPct','eFG%',1],['tp','3P%','p'],['ft','FT%','p'],['r3','3PA/FGA','p'],['ftr','FTA/FGA',2],['astTo','AST/TO',2]],
  p36:[['p36','Π/36',1],['r36','Ρ/36',1],['a36','Α/36',1],['stk36','Κλ+Κοψ/36',1],['use36','Usage/36',1]],
  shot:[['rimF','% στο καλάθι','p'],['rimP','FG% καλάθι','p'],['midF','% μέση','p'],['midP','FG% μέση','p'],['c3F','% γωνία 3','p'],['c3P','FG% γωνία 3','p'],['astd','% από ασίστ','p']],
  clutch:[['clPts','Clutch Π',0],['clFg','Clutch FG%','p'],['clG','Clutch αγ.',0]]};
const PGN={basic:'Βασικά',eff:'Αποδοτικότητα',p36:'Ανά 36′',shot:'Σουτ & ζώνες',clutch:'Clutch'};
const TCOLS=[['net','Net',1],['ortg','ORtg',1],['drtg','DRtg',1,true],['pace','Pace',1],['efg','eFG%','p'],['tovPct','TOV%','p',true],['orbPct','ORB%','p'],['oefg','Αντ. eFG%','p',true],['otovPct','Προκ. λάθη%','p'],['three','% τρίποντα','p'],['rim','% καλάθι','p'],['ast','% ασίστ','p'],['drim','Αντ. % καλάθι','p',true],['dthree','Αντ. % τρίποντα','p',true],['clnet','Clutch +/-',0]];
let LB={tab:'players',grp:'basic',sort:'ppg',dir:-1,pos:'',min:20,q:'',maxAge:45};
async function leaders(r){
  document.title='Στατιστικά · NBA ATLAS';if(r.q.get('t'))LB.tab=r.q.get('t');
  view.innerHTML=`<div id="hero" hidden></div><div class="sec-h"><div><div class="eyebrow">Leaderboards</div><h2 class="h2">Όλα τα στατιστικά</h2><p class="lede" style="margin-top:8px">Παίκτες και ομάδες σε πάνω από 40 κατηγορίες: βασικά, αποδοτικότητα, ανά 36′, ζώνες σουτ, clutch, ratings και στυλ. Πάτα σε στήλη για ταξινόμηση· το χρώμα δείχνει πού βρίσκεται κάθε τιμή μέσα στη λίγκα.</p></div></div><div id="lbbody"><div class="skel" style="min-height:600px"></div></div>`;
  const B=await base();if(route().name!=='leaders')return;const body=document.getElementById('lbbody');
  if(!B.ok){body.innerHTML='<div class="err">Τα στατιστικά δεν φόρτωσαν. Δοκίμασε ανανέωση.</div>';return}
  const paint=()=>{
    const tabs=`<div class="st-tabs"><button data-t="players" class="${LB.tab==='players'?'on':''}">Παίκτες</button><button data-t="teams" class="${LB.tab==='teams'?'on':''}">Ομάδες</button><a href="#/styles">Στυλ ομάδων →</a></div>`;
    if(LB.tab==='players'){
      const cols=PCOLS[LB.grp];if(!cols.some(c=>c[0]===LB.sort))LB.sort=cols[0][0];
      const elig=B.P.filter(p=>(p.mpg||0)>=LB.min&&(p.games||0)>=3&&(!LB.pos||String(p.pos).includes(LB.pos))&&(!p.age||p.age<=LB.maxAge)&&(!LB.q||p.name.toLowerCase().includes(LB.q.toLowerCase())));
      const D={};cols.forEach(([k])=>{D[k]=B.P.filter(p=>(p.mpg||0)>=15).map(p=>p[k]).filter(v=>v!=null).sort((a,b)=>a-b)});
      const R=elig.slice().sort((a,b)=>LB.dir*((a[LB.sort]??-1e9)-(b[LB.sort]??-1e9))).slice(0,150);
      const cell=(p,[k,,d])=>{const v=p[k];if(v==null)return'<td>—</td>';const q=pctile(D[k],v);const bg=q==null?'':`background:rgba(34,211,154,${Math.max(0,q-.5)*.6})`;return`<td class="h" style="${bg}">${d==='p'?pct(v):f(v,d)}</td>`};
      body.innerHTML=tabs+`<div class="st-tabs">${Object.entries(PGN).map(([k,l])=>`<button data-g="${k}" class="${LB.grp===k?'on':''}">${l}</button>`).join('')}</div>
      <div class="st-filters"><input type="search" id="lbq" placeholder="Παίκτης…" value="${esc(LB.q)}"><select id="lbpos"><option value="">Όλες οι θέσεις</option><option value="G" ${LB.pos==='G'?'selected':''}>Guards</option><option value="F" ${LB.pos==='F'?'selected':''}>Forwards</option><option value="C" ${LB.pos==='C'?'selected':''}>Centers</option></select><label>Λεπτά ≥ <b>${LB.min}</b><input type="range" id="lbmin" min="0" max="36" value="${LB.min}"></label><label>Ηλικία ≤ <b>${LB.maxAge>=45?'όλες':LB.maxAge}</b><input type="range" id="lbage" min="19" max="45" value="${LB.maxAge}"></label><span>${elig.length} παίκτες</span></div>
      <div class="lb-wrap"><table class="lb"><tr><th>Παίκτης</th>${cols.map(([k,l])=>`<th data-k="${k}" class="${LB.sort===k?'on':''}">${l}${LB.sort===k?(LB.dir<0?' ↓':' ↑'):''}</th>`).join('')}</tr>${R.map((p,i)=>`<tr><td><a class="pl" href="#/player/${p.id}"><span class="muted" style="width:22px">${i+1}</span><img src="${p.headshot||HS(p.id)}" alt="" loading="lazy" ${silh}><span>${esc(p.name)} <small>${esc(p.team||'')} · ${esc(p.pos||'')}</small></span></a></td>${cols.map(c=>cell(p,c)).join('')}</tr>`).join('')}</table></div>
      ${LB.grp==='shot'||LB.grp==='clutch'?`<p class="muted" style="font-size:12px;margin-top:10px">Ζώνες σουτ και clutch από το play-by-play των τελευταίων ${B.sh?.games||'—'} αγώνων. Ποσοστά ζώνης εμφανίζονται με ελάχιστο δείγμα 6–8 σουτ.</p>`:''}`;
    }else{
      const prof=teamProfiles(B.sh,B.se);
      const R0=(B.se?.teams||[]).map(t=>{const p=prof[t.id];return{id:t.id,t:B.T[t.id],rec:`${t.w}-${t.l}`,net:t.ortg!=null&&t.drtg!=null?t.ortg-t.drtg:null,ortg:t.ortg,drtg:t.drtg,pace:t.pace,efg:t.efg,tovPct:t.tovPct,orbPct:t.orbPct,oefg:t.oefg,otovPct:t.otovPct,three:p?.o.three,rim:p?.o.rim,ast:p?.o.ast,drim:p?.d.rim,dthree:p?.d.three,clnet:p?p.cl.pf-p.cl.pa:null}});
      if(!TCOLS.some(c=>c[0]===LB.sort))LB.sort='net';
      const D={};TCOLS.forEach(([k,,,low])=>{D[k]=R0.map(x=>x[k]).filter(v=>v!=null).sort((a,b)=>a-b)});
      const R=R0.sort((a,b)=>LB.dir*((a[LB.sort]??-1e9)-(b[LB.sort]??-1e9)));
      const cell=(x,[k,,d,low])=>{const v=x[k];if(v==null)return'<td>—</td>';let q=pctile(D[k],v);if(low)q=1-q;const bg=k==='pace'||k==='three'||k==='rim'||k==='ast'||k==='drim'||k==='dthree'?'':`background:rgba(34,211,154,${Math.max(0,q-.5)*.6})`;return`<td class="h" style="${bg}">${d==='p'?pct(v):f(v,d)}</td>`};
      body.innerHTML=tabs+`<div class="lb-wrap"><table class="lb"><tr><th>Ομάδα</th><th>Ρεκόρ</th>${TCOLS.map(([k,l])=>`<th data-k="${k}" class="${LB.sort===k?'on':''}">${l}${LB.sort===k?(LB.dir<0?' ↓':' ↑'):''}</th>`).join('')}</tr>${R.map((x,i)=>`<tr><td><a class="pl" href="#/team/${x.id}"><span class="muted" style="width:22px">${i+1}</span><img src="${x.t?.logo||''}" alt="" style="border-radius:0;background:none" ${hide}><span>${esc(x.t?.short||x.t?.name||x.id)}</span></a></td><td>${x.rec}</td>${TCOLS.map(c=>cell(x,c)).join('')}</tr>`).join('')}</table></div><p class="muted" style="font-size:12px;margin-top:10px">Ratings ανά 100 κατοχές από τα box scores της σεζόν· ποσοστά σουτ/ασίστ από το play-by-play των τελευταίων ${B.sh?.games||'—'} αγώνων. Οι στήλες στυλ (%) δεν χρωματίζονται, γιατί δείχνουν τρόπο παιχνιδιού, όχι ποιότητα.</p>`;
    }
    body.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{LB.tab=b.dataset.t;LB.sort=LB.tab==='teams'?'net':'ppg';LB.dir=-1;paint()});
    body.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{LB.grp=b.dataset.g;LB.sort=PCOLS[LB.grp][0][0];LB.dir=-1;paint()});
    body.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{const k=th.dataset.k;if(LB.sort===k)LB.dir*=-1;else{LB.sort=k;LB.dir=-1}paint()});
    const q=document.getElementById('lbq');if(q){q.oninput=()=>{LB.q=q.value;clearTimeout(q.t);q.t=setTimeout(()=>{paint();const n=document.getElementById('lbq');n.focus();n.setSelectionRange(n.value.length,n.value.length)},250)}}
    const ps=document.getElementById('lbpos');if(ps)ps.onchange=()=>{LB.pos=ps.value;paint()};
    const mn=document.getElementById('lbmin');if(mn)mn.onchange=()=>{LB.min=+mn.value;paint()};
    const ag=document.getElementById('lbage');if(ag)ag.onchange=()=>{LB.maxAge=+ag.value;paint()};
  };paint();
}

/* ---------- styles of all teams ---------- */
async function styles(){
  document.title='Στυλ παιχνιδιού · NBA ATLAS';
  view.innerHTML=`<div id="hero" hidden></div><div class="sec-h"><div><div class="eyebrow">Systems</div><h2 class="h2">Πώς παίζει κάθε ομάδα</h2><p class="lede" style="margin-top:8px">Το «σύστημα» κάθε ομάδας σε επίθεση και άμυνα, όπως φαίνεται από τα στατιστικά: πού σουτάρει, πόσες ασίστ, τι τύπους σουτ παίρνει, τι αφήνει στους αντιπάλους, ρυθμός και λάθη. Σύγκριση με τις άλλες 29.</p></div><a class="more" href="#/leaders?t=teams">Πίνακας ομάδων →</a></div><div id="stybody"><div class="skel" style="min-height:600px"></div></div>`;
  const B=await base();if(route().name!=='styles')return;const body=document.getElementById('stybody');
  const prof=teamProfiles(B.sh,B.se),tags=styleTags(prof);if(!Object.keys(tags).length){body.innerHTML='<div class="err">Τα δεδομένα play-by-play δεν φόρτωσαν. Δοκίμασε ανανέωση σε λίγο.</div>';return}
  const se=Object.fromEntries((B.se?.teams||[]).map(t=>[t.id,t]));
  const ids=Object.keys(tags).sort((a,b)=>((se[b]?.ortg??0)-(se[b]?.drtg??0))-((se[a]?.ortg??0)-(se[a]?.drtg??0)));
  body.innerHTML=`<div class="sty-grid">${ids.map(id=>{const t=B.T[id]||{},s=se[id],p=prof[id];return`<a class="sty" href="#/team/${id}"><h3><img src="${t.logo||''}" alt="" ${hide}>${esc(t.short||t.name||id)}<span class="muted" style="margin-left:auto;font-size:13px;font-family:var(--body)">${s?`${s.w}-${s.l} · net ${s.ortg-s.drtg>=0?'+':''}${f(s.ortg-s.drtg)}`:''}</span></h3>
    <div><div class="lbl" style="margin-bottom:6px">Επίθεση</div>${tags[id].o.map(([x,d])=>`<span class="chip o" title="${esc(d)}">${esc(x)}</span>`).join('')}</div>
    <div><div class="lbl" style="margin-bottom:6px">Άμυνα</div>${tags[id].d.map(([x,d])=>`<span class="chip d" title="${esc(d)}">${esc(x)}</span>`).join('')}</div>
    <div class="muted" style="font-size:12px">Τρίποντα ${pct(p.o.three,0)} · Καλάθι ${pct(p.o.rim,0)} · Ασίστ ${pct(p.o.ast,0)} · Pace ${f(p.pace)}</div></a>`}).join('')}</div>
  <p class="muted" style="font-size:12px;margin-top:14px">Οι ετικέτες μπαίνουν όταν μια ομάδα είναι στο πάνω ή κάτω ~20–25% της λίγκας σε έναν δείκτη. Βασίζονται σε ${B.sh?.games||'—'} πρόσφατους αγώνες και δεν είναι επίσημη περιγραφή τακτικής.</p>`;
}

/* ---------- navigation & hooks ---------- */
const MINE={leaders,styles};
const TILES=[['leaders','📊','Όλα τα στατιστικά','40+ κατηγορίες για παίκτες και ομάδες: ανά 36′, ζώνες σουτ, clutch, ratings.','rgba(34,211,154,.22)'],['styles','🧠','Στυλ παιχνιδιού','Πώς παίζει κάθε ομάδα σε επίθεση και άμυνα, από τα στατιστικά.','rgba(169,139,255,.25)']];
const navAdd=()=>{const a=document.querySelector('#links [data-r="players"]');if(a&&!document.querySelector('#links [data-r="leaders"]'))a.insertAdjacentHTML('afterend','<a href="#/leaders" data-r="leaders">Στατιστικά</a>')};
function hook(){const r=route();navAdd();document.querySelectorAll('#links [data-r="leaders"]').forEach(a=>a.classList.toggle('on',r.name==='leaders'||r.name==='styles'));
  if(MINE[r.name]){document.querySelectorAll('#links [data-r]').forEach(a=>{if(a.dataset.r!=='leaders')a.classList.remove('on')});setTimeout(()=>MINE[r.name](r),0)}}
let pend=null;
new MutationObserver(()=>{clearTimeout(pend);pend=setTimeout(()=>{const r=route();navAdd();
  if(r.name==='player'&&r.id&&document.querySelector('.phero'))playerStats(r.id);
  if(r.name==='team'&&r.id&&document.querySelector('.phero'))teamStats(r.id);
  if(r.name==='lab'){const g=view.querySelector('.lab-grid');if(g&&!g.querySelector('[data-st]'))g.insertAdjacentHTML('afterbegin',TILES.map(([k,ic,t,p,c])=>`<a class="lab-tile" data-st href="#/${k}" style="--glow:${c}"><span class="ic">${ic}</span><b>${t}</b><p>${p}</p></a>`).join(''))}
  if(r.name==='home'){const t=document.querySelector('#hteaser .teaser');if(t&&!t.querySelector('[data-st]'))t.insertAdjacentHTML('afterbegin',TILES.map(([k,ic,ti,p,c])=>`<a class="lab-tile" data-st href="#/${k}" style="--glow:${c};min-height:140px"><span class="ic">${ic}</span><b>${ti}</b><p>${p}</p></a>`).join(''))}
},180)}).observe(view,{childList:true});
addEventListener('hashchange',hook);hook();
})();
