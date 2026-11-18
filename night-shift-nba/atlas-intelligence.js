/* NBA ATLAS Intelligence Suite v2 — live, evidence-based tools.
   Home "Discover what matters" cards show a real live hook per tool.
   Data: /api/power, /api/lab (season|gamelog), /api/data (scoreboard|game), /api/history, window.ATLAS_DATA. */
(function(){
"use strict";
var root=document.getElementById("view");if(!root)return;

/* ---------- tools ---------- */
var ICON={
 shift:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 legacy:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
 matchup:'<path d="M4 4l7 7M13 13l7 7M20 4l-7 7M4 20l7-7"/><circle cx="12" cy="12" r="1.5"/>',
 rotation:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
 era:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="5"/><path d="M12 9v3l2 1"/>',
 dynasty:'<path d="M5 20h14M7 20v-4h10v4M8 16l-2-9 4 3 2-5 2 5 4-3-2 9"/>',
 faces:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3 3 0 010 6M18 14c2 .7 3 2.8 3 6"/>',
 dna:'<path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12"/><path d="M8.5 7h7M8.5 17h7M10 12h4"/>'
};
var TOOLS=[
 {k:"dna",name:"Player DNA",gr:"Το αποτύπωμα κάθε παίκτη",acc:"#ffd23f",desc:"Οκτώ διαστάσεις του παιχνιδιού σε εκατοστημόρια λίγκας, αρχέτυπο, σύγκριση και οι πιο «συγγενικοί» παίκτες."},
 {k:"faces",name:"Faces of the League",gr:"Ποιους κοιτάει ο κόσμος",acc:"#ff9f43",desc:"Τα πρόσωπα της λίγκας με βάση την προσοχή του κοινού: προβολές Wikipedia ανά ημέρα, σήμερα και όλων των εποχών, και πού η φήμη ξεπερνά την απόδοση."},
 {k:"shift",name:"NBA Shift",gr:"Ποιος ανεβαίνει, ποιος πέφτει",acc:"#ff5a1f",desc:"Φόρμα τελευταίων 5 αγώνων απέναντι στον μέσο όρο της σεζόν, για ομάδες και σταρ."},
 {k:"matchup",name:"Matchup DNA",gr:"Ποιος έχει το πάνω χέρι",acc:"#7cc4ff",desc:"Σύγκριση δύο ομάδων σε επίθεση, άμυνα, ρυθμό και four factors, με κατάταξη στη λίγκα."},
 {k:"legacy",name:"Legacy Clock",gr:"Πόσο απέχει το επόμενο ορόσημο",acc:"#a98bff",desc:"Σύνολα καριέρας, θέση στη λίστα όλων των εποχών και πόσοι αγώνες μένουν για το επόμενο ορόσημο."},
 {k:"rotation",name:"Rotation X-Ray",gr:"Βασικοί απέναντι στον πάγκο",acc:"#22d39a",desc:"Πεντάδα, πάγκος, λεπτά και ποσοστό πόντων από τον πάγκο σε κάθε πρόσφατο αγώνα."},
 {k:"era",name:"Era Machine",gr:"Η ίδια σεζόν σε άλλη εποχή",acc:"#ff6fae",desc:"Μεταφορά στατιστικών στον ρυθμό άλλης εποχής, με πραγματικό league pace ανά σεζόν."},
 {k:"dynasty",name:"Dynasty Tracker",gr:"80 χρόνια τίτλων",acc:"#45d6c4",desc:"Κάθε πρωτάθλημα από το 1947, συνεχόμενες σειρές και MVP τελικών ανά franchise."}
];
var BY={};TOOLS.forEach(function(t){BY[t.k]=t});
var pages={dna:dna,faces:faces,shift:shift,legacy:legacy,matchup:matchup,rotation:rotation,era:era,dynasty:dynasty};

/* ---------- helpers ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(x){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]})}
function num(v){var x=Number(v);return v==null||v===""||!Number.isFinite(x)?null:x}
function val(v,n){var z=num(v);return z==null?"—":z.toLocaleString("el-GR",{minimumFractionDigits:n==null?1:n,maximumFractionDigits:n==null?1:n})}
function sgn(v,n){var z=num(v);return z==null?"—":(z>0?"+":z<0?"−":"")+val(Math.abs(z),n)}
function pct(v,n){return num(v)==null?"—":val(100*v,n==null?1:n)+"%"}
function date(v,withTime){try{var o={timeZone:"Europe/Athens",day:"numeric",month:"short"};if(withTime!==false){o.hour="2-digit";o.minute="2-digit"}return new Date(v).toLocaleString("el-GR",o)}catch(e){return "—"}}
function avg(a){var b=a.filter(function(x){return Number.isFinite(x)});return b.length?b.reduce(function(s,x){return s+x},0)/b.length:null}
function asList(x){return Array.isArray(x)?x:[]}
function icon(k,size){return '<svg class="ix-ic" viewBox="0 0 24 24" width="'+(size||20)+'" height="'+(size||20)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICON[k]+'</svg>'}
var LOGO=function(abbr){return "https://a.espncdn.com/i/teamlogos/nba/500/"+String(abbr||"").toLowerCase()+".png"};
var HS=function(id){return "https://a.espncdn.com/i/headshots/nba/players/full/"+id+".png"};
var hideImg='onerror="this.style.visibility=\'hidden\'"';
var cache=new Map();
function get(p){if(!cache.has(p))cache.set(p,fetch("/api/"+p,{headers:{accept:"application/json"}}).then(function(r){return r.json().then(function(x){if(!r.ok)throw Error(x&&x.error||"HTTP "+r.status);return x&&x.data&&!x.players&&!x.teams&&!x.games?x.data:x})}).catch(function(e){cache.delete(p);throw e}));return cache.get(p)}
function soft(p){return get(p).catch(function(){return null})}
function set(s){var e=document.getElementById("ix-body");if(e)e.innerHTML=s}
function card(title,body,cls){return '<div class="ix-card '+(cls||"")+'">'+(title?'<div class="ix-card-h">'+title+'</div>':"")+body+'</div>'}
function note(t){return '<p class="ix-note">'+t+'</p>'}
function src(t){return '<div class="ix-src">Πηγή: '+esc(t)+'</div>'}
function skel(h){return '<div class="ix-skel" style="height:'+(h||160)+'px"></div>'}
function fail(t){set(card("Τα δεδομένα δεν φόρτωσαν",'<p class="ix-muted">'+esc(t||"Η πηγή δεν απάντησε. Δοκίμασε ξανά σε λίγο.")+'</p>'))}
function teamMeta(pw){var m={};asList(pw&&pw.teams).forEach(function(t){m[String(t.id)]=t});return m}
/* tiny bar chart of signed values */
function spark(vals,w,h,col){w=w||120;h=h||34;if(!vals.length)return"";var mx=Math.max(4,Math.max.apply(null,vals.map(Math.abs))),bw=w/vals.length,mid=h/2;
 return '<svg class="ix-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+'<line x1="0" x2="'+w+'" y1="'+mid+'" y2="'+mid+'" stroke="rgba(255,255,255,.18)"/>'+vals.map(function(v,i){var hh=Math.max(1.5,Math.abs(v)/mx*(mid-1));return '<rect x="'+(i*bw+bw*.18).toFixed(1)+'" y="'+(v>=0?mid-hh:mid).toFixed(1)+'" width="'+(bw*.64).toFixed(1)+'" height="'+hh.toFixed(1)+'" rx="1" fill="'+(v>=0?(col||"#22d39a"):"#ff4d6a")+'"/>'}).join("")+'</svg>'}

/* ---------- page shell ---------- */
function shell(k){var t=BY[k];
 return '<div class="ix-wrap" id="atlas-i-page-'+k+'" style="--acc:'+t.acc+'">'+
 '<nav class="ix-switch" aria-label="Εργαλεία Intelligence">'+TOOLS.map(function(x){return '<a href="#/'+x.k+'" class="'+(x.k===k?"on":"")+'" style="--acc:'+x.acc+'">'+icon(x.k,15)+'<span>'+esc(x.name)+'</span></a>'}).join("")+'</nav>'+
 '<header class="ix-head"><div class="ix-head-ic">'+icon(k,26)+'</div><div><div class="ix-kicker">Atlas Intelligence</div><h1>'+esc(t.name)+'</h1><p>'+esc(t.desc)+'</p></div></header>'+
 '<div id="ix-body" class="ix-body">'+skel(220)+'</div></div>'}

/* ====================================================================
   HOME — "Discover what matters"
   ==================================================================== */
function homeCard(t){return '<a class="ix-tile'+(t.k==="dna"?" ix-feat":"")+'" href="#/'+t.k+'" style="--acc:'+t.acc+'" data-tile="'+t.k+'">'+
 '<div class="ix-tile-top"><span class="ix-tile-ic">'+icon(t.k,18)+'</span><span class="ix-tile-name">'+esc(t.name)+'</span><span class="ix-tile-go">→</span></div>'+
 '<div class="ix-tile-live" id="ixh-'+t.k+'"><div class="ix-skel" style="height:64px"></div></div>'+
 '<div class="ix-tile-foot">'+esc(t.gr)+'</div></a>'}
function fillTile(k,html){var e=document.getElementById("ixh-"+k);if(e)e.innerHTML=html}
function hook(big,label,extra){return '<div class="ix-hook"><b>'+big+'</b><span>'+label+'</span></div>'+(extra||"")}

function renderHome(){
 var h=root.querySelector("#hero");if(!h||document.getElementById("i-home-teaser"))return;
 h.insertAdjacentHTML("afterend",'<section class="sec ix-home" id="i-home-teaser"><div class="ix-home-h"><div><div class="ix-kicker">Atlas Intelligence</div><h2 class="h2">Discover what matters</h2><p class="ix-muted">Έξι εργαλεία ανάλυσης. Κάθε κάρτα δείχνει το πιο ενδιαφέρον εύρημα αυτή τη στιγμή.</p></div></div><div class="ix-tiles">'+TOOLS.map(homeCard).join("")+'</div></section>');
 homeHooks();
}
async function homeHooks(){
 dynastyHook();eraHook();
 var pw=await soft("power"),meta=teamMeta(pw);
 dnaHook(pw);facesHook(pw);shiftHook(meta);matchupHook(pw,meta);legacyHook();rotationHook();
}
async function shiftHook(meta){
 var se=await soft("lab?type=season");var R=teamForm(se);
 if(!R.length){fillTile("shift",hook("—","Η φόρμα θα εμφανιστεί μόλις φορτώσει η σεζόν"));return}
 var top=R[0],m=meta[top.id]||{};
 fillTile("shift",'<div class="ix-hook-row"><img src="'+esc(m.logo||"")+'" alt="" '+hideImg+'><div class="ix-hook"><b class="up">'+sgn(top.delta,1)+'</b><span>'+esc(m.name||top.id)+' · διαφορά πόντων τελ. 5 σε σχέση με τη σεζόν</span></div></div>'+spark(top.last10,240,30));
}
async function upcoming(){var sb=await soft("data?type=scoreboard"),G=asList(sb&&sb.games).filter(function(g){return g.state!=="post"});
 for(var i=0;i<=3&&!G.length;i++){var d=new Date(Date.now()-5*3600000+i*86400000).toISOString().slice(0,10).replace(/-/g,"");var x=await soft("data?type=scoreboard&date="+d);G=asList(x&&x.games).filter(function(g){return g.state!=="post"})}
 return G}
async function matchupHook(pw,meta){
 var G=await upcoming();
 if(!G.length){fillTile("matchup",hook("VS","Διάλεξε δύο ομάδες και σύγκρινέ τες"));return}
 var pow=function(id){return num((meta[String(id)]||{}).power)};
 G.sort(function(a,b){var da=Math.abs((pow(a.home.id)||0)-(pow(a.away.id)||0)),db=Math.abs((pow(b.home.id)||0)-(pow(b.away.id)||0));return da-db});
 var g=G[0];
 fillTile("matchup",'<div class="ix-vs"><span><img src="'+esc(g.away.logo||LOGO(g.away.abbr))+'" alt="" '+hideImg+'><b>'+esc(g.away.abbr)+'</b></span><i>VS</i><span><img src="'+esc(g.home.logo||LOGO(g.home.abbr))+'" alt="" '+hideImg+'><b>'+esc(g.home.abbr)+'</b></span></div><div class="ix-tile-sub">'+(g.state==="in"?"Live τώρα":"Το πιο ισορροπημένο επόμενο ματς · "+esc(date(g.date)))+'</div>');
}
async function legacyHook(){
 var d=await soft("history?type=player&id=1966");var tot=d&&d.regular&&d.regular.careerTotals||{};var pts=num(tot.points);
 if(pts==null){fillTile("legacy",hook("43.000+","Οι πόντοι καριέρας του LeBron James"));return}
 var next=Math.ceil((pts+1)/1000)*1000,prev=next-1000;
 fillTile("legacy",hook(val(next-pts,0),"πόντοι λείπουν από τον LeBron για τους "+val(next,0))+'<div class="ix-prog"><i style="width:'+((pts-prev)/10).toFixed(1)+'%"></i></div>');
}
async function rotationHook(){
 var g=await latestFinals(2);if(!g.length){fillTile("rotation",hook("5 + 5","Βασικοί και πάγκος σε κάθε αγώνα"));return}
 var best=null;
 for(var i=0;i<Math.min(3,g.length);i++){var box=await soft("data?type=game&id="+g[i].id);boxPlayers(box).forEach(function(p){if(!p.starter&&p.pts!=null&&(!best||p.pts>best.pts))best=Object.assign({},p,{game:g[i]})})}
 if(!best){fillTile("rotation",hook("5 + 5","Βασικοί και πάγκος σε κάθε αγώνα"));return}
 fillTile("rotation",hook(val(best.pts,0)+' <small>πόντοι</small>',"από τον πάγκο: "+esc(best.name)+" ("+esc(best.team)+")"));
}
function eraHook(){var mj=28.7,p98=PACE[1998],now=PACE[CUR];fillTile("era",hook(val(mj*now/p98,1)+' <small>PPG</small>',"ο Jordan του 1997–98 (28,7) με τον σημερινό ρυθμό"))}
function dynastyHook(){var L=dynastyList();if(!L.length)return;var t=L[0];
 fillTile("dynasty",hook(t.count+' <small>τίτλοι</small>',esc(t.name)+" · μεγαλύτερο σερί "+t.run.length+" ("+t.run[0]+"–"+t.run[t.run.length-1]+")")+'<div class="ix-dots">'+t.years.map(function(){return "<i></i>"}).join("")+'</div>')}

/* ====================================================================
   1. NBA SHIFT — real form vs season, available on first visit
   ==================================================================== */
function teamForm(se){
 return asList(se&&se.teams).map(function(t){var L=asList(t.log).filter(function(g){return Number.isFinite(g.m)});if(L.length<6)return null;
  var season=avg(L.map(function(g){return g.m})),last5=avg(L.slice(-5).map(function(g){return g.m})),w5=L.slice(-5).filter(function(g){return g.m>0}).length;
  return {id:String(t.id),season:season,last5:last5,delta:last5-season,w5:w5,games:L.length,rec:t.w+"-"+t.l,last10:L.slice(-10).map(function(g){return g.m})}}).filter(Boolean).sort(function(a,b){return b.delta-a.delta});
}
async function shift(){
 var pair=await Promise.all([soft("lab?type=season"),soft("power")]),se=pair[0],pw=pair[1],meta=teamMeta(pw),R=teamForm(se);
 if(!R.length){fail("Δεν φόρτωσαν τα αποτελέσματα της σεζόν.");return}
 var mx=Math.max.apply(null,R.map(function(r){return Math.abs(r.delta)}).concat([3]));
 var row=function(r){var m=meta[r.id]||{};return '<a class="ix-trow" href="#/team/'+r.id+'"><img src="'+esc(m.logo||"")+'" alt="" '+hideImg+'><div class="ix-trow-n"><b>'+esc(m.name||r.id)+'</b><small>'+esc(r.rec)+' · '+r.w5+'-'+(5-r.w5)+' στα τελ. 5 · σεζόν '+sgn(r.season,1)+'</small></div>'+spark(r.last10,90,28)+'<span class="ix-delta '+(r.delta>=0?"up":"down")+'">'+sgn(r.delta,1)+'</span></a>'};
 var up=R.slice(0,5),down=R.slice(-5).reverse();
 var html='<div class="ix-grid2">'+card('<span class="up">▲</span> Ανεβαίνουν',up.map(row).join(""))+card('<span class="down">▼</span> Πέφτουν',down.map(row).join(""))+'</div>';
 html+=card("Όλες οι ομάδες · αλλαγή φόρμας",'<div class="ix-div">'+R.map(function(r){var m=meta[r.id]||{},w=Math.abs(r.delta)/mx*50;return '<a class="ix-div-row" href="#/team/'+r.id+'"><span class="ix-div-l">'+esc(m.abbr||r.id)+'</span><span class="ix-div-bar"><i style="'+(r.delta>=0?"left:50%":"right:50%")+';width:'+w.toFixed(1)+'%" class="'+(r.delta>=0?"up":"down")+'"></i></span><span class="ix-div-v '+(r.delta>=0?"up":"down")+'">'+sgn(r.delta,1)+'</span></a>'}).join("")+'</div>'+note("Αλλαγή = μέση διαφορά πόντων στους τελευταίους 5 αγώνες μείον τη μέση διαφορά όλης της σεζόν. Οι μπάρες στις κάρτες δείχνουν τη διαφορά σκορ των τελευταίων 10 αγώνων (πράσινο νίκη, κόκκινο ήττα)."));
 html+='<div id="ix-shift-pl">'+card("Παίκτες σε φόρμα",skel(180))+'</div>'+src("ESPN box scores σεζόν "+(se&&se.games?"("+se.games+" αγώνες)":"")+" · ενημέρωση "+date(Date.now()));
 set(html);
 /* players: last 5 vs season points, top players by Atlas index */
 var PL=asList(pw&&pw.players).filter(function(p){return p.teamId&&num(p.index)!=null}).sort(function(a,b){return b.index-a.index}).slice(0,18),out=[];
 for(var i=0;i<PL.length;i+=6){var rs=await Promise.all(PL.slice(i,i+6).map(function(p){return soft("lab?type=gamelog&id="+p.id).then(function(g){return {p:p,g:g}})}));
  rs.forEach(function(x){var G=asList(x.g&&x.g.games).filter(function(g){return g.min>0&&Number.isFinite(g.pts)});if(G.length<6)return;var s=avg(G.map(function(g){return g.pts})),l=avg(G.slice(-5).map(function(g){return g.pts}));out.push({p:x.p,season:s,last5:l,delta:l-s,pts:G.slice(-10).map(function(g){return g.pts})})})}
 var host=document.getElementById("ix-shift-pl");if(!host)return;
 if(!out.length){host.innerHTML=card("Παίκτες σε φόρμα",'<p class="ix-muted">Δεν φόρτωσαν τα game logs.</p>');return}
 out.sort(function(a,b){return b.delta-a.delta});
 var prow=function(o){var mxp=Math.max.apply(null,o.pts.concat([10]));return '<a class="ix-prow" href="#/player/'+o.p.id+'"><img src="'+esc(o.p.headshot||HS(o.p.id))+'" alt="" loading="lazy" '+hideImg+'><div class="ix-trow-n"><b>'+esc(o.p.name)+'</b><small>'+esc(o.p.team||"")+' · σεζόν '+val(o.season,1)+' → τελ. 5 '+val(o.last5,1)+'</small></div><span class="ix-minis">'+o.pts.map(function(v){return '<i style="height:'+Math.max(8,v/mxp*100).toFixed(0)+'%"></i>'}).join("")+'</span><span class="ix-delta '+(o.delta>=0?"up":"down")+'">'+sgn(o.delta,1)+'</span></a>'};
 host.innerHTML='<div class="ix-grid2">'+card('<span class="up">🔥</span> Σε φόρμα',out.slice(0,6).map(prow).join(""))+card('<span class="down">❄</span> Σε κοιλιά',out.slice(-6).reverse().map(prow).join(""))+'</div>'+note("Πόντοι ανά αγώνα στα τελευταία 5 παιχνίδια μείον τον μέσο όρο της σεζόν, για τους "+PL.length+" κορυφαίους του Atlas Index. Οι στήλες δείχνουν τους πόντους των τελευταίων 10 αγώνων.");
}

/* ====================================================================
   2. LEGACY CLOCK — totals, milestones, all-time rank
   ==================================================================== */
var FAV=[["1966","LeBron James"],["3202","Kevin Durant"],["3975","Stephen Curry"],["3112335","Nikola Jokić"],["3032977","Giannis Antetokounmpo"],["4278073","Shai Gilgeous-Alexander"],["3945274","Luka Dončić"],["4594268","Anthony Edwards"],["3992","James Harden"],["3468","Russell Westbrook"],["2779","Chris Paul"],["5041939","Cooper Flagg"]];
async function legacy(){
 var opts=FAV.map(function(a){return '<option value="'+a[0]+'">'+esc(a[1])+'</option>'}).join("");
 set('<div class="ix-controls"><label>Παίκτης<select id="ix-pl">'+opts+'</select></label></div><div id="ix-legacy">'+skel(300)+'</div>');
 document.getElementById("ix-pl").onchange=read;read();
 async function read(){var id=document.getElementById("ix-pl").value,host=document.getElementById("ix-legacy");host.innerHTML=skel(300);
  var both=await Promise.all([soft("history?type=player&id="+id),soft("power")]),d=both[0],pw=both[1];if(document.getElementById("ix-pl").value!==id)return;
  var r=d&&d.regular;if(!r){host.innerHTML=card("Δεν υπάρχουν στοιχεία καριέρας",'<p class="ix-muted">Το ESPN δεν επέστρεψε σύνολα για αυτόν τον παίκτη.</p>');return}
  var tot=r.careerTotals||{},av=r.careerAverages||{},who=(FAV.find(function(x){return x[0]===id})||["","Παίκτης"])[1],cur=asList(pw&&pw.players).find(function(x){return String(x.id)===id});
  var pick=function(ks){for(var i=0;i<ks.length;i++)if(num(tot[ks[i]])!=null)return num(tot[ks[i]]);return null};
  var M=[["Πόντοι","pts",pick(["points","totalPoints"]),1000,cur&&cur.ppg],["Ασίστ","ast",pick(["assists","totalAssists"]),500,cur&&cur.apg],["Ριμπάουντ","trb",pick(["rebounds","totalRebounds"]),500,cur&&cur.rpg]];
  var gp=pick(["gamesPlayed","games"]);if(gp==null){var bs={};asList(r.seasonRows).forEach(function(x){var g=num(x.stats&&x.stats.gamesPlayed)||0;if(!bs[x.season]||g>bs[x.season])bs[x.season]=g});var sum=Object.keys(bs).reduce(function(a,k){return a+bs[k]},0);gp=sum||null}
  var L=asList((window.ATLAS_DATA||{}).leaders);
  var html='<div class="ix-legacy-hero"><img src="'+HS(id)+'" alt="" '+hideImg+'><div><div class="ix-kicker">Καριέρα κανονικής περιόδου</div><h2>'+esc(who)+'</h2><div class="ix-stats"><span><b>'+val(r.yearCount,0)+'</b>σεζόν</span><span><b>'+val(gp,0)+'</b>αγώνες</span><span><b>'+val(av.avgPoints,1)+'</b>PPG</span><span><b>'+val(av.avgRebounds,1)+'</b>RPG</span><span><b>'+val(av.avgAssists,1)+'</b>APG</span></div></div></div>';
  html+='<div class="ix-grid3">'+M.map(function(m){var n=m[2];if(n==null)return card(m[0],'<p class="ix-muted">Δεν υπάρχει σύνολο στο feed.</p>');
   var next=Math.ceil((n+1)/m[3])*m[3],prev=next-m[3],left=next-n,rate=num(m[4]),games=rate>0?Math.ceil(left/rate):null;
   var list=(L.find(function(x){return x.id===m[1]})||{}).rows||[],others=list.filter(function(x){return x[0]!==who}),rank=others.filter(function(x){return x[1]>n}).length+1,above=others.filter(function(x){return x[1]>n}).slice(-1)[0];
   var rankTxt=rank<=10?'<div class="ix-rank"><b>#'+rank+'</b> όλων των εποχών'+(above?' · '+val(above[1]-n,0)+' πίσω από '+esc(above[0]):' · πρώτος')+'</div>':(others.length?'<div class="ix-rank">'+val(others[others.length-1][1]-n,0)+' για το all-time top 10</div>':"");
   return card(m[0],'<div class="ix-big">'+val(n,0)+'</div><div class="ix-prog"><i style="width:'+((n-prev)/m[3]*100).toFixed(1)+'%"></i></div><div class="ix-prog-l"><span>'+val(prev,0)+'</span><span>'+val(next,0)+'</span></div><p>Λείπουν <b>'+val(left,0)+'</b>'+(games?' · περίπου <b>'+games+'</b> αγώνες με τον φετινό ρυθμό ('+val(rate,1)+'/αγ.)':' · δεν αγωνίζεται φέτος')+'</p>'+rankTxt)}).join("")+'</div>';
  host.innerHTML=html+note("Τα ορόσημα είναι στρογγυλά επίπεδα (1.000 πόντοι, 500 ασίστ/ριμπάουντ). Η εκτίμηση αγώνων χρησιμοποιεί τον φετινό μέσο όρο και δεν προβλέπει απουσίες. Κατάταξη απέναντι στη λίστα κορυφαίων όλων των εποχών του Atlas (έως 2025–26).")+'<a class="ix-link" href="#/player/'+id+'">Πλήρης καρτέλα παίκτη →</a>'+src("ESPN career stats · "+date(Date.now()));
 }
}

/* ====================================================================
   3. MATCHUP DNA — mirrored bars with league rank
   ==================================================================== */
async function matchup(){
 var all=await Promise.all([soft("power"),soft("lab?type=season"),upcoming()]),pw=all[0],se=all[1];
 if(!pw||!asList(pw.teams).length){fail("Δεν φόρτωσαν οι ομάδες.");return}
 var T=pw.teams.slice().sort(function(a,b){return a.name.localeCompare(b.name)}),meta=teamMeta(pw),LS={};asList(se&&se.teams).forEach(function(x){LS[String(x.id)]=x});
 var games=all[2],first=games[0],qa=new URLSearchParams((location.hash.split("?")[1]||"")),A=qa.get("a")||(first?String(first.away.id):String(T[0].id)),H=qa.get("h")||(first?String(first.home.id):String(T[1].id));
 var sel=function(id,v){return '<select id="'+id+'">'+T.map(function(t){return '<option value="'+esc(t.id)+'" '+(String(t.id)===v?"selected":"")+'>'+esc(t.name)+'</option>'}).join("")+'</select>'};
 var chips=games.length?'<div class="ix-chips"><span>Επόμενοι αγώνες:</span>'+games.map(function(g){return '<button data-a="'+esc(g.away.id)+'" data-h="'+esc(g.home.id)+'">'+esc(g.away.abbr)+' @ '+esc(g.home.abbr)+'</button>'}).join("")+'</div>':"";
 set(chips+'<div class="ix-controls"><label>Ομάδα Α'+sel("ix-a",A)+'</label><span class="ix-vs-sep">VS</span><label>Ομάδα Β'+sel("ix-h",H)+'</label></div><div id="ix-mu"></div>');
 document.querySelectorAll(".ix-chips button").forEach(function(b){b.onclick=function(){document.getElementById("ix-a").value=b.dataset.a;document.getElementById("ix-h").value=b.dataset.h;paint()}});
 document.getElementById("ix-a").onchange=paint;document.getElementById("ix-h").onchange=paint;paint();
 function paint(){
  var a=meta[document.getElementById("ix-a").value],h=meta[document.getElementById("ix-h").value];if(!a||!h)return;
  var la=LS[String(a.id)]||{},lh=LS[String(h.id)]||{},pool=Object.values(LS);
  var M=[["Power Index","power",function(t,l){return num(t.power)},1,false,1],["Διαφορά πόντων","margin",function(t,l){return num(t.margin)},1,false,1],["Offensive Rating","ortg",function(t,l){return num(l.ortg)},1,false,1],["Defensive Rating","drtg",function(t,l){return num(l.drtg)},1,true,1],["Net Rating","net",function(t,l){return l.ortg!=null&&l.drtg!=null?l.ortg-l.drtg:null},1,false,1],["Pace","pace",function(t,l){return num(l.pace)},1,null,1],["eFG%","efg",function(t,l){return num(l.efg)},100,false,1],["Turnover %","tov",function(t,l){return num(l.tovPct)},100,true,1],["Off. rebound %","orb",function(t,l){return num(l.orbPct)},100,false,1],["Free throw rate","ftr",function(t,l){return num(l.ftr)},100,false,1],["eFG% αντιπάλων","oefg",function(t,l){return num(l.oefg)},100,true,1],["3P%","tp",function(t,l){return num(l.tpPct)},100,false,1]];
  var winsA=0,winsH=0,lines=[];
  var rows=M.map(function(m){var va=m[2](a,la),vh=m[2](h,lh);if(va==null&&vh==null)return"";
   var leag=(m[1]==="power"||m[1]==="margin")?pw.teams.map(function(t){return m[2](t,{})}):pool.map(function(l){return m[2]({},l)});leag=leag.filter(function(x){return x!=null});
   var lo=Math.min.apply(null,leag),hi=Math.max.apply(null,leag),sc=function(v){if(v==null||hi===lo)return 0;var z=(v-lo)/(hi-lo);return 12+(m[4]?1-z:z)*88};
   var rk=function(v){if(v==null||m[4]===null)return"";return "#"+(1+leag.filter(function(x){return m[4]?x<v:x>v}).length)};
   var better=va!=null&&vh!=null&&m[4]!==null&&va!==vh?((m[4]?va<vh:va>vh)?"a":"h"):"";if(better==="a")winsA++;if(better==="h")winsH++;
   if(better&&["net","ortg","drtg","efg","tov","orb"].indexOf(m[1])>=0)lines.push({m:m[0],w:better==="a"?a:h,ra:rk(better==="a"?va:vh),rl:rk(better==="a"?vh:va)});
   var fmt=function(v){return v==null?"—":(m[1]==="margin"||m[1]==="net"?sgn(v*m[3],1):val(v*m[3],1)+(m[3]===100?"%":""))};
   return '<div class="ix-mrow"><div class="ix-mside l'+(better==="a"?" w":"")+'"><span class="ix-mv '+(better==="a"?"win":"")+'">'+fmt(va)+'<small>'+rk(va)+'</small></span><span class="ix-mbar"><i style="width:'+sc(va).toFixed(0)+'%"></i></span></div><div class="ix-mlabel">'+m[0]+'</div><div class="ix-mside r'+(better==="h"?" w":"")+'"><span class="ix-mbar"><i style="width:'+sc(vh).toFixed(0)+'%"></i></span><span class="ix-mv '+(better==="h"?"win":"")+'">'+fmt(vh)+'<small>'+rk(vh)+'</small></span></div></div>'}).join("");
  var head='<div class="ix-mhead"><a href="#/team/'+a.id+'"><img src="'+esc(a.logo||LOGO(a.abbr))+'" alt="" '+hideImg+'><b>'+esc(a.name)+'</b><small>'+esc((a.wins??"")+"-"+(a.losses??""))+'</small></a><div class="ix-score"><b>'+winsA+'</b><span>πλεονεκτήματα</span><b>'+winsH+'</b></div><a href="#/team/'+h.id+'"><img src="'+esc(h.logo||LOGO(h.abbr))+'" alt="" '+hideImg+'><b>'+esc(h.name)+'</b><small>'+esc((h.wins??"")+"-"+(h.losses??""))+'</small></a></div>';
  var story=lines.length?'<ul class="ix-story">'+lines.slice(0,4).map(function(x){return '<li><b>'+esc(x.w.abbr)+'</b> καλύτερη σε '+esc(x.m)+' ('+x.ra+' στη λίγκα έναντι '+x.rl+')</li>'}).join("")+'</ul>':"";
  document.getElementById("ix-mu").innerHTML=card("",head+'<div class="ix-mtable">'+rows+'</div>',"ix-mcard")+(story?card("Τι ξεχωρίζει",story):"")+(se?"":note("Δεν φόρτωσαν τα advanced stats: εμφανίζονται μόνο power και διαφορά πόντων."))+note("Το μήκος της μπάρας δείχνει πού βρίσκεται η ομάδα σε σχέση με όλη τη λίγκα (πάντα «προς τα δεξιά = καλύτερα»). #N = κατάταξη στη λίγκα. Πρόκειται για σύγκριση προφίλ, όχι για πρόβλεψη αποτελέσματος.")+src("ESPN box scores · Atlas power · "+date(Date.now()));
 }
}

/* ====================================================================
   4. ROTATION X-RAY
   ==================================================================== */
async function latestFinals(days){var dates=[];for(var i=0;i<(days||5);i++){var d=new Date(Date.now()-i*86400000);dates.push(d.toISOString().slice(0,10).replace(/-/g,""))}
 var S=await Promise.all(dates.map(function(x){return soft("data?type=scoreboard&date="+x)})),seen=new Set(),out=[];
 S.forEach(function(s){asList(s&&s.games).forEach(function(g){if(g.state==="post"&&!seen.has(g.id)){seen.add(g.id);out.push(g)}})});
 return out.sort(function(a,b){return String(b.date).localeCompare(String(a.date))})}
function boxPlayers(box){var out=[];asList(box&&box.players).forEach(function(team){var ab=team.team&&team.team.abbr||"";asList(team.groups).forEach(function(z){var lab=asList(z.labels).map(function(k){return String(k).toUpperCase()});asList(z.athletes).forEach(function(a){if(!a.athlete||!a.athlete.name)return;var st={};lab.forEach(function(k,i){st[k]=a.stats&&a.stats[i]});var mn=parseFloat(String(st.MIN||"0").split(":")[0]);out.push({team:ab,teamObj:team.team||{},name:a.athlete.name,id:a.athlete.id,starter:!!a.starter,min:Number.isFinite(mn)?mn:0,pts:num(st.PTS),reb:num(st.REB),ast:num(st.AST),pm:st["+/-"]})})})});return out}
async function rotation(){
 var games=await latestFinals(5);if(!games.length){fail("Δεν βρέθηκαν ολοκληρωμένοι αγώνες τις τελευταίες πέντε ημέρες.");return}
 set('<div class="ix-controls"><label>Αγώνας<select id="ix-rg">'+games.slice(0,30).map(function(g){return '<option value="'+esc(g.id)+'">'+esc(g.away.abbr)+' '+esc(g.away.score)+' – '+esc(g.home.score)+' '+esc(g.home.abbr)+' · '+date(g.date,false)+'</option>'}).join("")+'</select></label></div><div id="ix-rot">'+skel(300)+'</div>');
 document.getElementById("ix-rg").onchange=paint;paint();
 async function paint(){var id=document.getElementById("ix-rg").value,host=document.getElementById("ix-rot");host.innerHTML=skel(300);
  var box=await soft("data?type=game&id="+encodeURIComponent(id));if(document.getElementById("ix-rg").value!==id)return;
  var P=boxPlayers(box).filter(function(p){return p.min>0});if(!P.length){host.innerHTML=card("Δεν υπάρχει box score",'<p class="ix-muted">Το ESPN δεν επέστρεψε στατιστικά παικτών για αυτόν τον αγώνα.</p>');return}
  var teams=[];P.forEach(function(p){if(teams.indexOf(p.team)<0)teams.push(p.team)});
  var mxMin=Math.max.apply(null,P.map(function(p){return p.min}).concat([36]));
  host.innerHTML='<div class="ix-grid2">'+teams.map(function(ab){var X=P.filter(function(p){return p.team===ab}).sort(function(a,b){return (b.starter-a.starter)||(b.min-a.min)}),S=X.filter(function(p){return p.starter}),B=X.filter(function(p){return !p.starter});
   var sp=S.reduce(function(s,p){return s+(p.pts||0)},0),bp=B.reduce(function(s,p){return s+(p.pts||0)},0),share=sp+bp?bp/(sp+bp):0,top=B.slice().sort(function(a,b){return (b.pts||0)-(a.pts||0)})[0];
   var row=function(p){return '<div class="ix-rrow"><span class="ix-rname">'+esc(p.name)+'</span><span class="ix-rmin"><i style="width:'+(p.min/mxMin*100).toFixed(0)+'%"></i><em>'+p.min+"′</em></span><span class=\"ix-rpts\">"+val(p.pts,0)+'</span><span class="ix-rsub">'+val(p.reb,0)+'/'+val(p.ast,0)+(p.pm!=null&&p.pm!==""?' · '+esc(p.pm):"")+'</span></div>'};
   var logo=(X[0].teamObj.logo)||LOGO(ab);
   return card('<img class="ix-ch-logo" src="'+esc(logo)+'" alt="" '+hideImg+'>'+esc(ab),'<div class="ix-share"><div class="ix-share-bar"><i style="width:'+((1-share)*100).toFixed(1)+'%"></i><b style="width:'+(share*100).toFixed(1)+'%"></b></div><div class="ix-share-l"><span>Πεντάδα <b>'+sp+'</b> πόντοι</span><span>Πάγκος <b>'+bp+'</b> ('+pct(share,0)+')</span></div>'+(top&&top.pts?'<div class="ix-tile-sub">Κορυφαίος από τον πάγκο: <b>'+esc(top.name)+'</b> με '+top.pts+' πόντους</div>':"")+'</div><div class="ix-rhead"><span>Παίκτης</span><span>Λεπτά</span><span>PTS</span><span>REB/AST · +/−</span></div><div class="ix-rgroup">Βασική πεντάδα</div>'+S.map(row).join("")+'<div class="ix-rgroup">Πάγκος</div>'+B.map(row).join(""))}).join("")+'</div>'+note("Πραγματική αρχική πεντάδα και λεπτά από το box score. Δεν εμφανίζονται on/off ή net rating πεντάδων, γιατί απαιτούν δεδομένα αλλαγών ανά κατοχή που δεν δίνει αυτή η πηγή.")+src("ESPN box score");
 }
}

/* ====================================================================
   5. ERA MACHINE — real league pace per season (Basketball-Reference, ≈)
   ==================================================================== */
var PACE={1974:107.8,1975:104.5,1976:105.5,1977:106.5,1978:106.7,1979:105.8,1980:103.1,1981:101.8,1982:100.9,1983:103.1,1984:101.4,1985:102.1,1986:100.8,1987:100.6,1988:99.6,1989:100.6,1990:98.3,1991:97.8,1992:96.6,1993:96.8,1994:95.1,1995:92.9,1996:91.8,1997:90.1,1998:90.3,1999:88.9,2000:93.1,2001:91.3,2002:90.7,2003:91.0,2004:90.1,2005:90.9,2006:90.5,2007:91.9,2008:92.4,2009:91.7,2010:92.7,2011:92.1,2012:91.3,2013:92.0,2014:93.9,2015:93.9,2016:95.8,2017:96.4,2018:97.3,2019:100.0,2020:100.3,2021:99.2,2022:98.2,2023:99.2,2024:98.5,2025:98.6,2026:99.0,2027:99.0};
var CUR=2027;
var ERAS=[[2027,"Σήμερα (2026–27)"],[2019,"Pace & space (2018–19)"],[2014,"Spurs ball (2013–14)"],[2004,"Η πιο αργή NBA (2003–04)"],[1998,"Jordan, 2ο three-peat (1997–98)"],[1991,"Bad Boys / Bulls (1990–91)"],[1986,"Showtime (1985–86)"],[1977,"Μετά τη συγχώνευση ABA (1976–77)"]];
var ERA_FAV=FAV.concat([["1035","Michael Jordan"],["110","Kobe Bryant"],["215","Tim Duncan"],["609","Dirk Nowitzki"]]).filter(function(x,i,a){return a.findIndex(function(y){return y[0]===x[0]})===i});
async function era(){
 set('<div class="ix-controls"><label>Παίκτης<select id="ix-ep">'+ERA_FAV.map(function(x){return '<option value="'+x[0]+'" '+(x[0]==="1035"?"selected":"")+'>'+esc(x[1])+'</option>'}).join("")+'</select></label><label>Μεταφορά στην εποχή<select id="ix-ee">'+ERAS.map(function(e){return '<option value="'+e[0]+'">'+esc(e[1])+' · pace '+val(PACE[e[0]],1)+'</option>'}).join("")+'</select></label></div><div id="ix-era">'+skel(320)+'</div>');
 var data=null,loaded="";
 document.getElementById("ix-ep").onchange=paint;document.getElementById("ix-ee").onchange=paint;paint();
 async function paint(){var id=document.getElementById("ix-ep").value,tgt=+document.getElementById("ix-ee").value,host=document.getElementById("ix-era");
  if(loaded!==id){host.innerHTML=skel(320);data=await soft("history?type=player&id="+id);loaded=id;if(document.getElementById("ix-ep").value!==id)return}
  var rows=asList(data&&data.regular&&data.regular.seasonRows),best=new Map();
  rows.forEach(function(r){var g=num(r.stats&&r.stats.gamesPlayed)||0;if(!best.has(r.season)||(num(best.get(r.season).stats.gamesPlayed)||0)<g)best.set(r.season,r)});
  var S=Array.from(best.values()).filter(function(r){return num(r.stats.avgPoints)!=null&&(num(r.stats.gamesPlayed)||0)>=10}).sort(function(a,b){return a.season-b.season});
  if(!S.length){host.innerHTML=card("Δεν υπάρχουν σεζόν",'<p class="ix-muted">Το ESPN δεν επέστρεψε μέσους όρους ανά σεζόν.</p>');return}
  var tp=PACE[tgt],X=S.map(function(r){var p=PACE[r.season]||PACE[Math.min(CUR,Math.max(1974,r.season))]||null,f=p&&r.season>=1974?tp/p:null,st=r.stats;return {season:r.season,pace:p,f:f,pts:num(st.avgPoints),reb:num(st.avgRebounds),ast:num(st.avgAssists),gp:num(st.gamesPlayed)}});
  var peak=X.slice().sort(function(a,b){return b.pts-a.pts})[0];
  /* chart */
  var W=640,H=200,pad=28,mx=Math.max.apply(null,X.map(function(x){return Math.max(x.pts,x.f?x.pts*x.f:0)}))*1.08,xs=function(i){return pad+(X.length<2?0.5:i/(X.length-1))*(W-pad*2)},ys=function(v){return H-pad-(v/mx)*(H-pad*2)};
  var path=function(fn){var d="",started=false;X.forEach(function(x,i){var v=fn(x);if(v==null){started=false;return}d+=(started?"L":"M")+xs(i).toFixed(1)+","+ys(v).toFixed(1);started=true});return d};
  var chart='<svg class="ix-chart" viewBox="0 0 '+W+' '+H+'"><g stroke="rgba(255,255,255,.07)">'+[0.25,.5,.75,1].map(function(q){return '<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+ys(mx*q/1.08)+'" y2="'+ys(mx*q/1.08)+'"/>'}).join("")+'</g>'+[0.5,1].map(function(q){return '<text x="4" y="'+(ys(mx*q/1.08)+4)+'" fill="#626a7a" font-size="10">'+val(mx*q/1.08,0)+'</text>'}).join("")+
   '<path d="'+path(function(x){return x.pts})+'" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-dasharray="4 4"/><path d="'+path(function(x){return x.f?x.pts*x.f:null})+'" fill="none" stroke="var(--acc)" stroke-width="2.6"/>'+X.map(function(x,i){var top=X.slice().sort(function(a,b){return (b.pts+.7*(b.reb||0)+(b.ast||0))-(a.pts+.7*(a.reb||0)+(a.ast||0))}).slice(0,3).indexOf(x)>=0;var y=x.f?x.pts*x.f:x.pts;return (x.f?'<circle cx="'+xs(i).toFixed(1)+'" cy="'+ys(x.pts*x.f).toFixed(1)+'" r="3" fill="var(--acc)"/>':"")+(top?'<circle cx="'+xs(i).toFixed(1)+'" cy="'+ys(y).toFixed(1)+'" r="8" fill="none" stroke="#ffd23f" stroke-width="2"/>':"")}).join("")+
   X.map(function(x,i){return (i===0||i===X.length-1||i%Math.ceil(X.length/6)===0)?'<text x="'+xs(i).toFixed(1)+'" y="'+(H-8)+'" fill="#626a7a" font-size="10" text-anchor="middle">'+(x.season-1)+'–'+String(x.season).slice(-2)+'</text>':""}).join("")+'</svg><div class="ix-legend"><span><i style="background:rgba(255,255,255,.45)"></i>Πραγματικοί πόντοι/αγώνα</span><span><i style="background:var(--acc)"></i>Στον ρυθμό του '+(tgt-1)+'–'+String(tgt).slice(-2)+'</span></div>';
  var head=peak?'<div class="ix-era-peak"><div><div class="ix-kicker">Κορυφαία σεζόν</div><b>'+(peak.season-1)+'–'+String(peak.season).slice(-2)+'</b></div><div><span>Πραγματικά</span><b>'+val(peak.pts,1)+'</b></div><div class="ix-arrow">→</div><div><span>'+esc((ERAS.find(function(e){return e[0]===tgt})||[0,""])[1])+'</span><b class="acc">'+(peak.f?val(peak.pts*peak.f,1):"—")+'</b></div><div><span>Συντελεστής</span><b>'+(peak.f?"×"+val(peak.f,2):"—")+'</b></div></div>':"";
  var heatC=function(arr,v){var a=arr.filter(function(z){return z!=null}),lo=Math.min.apply(null,a),hi=Math.max.apply(null,a);if(v==null||hi===lo)return"";var z=(v-lo)/(hi-lo);return 'style="background:rgba(255,111,174,'+(z*z*.42).toFixed(3)+')"'};
  var score=function(x){return (x.pts||0)+.7*(x.reb||0)+(x.ast||0)},ranked=X.slice().sort(function(a,b){return score(b)-score(a)}),medal={};ranked.slice(0,3).forEach(function(x,i){medal[x.season]=i});
  var colP=X.map(function(x){return x.pts}),colR=X.map(function(x){return x.reb}),colA=X.map(function(x){return x.ast});
  var table='<div class="ix-tbl"><table><thead><tr><th>Σεζόν</th><th>GP</th><th>Pace εποχής</th><th>PTS</th><th>REB</th><th>AST</th><th>→ PTS</th><th>→ REB</th><th>→ AST</th></tr></thead><tbody>'+X.slice().reverse().map(function(x){var m=medal[x.season];return '<tr class="'+(m!=null?"best b"+m:"")+'"><td>'+(m!=null?'<span class="ix-medal m'+m+'">'+(m+1)+'</span>':'')+(x.season-1)+'–'+String(x.season).slice(-2)+'</td><td>'+val(x.gp,0)+'</td><td>'+(x.pace&&x.season>=1974?val(x.pace,1):"—")+'</td><td '+heatC(colP,x.pts)+'>'+val(x.pts,1)+'</td><td '+heatC(colR,x.reb)+'>'+val(x.reb,1)+'</td><td '+heatC(colA,x.ast)+'>'+val(x.ast,1)+'</td><td class="acc">'+(x.f?val(x.pts*x.f,1):"—")+'</td><td>'+(x.f&&x.reb!=null?val(x.reb*x.f,1):"—")+'</td><td>'+(x.f&&x.ast!=null?val(x.ast*x.f,1):"—")+'</td></tr>'}).join("")+'</tbody></table></div><div class="ix-legend"><span><span class="ix-medal m0">1</span><span class="ix-medal m1">2</span><span class="ix-medal m2">3</span> Οι 3 καλύτερες σεζόν (PTS + AST + 0,7·REB)</span><span><i style="background:rgba(255,111,174,.42)"></i>Πιο έντονο = υψηλότερο στην καριέρα του</span></div>';
  host.innerHTML=card("",head+chart,"ix-era-card")+card("Ανά σεζόν",table)+note("Συντελεστής = ρυθμός (κατοχές ανά 48′) της εποχής-στόχου ÷ ρυθμός της λίγκας τη σεζόν που αγωνίστηκε ο παίκτης. Μετατρέπει μόνο τον όγκο κατοχών: δεν λαμβάνει υπόψη κανονισμούς, τρίποντο, άμυνες ή ρόλο. Pace ανά σεζόν κατά προσέγγιση από Basketball-Reference· πριν το 1973–74 δεν καταγραφόταν, οπότε δεν γίνεται μεταφορά.")+src("ESPN μέσοι όροι σεζόν · Basketball-Reference league pace");
 }
}

/* ====================================================================
   6. DYNASTY TRACKER
   ==================================================================== */
var FR_NAME={ATL:"Atlanta Hawks",WAS:"Washington Wizards",SAC:"Sacramento Kings",BKN:"Brooklyn Nets",GSW:"Golden State Warriors",LAL:"Los Angeles Lakers",PHI:"Philadelphia 76ers",DET:"Detroit Pistons",OKC:"Oklahoma City Thunder",SAS:"San Antonio Spurs"};
function dynastyList(){var A=window.ATLAS_DATA||{},F=asList(A.finals),T=A.teams||{},g=new Map();
 F.forEach(function(r){var y=+r[0];if(!Number.isFinite(y))return;var code=r[1],fr=(T[code]&&T[code][1])||code;if(fr==="DEF")fr=code;if(!g.has(fr))g.set(fr,{years:[],mvps:[],aka:new Set()});var e=g.get(fr);e.years.push(y);if(r[4])e.mvps.push([y,r[4]]);if(T[code]&&code!==fr)e.aka.add(T[code][0])});
 return Array.from(g).map(function(kv){var id=kv[0],e=kv[1],ys=e.years.sort(function(a,b){return a-b}),runs=[],cur=[];ys.forEach(function(y){if(!cur.length||y-cur[cur.length-1]===1)cur.push(y);else{runs.push(cur);cur=[y]}});if(cur.length)runs.push(cur);
  var name=FR_NAME[id]||(T[id]&&T[id][1]===id?T[id][0]:(T[id]&&T[id][0])||id);
  return {id:id,name:name,years:ys,count:ys.length,run:runs.sort(function(a,b){return b.length-a.length||b[0]-a[0]})[0]||[],runs:runs,mvps:e.mvps,aka:Array.from(e.aka),last:ys[ys.length-1]}}).sort(function(a,b){return b.count-a.count||b.last-a.last});
}
function dynasty(){
 var L=dynastyList();if(!L.length){fail("Δεν υπάρχει ιστορικό τελικών.");return}
 var PAL=["#45d6c4","#ff5a1f","#7cc4ff","#a98bff","#ff6fae","#ffd166","#22d39a","#ff8a3d"],col={};L.slice(0,8).forEach(function(t,i){col[t.id]=PAL[i]});
 var F=asList((window.ATLAS_DATA||{}).finals).slice().sort(function(a,b){return a[0]-b[0]}),T=(window.ATLAS_DATA||{}).teams||{};
 var strip='<div class="ix-strip">'+F.map(function(r){var fr=(T[r[1]]&&T[r[1]][1])||r[1];if(fr==="DEF")fr=r[1];return '<i title="'+esc(r[0]+" · "+((T[r[1]]||[])[0]||r[1])+" · MVP "+(r[4]||"—"))+'" style="background:'+(col[fr]||"rgba(255,255,255,.12)")+'"></i>'}).join("")+'</div><div class="ix-strip-ax"><span>1947</span><span>1970</span><span>1990</span><span>2010</span><span>2026</span></div><div class="ix-legend">'+L.slice(0,8).map(function(t){return '<span><i style="background:'+col[t.id]+'"></i>'+esc(t.name)+' '+t.count+'</span>'}).join("")+'</div>';
 var dyn=[];L.forEach(function(t){t.runs.filter(function(r){return r.length>=2}).forEach(function(r){dyn.push({t:t,r:r})})});dyn.sort(function(a,b){return b.r.length-a.r.length||a.r[0]-b.r[0]});
 set(card("Κάθε πρωτάθλημα, 1947–2026",strip)+card("Οι μεγαλύτερες δυναστείες",'<div class="ix-dyn">'+dyn.slice(0,8).map(function(d){var mv={};d.t.mvps.forEach(function(x){if(d.r.indexOf(x[0])>=0)mv[x[1]]=(mv[x[1]]||0)+1});var star=Object.keys(mv).sort(function(a,b){return mv[b]-mv[a]})[0];return '<div class="ix-dyn-row" style="--c:'+(col[d.t.id]||"#626a7a")+'"><b>'+d.r.length+'×</b><div><strong>'+esc(d.t.name)+'</strong><small>'+d.r[0]+'–'+d.r[d.r.length-1]+(star?' · MVP τελικών: '+esc(star)+(mv[star]>1?' ('+mv[star]+')':''):"")+'</small></div></div>'}).join("")+'</div>')+
  '<div class="ix-controls"><label>Franchise<select id="ix-fr"><option value="">Όλες οι ομάδες με τίτλο ('+L.length+')</option>'+L.map(function(t){return '<option value="'+esc(t.id)+'">'+esc(t.name)+' · '+t.count+'</option>'}).join("")+'</select></label></div><div id="ix-frl"></div>'+note("Από το ενσωματωμένο ιστορικό τελικών του NBA ATLAS (NBA.com). Οι μετακομίσεις ενοποιούνται στο σημερινό franchise (π.χ. Minneapolis → LA Lakers, Seattle → OKC). Δυναστεία = συνεχόμενοι τίτλοι, όχι υποκειμενική αξιολόγηση."));
 document.getElementById("ix-fr").onchange=paint;paint();
 function paint(){var s=document.getElementById("ix-fr").value,A=s?L.filter(function(t){return t.id===s}):L;
  document.getElementById("ix-frl").innerHTML='<div class="ix-grid3">'+A.map(function(t){return '<div class="ix-card ix-fr" style="--c:'+(col[t.id]||"#626a7a")+'"><div class="ix-fr-h"><img src="'+LOGO(t.id==="GSW"?"gs":t.id==="SAS"?"sa":t.id==="NYK"?"ny":t.id==="WAS"?"wsh":t.id==="UTA"?"utah":t.id==="NOP"?"no":t.id)+'" alt="" '+hideImg+'><div><strong>'+esc(t.name)+'</strong>'+(t.aka.length?'<small>και ως '+esc(t.aka.join(", "))+'</small>':"")+'</div><b>'+t.count+'</b></div><div class="ix-years">'+t.years.map(function(y){return '<span class="'+(t.run.length>1&&t.run.indexOf(y)>=0?"run":"")+'">'+y+'</span>'}).join("")+'</div><small class="ix-muted">Μεγαλύτερο σερί: '+t.run.length+(t.run.length>1?' ('+t.run[0]+'–'+t.run[t.run.length-1]+')':'')+' · τελευταίος τίτλος '+t.last+'</small></div>'}).join("")+'</div>';
 }
}


/* ====================================================================
   0. PLAYER DNA — percentile radar, archetype, twins
   ==================================================================== */
var AX=[["Σκοράρισμα","PTS/36",function(p){return p.mpg?p.ppg/p.mpg*36:null}],["Δημιουργία","AST/36",function(p){return p.mpg?p.apg/p.mpg*36:null}],["Ριμπάουντ","REB/36",function(p){return p.mpg?p.rpg/p.mpg*36:null}],["Άμυνα","STL+BLK/36",function(p){return p.mpg?((p.spg||0)+(p.bpg||0))/p.mpg*36:null}],["Αποτελεσματικότητα","TS%",function(p){return num(p.tsPct)}],["Ασφάλεια μπάλας","AST/TO",function(p){return num(p.astTo)}],["Ρόλος","Λεπτά",function(p){return num(p.mpg)}],["Επιρροή","Atlas Index",function(p){return num(p.index)}]];
var DNA_COL=["#ffd23f","#7cc4ff"];
function dnaPool(pw){var P=asList(pw&&pw.players).filter(function(p){return p.eligible!==false&&num(p.mpg)>=15&&(num(p.games)||0)>=5});
 var cols=AX.map(function(a){return P.map(function(p){return a[2](p)}).filter(function(x){return x!=null}).sort(function(x,y){return x-y})});
 P.forEach(function(p){p._raw=AX.map(function(a){return a[2](p)});p._pct=p._raw.map(function(v,i){if(v==null)return null;var c=cols[i],k=0;while(k<c.length&&c[k]<=v)k++;return Math.round(k/c.length*100)})});
 return P.sort(function(a,b){return (b.index||0)-(a.index||0)})}
function archetype(p){var q=p._pct.map(function(x){return x||0}),sc=q[0],cr=q[1],rb=q[2],df=q[3],ef=q[4],bh=q[5];
 if(sc>=85&&rb>=85&&df>=85)return["Unicorn","Σκοράρει σαν σταρ, μαζεύει ριμπάουντ και προστατεύει τη ρακέτα — συνδυασμός που σχεδόν δεν υπάρχει."];
 if(sc>=90&&cr>=85)return["Offensive engine","Σκοράρει και δημιουργεί σε κορυφαίο επίπεδο — η επίθεση περνά από τα χέρια του."];
 if(rb>=85&&cr>=80)return["Point center","Ψηλός που μοιράζει: ριμπάουντ και δημιουργία μαζί, σπάνιος συνδυασμός."];
 if(sc>=88&&ef>=75)return["Ελίτ σκόρερ","Πολλοί πόντοι με υψηλή αποτελεσματικότητα."];
 if(sc>=85)return["Volume scorer","Κουβαλά μεγάλο φορτίο πόντων."];
 if(cr>=88&&bh>=70)return["Floor general","Οργανωτής που προσέχει την μπάλα."];
 if(rb>=85&&df>=80)return["Rim protector","Κυριαρχεί στη ρακέτα: ριμπάουντ, τάπες, κλεψίματα."];
 if(df>=85)return["Αμυντικός ειδικός","Αλλάζει κατοχές με κλεψίματα και τάπες."];
 if(ef>=85&&sc<60)return["Αποτελεσματικός ρολίστας","Λίγα σουτ, σχεδόν όλα καλά."];
 var mean=q.reduce(function(a,b){return a+b},0)/q.length;if(mean>=65&&Math.min.apply(null,q)>=40)return["Two-way all-rounder","Χωρίς αδύναμο σημείο: συνεισφέρει παντού."];
 return["Πολυεργαλείο","Μοιράζει την παραγωγή του σε πολλές διαστάσεις."]}
function radar(players,size){size=size||340;var c=size/2,R=c-58,n=AX.length,pt=function(i,v){var a=-Math.PI/2+i*2*Math.PI/n;return [c+Math.cos(a)*R*v/100,c+Math.sin(a)*R*v/100]};
 var g='';[25,50,75,100].forEach(function(l){g+='<polygon points="'+AX.map(function(_,i){return pt(i,l).join(",")}).join(" ")+'" fill="'+(l===100?"rgba(255,255,255,.02)":"none")+'" stroke="rgba(255,255,255,'+(l===50?.14:.07)+')"/>'});
 AX.forEach(function(a,i){var e=pt(i,100),t=pt(i,124);g+='<line x1="'+c+'" y1="'+c+'" x2="'+e[0]+'" y2="'+e[1]+'" stroke="rgba(255,255,255,.07)"/><text x="'+t[0].toFixed(1)+'" y="'+(t[1]+4).toFixed(1)+'" text-anchor="middle" fill="#aeb4c0" font-size="10.5" font-weight="700">'+a[0]+'</text>'});
 players.forEach(function(p,k){var col=DNA_COL[k],pts=p._pct.map(function(v,i){return pt(i,Math.max(4,v||0)).map(function(x){return x.toFixed(1)}).join(",")}).join(" ");
  g+='<polygon points="'+pts+'" fill="'+col+'" fill-opacity="'+(k?.14:.22)+'" stroke="'+col+'" stroke-width="2.2" stroke-linejoin="round"/>'+p._pct.map(function(v,i){var q=pt(i,Math.max(4,v||0));return '<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="3.4" fill="'+col+'"/>'}).join("")});
 return '<svg class="ix-radar" viewBox="0 0 '+size+' '+size+'">'+g+'</svg>'}
function miniRadar(p,col){var c=34,R=28,n=AX.length,pt=function(i,v){var a=-Math.PI/2+i*2*Math.PI/n;return (c+Math.cos(a)*R*v/100).toFixed(1)+","+(c+Math.sin(a)*R*v/100).toFixed(1)};
 return '<svg viewBox="0 0 68 68" class="ix-mini-radar"><polygon points="'+AX.map(function(_,i){return pt(i,100)}).join(" ")+'" fill="none" stroke="rgba(255,255,255,.12)"/><polygon points="'+p._pct.map(function(v,i){return pt(i,Math.max(5,v||0))}).join(" ")+'" fill="'+col+'" fill-opacity=".3" stroke="'+col+'" stroke-width="1.6"/></svg>'}
function twins(p,P){return P.filter(function(x){return x.id!==p.id}).map(function(x){var d=0;for(var i=0;i<AX.length;i++){var a=p._pct[i],b=x._pct[i];if(a==null||b==null)continue;d+=(a-b)*(a-b)}return {x:x,s:Math.max(0,100-Math.sqrt(d/AX.length))}}).sort(function(a,b){return b.s-a.s}).slice(0,5)}
async function dnaHook(pw){var P=dnaPool(pw);if(!P.length)return;var best=P.slice(0,60).map(function(p){return {p:p,m:Math.min.apply(null,p._pct.slice(0,6).map(function(x){return x||0}))}}).sort(function(a,b){return b.m-a.m})[0].p,lead=P[0];
 fillTile("dna",'<div class="ix-dna-hook">'+miniRadar(lead,"#ffd23f")+'<div class="ix-hook"><b>'+esc(lead.name)+'</b><span>'+esc(archetype(lead)[0])+' · #1 στο Atlas Index · '+esc(lead.team||"")+'</span></div></div><div class="ix-tile-sub">Πιο ολοκληρωμένο προφίλ: <b>'+esc(best.name)+'</b> — κανένα εκατοστημόριο κάτω από '+Math.min.apply(null,best._pct.slice(0,6).map(function(x){return x||0}))+'</div>')}
async function dna(){
 var pw=await soft("power"),P=dnaPool(pw);if(!P.length){fail("Δεν φόρτωσαν οι παίκτες.");return}
 var q=new URLSearchParams(location.hash.split("?")[1]||""),first=q.get("p")||P[0].id;
 var opts=function(sel,none){return (none?'<option value="">— κανένας —</option>':"")+P.map(function(p){return '<option value="'+esc(p.id)+'" '+(String(p.id)===String(sel)?"selected":"")+'>'+esc(p.name)+' · '+esc(p.team||"")+'</option>'}).join("")};
 set('<div class="ix-controls"><label>Παίκτης<select id="ix-d1">'+opts(first)+'</select></label><label>Σύγκρινε με<select id="ix-d2">'+opts("",true)+'</select></label></div><div id="ix-dna"></div>');
 document.getElementById("ix-d1").onchange=paint;document.getElementById("ix-d2").onchange=paint;paint();
 function paint(){var a=P.find(function(p){return String(p.id)===document.getElementById("ix-d1").value}),b=P.find(function(p){return String(p.id)===document.getElementById("ix-d2").value});if(!a)return;
  var arc=archetype(a),L=[a].concat(b?[b]:[]),tw=twins(a,P);
  var strong=a._pct.map(function(v,i){return [v||0,i]}).sort(function(x,y){return y[0]-x[0]});
  var head='<div class="ix-dna-hero"><img src="'+esc(a.headshot||HS(a.id))+'" alt="" '+hideImg+'><div><div class="ix-kicker">'+esc(a.teamName||a.team||"")+'</div><h2>'+esc(a.name)+'</h2><div class="ix-arch"><b>'+esc(arc[0])+'</b><span>'+esc(arc[1])+'</span></div><div class="ix-stats"><span><b>'+val(a.ppg,1)+'</b>PPG</span><span><b>'+val(a.rpg,1)+'</b>RPG</span><span><b>'+val(a.apg,1)+'</b>APG</span><span><b>'+val(a.tsPct,1)+'</b>TS%</span><span><b>'+val(a.index,1)+'</b>Index</span></div></div></div>';
  var bars=AX.map(function(x,i){var v=a._pct[i],w=b?b._pct[i]:null,tier=v>=90?"elite":v>=70?"good":v>=40?"mid":"low";return '<div class="ix-dbar"><div class="ix-dbar-l"><b>'+x[0]+'</b><small>'+x[1]+' '+(a._raw[i]!=null?val(a._raw[i],x[1]==="AST/TO"?2:1):"—")+(b&&b._raw[i]!=null?' · '+esc(b.name.split(" ").slice(-1)[0])+' '+val(b._raw[i],x[1]==="AST/TO"?2:1):"")+'</small></div><div class="ix-dbar-t"><i class="'+tier+'" style="width:'+Math.max(3,v||0)+'%"></i>'+(w!=null?'<em style="left:'+w+'%"></em>':"")+'</div><span class="ix-dbar-v '+tier+'">'+(v==null?"—":v)+'</span></div>'}).join("");
  var leg=b?'<div class="ix-legend"><span><i style="background:'+DNA_COL[0]+'"></i>'+esc(a.name)+'</span><span><i style="background:'+DNA_COL[1]+'"></i>'+esc(b.name)+'</span></div>':"";
  var twin='<div class="ix-twins">'+tw.map(function(t){return '<button class="ix-twin" data-id="'+esc(t.x.id)+'"><img src="'+esc(t.x.headshot||HS(t.x.id))+'" alt="" loading="lazy" '+hideImg+'><div><b>'+esc(t.x.name)+'</b><small>'+esc(archetype(t.x)[0])+' · '+esc(t.x.team||"")+'</small></div><span>'+Math.round(t.s)+'%</span></button>'}).join("")+'</div>';
  document.getElementById("ix-dna").innerHTML=head+'<div class="ix-dna-grid">'+card("Αποτύπωμα",radar(L)+leg,"ix-dna-radar")+card("Εκατοστημόρια λίγκας",'<div class="ix-dbars">'+bars+'</div><p>Δυνατότερα σημεία: <b>'+AX[strong[0][1]][0]+'</b> ('+strong[0][0]+'), <b>'+AX[strong[1][1]][0]+'</b> ('+strong[1][0]+'). Πιο αδύναμο: <b>'+AX[strong[7][1]][0]+'</b> ('+strong[7][0]+').</p>')+'</div>'+card("Γενετικά πιο κοντά",twin+note("Ομοιότητα = απόσταση των οκτώ εκατοστημορίων. Πάτα έναν παίκτη για σύγκριση."))+note("Εκατοστημόριο = ποσοστό των "+P.length+" παικτών της λίγκας (≥15 λεπτά, ≥5 αγώνες) που έχουν ίση ή χαμηλότερη τιμή. Ανά 36 λεπτά για δίκαιη σύγκριση ρόλων. Το αρχέτυπο προκύπτει από κανόνες πάνω στα εκατοστημόρια, όχι από scouting.")+'<a class="ix-link" href="#/player/'+esc(a.id)+'">Καρτέλα παίκτη →</a>'+src("ESPN season averages · Atlas power · "+date(Date.now()));
  document.querySelectorAll(".ix-twin").forEach(function(btn){btn.onclick=function(){document.getElementById("ix-d2").value=btn.dataset.id;paint();document.getElementById("ix-d2").scrollIntoView({behavior:"smooth",block:"center"})}});
 }
}


/* ====================================================================
   FACES OF THE LEAGUE — public attention via Wikipedia pageviews
   ==================================================================== */
var LEGENDS=["Michael Jordan","Kobe Bryant","Magic Johnson","Larry Bird","Kareem Abdul-Jabbar","Shaquille O'Neal","Tim Duncan","Wilt Chamberlain","Bill Russell","Allen Iverson","Dirk Nowitzki","Hakeem Olajuwon","Kevin Garnett","Dwyane Wade","Dennis Rodman","Scottie Pippen","Charles Barkley","Vince Carter","Tracy McGrady","Yao Ming","Steve Nash","Karl Malone","John Stockton","Julius Erving","Oscar Robertson","Jerry West","Isiah Thomas","Pau Gasol","Manu Ginóbili","Carmelo Anthony","Derrick Rose","Dwight Howard","Paul Pierce","Ray Allen","Patrick Ewing","David Robinson"];
var WIKI_FIX={"Jalen Williams":"Jalen Williams (basketball, born 2001)","Anthony Davis":"Anthony Davis","Jaylen Brown":"Jaylen Brown","Scottie Barnes":"Scottie Barnes","Jalen Johnson":"Jalen Johnson (basketball)","Josh Hart":"Josh Hart","Mikal Bridges":"Mikal Bridges","Jalen Green":"Jalen Green (basketball)","Amen Thompson":"Amen Thompson","Chet Holmgren":"Chet Holmgren","Evan Mobley":"Evan Mobley","Tyrese Maxey":"Tyrese Maxey","Cade Cunningham":"Cade Cunningham","Alperen Sengun":"Alperen Şengün","Nikola Jokic":"Nikola Jokić","Luka Doncic":"Luka Dončić","Nikola Vucevic":"Nikola Vučević","Bogdan Bogdanovic":"Bogdan Bogdanović","Jusuf Nurkic":"Jusuf Nurkić","Kristaps Porzingis":"Kristaps Porziņģis","Dennis Schroder":"Dennis Schröder","Jonas Valanciunas":"Jonas Valančiūnas"};
function wikiTitle(n){return WIKI_FIX[n]||n}
var wikiCache=new Map();
async function wikiBatch(names){var out={},need=names.filter(function(n){if(wikiCache.has(n)){out[n]=wikiCache.get(n);return false}return true});
 for(var i=0;i<need.length;i+=45){var chunk=need.slice(i,i+45),titles=chunk.map(wikiTitle);
  try{var u="https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1&prop=pageviews|description&pvipdays=30&titles="+encodeURIComponent(titles.join("|"));
   var j=await fetch(u).then(function(r){return r.json()});var q=j.query||{},map={};(q.normalized||[]).concat(q.redirects||[]).forEach(function(x){map[x.from]=x.to});
   var pages={};asList(q.pages).forEach(function(p){pages[p.title]=p});
   chunk.forEach(function(n){var t=wikiTitle(n);t=map[t]||t;t=map[t]||t;var p=pages[t];if(!p||p.missing)return;var pv=p.pageviews||{},days=Object.keys(pv).sort(),series=days.map(function(d){return pv[d]||0});
    var desc=p.description||"";if(desc&&!/basketball|NBA/i.test(desc))return;
    var total=series.reduce(function(a,b){return a+b},0),last7=series.slice(-7).reduce(function(a,b){return a+b},0),prev=series.slice(0,-7),prevAvg=prev.length?prev.reduce(function(a,b){return a+b},0)/prev.length:0;
    var r={name:n,title:p.title,desc:desc,series:series,total:total,daily:series.length?total/series.length:0,trend:prevAvg?(last7/7)/prevAvg-1:null,url:"https://en.wikipedia.org/wiki/"+encodeURIComponent(p.title.replace(/ /g,"_"))};wikiCache.set(n,r);out[n]=r})}catch(e){}}
 return out}
function kfmt(v){v=num(v);if(v==null)return"—";return v>=1e6?val(v/1e6,1)+"M":v>=1e3?val(v/1e3,v>=1e5?0:1)+"K":val(v,0)}
function line(series,w,h,col){if(!series.length)return"";var mx=Math.max.apply(null,series)||1,step=w/(series.length-1||1);var d=series.map(function(v,i){return (i?"L":"M")+(i*step).toFixed(1)+","+(h-2-v/mx*(h-4)).toFixed(1)}).join("");return '<svg class="ix-line" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><path d="'+d+'L'+w+','+h+'L0,'+h+'Z" fill="'+col+'" fill-opacity=".12"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>'}
async function facesHook(pw){var P=asList(pw&&pw.players).filter(function(p){return p.eligible!==false}).sort(function(a,b){return (b.index||0)-(a.index||0)}).slice(0,40);
 var W=await wikiBatch(P.map(function(p){return p.name}));var R=P.map(function(p){return W[p.name]&&{p:p,w:W[p.name]}}).filter(Boolean).sort(function(a,b){return b.w.total-a.w.total});
 if(!R.length){fillTile("faces",hook("—","Η προσοχή του κοινού δεν φόρτωσε"));return}var t=R[0];
 fillTile("faces",'<div class="ix-hook-row"><img class="ix-face" src="'+esc(t.p.headshot||HS(t.p.id))+'" alt="" '+hideImg+'><div class="ix-hook"><b>'+kfmt(t.w.total)+'</b><span>προβολές σε 30 ημέρες · '+esc(t.p.name)+', το πιο «ψαγμένο» πρόσωπο της λίγκας</span></div></div>'+line(t.w.series,240,30,"#ff9f43"))}
async function faces(){
 var pw=await soft("power"),P=asList(pw&&pw.players).filter(function(p){return p.eligible!==false&&p.teamId}).sort(function(a,b){return (b.index||0)-(a.index||0)}).slice(0,60);
 var tab=(new URLSearchParams(location.hash.split("?")[1]||"")).get("t")||"now";
 set('<div class="ix-tabs"><a href="#/faces?t=now" class="'+(tab==="now"?"on":"")+'">Σήμερα</a><a href="#/faces?t=legends" class="'+(tab==="legends"?"on":"")+'">Όλων των εποχών</a><a href="#/faces?t=gap" class="'+(tab==="gap"?"on":"")+'">Φήμη vs απόδοση</a></div><div id="ix-faces">'+skel(360)+'</div>');
 document.querySelectorAll(".ix-tabs a").forEach(function(a){a.onclick=function(e){e.preventDefault();history.replaceState(null,"",a.getAttribute("href"));var r=document.getElementById("atlas-i-page-faces");if(r)r.remove();nav()}});
 var host=function(){return document.getElementById("ix-faces")};
 if(tab==="legends"){var W=await wikiBatch(LEGENDS),L=LEGENDS.map(function(n){return W[n]}).filter(Boolean).sort(function(a,b){return b.total-a.total});if(!host())return;
  if(!L.length){host().innerHTML=card("Δεν απάντησε η Wikipedia",'<p class="ix-muted">Δοκίμασε ξανά σε λίγο.</p>');return}
  var mx=L[0].total;
  host().innerHTML='<div class="ix-podium">'+L.slice(0,3).map(function(w,i){return '<a class="ix-pod p'+i+'" href="'+esc(w.url)+'" target="_blank" rel="noopener"><span class="ix-pod-n">'+(i+1)+'</span><b>'+esc(w.name)+'</b><strong>'+kfmt(w.total)+'</strong><small>προβολές / 30 ημ.</small>'+line(w.series,200,34,"#ff9f43")+'</a>'}).join("")+'</div>'+card("Οι θρύλοι που ψάχνει ακόμα ο κόσμος",'<div class="ix-fame">'+L.map(function(w,i){return famRow(w,i,mx,null)}).join("")+'</div>')+note("Προβολές της αγγλικής Wikipedia τις τελευταίες 30 ημέρες, ως δείκτης δημόσιου ενδιαφέροντος. Τα Google Trends δεν έχουν δημόσιο API, οπότε η Wikipedia είναι η πιο αξιόπιστη ανοιχτή πηγή «buzz». Μια επέτειος, ένα ντοκιμαντέρ ή μια είδηση μπορεί να εκτοξεύσει έναν θρύλο για λίγες μέρες.")+src("Wikimedia Pageviews API · "+date(Date.now()));return}
 var W2=await wikiBatch(P.map(function(p){return p.name})),R=P.map(function(p,i){return W2[p.name]&&{p:p,w:W2[p.name],perf:i+1}}).filter(Boolean);if(!host())return;
 if(!R.length){host().innerHTML=card("Δεν απάντησε η Wikipedia",'<p class="ix-muted">Δοκίμασε ξανά σε λίγο.</p>');return}
 R.sort(function(a,b){return b.w.total-a.w.total});R.forEach(function(r,i){r.fame=i+1});
 if(tab==="gap"){var gap=R.map(function(r){return Object.assign(r,{g:r.fame-r.perf})});
  var under=gap.slice().sort(function(a,b){return b.g-a.g}).slice(0,6),over=gap.slice().sort(function(a,b){return a.g-b.g}).slice(0,6);
  var W=620,H=330,pad=36,lmx=Math.log10(Math.max.apply(null,R.map(function(r){return r.w.total}))),lmn=Math.log10(Math.max(1,Math.min.apply(null,R.map(function(r){return r.w.total})))),ix=R.map(function(r){return r.p.index||0}),imx=Math.max.apply(null,ix),imn=Math.min.apply(null,ix);
  var X=function(v){return pad+(v-imn)/(imx-imn||1)*(W-pad*2)},Y=function(v){return H-pad-(Math.log10(Math.max(1,v))-lmn)/(lmx-lmn||1)*(H-pad*2)};
  var tag=new Set(under.slice(0,3).concat(over.slice(0,3)).concat(R.slice(0,3)).map(function(r){return r.p.id}));
  var sc='<svg class="ix-chart" viewBox="0 0 '+W+' '+H+'"><line x1="'+pad+'" y1="'+(H-pad)+'" x2="'+(W-pad)+'" y2="'+(H-pad)+'" stroke="rgba(255,255,255,.12)"/><line x1="'+pad+'" y1="'+pad+'" x2="'+pad+'" y2="'+(H-pad)+'" stroke="rgba(255,255,255,.12)"/><text x="'+(W-pad)+'" y="'+(H-10)+'" text-anchor="end" fill="#626a7a" font-size="11">Απόδοση (Atlas Index) →</text><text x="'+(pad+4)+'" y="'+(pad-12)+'" fill="#626a7a" font-size="11">↑ Προβολές Wikipedia (λογαριθμικά)</text>'+R.map(function(r){var c=r.g>=12?"#22d39a":r.g<=-12?"#ff4d6a":"#ff9f43";return '<circle cx="'+X(r.p.index||0).toFixed(1)+'" cy="'+Y(r.w.total).toFixed(1)+'" r="'+(tag.has(r.p.id)?5.5:4)+'" fill="'+c+'" fill-opacity=".85"><title>'+esc(r.p.name)+' · '+kfmt(r.w.total)+'</title></circle>'+(tag.has(r.p.id)?'<text x="'+(X(r.p.index||0)+(X(r.p.index||0)>W-110?-8:8)).toFixed(1)+'" text-anchor="'+(X(r.p.index||0)>W-110?"end":"start")+'" y="'+(Y(r.w.total)+4).toFixed(1)+'" fill="#dfe3ea" font-size="10.5" font-weight="700">'+esc(r.p.name.split(" ").slice(-1)[0])+'</text>':"")}).join("")+'</svg><div class="ix-legend"><span><i style="background:#22d39a"></i>Υποτιμημένοι: παίζουν καλύτερα απ’ όσο τους ψάχνουν</span><span><i style="background:#ff4d6a"></i>Φήμη μεγαλύτερη από τη φετινή απόδοση</span></div>';
  var lst=function(A,good){return A.map(function(r){return '<a class="ix-prow" href="#/player/'+r.p.id+'"><img src="'+esc(r.p.headshot||HS(r.p.id))+'" alt="" loading="lazy" '+hideImg+'><div class="ix-trow-n"><b>'+esc(r.p.name)+'</b><small>#'+r.perf+' σε απόδοση · #'+r.fame+' σε προβολές</small></div><span></span><span class="ix-delta '+(good?"up":"down")+'">'+(good?"+":"−")+Math.abs(r.g)+'</span></a>'}).join("")};
  host().innerHTML=card("Φήμη απέναντι σε απόδοση",sc)+'<div class="ix-grid2">'+card('<span class="up">●</span> Οι πιο υποτιμημένοι',lst(under,true))+card('<span class="down">●</span> Η φήμη προηγείται',lst(over,false))+'</div>'+note("Σύγκριση της θέσης κάθε παίκτη στο Atlas Index (απόδοση φέτος) με τη θέση του στις προβολές Wikipedia 30 ημερών, για τους "+R.length+" κορυφαίους. Η διαφορά θέσεων δεν κρίνει την αξία του παίκτη· δείχνει πού η προσοχή του κοινού δεν ακολουθεί τα νούμερα.")+src("Wikimedia Pageviews API · ESPN / Atlas power");return}
 var mx2=R[0].w.total,rising=R.filter(function(r){return r.w.trend!=null&&r.w.total>20000}).sort(function(a,b){return b.w.trend-a.w.trend}).slice(0,4);
 host().innerHTML='<div class="ix-podium">'+R.slice(0,3).map(function(r,i){return '<a class="ix-pod p'+i+'" href="#/player/'+r.p.id+'"><span class="ix-pod-n">'+(i+1)+'</span><img src="'+esc(r.p.headshot||HS(r.p.id))+'" alt="" '+hideImg+'><b>'+esc(r.p.name)+'</b><strong>'+kfmt(r.w.total)+'</strong><small>προβολές / 30 ημ. · '+esc(r.p.team||"")+'</small>'+line(r.w.series,200,34,"#ff9f43")+'</a>'}).join("")+'</div>'+
  (rising.length?card("📈 Ανεβαίνουν στην επικαιρότητα",'<div class="ix-rise">'+rising.map(function(r){return '<a href="#/player/'+r.p.id+'"><img src="'+esc(r.p.headshot||HS(r.p.id))+'" alt="" '+hideImg+'><div><b>'+esc(r.p.name)+'</b><small>τελευταία 7 ημέρες σε σχέση με το προηγούμενο διάστημα</small></div><span class="up">'+(r.w.trend>=0?"+":"")+Math.round(r.w.trend*100)+'%</span></a>'}).join("")+'</div>'):"")+
  card("Τα πρόσωπα της λίγκας τώρα",'<div class="ix-fame">'+R.map(function(r,i){return famRow(r.w,i,mx2,r.p)}).join("")+'</div>')+note("Ενδιαφέρον κοινού = προβολές της σελίδας του παίκτη στην αγγλική Wikipedia τις τελευταίες 30 ημέρες (Wikimedia). Περιγραφή = η σύντομη περιγραφή της ίδιας της Wikipedia. Τα Google Trends δεν έχουν δημόσιο API, γι’ αυτό δεν χρησιμοποιούνται.")+src("Wikimedia Pageviews API · "+date(Date.now()));
}
function famRow(w,i,mx,p){return '<div class="ix-frow"><span class="ix-frank">'+(i+1)+'</span>'+(p?'<img src="'+esc(p.headshot||HS(p.id))+'" alt="" loading="lazy" '+hideImg+'>':'<span class="ix-fini">'+esc(w.name.split(" ").map(function(x){return x[0]}).join("").slice(0,2))+'</span>')+'<div class="ix-trow-n"><b>'+(p?'<a href="#/player/'+p.id+'">'+esc(w.name)+'</a>':esc(w.name))+'</b><small>'+esc(w.desc||"")+(w.trend!=null?' · <span class="'+(w.trend>=0?"up":"down")+'">'+(w.trend>=0?"▲":"▼")+Math.abs(Math.round(w.trend*100))+'% εβδ.</span>':"")+'</small></div><div class="ix-fbar"><i style="width:'+(w.total/mx*100).toFixed(1)+'%"></i></div>'+line(w.series,110,26,"#ff9f43")+'<a class="ix-fv" href="'+esc(w.url)+'" target="_blank" rel="noopener">'+kfmt(w.total)+'</a></div>'}

/* ---------- router glue ---------- */
function nav(){
 var links=document.getElementById("links");if(links&&!links.querySelector('[data-r="shift"]'))links.insertAdjacentHTML("beforeend",'<a href="#/dna" data-r="dna">DNA</a><a href="#/faces" data-r="faces">Faces</a><a href="#/shift" data-r="shift">Shift</a><a href="#/matchup" data-r="matchup">Matchups</a><a href="#/legacy" data-r="legacy">Legacy</a><a href="#/dynasty" data-r="dynasty">Dynasties</a>');
 var path=(location.hash.replace(/^#\/?/,"").split(/[/?]/)[0]||"home");
 if(pages[path]){document.querySelectorAll("#links [data-r]").forEach(function(a){a.classList.toggle("on",a.dataset.r===path)});
  if(!document.getElementById("atlas-i-page-"+path)){root.innerHTML=shell(path);document.title=BY[path].name+" · NBA ATLAS";scrollTo(0,0);Promise.resolve().then(pages[path]).catch(function(e){fail(e&&e.message)})}return}
 if(path==="menu"){var grid=root.querySelector(".grid.g2");if(grid&&!grid.querySelector("[data-i-card]"))grid.insertAdjacentHTML("afterbegin",TOOLS.map(function(t){return '<a data-i-card class="card ix-menu" href="#/'+t.k+'" style="--acc:'+t.acc+'"><span class="ix-tile-ic">'+icon(t.k,18)+'</span><div class="h2" style="font-size:26px;margin-top:10px">'+esc(t.name)+'</div><p class="muted">'+esc(t.desc)+'</p></a>'}).join(""))}
 if(path==="home")renderHome();
}
var delay;new MutationObserver(function(){clearTimeout(delay);delay=setTimeout(nav,90)}).observe(root,{subtree:true,childList:true});
addEventListener("hashchange",function(){setTimeout(nav,110)});nav();
})();
