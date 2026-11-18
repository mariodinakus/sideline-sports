/* NBA ATLAS plus: Twins 2.0 (archetypes, radar, era-adjusted legends, adjustable weights),
   head-to-head compare, injury centre, Greeks of the NBA, "tonight" picks, model accuracy over time.
   Self-contained; hooks into pages app.js renders. Data: /api/power, /api/goat, /api/data, /api/intel, /api/schedule. */
(()=>{'use strict';
const view=document.getElementById('view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v==null||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};
const f=(v,d=1)=>{const x=num(v);return x===null?'—':x.toFixed(d)};
const HS=id=>`https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const LOGO=a=>`https://a.espncdn.com/i/teamlogos/nba/500/${String(a||'nba').toLowerCase()}.png`;
const silh=`onerror="this.onerror=null;this.src=window.SILH"`,hide=`onerror="this.style.visibility='hidden'"`;
const tz={timeZone:'Europe/Athens'};
const tm=d=>new Date(d).toLocaleTimeString('el-GR',{...tz,hour:'2-digit',minute:'2-digit',hour12:false});
const dy=d=>new Date(d).toLocaleDateString('el-GR',{...tz,weekday:'short',day:'numeric',month:'short'});
const cache=new Map();
const api=p=>{if(!cache.has(p))cache.set(p,fetch('/api/'+p).then(r=>r.ok?r.json():null).then(j=>j&&(j.data&&!j.players&&!j.teams&&!j.games&&!j.records?j.data:j)).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
const route=()=>{const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[name,id]=path.split('/');return{name:name||'home',id,q:new URLSearchParams(qs||'')}};
const ftin=i=>i?`${Math.floor(i/12)}'${i%12}"`:'—',cm=i=>i?Math.round(i*2.54)+' cm':'—',kg=l=>l?Math.round(l*.4536)+' kg':'—';

const css=document.createElement('style');css.textContent=`
.tw2-top{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:22px;align-items:start}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}.tag{padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:800;background:rgba(255,90,31,.12);color:var(--hot2);border:1px solid rgba(255,90,31,.28)}
.tag.cool{background:rgba(124,196,255,.1);color:var(--ice);border-color:rgba(124,196,255,.28)}
.tw2-list{display:flex;flex-direction:column;gap:8px}
.tw2{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card2);cursor:pointer;text-align:left;color:var(--text);font:inherit;width:100%}
.tw2.on{border-color:var(--hot);box-shadow:0 0 0 1px var(--hot) inset}
.tw2 img{width:48px;height:48px;border-radius:50%;object-fit:cover;object-position:top;background:var(--bg2)}
.tw2 b{display:block;font-size:14px;line-height:1.2}.tw2 small{color:var(--muted);font-size:12px}
.tw2 .sim{font-family:var(--display);font-size:24px;color:var(--hot)}
.simbar{height:4px;border-radius:9px;background:var(--bg2);margin-top:5px;overflow:hidden}.simbar i{display:block;height:100%;background:linear-gradient(90deg,var(--hot),var(--hot2))}
.wts{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px 16px;margin:6px 0 16px}
.wts label{display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:var(--muted)}.wts input{width:100%;accent-color:var(--hot)}
.rad text{fill:var(--muted);font-size:10.5px;font-weight:700}.rad .gr{stroke:rgba(255,255,255,.09);fill:none}
.diffs{display:flex;flex-direction:column;gap:6px;margin-top:10px;font-size:13px;color:var(--muted)}.diffs b{color:var(--text)}
.legend-k{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;font-weight:700;color:var(--muted);justify-content:center;margin-top:4px}.legend-k i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.cmp-head{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center}
.cmp-p{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px}
.cmp-p img.hs{width:150px;height:110px;object-fit:cover;object-position:top}
.cmp-p select,.cmp-sel{max-width:100%;background:var(--card2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:8px 10px;font:inherit;font-weight:700}
.vs{font-family:var(--display);font-size:44px;color:var(--dim)}
.ctab{width:100%;border-collapse:collapse;font-size:14px}.ctab td{padding:9px 8px;border-bottom:1px solid var(--line)}
.ctab td:nth-child(1),.ctab td:nth-child(3){width:38%;font-weight:800;font-variant-numeric:tabular-nums}.ctab td:nth-child(1){text-align:right}.ctab td:nth-child(2){text-align:center;color:var(--muted);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.ctab .w{color:var(--good)}
.inj-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.injcols{columns:2 440px;column-gap:16px}.inj-team{margin-bottom:16px;break-inside:avoid;display:block}.inj-team h3{display:flex;align-items:center;gap:10px;font-family:var(--cond);font-size:20px;font-weight:900;margin:0 0 8px}.inj-team h3 img{width:28px;height:28px}
.inj{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}
.inj img{width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:top;background:var(--bg2)}
.inj b{font-size:14px}.inj small{display:block;color:var(--muted);font-size:12px;line-height:1.35}
.st-out{background:rgba(255,77,106,.14)!important;color:var(--bad)!important}.st-dtd{background:rgba(255,179,71,.14)!important;color:#ffb347!important}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.chips button{padding:7px 14px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--muted);font:inherit;font-weight:800;font-size:13px;cursor:pointer}.chips button.on{background:var(--hot);color:#111;border-color:var(--hot)}
.gr-hero{background:linear-gradient(135deg,rgba(13,94,175,.35),rgba(13,94,175,.08) 60%),var(--card);border:1px solid rgba(124,196,255,.25)}
.gr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.gr-card{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:var(--r);border:1px solid var(--line);background:var(--card)}
.gr-card .top{display:flex;gap:12px;align-items:center}.gr-card .top img.hs{width:78px;height:78px;border-radius:50%;object-fit:cover;object-position:top;background:var(--bg2)}
.gr-card .ln{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted)}.gr-card .ln em{font-style:normal;font-weight:900;color:var(--text);font-size:17px;margin-right:3px}
.nextg{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;padding:8px 10px;border-radius:10px;background:var(--card2)}.nextg img{width:22px;height:22px}
.tn-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.tn{display:flex;flex-direction:column;gap:8px;padding:14px 16px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(255,90,31,.08),transparent 60%),var(--card)}
.tn .tms{display:flex;align-items:center;gap:8px;font-weight:900;font-family:var(--cond);font-size:19px}.tn .tms img{width:26px;height:26px}
.tn .stars{color:var(--hot);letter-spacing:2px}.tn small{color:var(--muted);font-size:12px}
.tvchip{display:inline-flex;align-items:center;font-size:11px;font-weight:800;padding:5px 9px;border-radius:999px;background:rgba(124,196,255,.12);color:var(--ice);white-space:nowrap;margin-left:6px}.tvchip.lp{background:rgba(255,255,255,.05);color:var(--dim)}.game-top .tvchip~span{display:none}
.mchart text{fill:var(--dim);font-size:10px}.mchart .gr{stroke:rgba(255,255,255,.07)}
#links{mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent);-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent)}
.teaser{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.hist{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 18px;font-size:13.5px}.hist div{padding:8px 0;border-bottom:1px solid var(--line)}.hist small{display:block;color:var(--muted);font-size:12px}
@media (max-width:860px){.tw2-top{grid-template-columns:1fr}.cmp-p img.hs{width:110px;height:80px}.vs{font-size:28px}}
`;document.head.appendChild(css);

/* ---------- legends bio (Basketball-Reference career values; steals/blocks not recorded before 1973-74) ----------
   pace = estimated league possessions/48 over the player's career, used to era-adjust counting stats to today's ~100. */
const LEG={
'1035':{h:78,w:216,pos:'SG',spg:2.3,bpg:.8,pace:96,era:'1984–2003'},'110':{h:78,w:212,pos:'SG',spg:1.4,bpg:.5,pace:92,era:'1996–2016'},
'2334':{h:81,w:215,pos:'PG',spg:1.9,bpg:.4,pace:102,era:'1979–1996'},'4145':{h:86,w:225,pos:'C',spg:null,bpg:null,pace:106,era:'1969–1989'},
'2335':{h:81,w:220,pos:'SF',spg:1.7,bpg:.8,pace:101,era:'1979–1992'},'215':{h:83,w:250,pos:'PF',spg:.7,bpg:2.2,pace:92,era:'1997–2016'},
'609':{h:84,w:245,pos:'PF',spg:.8,bpg:.8,pace:93,era:'1998–2019'},'614':{h:85,w:325,pos:'C',spg:.6,bpg:2.3,pace:92,era:'1992–2011'},
'366':{h:72,w:165,pos:'PG',spg:2.2,bpg:.2,pace:91,era:'1996–2010'},'619':{h:84,w:255,pos:'C',spg:1.7,bpg:3.1,pace:96,era:'1984–2002'},
'4152':{h:82,w:215,pos:'C',spg:null,bpg:null,pace:125,era:'1956–1969'},'4142':{h:85,w:275,pos:'C',spg:null,bpg:null,pace:122,era:'1959–1973'},
'1987':{h:76,w:220,pos:'SG',spg:1.5,bpg:.8,pace:93,era:'2003–2019'},'4119':{h:77,w:205,pos:'PG',spg:null,bpg:null,pace:118,era:'1960–1974'},
'501':{h:81,w:250,pos:'PF',spg:1.4,bpg:.8,pace:95,era:'1985–2004'},'37':{h:78,w:252,pos:'PF',spg:1.5,bpg:.8,pace:97,era:'1984–2000'},
'261':{h:83,w:240,pos:'PF',spg:1.3,bpg:1.4,pace:92,era:'1995–2016'},'715':{h:85,w:235,pos:'C',spg:1.4,bpg:3.0,pace:94,era:'1989–2003'},
'3507':{h:73,w:180,pos:'PG',spg:1.9,bpg:.3,pace:100,era:'1981–1994'},'812':{h:73,w:170,pos:'PG',spg:2.2,bpg:.2,pace:95,era:'1984–2003'},
'663':{h:80,w:210,pos:'SF',spg:2.0,bpg:.8,pace:94,era:'1987–2004'},'3776':{h:82,w:215,pos:'C',spg:.8,bpg:1.3,pace:102,era:'1976–1995'},
'4135':{h:77,w:225,pos:'SF',spg:null,bpg:null,pace:122,era:'1958–1972'},'4151':{h:75,w:175,pos:'PG',spg:null,bpg:null,pace:118,era:'1960–1974'}};

/* ---------- shared data ---------- */
const pctile=(arr,v)=>{if(v==null)return null;let lo=0;for(const x of arr)if(x<v)lo++;return arr.length?lo/arr.length:null};
let MODEL=null;
async function model(){
  if(MODEL)return MODEL;
  const [pw,bio]=await Promise.all([api('power'),api('data?type=players')]);
  const B={};(bio?.players||[]).forEach(b=>{B[b.id]=b});
  const per=(p,v)=>p.mpg>0&&v!=null?v/p.mpg*36:null;
  const P=(pw?.players||[]).map(p=>{const b=B[p.id]||{};const fga=num(p.fga),fta=num(p.fta),tov=num(p.turnovers);return{...p,bio:b,
    h:num(b.heightIn),w:num(b.weightLb),age:num(b.age),pos:b.position||'',country:b.country||'',
    p36:per(p,p.ppg),a36:per(p,p.apg),r36:per(p,p.rpg),or36:per(p,num(p.orpg)),s36:per(p,p.spg),b36:per(p,p.bpg),
    ts:num(p.tsPct),ato:num(p.astTo),r3:fga>0&&p.fg3a!=null?p.fg3a/fga:null,ftr:fga>0&&fta!=null?fta/fga:null,
    use36:p.mpg>0&&fga!=null&&fta!=null&&tov!=null?(fga+.44*fta+tov)/p.mpg*36:null}});
  const E=P.filter(p=>p.mpg>=12&&p.games>=3);
  const KEYS=['h','w','p36','ts','r3','ftr','a36','ato','use36','r36','or36','s36','b36'];
  const dist={};KEYS.forEach(k=>{dist[k]=E.map(p=>p[k]).filter(v=>v!=null).sort((a,b)=>a-b)});
  const st={};KEYS.forEach(k=>{const a=dist[k],m=a.reduce((s,x)=>s+x,0)/(a.length||1),sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length||1))||1;st[k]=[m,sd]});
  const z=(p,k)=>p[k]==null?0:(p[k]-st[k][0])/st[k][1];
  const pc=(p,k)=>pctile(dist[k],p[k]);
  const out={P,E,byId:Object.fromEntries(P.map(p=>[p.id,p])),z,pc,st,ok:!!pw};
  if(pw&&bio?.players?.length)MODEL=out;
  return out;
}
const GROUPS=[['body','Σώμα',['h','w']],['score','Σκοράρισμα',['p36','ts','r3','ftr']],['play','Δημιουργία',['a36','ato','use36']],['reb','Ριμπάουντ',['r36','or36']],['def','Άμυνα',['s36','b36']]];
const W0={body:1,score:1,play:1,reb:1,def:1};
function distance(M,a,b,W){let s=0,t=0;for(const [g,,ks] of GROUPS){const w=W[g]||0;if(!w)continue;let d=0;ks.forEach(k=>{d+=(M.z(a,k)-M.z(b,k))**2});s+=w*d/ks.length;t+=w}return t?Math.sqrt(s/t):9}
const simPct=d=>Math.max(1,Math.round(100*Math.exp(-d*d*.28)));

function archetypes(M,p){
  const q=k=>M.pc(p,k)??.5,h=p.h||0,stocks=(q('s36')+q('b36'))/2,T=[];
  if(q('a36')>.88&&q('use36')>.7)T.push(['Primary creator','Ο οργανωτής της επίθεσης']);
  else if(q('a36')>.78&&h>=79)T.push(['Point forward','Ψηλός που μοιράζει']);
  else if(q('ato')>.85&&q('a36')>.7)T.push(['Floor general','Σταθερός πλέι-μέικερ']);
  if(h>=82&&q('b36')>.8)T.push(['Rim protector','Κλείνει τη ρακέτα']);
  if(h>=82&&q('r3')>.6)T.push(['Stretch big','Ψηλός που ανοίγει το γήπεδο']);
  if(q('r36')>.88&&!T.some(t=>t[0]==='Rim protector'))T.push(['Glass cleaner','Μαγνήτης στα ριμπάουντ']);
  if(q('use36')>.88&&q('p36')>.85)T.push(['Volume scorer','Η πρώτη επιλογή στο σκορ']);
  if(h>=77&&h<=81&&q('r3')>.55&&stocks>.55)T.push(['3&D wing','Τρίποντο και άμυνα']);
  else if(q('p36')>.6&&stocks>.72)T.push(['Two-way','Και στις δύο άκρες']);
  if(q('r3')>.8&&q('ts')>.6&&h<82)T.push(['Sniper','Ζει πίσω από τη γραμμή']);
  if(q('ftr')>.85)T.push(['Rim attacker','Επιτίθεται στο καλάθι, κερδίζει βολές']);
  if(q('ts')>.88&&q('use36')<.55)T.push(['Efficient finisher','Λίγα σουτ, πολύ ψηλά ποσοστά']);
  if(!T.length)T.push(['Role player','Ρόλος χωρίς ακραίο προφίλ']);
  return T.slice(0,3);
}
const RAX=[['Σκορ','p36'],['TS%','ts'],['Τρίποντα','r3'],['Βολές','ftr'],['Πάσα','a36'],['Ριμπ.','r36'],['Άμυνα','def'],['Usage','use36']];
const rv=(M,p,k)=>k==='def'?(((M.pc(p,'s36')??.5)+(M.pc(p,'b36')??.5))/2):(M.pc(p,k)??0);
function radarSVG(axes,series,size=330){
  const c=size/2,R=c-46,ang=i=>-Math.PI/2+i*2*Math.PI/axes.length,pt=(i,v)=>[c+Math.cos(ang(i))*R*v,c+Math.sin(ang(i))*R*v];
  let g='';[.25,.5,.75,1].forEach(l=>{g+=`<polygon class="gr" points="${axes.map((_,i)=>pt(i,l).join(',')).join(' ')}"/>`});
  axes.forEach((a,i)=>{const [x,y]=pt(i,1),[lx,ly]=pt(i,1.17);g+=`<line class="gr" x1="${c}" y1="${c}" x2="${x}" y2="${y}"/><text x="${lx}" y="${ly+4}" text-anchor="middle">${esc(a)}</text>`});
  series.forEach(s=>{g+=`<polygon points="${s.vals.map((v,i)=>pt(i,Math.max(.03,v)).join(',')).join(' ')}" fill="${s.color}" fill-opacity=".2" stroke="${s.color}" stroke-width="2"/>`;s.vals.forEach((v,i)=>{const [x,y]=pt(i,Math.max(.03,v));g+=`<circle cx="${x}" cy="${y}" r="2.6" fill="${s.color}"/>`})});
  return`<svg class="rad" viewBox="0 0 ${size} ${size}" style="width:100%;max-width:${size+40}px;display:block;margin:auto">${g}</svg><div class="legend-k">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}
function diffText(M,a,b){
  const D=RAX.map(([l,k])=>({l,d:rv(M,a,k)-rv(M,b,k)})).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d)).slice(0,3);
  const ln=a.name.split(' ').slice(-1)[0],lb=b.name.split(' ').slice(-1)[0];
  return D.map(x=>Math.abs(x.d)<.08?`<div>Στο <b>${x.l}</b> είναι σχεδόν ίδιοι.</div>`:`<div><b>${x.l}</b>: ${x.d>0?esc(ln):esc(lb)} πιο ψηλά κατά ${Math.round(Math.abs(x.d)*100)} εκατοστημόρια.</div>`).join('');
}

/* ---------- Twins 2.0 on the player page ---------- */
let twinW={...W0};try{const s=JSON.parse(localStorage.getItem('atlas-twinw')||'null');if(s)twinW={...W0,...s}}catch{}
async function twins2(id){
  if(document.getElementById('tw2sec'))return;const hero=document.querySelector('.phero');if(!hero)return;
  const sec=document.createElement('section');sec.className='sec card';sec.id='tw2sec';sec.innerHTML='<div class="skel" style="min-height:260px"></div>';
  (document.getElementById('advpl')||hero).after(sec);
  const [M,gt]=await Promise.all([model(),api('goat')]);if(route().id!==id||!document.body.contains(sec))return;
  const me=M.byId[id],legMe=(gt?.players||[]).find(p=>p.id===id&&!p.active);
  const legRows=(gt?.players||[]).filter(p=>!p.active&&LEG[p.id]).map(p=>{const b=LEG[p.id],k=100/b.pace;return{p,b,pts:p.careerPPG*k,reb:p.careerRPG*k,ast:p.careerAPG*k,h:b.h,stk:b.spg!=null&&b.bpg!=null?(b.spg+b.bpg)*k:null}});
  const legVec=(x)=>[x.pts,x.reb,x.ast,x.h,x.stk];
  const curVec=(p)=>[p.ppg,p.rpg,p.apg,p.h,p.spg!=null&&p.bpg!=null?p.spg+p.bpg:null];
  const LST=(()=>{const rows=[...legRows.map(legVec),...M.E.map(curVec)];return [0,1,2,3,4].map(i=>{const a=rows.map(r=>r[i]).filter(v=>v!=null),m=a.reduce((s,x)=>s+x,0)/a.length,sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)||1;return[m,sd]})})();
  const ldist=(u,v)=>{let s=0,n=0;u.forEach((x,i)=>{if(x==null||v[i]==null)return;const w=i===3?.8:1;s+=w*((x-LST[i][0])/LST[i][1]-(v[i]-LST[i][0])/LST[i][1])**2;n+=w});return n?Math.sqrt(s/n):9};
  const legSim=d=>Math.max(1,Math.round(100*Math.exp(-d*d*.4)));

  if(me&&me.mpg>=8){
    const tags=archetypes(M,me);
    const draw=()=>{
      const near=M.E.filter(x=>x.id!==id).map(x=>({x,d:distance(M,me,x,twinW)})).sort((a,b)=>a.d-b.d).slice(0,6);
      const lnear=me.h?legRows.map(r=>({r,d:ldist(curVec(me),legVec(r))})).sort((a,b)=>a.d-b.d).slice(0,3):[];
      let sel=near[0]?.x;
      sec.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Statistical twins 2.0</div><h2 class="h2">Με ποιον μοιάζει</h2><p class="lede" style="margin-top:8px">Σύγκριση σε 13 χαρακτηριστικά: σώμα (ύψος, βάρος), σκοράρισμα ανά 36′, TS%, πόσο σουτάρει τρίποντα και πόσες βολές κερδίζει, δημιουργία, ριμπάουντ και άμυνα. Ρύθμισε τι μετράει περισσότερο.</p></div><a class="more" href="#/compare?a=${id}${sel?'&b='+sel.id:''}" id="tw2cmp">🆚 Πλήρης σύγκριση</a></div>
      <div class="lbl">Αρχέτυπο</div><div class="tags">${tags.map(([t,d],i)=>`<span class="tag ${i?'cool':''}" title="${esc(d)}">${esc(t)} · <span style="font-weight:600">${esc(d)}</span></span>`).join('')}</div>
      <div class="wts">${GROUPS.map(([g,l])=>`<div><label><span>${l}</span><b>${['0','×½','×1','×1½','×2','×3'][[0,.5,1,1.5,2,3].indexOf(twinW[g])]||'×'+twinW[g]}</b></label><input type="range" min="0" max="5" step="1" value="${[0,.5,1,1.5,2,3].indexOf(twinW[g])}" data-g="${g}"></div>`).join('')}</div>
      <div class="tw2-top"><div><div class="lbl">Σημερινοί παίκτες που του μοιάζουν</div><div class="tw2-list">${near.map(({x,d},i)=>`<button class="tw2 ${i===0?'on':''}" data-id="${x.id}"><img src="${x.headshot||HS(x.id)}" alt="" loading="lazy" ${silh}><span><b>${esc(x.name)}</b><small>${esc(x.team||'')} · ${archetypes(M,x)[0][0]} · ${f(x.ppg)}/${f(x.rpg)}/${f(x.apg)}</small><div class="simbar"><i style="width:${simPct(d)}%"></i></div></span><span class="sim">${simPct(d)}%</span></button>`).join('')}</div></div>
      <div><div id="tw2rad"></div><div class="diffs" id="tw2diff"></div></div></div>
      ${lnear.length?`<div class="lbl" style="margin-top:22px">Ο θρύλος που του μοιάζει (προσαρμογή εποχής για ρυθμό παιχνιδιού)</div><div class="twins">${lnear.map(({r,d})=>`<a class="twin" href="#/player/${r.p.id}"><img src="${HS(r.p.id)}" alt="" loading="lazy" ${silh}><span><b>${esc(r.p.name)}</b><small>${legSim(d)}% · ${esc(r.b.pos)} ${ftin(r.b.h)} · ${esc(r.b.era)}</small></span></a>`).join('')}</div>`:''}
      <p class="note" style="margin-top:14px;font-size:12px;color:var(--dim)">Ομοιότητα = απόσταση σε τυποποιημένες τιμές (z-scores) μεταξύ ${M.E.length} παικτών με ≥12′. Θρύλοι: μέσοι όροι καριέρας (Basketball-Reference) ×100/ρυθμό εποχής· κλεψίματα/κοψίματα δεν καταγράφονταν πριν το 1973-74.</p>`;
      const paint=x=>{sel=x;document.getElementById('tw2rad').innerHTML=radarSVG(RAX.map(a=>a[0]),[{name:me.name,color:'#ff5a1f',vals:RAX.map(([,k])=>rv(M,me,k))},{name:x.name,color:'#7cc4ff',vals:RAX.map(([,k])=>rv(M,x,k))}]);document.getElementById('tw2diff').innerHTML=diffText(M,me,x);const a=document.getElementById('tw2cmp');if(a)a.href=`#/compare?a=${id}&b=${x.id}`};
      if(sel)paint(sel);
      sec.querySelectorAll('.tw2').forEach(b=>b.onclick=()=>{sec.querySelectorAll('.tw2').forEach(o=>o.classList.toggle('on',o===b));paint(M.byId[b.dataset.id])});
      sec.querySelectorAll('.wts input').forEach(inp=>inp.oninput=()=>{twinW[inp.dataset.g]=[0,.5,1,1.5,2,3][+inp.value];try{localStorage.setItem('atlas-twinw',JSON.stringify(twinW))}catch{}clearTimeout(draw.t);draw.t=setTimeout(draw,120)});
    };draw();return;
  }
  if(legMe&&LEG[id]){
    const r=legRows.find(x=>x.p.id===id);if(!r){sec.remove();return}
    const near=M.E.filter(x=>x.h).map(x=>({x,d:ldist(curVec(x),legVec(r))})).sort((a,b)=>a.d-b.d).slice(0,6);
    const others=legRows.filter(x=>x.p.id!==id).map(x=>({x,d:ldist(legVec(x),legVec(r))})).sort((a,b)=>a.d-b.d).slice(0,3);
    sec.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Statistical twins 2.0</div><h2 class="h2">Ο σημερινός του διάδοχος</h2><p class="lede" style="margin-top:8px">${esc(r.p.name)}: ${esc(r.b.pos)}, ${ftin(r.b.h)} (${cm(r.b.h)}), ${esc(r.b.era)}. Τα νούμερα καριέρας προσαρμόζονται στον σημερινό ρυθμό (~100 κατοχές) και συγκρίνονται με πόντους, ριμπάουντ, ασίστ, ύψος και κλεψίματα+κοψίματα.</p></div></div>
    <div class="grid g4" style="margin-bottom:18px">${[['Πόντοι (adj.)',r.pts],['Ριμπάουντ (adj.)',r.reb],['Ασίστ (adj.)',r.ast],['Stl+Blk (adj.)',r.stk]].map(([l,v])=>`<div class="card" style="padding:14px"><div class="lbl">${l}</div><b style="font-family:var(--display);font-size:32px">${f(v)}</b></div>`).join('')}</div>
    <div class="lbl">Σημερινοί παίκτες με το ίδιο προφίλ</div><div class="twins">${near.map(({x,d})=>`<a class="twin" href="#/player/${x.id}"><img src="${x.headshot||HS(x.id)}" alt="" loading="lazy" ${silh}><span><b>${esc(x.name)}</b><small>${legSim(d)}% · ${f(x.ppg)}/${f(x.rpg)}/${f(x.apg)}</small></span></a>`).join('')}</div>
    <div class="lbl" style="margin-top:18px">Θρύλοι με παρόμοιο προφίλ</div><div class="twins">${others.map(({x,d})=>`<a class="twin" href="#/player/${x.p.id}"><img src="${HS(x.p.id)}" alt="" loading="lazy" ${silh}><span><b>${esc(x.p.name)}</b><small>${legSim(d)}% · ${esc(x.b.era)}</small></span></a>`).join('')}</div>
    <p class="note" style="margin-top:14px;font-size:12px;color:var(--dim)">Ρυθμός εποχής = εκτίμηση μέσου όρου κατοχών της λίγκας στα χρόνια καριέρας. Κλεψίματα/κοψίματα δεν καταγράφονταν πριν το 1973-74, οπότε για εκείνους μετράνε μόνο τα υπόλοιπα.</p>`;
    return;
  }
  sec.remove();
}

/* ---------- head-to-head compare ---------- */
async function compare(r){
  document.title='Σύγκριση · NBA ATLAS';
  view.innerHTML=`<div id="hero" hidden></div><div class="sec-h"><div><div class="eyebrow">Head to head</div><h2 class="h2">Σύγκριση παικτών</h2><p class="lede" style="margin-top:8px">Διάλεξε δύο παίκτες της σεζόν. Radar σε εκατοστημόρια, ανά-36 νούμερα, αρχέτυπο και πόσο μοιάζουν.</p></div><button class="more" id="cswap">⇄ Αντιστροφή</button></div><div id="cbody"><div class="skel" style="min-height:520px"></div></div>`;
  const M=await model();if(route().name!=='compare')return;
  const body=document.getElementById('cbody');if(!M.ok){body.innerHTML='<div class="err">Τα στατιστικά δεν φόρτωσαν. Δοκίμασε ανανέωση.</div>';return}
  const L=M.P.filter(p=>p.mpg>=8).sort((a,b)=>a.name.localeCompare(b.name));const top=M.E.slice().sort((a,b)=>(b.index||0)-(a.index||0));
  let a=M.byId[r.q.get('a')]||top[0],b=M.byId[r.q.get('b')]||top.find(x=>x.id!==a.id);
  const opts=sel=>L.map(p=>`<option value="${p.id}" ${p.id===sel.id?'selected':''}>${esc(p.name)} · ${esc(p.team||'')}</option>`).join('');
  const S={style:true};const rows=[['Πόντοι','ppg',1],['Ριμπάουντ','rpg',1],['Ασίστ','apg',1],['Κλεψίματα','spg',1],['Κοψίματα','bpg',1],['Λεπτά','mpg',0,S],['TS%','ts',1],['eFG%','efgPct',1],['Πόντοι/36','p36',1],['Ασίστ/36','a36',1],['Ριμπ./36','r36',1],['Τρίποντα / σουτ','r3',0,{style:true,pct:true}],['Βολές / σουτ','ftr',0,{style:true,pct:true}],['AST/TO','ato',2],['Usage/36','use36',1,S],['Atlas index','index',1],['Ύψος','h',0,{style:true,fmt:ftin}],['Βάρος','w',0,{style:true,fmt:kg}],['Ηλικία','age',0,{style:true,fmt:v=>v??'—'}]];
  const paint=()=>{
    history.replaceState(null,'',`#/compare?a=${a.id}&b=${b.id}`);
    const d=distance(M,a,b,W0),cell=(p,o,[,k,dp,opt={}])=>{const v=p[k],w=o[k],win=!opt.style&&v!=null&&w!=null&&v>w;const s=opt.fmt?opt.fmt(v):opt.pct?(v==null?'—':Math.round(v*100)+'%'):f(v,dp);return`<span class="${win?'w':''}">${s}</span>`};
    const head=p=>`<div class="cmp-p"><img class="hs" src="${p.headshot||HS(p.id)}" alt="" ${silh}><a href="#/player/${p.id}" style="font-family:var(--display);font-size:26px;line-height:1">${esc(p.name)}</a><small class="muted">${esc(p.team||'')} · ${esc(p.pos||'')} · ${ftin(p.h)}</small><div class="tags" style="justify-content:center;margin:0">${archetypes(M,p).slice(0,2).map(([t])=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div>`;
    body.innerHTML=`<div class="card"><div class="cmp-head"><div style="display:flex;flex-direction:column;gap:10px"><select class="cmp-sel" id="ca">${opts(a)}</select>${head(a)}</div><div style="text-align:center"><div class="vs">VS</div><div style="font-family:var(--display);font-size:30px;color:var(--hot)">${simPct(d)}%</div><small class="muted">ομοιότητα</small></div><div style="display:flex;flex-direction:column;gap:10px"><select class="cmp-sel" id="cb">${opts(b)}</select>${head(b)}</div></div></div>
    <section class="sec grid g2" style="align-items:start"><div class="card">${radarSVG(RAX.map(x=>x[0]),[{name:a.name,color:'#ff5a1f',vals:RAX.map(([,k])=>rv(M,a,k))},{name:b.name,color:'#7cc4ff',vals:RAX.map(([,k])=>rv(M,b,k))}],360)}<div class="diffs">${diffText(M,a,b)}</div></div>
    <div class="card"><table class="ctab">${rows.map(rw=>`<tr><td>${cell(a,b,rw)}</td><td>${rw[0]}</td><td>${cell(b,a,rw)}</td></tr>`).join('')}</table><p class="muted" style="font-size:12px;margin-top:10px">Πράσινο = καλύτερο. Τρίποντα/βολές ανά σουτ και usage δείχνουν στυλ, όχι ποιότητα, οπότε δεν χρωματίζονται.</p></div></section>`;
    document.getElementById('ca').onchange=e=>{a=M.byId[e.target.value];paint()};document.getElementById('cb').onchange=e=>{b=M.byId[e.target.value];paint()};
  };
  document.getElementById('cswap').onclick=()=>{[a,b]=[b,a];paint()};paint();
}

/* ---------- injuries ---------- */
const stCls=s=>/out/i.test(s)?'st-out':/day|quest|doubt|probable/i.test(s)?'st-dtd':'';
const stGr=s=>({'Out':'Εκτός','Day-To-Day':'Day-to-day','Questionable':'Αμφίβολος','Doubtful':'Μάλλον εκτός','Probable':'Πιθανός','Suspension':'Τιμωρία'})[s]||s;
const partGr={Ankle:'Αστράγαλος',Knee:'Γόνατο',Hamstring:'Οπίσθιος μηριαίος',Calf:'Γάμπα',Foot:'Πέλμα',Back:'Πλάτη',Hip:'Ισχίο',Groin:'Βουβωνική',Shoulder:'Ώμος',Wrist:'Καρπός',Hand:'Χέρι',Finger:'Δάχτυλο',Thumb:'Αντίχειρας',Elbow:'Αγκώνας',Achilles:'Αχίλλειος',Illness:'Ασθένεια',Concussion:'Διάσειση',Quadriceps:'Τετρακέφαλος',Toe:'Δάχτυλο ποδιού',Abdomen:'Κοιλιακά',Rest:'Ξεκούραση',Personal:'Προσωπικοί λόγοι',Shin:'Κνήμη',Neck:'Αυχένας',Ribs:'Πλευρά',Oblique:'Πλάγιοι κοιλιακοί',Face:'Πρόσωπο',Eye:'Μάτι',Leg:'Πόδι',Lower:'Κάτω άκρο',Chest:'Θώρακας'};
const sideGr={Left:'αριστ.',Right:'δεξ.'};
Object.assign(partGr,{Heel:'Φτέρνα',Head:'Κεφάλι','Lower Leg':'Κνήμη',Knee:'Γόνατο',Adductor:'Προσαγωγοί',Pelvis:'Λεκάνη',Arm:'Χέρι',Forearm:'Πήχης',Jaw:'Σαγόνι',Nose:'Μύτη',Glute:'Γλουτός',Thigh:'Μηρός','Upper Leg':'Μηρός',Spine:'Σπονδυλική',Heart:'Καρδιά',Undisclosed:'Δεν ανακοινώθηκε','Not Specified':''});
const detGr={Bruise:'μώλωπας',Contusion:'θλάση',Soreness:'ενόχληση',Sprain:'διάστρεμμα',Strain:'θλάση μυός',Inflammation:'φλεγμονή',Fracture:'κάταγμα',Tear:'ρήξη',Surgery:'χειρουργείο',Tendinitis:'τενοντίτιδα',Tendonitis:'τενοντίτιδα',Tightness:'σφίξιμο',Spasms:'σπασμοί',Dislocation:'εξάρθρωση',Discomfort:'δυσφορία',Laceration:'τραύμα',Impingement:'πρόσκρουση',Stress:'καταπόνηση','Stress Reaction':'κάταγμα κόπωσης',Rupture:'ρήξη',Injury:'τραυματισμός',Illness:'ασθένεια',Rest:'ξεκούραση','Not Specified':''};
async function teamsMap(){const t=await api('data?type=teams');const m={};(t?.teams||[]).forEach(x=>{m[x.id]=x});return m}
const injLine=x=>[partGr[x.part]??x.part,sideGr[x.side]||'',detGr[x.detail]??x.detail].filter(Boolean).join(' · ');
const injRow=(x,M)=>{const p=M?.byId[x.id];return`<div class="inj"><img src="${x.headshot||HS(x.id)}" alt="" loading="lazy" ${silh}><div><a href="#/player/${x.id}"><b>${esc(x.name)}</b></a> <small style="display:inline">${esc(x.pos)}${p?` · ${f(p.ppg)} π.`:''}</small><small>${esc(injLine(x))}${x.ret?` · επιστροφή ~${dy(x.ret)}`:''}</small>${x.note?`<small style="color:var(--dim)">${esc(x.note)}</small>`:''}</div><span class="pill ${stCls(x.status)}">${esc(stGr(x.status))}</span></div>`};
async function injuries(){
  document.title='Τραυματίες · NBA ATLAS';
  view.innerHTML=`<div id="hero" hidden></div><div class="sec-h"><div><div class="eyebrow">Injury report</div><h2 class="h2">Τραυματίες</h2><p class="lede" style="margin-top:8px">Ποιος λείπει, από τι και πότε υπολογίζεται να γυρίσει. Η «χαμένη αξία» αθροίζει τον Atlas index των παικτών που είναι εκτός.</p></div></div><div id="ibody"><div class="skel" style="min-height:500px"></div></div>`;
  const [d,M,T]=await Promise.all([api('data?type=injuries'),model(),teamsMap()]);if(route().name!=='injuries')return;
  const body=document.getElementById('ibody');if(!d?.teams){body.innerHTML='<div class="err">Η αναφορά τραυματισμών δεν είναι διαθέσιμη από το ESPN αυτή τη στιγμή.</div>';return}
  const all=d.teams.flatMap(t=>t.players.map(p=>({...p,tid:t.id})));
  const lost=d.teams.map(t=>{const v=t.players.filter(p=>/out/i.test(p.status)).reduce((s,p)=>s+(M.byId[p.id]?.index||0),0);const ab=T[t.id]?.abbr;const tot=ab?(M.P||[]).filter(p=>p.team===ab).reduce((s,p)=>s+(p.index||0),0):0;return{t,v,share:tot>0&&v>0?v/tot:null}}).sort((a,b)=>b.v-a.v);
  let flt='all';
  const paint=()=>{
    const ok=p=>flt==='all'||(flt==='out'?/out/i.test(p.status):!/out/i.test(p.status));
    body.innerHTML=`<div class="inj-k"><div class="card"><div class="lbl">Εκτός</div><b style="font-family:var(--display);font-size:42px">${all.filter(p=>/out/i.test(p.status)).length}</b></div><div class="card"><div class="lbl">Day-to-day / αμφίβολοι</div><b style="font-family:var(--display);font-size:42px">${all.filter(p=>!/out/i.test(p.status)).length}</b></div>${lost.slice(0,2).map((x,i)=>`<div class="card"><div class="lbl">${i?'2η':'Πονάει'} περισσότερο</div><div style="display:flex;align-items:center;gap:10px"><img src="${T[x.t.id]?.logo||''}" width="36" height="36" alt="" ${hide}><b style="font-family:var(--cond);font-size:20px">${esc(T[x.t.id]?.short||x.t.name)}</b></div><small class="muted">χαμένη αξία ${f(x.v,0)}</small></div>`).join('')}</div>
    <div class="chips">${[['all','Όλοι'],['out','Εκτός'],['dtd','Day-to-day']].map(([k,l])=>`<button data-k="${k}" class="${flt===k?'on':''}">${l}</button>`).join('')}</div>
    <div class="injcols">${lost.filter(x=>x.t.players.some(ok)).map(({t,v,share})=>`<div class="card inj-team"><h3><img src="${T[t.id]?.logo||''}" alt="" ${hide}><a href="#/team/${t.id}">${esc(t.name)}</a>${v?`<span class="pill" style="margin-left:auto" title="Χαμένο Atlas index των εκτός παικτών· μερίδιο του συνολικού index της ομάδας">−${f(v,0)}${share!=null?` · ${Math.round(share*100)}%`:''}</span>`:''}</h3>${t.players.filter(ok).map(x=>injRow(x,M)).join('')}</div>`).join('')}</div>
    <p class="muted" style="font-size:12px;margin-top:12px">Πηγή: ESPN injury report (ανεπίσημα). Οι ημερομηνίες επιστροφής είναι εκτιμήσεις της πηγής.</p>`;
    body.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{flt=b.dataset.k;paint()});
  };paint();
}
async function teamInjuries(id){
  if(document.getElementById('tinj'))return;const hero=document.querySelector('.phero');if(!hero)return;
  const ph=document.createElement('div');ph.id='tinj';hero.after(ph);
  const [d,M]=await Promise.all([api('data?type=injuries'),model()]);if(route().id!==id)return;
  const t=(d?.teams||[]).find(x=>x.id===String(id));if(!t||!t.players.length){ph.remove();return}
  ph.className='sec card';ph.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Injury report</div><h2 class="h2">Ποιος λείπει</h2></div><a class="more" href="#/injuries">Όλη η λίγκα →</a></div>${t.players.map(x=>injRow(x,M)).join('')}`;
}
async function homeOut(){
  const g=document.getElementById('hgames');if(!g||document.getElementById('hout'))return;
  const box=document.createElement('section');box.className='sec';box.id='hout';g.closest('section').after(box);
  const [{G:U},d,M,T]=await Promise.all([upcoming(),api('data?type=injuries'),model(),teamsMap()]);if(route().name!=='home'||!document.body.contains(box))return;
  const ids=new Set(U.flatMap(x=>[x.home?.id,x.away?.id]).filter(Boolean));
  const out=(d?.teams||[]).filter(t=>ids.has(t.id)).flatMap(t=>t.players.filter(p=>/out/i.test(p.status)).map(p=>({...p,tid:t.id,v:M.byId[p.id]?.index||0}))).sort((a,b)=>b.v-a.v).slice(0,8);
  if(!out.length){box.remove();return}
  box.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Injury report</div><h2 class="h2">Εκτός για τα επόμενα ματς</h2></div><a class="more" href="#/injuries">Όλοι οι τραυματίες →</a></div><div class="twins">${out.map(x=>`<a class="twin" href="#/player/${x.id}"><img src="${x.headshot||HS(x.id)}" alt="" loading="lazy" ${silh}><span><b>${esc(x.name)}</b><small>${esc(T[x.tid]?.abbr||'')} · ${esc(partGr[x.part]||x.part||'—')}</small></span></a>`).join('')}</div>`;
}

/* ---------- tonight: which games are worth staying up for ---------- */
async function upcoming(){
  const [sb,fc,T]=await Promise.all([api('data?type=scoreboard'),api('intel?type=forecast'),teamsMap()]);
  const byAbbr={};Object.values(T).forEach(t=>{byAbbr[t.abbr]=t});
  const now=Date.now(),seen=new Set(),G=[];
  (sb?.games||[]).filter(x=>x.state==='pre').forEach(x=>{seen.add(x.id);G.push({id:x.id,date:x.date,home:x.home,away:x.away})});
  ((fc?.records)||fc?.data?.records||[]).forEach(r=>{const id=String(r.id).split(':').pop(),t=new Date(r.tip).getTime();if(seen.has(id)||r.actual||!(t>now&&t<now+30*3600e3))return;const h=byAbbr[r.homeCode]||{abbr:r.homeCode},a=byAbbr[r.awayCode]||{abbr:r.awayCode};seen.add(id);G.push({id,date:r.tip,home:h,away:a})});
  const F={};((fc?.records)||fc?.data?.records||[]).forEach(r=>{F[String(r.id).split(':').pop()]=r});
  return{G:G.sort((a,b)=>new Date(a.date)-new Date(b.date)),F};
}
async function tonight(){
  const g=document.getElementById('hgames');if(!g||document.getElementById('tonight'))return;
  const box=document.createElement('section');box.className='sec';box.id='tonight';g.closest('section').before(box);
  const [{G:U,F},pw]=await Promise.all([upcoming(),api('power')]);if(route().name!=='home'||!document.body.contains(box))return;
  const pow=(pw?.teams||[]).map(t=>t.power).filter(Number.isFinite).sort((a,b)=>a-b),P={};(pw?.teams||[]).forEach(t=>{P[t.id]=pctile(pow,t.power)});
  const G=U.map(x=>{const p=F[x.id]?.forecast?.homeWinProb,close=p==null?.5:1-Math.abs(p-.5)*2,q=((P[x.home.id]??.5)+(P[x.away.id]??.5))/2,s=.55*close+.45*q;return{x,p,close,q,s}}).sort((a,b)=>b.s-a.s).slice(0,3);
  if(!G.length){box.remove();return}
  const why=o=>[o.close>.8?'αμφίρροπο':'',o.q>.7?'δύο δυνατές ομάδες':o.q>.55?'καλές ομάδες':'',o.p!=null?`${Math.round(o.p*100)}–${Math.round((1-o.p)*100)} για τον γηπεδούχο`:''].filter(Boolean).join(' · ');
  box.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Επόμενα ματς · ώρα Ελλάδας</div><h2 class="h2">Αξίζει να ξενυχτήσεις;</h2><p class="lede" style="margin-top:8px">Τα ${G.length} πιο ενδιαφέροντα από τους ${U.length} επόμενους αγώνες, με βάση πόσο αμφίρροπα τα βλέπει το μοντέλο και πόσο δυνατές είναι οι ομάδες.</p></div></div><div class="tn-grid">${G.map(o=>{const st=Math.max(1,Math.min(5,Math.round(o.s*5+.4)));return`<a class="tn" href="#/game/${o.x.id}"><div class="tms"><img src="${o.x.away.logo||LOGO(o.x.away.abbr)}" alt="" ${hide}>${esc(o.x.away.abbr)} <span class="muted" style="font-size:14px">@</span> <img src="${o.x.home.logo||LOGO(o.x.home.abbr)}" alt="" ${hide}>${esc(o.x.home.abbr)}<span class="pill hot" style="margin-left:auto">${dy(o.x.date)} ${tm(o.x.date)}</span></div><div class="stars">${'★'.repeat(st)}<span style="color:var(--dim)">${'★'.repeat(5-st)}</span></div><small>${esc(why(o))}</small></a>`}).join('')}</div>`;
}

/* ---------- Greeks of the NBA ---------- */
const HIST=[['Γιάννης Αντετοκούνμπο','Bucks, Heat · δύο φορές MVP, πρωταθλητής και MVP τελικών 2021'],['Θανάσης Αντετοκούνμπο','Knicks, Bucks · πρωταθλητής 2021'],['Κώστας Αντετοκούνμπο','Mavericks, Lakers · πρωταθλητής 2020'],['Κώστας Κουφός','Jazz, Timberwolves, Nuggets, Grizzlies, Kings (2008–2019)'],['Βασίλης Σπανούλης','Houston Rockets (2006–07)'],['Νικ Καλάθης','Memphis Grizzlies (2013–15)'],['Κώστας Παπανικολάου','Rockets, Nuggets (2014–16)'],['Γιώργος Παπαγιάννης','Kings, Trail Blazers (2016–18)'],['Αντώνης Φώτσης','Memphis Grizzlies (2001–02)'],['Ευθύμιος Ρεντζιάς','Philadelphia 76ers (2002–03)'],['Ανδρέας Γλυνιαδάκης','Seattle SuperSonics (2008)']];
async function greece(){
  document.title='Έλληνες στο NBA · NBA ATLAS';
  view.innerHTML=`<div id="hero" hidden></div><section class="card gr-hero" style="margin-bottom:18px"><div class="eyebrow" style="color:var(--ice)">Ελληνικό ενδιαφέρον</div><h1 class="h1" style="font-size:clamp(40px,6vw,76px);margin:6px 0">ΟΙ ΕΛΛΗΝΕΣ ΤΟΥ NBA</h1><p class="lede">Όλοι οι παίκτες των φετινών ρόστερ που γεννήθηκαν στην Ελλάδα, με τα νούμερά τους και τον επόμενο αγώνα σε ώρα Ελλάδας.</p></section><div id="grbody"><div class="skel" style="min-height:300px"></div></div>`;
  const [bio,M,sc,T]=await Promise.all([api('data?type=players'),model(),api('schedule'),teamsMap()]);if(route().name!=='greece')return;
  const body=document.getElementById('grbody');
  const G=(bio?.players||[]).filter(p=>/^(greece|gre|ελλάδα)$/i.test(String(p.country||'').trim()));
  if(!G.length){body.innerHTML=`<div class="empty">${bio?'Δεν βρέθηκαν παίκτες γεννημένοι στην Ελλάδα στα τρέχοντα ρόστερ.':'Τα ρόστερ δεν φόρτωσαν από το ESPN. Δοκίμασε ανανέωση σε λίγο.'}</div>`;return}
  const now=Date.now(),next=tid=>(sc?.games||[]).filter(g=>new Date(g.date)>now&&(g.home===tid||g.away===tid)).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  body.innerHTML=`<div class="gr-grid">${G.sort((a,b)=>(M.byId[b.id]?.ppg||0)-(M.byId[a.id]?.ppg||0)).map(b=>{const p=M.byId[b.id],t=b.team||{},ng=t.id&&next(t.id),opp=ng&&T[ng.home===t.id?ng.away:ng.home];return`<div class="gr-card"><div class="top"><img class="hs" src="${b.headshot||HS(b.id)}" alt="" ${silh}><div><a href="#/player/${b.id}" style="font-family:var(--display);font-size:24px;line-height:1.05;display:block">${esc(b.name)}</a><small class="muted">${esc(t.name||'')} · ${esc(b.position||'')} · ${b.age?b.age+' ετών':''}</small><div class="muted" style="font-size:12px">${esc([b.city,'Ελλάδα'].filter(Boolean).join(', '))} · ${ftin(b.heightIn)} (${cm(b.heightIn)})</div></div></div>
  ${p?`<div class="ln"><span><em>${f(p.ppg)}</em>π.</span><span><em>${f(p.rpg)}</em>ρ.</span><span><em>${f(p.apg)}</em>α.</span><span><em>${f(p.mpg,0)}</em>λεπτά</span><span><em>${f(p.ts)}</em>TS%</span></div><div class="tags" style="margin:0">${M.E.includes(p)?archetypes(M,p).slice(0,2).map(([x])=>`<span class="tag">${esc(x)}</span>`).join(''):''}</div>`:'<div class="muted" style="font-size:13px">Χωρίς αρκετά λεπτά φέτος για στατιστικά.</div>'}
  ${ng?`<div class="nextg">Επόμενος: ${ng.home===t.id?'vs':'@'} <img src="${opp?.logo||''}" alt="" ${hide}>${esc(opp?.short||'')}<span style="margin-left:auto" class="pill hot">${dy(ng.date)} ${tm(ng.date)}</span></div><div class="tvl muted" data-g="${ng.id}" style="font-size:12.5px;font-weight:700"></div>`:''}</div>`}).join('')}</div>
  <section class="sec card"><div class="sec-h"><div><div class="eyebrow">Ιστορικά</div><h2 class="h2">Έλληνες που πέρασαν από το NBA</h2></div></div><div class="hist">${HIST.map(([n,t])=>`<div><b>${esc(n)}</b><small>${esc(t)}</small></div>`).join('')}</div><p class="muted" style="font-size:12px;margin-top:10px">Ενδεικτική επιλογή, όχι πλήρης λίστα.</p></section>
  <p class="muted" style="font-size:12px;margin-top:14px">Τηλεοπτικά: πρόγραμμα MagentaTV για τις επόμενες ~2 μέρες. Κριτήριο: τόπος γέννησης Ελλάδα στα στοιχεία του ESPN. Παίκτες ελληνικής καταγωγής που γεννήθηκαν αλλού δεν εμφανίζονται.</p>`;
  tvMap().then(M=>{if(!M)return;body.querySelectorAll('.tvl[data-g]').forEach(e=>{const l=tvLabel(M[e.dataset.g]);if(l)e.innerHTML=l})});
}

/* ---------- model accuracy over time ---------- */
function modelTrend(){
  const mk=document.getElementById('mk');if(!mk||document.getElementById('mtrend'))return;
  const sec=document.createElement('section');sec.className='sec card';sec.id='mtrend';sec.innerHTML='<div class="skel" style="min-height:300px"></div>';mk.after(sec);
  api('intel?type=forecast').then(fc=>{const recs=(fc?.records||fc?.data?.records||[]).filter(r=>r.actual&&r.forecast&&Number.isFinite(r.forecast.homeWinProb)).sort((a,b)=>new Date(a.tip)-new Date(b.tip));
    if(recs.length<10){sec.remove();return}
    let c=0,hb=0,bs=0;const acc=[],base=[],bri=[],N=20;
    recs.forEach((r,i)=>{const hw=r.actual.home>r.actual.away?1:0,p=r.forecast.homeWinProb;c+=(p>=.5)===!!hw?1:0;hb+=hw;bs+=(p-hw)**2;acc.push([i+1,c/(i+1)]);base.push([i+1,hb/(i+1)]);const w=recs.slice(Math.max(0,i-N+1),i+1);bri.push([i+1,w.reduce((s,x)=>s+(x.forecast.homeWinProb-(x.actual.home>x.actual.away?1:0))**2,0)/w.length])});
    const W=760,H=260,P={l:44,r:14,t:12,b:28},n=recs.length,X=i=>P.l+(i-1)/(n-1||1)*(W-P.l-P.r),Y=v=>H-P.b-(Math.max(.3,Math.min(.9,v))-.3)/.6*(H-P.t-P.b);
    const line=(pts,col,dash)=>`<polyline fill="none" stroke="${col}" stroke-width="2.4" ${dash?'stroke-dasharray="5 5"':''} points="${pts.map(([x,y])=>X(x)+','+Y(y)).join(' ')}"/>`;
    let g='';[.3,.4,.5,.6,.7,.8,.9].forEach(t=>{g+=`<line class="gr" x1="${P.l}" x2="${W-P.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${P.l-8}" y="${Y(t)+3}" text-anchor="end">${Math.round(t*100)}%</text>`});
    g+=`<text x="${W-P.r}" y="${H-8}" text-anchor="end">αγώνες →</text>`;
    const H2=200,Yb=v=>H2-P.b-(Math.min(.35,v)/.35)*(H2-P.t-P.b);let g2='';[0,.1,.2,.3].forEach(t=>{g2+=`<line class="gr" x1="${P.l}" x2="${W-P.r}" y1="${Yb(t)}" y2="${Yb(t)}"/><text x="${P.l-8}" y="${Yb(t)+3}" text-anchor="end">${t.toFixed(2)}</text>`});
    g2+=`<line x1="${P.l}" x2="${W-P.r}" y1="${Yb(.25)}" y2="${Yb(.25)}" stroke="var(--bad)" stroke-dasharray="4 4" opacity=".6"/><polyline fill="none" stroke="#7cc4ff" stroke-width="2.4" points="${bri.map(([x,y])=>X(x)+','+Yb(y)).join(' ')}"/>`;
    sec.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Με τον καιρό</div><h2 class="h2">Η ακρίβεια αγώνα με τον αγώνα</h2><p class="lede" style="margin-top:8px">Αθροιστικό ποσοστό σωστού νικητή σε ${n} κλειδωμένες προβλέψεις, απέναντι στη στρατηγική «πάντα ο γηπεδούχος». Από κάτω, το Brier των τελευταίων ${N} αγώνων (χαμηλότερο = καλύτερο, η κόκκινη γραμμή είναι το κορώνα-γράμματα).</p></div></div>
    <svg class="mchart" viewBox="0 0 ${W} ${H}" style="width:100%">${g}${line(base,'var(--dim)',1)}${line(acc,'#ff5a1f')}</svg>
    <div class="legend-k"><span><i style="background:#ff5a1f"></i>Atlas ${Math.round(c/n*100)}%</span><span><i style="background:var(--dim)"></i>Πάντα ο γηπεδούχος ${Math.round(hb/n*100)}%</span></div>
    <svg class="mchart" viewBox="0 0 ${W} ${H2}" style="width:100%;margin-top:14px">${g2}</svg><div class="legend-k"><span><i style="background:#7cc4ff"></i>Brier (κυλιόμενο ${N})</span><span><i style="background:var(--bad)"></i>0,25 = τυχαίο</span></div>
    ${(function(){const B=[[.5,.6,'50–60%'],[.6,.7,'60–70%'],[.7,.8,'70–80%'],[.8,1.01,'80%+']];const rows=B.map(([lo,hi,lab])=>{const s=recs.filter(r=>{const p=r.forecast.homeWinProb,c=Math.max(p,1-p);return c>=lo&&c<hi});if(!s.length)return null;const pred=s.reduce((a,r)=>a+Math.max(r.forecast.homeWinProb,1-r.forecast.homeWinProb),0)/s.length;const ok=s.filter(r=>(r.forecast.homeWinProb>=.5)===(r.actual.home>r.actual.away)).length/s.length;return `<tr><td>${lab}</td><td>${s.length}</td><td>${Math.round(pred*100)}%</td><td>${Math.round(ok*100)}%</td><td>${Math.round((ok-pred)*100)>=0?'+':''}${Math.round((ok-pred)*100)} μ.</td></tr>`}).filter(Boolean).join('');return rows?`<div class="sec-h" style="margin-top:18px"><div><div class="eyebrow">Βαθμονόμηση</div><h2 class="h2" style="font-size:18px">Πόσο λέει την αλήθεια η πιθανότητα</h2><p class="lede" style="margin-top:6px">Ομαδοποίηση ανά σιγουριά του μοντέλου για τον φαβορί. Αν μια ομάδα είναι «70%», πρέπει να κερδίζει περίπου 70% των φορών.</p></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Σιγουριά</th><th>Αγώνες</th><th>Πρόβλεψη</th><th>Πραγματικά</th><th>Διαφορά</th></tr></thead><tbody>${rows}</tbody></table></div>`:''})()}`;
  });
}

function teaser(){const n=document.getElementById('hnews');if(!n||document.getElementById('hteaser'))return;const s=document.createElement('section');s.className='sec';s.id='hteaser';s.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Εργαλεία</div><h2 class="h2">Βάλε τα νούμερα να δουλέψουν</h2></div><a class="more" href="#/lab">Atlas Lab →</a></div><div class="teaser">${TILES.map(([k,ic,t,p,c])=>`<a class="lab-tile" href="#/${k}" style="--glow:${c};min-height:140px"><span class="ic">${ic}</span><b>${t}</b><p>${p}</p></a>`).join('')}</div>`;n.closest('section').after(s)}
/* ---------- Greek TV: which games MagentaTV (ex COSMOTE TV) shows ---------- */
let TVP=null;
function tvMap(){if(TVP)return TVP;TVP=Promise.all([api('data?type=tvgr'),api('schedule'),teamsMap(),api('data?type=scoreboard')]).then(([tv,sc,T,sb])=>{
  if(!tv?.broadcasts){TVP=null;return null}
  const DIS={};(tv.espn||[]).forEach(e=>{DIS[e.id]=e});
  const B=tv.broadcasts.map(b=>({...b,t:new Date(b.start).getTime()})),from=Math.min(...B.map(b=>b.t),Infinity),M={};
  const games=[...(sc?.games||[]).map(g=>({id:String(g.id),date:g.date,h:T[g.home]?.abbr,a:T[g.away]?.abbr})),...(sb?.games||[]).map(g=>({id:String(g.id),date:g.date,h:g.home?.abbr,a:g.away?.abbr}))];
  const lo=Date.now()-3*3600e3,hi=Date.now()+36*3600e3;
  for(const g of games){if(!g.h||!g.a||M[g.id])continue;const t=new Date(g.date).getTime();const hit=B.filter(b=>((b.home===g.h&&b.away===g.a)||(b.home===g.a&&b.away===g.h))&&Math.abs(b.t-t)<5*3600e3);
    const live=hit.find(b=>b.live),rep=hit.filter(b=>!b.live&&b.t>t).sort((x,y)=>x.t-y.t)[0];
    M[g.id]={live,rep,inWindow:t>lo&&t<hi,disney:!!DIS[g.id]?.disney,us:DIS[g.id]?.national||[]}}
  Object.values(DIS).forEach(e=>{if(!M[e.id]){const t=new Date(e.date).getTime();M[e.id]={inWindow:t>lo&&t<hi,disney:e.disney,us:e.national}}});
  return M}).catch(()=>{TVP=null;return null});return TVP}
const tvBase=(x,short)=>x?.live?`📺 ${esc(x.live.channel)}${short?'':' · ζωντανά'}`:x?.rep?`📺 ${esc(x.rep.channel)} · ${short?'':'μαγνητοσκ. '}${tm(x.rep.start)}`:'';
const tvLabel=(x,short)=>{const b=tvBase(x,short),d=x?.disney?(b?' · ':'📺 ')+'Disney+':'';return b||d?b+d:x?.inWindow?'League Pass':''};
async function tvDecorate(){
  const cards=[...view.querySelectorAll('a.game[href^="#/game/"]')].filter(a=>!a.dataset.tv);if(!cards.length&&!document.getElementById('tonight')&&route().name!=='game')return;
  const M=await tvMap();if(!M)return;
  cards.forEach(a=>{a.dataset.tv='1';const x=M[a.getAttribute('href').split('/').pop()],l=tvLabel(x,true);if(!l)return;const top=a.querySelector('.game-top');if(top&&!top.querySelector('.tvchip'))top.querySelector('.pill')?.insertAdjacentHTML('afterend',`<span class="tvchip ${x.live||x.rep||x.disney?'':'lp'}" title="${[x.live||x.rep?'MagentaTV':'',x.disney?'Disney+ (ESPN, αγγλικός σχολιασμός)':''].filter(Boolean).join(' + ')||'Δεν μεταδίδεται στην ελληνική TV· διαθέσιμο στο NBA League Pass'}">${l}</span>`)});
  document.querySelectorAll('#tonight a.tn').forEach(a=>{if(a.querySelector('.tvl'))return;const x=M[a.getAttribute('href').split('/').pop()],l=tvLabel(x);if(l)a.insertAdjacentHTML('beforeend',`<small class="tvl" style="color:${x.live||x.disney?'var(--text)':'var(--dim)'};font-weight:700">${l}</small>`)});
  const r=route();if(r.name==='game'&&r.id&&!document.getElementById('tvgame')){const h=view.querySelector('section.hero');const x=M[r.id];if(h&&x&&(x.live||x.rep||x.disney||x.inWindow)){const L=[];if(x.live)L.push(`<b style="font-size:15px">📺 Ζωντανά στο ${esc(x.live.channel)}</b><span class="muted" style="font-size:13px">MagentaTV (πρώην COSMOTE TV), ελληνικός σχολιασμός</span>`);else if(x.rep)L.push(`<b style="font-size:15px">📺 Μαγνητοσκοπημένο στο ${esc(x.rep.channel)}, ${dy(x.rep.start)} ${tm(x.rep.start)}</b>`);if(x.disney)L.push(`<b style="font-size:15px">📺 Disney+</b><span class="muted" style="font-size:13px">ESPN hub, αγγλικός σχολιασμός${x.us.length?' · ΗΠΑ: '+esc(x.us.join(', ')):''}</span>`);if(!L.length)L.push('<b style="font-size:15px">Δεν μεταδίδεται στην ελληνική TV</b><span class="muted" style="font-size:13px">Διαθέσιμο στο NBA League Pass</span>');if(x.live&&x.rep)L.push(`<span class="muted" style="font-size:13px">Επανάληψη: ${esc(x.rep.channel)} ${dy(x.rep.start)} ${tm(x.rep.start)}</span>`);h.insertAdjacentHTML('afterend',`<div id="tvgame" class="card" style="margin-top:14px;display:flex;flex-direction:column;gap:6px;padding:14px 18px">${L.map(l=>`<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">${l}</div>`).join('')}</div>`)}}
}

/* ---------- navigation, lab tiles, routing ---------- */
/* ---------- roster what-if: remove players, see the team index change ---------- */
async function whatif(r){
  document.title='Roster what-if · NBA ATLAS';
  view.innerHTML=`<div class="sec-h"><div><div class="eyebrow">Roster what-if</div><h2 class="h2">Αφαίρεσε παίκτες, δες πώς αλλάζει η ομάδα</h2><p class="lede" style="margin-top:8px">Το Atlas index της ομάδας είναι το άθροισμα των παικτών της. Τσέκαρε όσους λείπουν και δες το νέο σύνολο. Τίποτα δεν αποθηκεύεται.</p></div></div><div id="wbody"><div class="skel" style="min-height:400px"></div></div>`;
  const [M,T]=await Promise.all([model(),teamsMap()]);if(route().name!=='whatif')return;
  const teams=Object.values(T).filter(t=>t.abbr).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const body=document.getElementById('wbody');if(!body||!teams.length){if(body)body.innerHTML='<div class="err">Δεν φόρτωσαν οι ομάδες.</div>';return}
  const cur=String(r.id||'')||teams[0].id;
  const team=T[cur]||teams[0];const ab=team.abbr;
  const roster=(M.P||[]).filter(p=>p.team===ab&&p.index!=null).sort((a,b)=>b.index-a.index);
  const total=roster.reduce((s,p)=>s+p.index,0);
  const out=new Set();
  const paint=()=>{
    const left=roster.filter(p=>!out.has(p.id)),nt=left.reduce((s,p)=>s+p.index,0),d=total?((nt-total)/total*100):0;
    body.innerHTML=`<div class="inj-k"><div class="card"><div class="lbl">Αρχικό index</div><b style="font-family:var(--display);font-size:42px">${f(total,1)}</b></div><div class="card"><div class="lbl">Νέο index</div><b style="font-family:var(--display);font-size:42px">${f(nt,1)}</b></div><div class="card"><div class="lbl">Αλλαγή</div><b style="font-family:var(--display);font-size:42px">${d>=0?'+':''}${f(d,1)}%</b></div></div>
    <div class="chips" style="margin:16px 0"><select id="wsel" aria-label="Ομάδα">${teams.map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(team.id)?'selected':''}>${esc(t.name)}</option>`).join('')}</select> <button type="button" id="wreset">Επαναφορά</button></div>
    <div class="card">${roster.map(p=>`<label class="inj" style="cursor:pointer"><input type="checkbox" data-id="${esc(p.id)}" ${out.has(p.id)?'checked':''} style="width:18px;height:18px"><img src="${p.headshot||HS(p.id)}" alt="" loading="lazy" ${silh}><div><b>${esc(p.name)}</b><small>${esc(p.pos||'')} · ${f(p.ppg,1)} π.</small></div><span class="pill">${f(p.index,1)} · ${total?Math.round(p.index/total*100):0}%</span></label>`).join('')||'<p class="muted">Δεν βρέθηκαν παίκτες για αυτή την ομάδα.</p>'}</div>
    <p class="muted" style="font-size:12px;margin-top:12px">Το index είναι άθροισμα του Atlas index των παικτών της ομάδας από τα τρέχοντα δεδομένα. Δεν μοντελοποιεί ούτε συντονισμό ούτε λεπτά, οπότε είναι εξήγηση του μεγέθους και όχι πρόβλεψη νικών.</p>`;
    document.getElementById('wsel').onchange=e=>{location.hash='#/whatif/'+e.target.value};
    document.getElementById('wreset').onclick=()=>{out.clear();paint()};
    body.querySelectorAll('input[type=checkbox]').forEach(c=>c.onchange=()=>{c.checked?out.add(c.dataset.id):out.delete(c.dataset.id);paint()});
  };paint();
}
const MINE={compare,injuries,greece,whatif};
const navAdd=()=>{const after=document.querySelector('#links [data-r="teams"]');if(after&&!document.querySelector('#links [data-r="greece"]'))after.insertAdjacentHTML('afterend','<a href="#/greece" data-r="greece">Ελλάδα</a>')};
const TILES=[['whatif','🧩','Roster what-if','Αφαίρεσε παίκτες από ρόστερ και δες πώς αλλάζει το index της ομάδας.','rgba(70,220,160,.2)'],['compare','🆚','Σύγκριση παικτών','Δύο παίκτες δίπλα-δίπλα: radar, ανά-36, αρχέτυπα και πόσο μοιάζουν.','rgba(255,90,31,.25)'],['injuries','🩹','Τραυματίες','Ποιος λείπει, από τι, πότε γυρίζει και ποια ομάδα πονάει περισσότερο.','rgba(255,77,106,.22)'],['greece','🏛️','Οι Έλληνες του NBA','Οι Έλληνες των ρόστερ, τα νούμερά τους και ο επόμενος αγώνας σε ώρα Ελλάδας.','rgba(70,140,255,.28)']];
function hook(){
  const r=route();navAdd();
  document.querySelectorAll('#links [data-r="greece"]').forEach(a=>a.classList.toggle('on',a.dataset.r===r.name));
  if(MINE[r.name]){document.querySelectorAll('#links [data-r]').forEach(a=>{if(a.dataset.r!==r.name)a.classList.remove('on')});setTimeout(()=>MINE[r.name](r),0);return}
}
let pend=null;
new MutationObserver(()=>{clearTimeout(pend);pend=setTimeout(()=>{const r=route();navAdd();
  if(r.name==='home'){tonight();homeOut();teaser()}
  if(r.name==='lab'){const g=view.querySelector('.lab-grid');if(g&&!g.querySelector('[data-plus]'))g.insertAdjacentHTML('afterbegin',TILES.map(([k,ic,t,p,c])=>`<a class="lab-tile" data-plus href="#/${k}" style="--glow:${c}"><span class="ic">${ic}</span><b>${t}</b><p>${p}</p></a>`).join(''))}
  if(r.name==='player'&&r.id&&document.querySelector('.phero')){twins2(r.id);model().then(M=>{const p=M.byId[r.id],txt=document.querySelector('.phero .txt');if(!p||p.mpg<8||!txt||txt.querySelector('.cmp-btn')||route().id!==r.id)return;const row=txt.querySelector('.dna-btn')?.parentElement;const html=`<a class="dna-btn cmp-btn" href="#/compare?a=${r.id}">🆚 Σύγκρινέ τον</a>`;if(row)row.insertAdjacentHTML('beforeend',html);else txt.insertAdjacentHTML('beforeend',`<div style="display:flex;gap:8px;flex-wrap:wrap">${html}</div>`)})}
  if(r.name==='team'&&r.id&&document.querySelector('.phero'))teamInjuries(r.id);
  if(r.name==='model')modelTrend();
  if(['home','games','game','team'].includes(r.name))setTimeout(tvDecorate,600);
  if(r.name==='menu'&&!document.getElementById('pluscard'))view.insertAdjacentHTML('afterbegin',`<div id="pluscard" class="grid g2" style="margin-bottom:16px">${TILES.map(([k,ic,t])=>`<a class="card" href="#/${k}" style="display:block"><div class="h2" style="font-size:24px">${ic} ${t}</div></a>`).join('')}</div>`);
},150)}).observe(view,{childList:true});
addEventListener('hashchange',hook);hook();
})();
