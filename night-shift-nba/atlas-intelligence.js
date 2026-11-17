/* NBA ATLAS Intelligence Suite: evidence-based experimental analytics. */
(function(){
"use strict";
var root=document.getElementById("view");if(!root)return;
var pages={shift:shift,legacy:legacy,matchup:matchup,rotation:rotation,era:era,dynasty:dynasty};
var names={shift:"NBA SHIFT",legacy:"Legacy Clock",matchup:"Matchup DNA",rotation:"Rotation X-Ray",era:"Era Machine",dynasty:"Dynasty Tracker"};
var desc={shift:"Τι άλλαξε σε παίκτες και ομάδες",legacy:"Πραγματικά ιστορικά ορόσημα",matchup:"Τακτική σύγκριση ομάδων",rotation:"Βασικοί και πάγκος, από box scores",era:"Υποθετική προσαρμογή ρυθμού",dynasty:"Πρωταθλήματα και ιστορικές σειρές"};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(x){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]})}
function val(v,n){var z=Number(v);return v===null||v===undefined||v===""||!Number.isFinite(z)?"—":z.toLocaleString("el-GR",{maximumFractionDigits:n==null?1:n})}
function num(v){var x=Number(v);return v==null||v===""||!Number.isFinite(x)?null:x}
function pct(v){return num(v)==null?"—":val(100*v,1)+"%"}
function date(v){try{return new Date(v).toLocaleString("el-GR",{timeZone:"Europe/Athens",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}catch{return "—"}}
function mark(s){return '<span class="i-source">'+esc(s)+'</span>'}
function link(hash,t){return '<a class="i-link" href="#/'+esc(hash)+'">'+esc(t)+' →</a>'}
function shell(id,title,sub){return '<div class="i-wrap" id="atlas-i-page-'+id+'"><div class="i-top"><a href="#/menu">← Εργαλεία</a><span>NBA ATLAS / INTELLIGENCE</span></div><div class="i-heading"><div class="i-kicker">DATA EXPLORER</div><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p></div><div id="i-body" class="i-body"><div class="i-card">Φόρτωση δεδομένων…</div></div></div>'}
function box(t,txt){return '<div class="i-card"><h3>'+esc(t)+'</h3>'+txt+'</div>'}
function set(s){var e=document.getElementById("i-body");if(e)e.innerHTML=s}
function err(t){set(box("Μη διαθέσιμα δεδομένα",'<p>'+esc(t||"Δεν αποκρίθηκε η πηγή. Δοκίμασε ξανά.")+'</p>'))}
async function get(p){var r=await fetch("/api/"+p,{headers:{accept:"application/json"}});var x=await r.json();if(!r.ok)throw Error(x.error||"HTTP "+r.status);return x.data&&!x.players&&!x.teams&&!x.games?x.data:x}
async function many(paths){return Promise.all(paths.map(function(p){return get(p).catch(function(){return null})}))}
function asList(x){return Array.isArray(x)?x:[]}
function topdata(T){return asList(T).map(function(t,i){return {id:String(t.id),name:t.name,abbr:t.abbr,power:num(t.power),rank:i+1,share:num(t.titleShare),wins:num(t.wins),losses:num(t.losses),recent:num(t.recentWinPct),margin:num(t.margin)}})}
function pList(P){return asList(P).map(function(p){return {id:String(p.id),name:p.name,index:num(p.index),team:p.team,ppg:num(p.ppg),games:num(p.games),ts:num(p.tsPct)}})}
function capture(power){var k="atlas.intelligence.snapshots.2027",items=[];try{items=JSON.parse(localStorage.getItem(k)||"[]")}catch{}if(!Array.isArray(items))items=[];var now=Date.now(),current={t:now,teams:topdata(power.teams),players:pList(power.players)};
if(!items.length||now-items[items.length-1].t>21600000){items.push(current);items=items.filter(function(s){return s.t>=now-45*86400000}).slice(-200);try{localStorage.setItem(k,JSON.stringify(items))}catch{}}
return {items:items,current:current}}
function delta(a,b,dig){if(num(a)==null||num(b)==null)return "—";var v=a-b;return (v>0?"+":"")+val(v,dig==null?1:dig)}
function changeRows(now,old,kind){var ref=new Map(asList(old).map(function(x){return [String(x.id),x]}));return now.map(function(x){var before=ref.get(String(x.id));if(!before)return null;var key=kind==="teams"?"power":"index",d=num(x[key])==null||num(before[key])==null?null:x[key]-before[key];return {x:x,b:before,d:d}}).filter(function(x){return x&&x.d!=null}).sort(function(a,b){return Math.abs(b.d)-Math.abs(a.d)}).slice(0,12)}
function changes(rows,kind){return rows.length?'<div class="i-stack">'+rows.map(function(o){return '<div class="i-line"><strong>'+esc(o.x.name)+'</strong><span class="'+(o.d>=0?"i-up":"i-down")+'">'+delta(o.x[kind],o.b[kind],1)+'</span><small>'+esc(kind==="power"?"Power":"Atlas Index")+' · '+esc(o.x.abbr||o.x.team||"")+'</small></div>'}).join("")+'</div>':'<p class="i-note">Δεν υπάρχουν συγκρίσιμα δεδομένα.</p>'}
async function shift(){
set(box("Προσωπικό ιστορικό αλλαγών",'<p class="i-note">Ο δείκτης συγκρίνει αποθηκευμένα snapshots από αυτή τη συσκευή. Δεν εμφανίζει επινοημένες μεταβολές πριν από την πρώτη επίσκεψη.</p>'));
try{var p=await get("power"),a=capture(p),now=a.current,s="<div class=\"i-grid\">";[1,7,30].forEach(function(days){var target=now.t-days*86400000,old=a.items.filter(function(x){return x.t<=now.t-3600000}).sort(function(x,y){return Math.abs(x.t-target)-Math.abs(y.t-target)})[0];var close=old&&Math.abs(old.t-target)<=Math.max(5*3600000,days*.25*86400000);
s+='<div class="i-card"><div class="i-kicker">LAST '+days+' DAY'+(days>1?"S":"")+'</div>';
if(close){var t=changeRows(now.teams,old.teams,"teams"),pl=changeRows(now.players,old.players,"players");s+='<p class="i-note">Βάση: '+date(old.t)+' · Τώρα: '+date(now.t)+'</p><h3>Ομάδες</h3>'+changes(t.slice(0,5),"power")+'<h3>Παίκτες</h3>'+changes(pl.slice(0,5),"index")}
else s+='<p>Δεν υπάρχει ακόμη snapshot κοντά σε αυτή τη χρονική στιγμή.</p><p class="i-note">Οι συγκρίσεις θα γίνουν διαθέσιμες μετά από επόμενες επισκέψεις.</p>';
s+='</div>'});s+='</div>';
s+=box("Τρέχουσα φόρμα",'<p class="i-note">Πρόσφατη επίδοση από το τρέχον ESPN feed — δεν είναι ιστορική μεταβολή.</p><div class="i-stack">'+now.teams.filter(function(x){return x.recent!=null}).sort(function(a,b){return b.recent-a.recent}).slice(0,8).map(function(x){return '<div class="i-line"><strong>'+esc(x.name)+'</strong><span>'+pct(x.recent)+'</span><small>Νίκες τελευταίων 10</small></div>'}).join("")+'</div>');
set(s+mark("ESPN season averages / standings · Local snapshots ανά συσκευή · "+date(p.asOf||Date.now())))}catch(e){err(e.message)}
}
var FAV=[["1966","LeBron James"],["3945274","Luka Dončić"],["4594268","Anthony Edwards"],["5041939","Cooper Flagg"],["1035","Michael Jordan"],["110","Kobe Bryant"],["3975","Stephen Curry"]];
async function legacy(){
set(box("Career records",'<p>Ανάκτηση πραγματικών στοιχείων καριέρας από το αρχείο ESPN…</p>'));
var selector='<label class="i-field">Παίκτης <select id="i-player">'+FAV.map(function(a){return '<option value="'+a[0]+'">'+esc(a[1])+'</option>'}).join("")+'</select></label>';
set(selector+'<div id="i-legacy"></div>');
document.getElementById("i-player").onchange=read;await read();
async function read(){var id=document.getElementById("i-player")?.value,host=document.getElementById("i-legacy");if(!host)return;host.innerHTML=box("Στοιχεία καριέρας","Φόρτωση…");
try{var data=await many(["history?type=player&id="+id,"power"]),d=data[0],p=data[1];if(!d?.regular)throw Error("Δεν υπάρχουν διαθέσιμα συνολικά στοιχεία καριέρας");
var r=d.regular,tot=r.careerTotals||{},avg=r.careerAverages||{},rows=r.seasonRows||[],who=FAV.find(function(x){return x[0]===id})||["","Παίκτης"],season=p?.players?.find(function(x){return String(x.id)===id});
function metric(candidates){for(var i=0;i<candidates.length;i++)if(num(tot[candidates[i]])!=null)return num(tot[candidates[i]]);return null}
var pts=metric(["points","totalPoints","pts"]),ast=metric(["assists","totalAssists"]),reb=metric(["rebounds","totalRebounds"]),gp=metric(["gamesPlayed","games"]);
var metrics=[["Πόντοι",pts,1000,season?.ppg],["Ασίστ",ast,500,season?.apg],["Ριμπάουντ",reb,500,season?.rpg],["Αγώνες",gp,100,1]];
var html='<div class="i-grid">'+metrics.map(function(m){var n=m[1],next=n==null?null:Math.ceil((n+1)/m[2])*m[2],left=next==null?null:next-n,rate=num(m[3]),needed=left!=null&&rate>0?Math.ceil(left/rate):null;
return box(m[0],'<div class="i-big">'+val(n,0)+'</div>'+(n==null?'<p class="i-note">Δεν παρέχεται σύνολο από το feed.</p>':'<p>Επόμενο ορόσημο: <strong>'+val(next,0)+'</strong> · Απομένουν '+val(left,0)+'</p>')+(needed!=null?'<p class="i-note">Ενδεικτικά '+val(needed,0)+' αγώνες με φετινό ρυθμό, χωρίς πρόβλεψη συμμετοχών.</p>':''))}).join("")+'</div>';
html+=box("Καριέρα · "+who[1],'<p>'+val(r.yearCount,0)+' σεζόν με στοιχεία · '+val(avg.avgPoints,1)+' πόντοι/αγώνα · '+val(avg.avgAssists,1)+' ασίστ/αγώνα · '+val(avg.avgRebounds,1)+' ριμπάουντ/αγώνα</p><p class="i-note">Οι συνολικοί αριθμοί παρατίθενται μόνο όταν υπάρχουν στο feed. Επόμενο ορόσημο = στρογγυλό αριθμητικό επίπεδο, όχι θέση σε all-time ranking.</p>'+link("player/"+id,"Αναλυτική καρτέλα"));
host.innerHTML=html+mark("ESPN NBA regular-season career stats · αθροίσματα ανά καριέρα · "+date(d.updatedAt||Date.now()));
}catch(e){host.innerHTML=box("Αδυναμία φόρτωσης",'<p>'+esc(e.message)+'</p>')}}}
async function matchup(){
try{var pair=await many(["power","lab?type=season"]);var p=pair[0],lab=pair[1];if(!p?.teams?.length)throw Error("Δεν φορτώθηκαν οι ομάδες");
var list=p.teams,sel=function(id,defaultIx){return '<select id="'+id+'">'+list.map(function(t,i){return '<option value="'+esc(t.id)+'" '+(i===defaultIx?"selected":"")+'>'+esc(t.name)+'</option>'}).join("")+'</select>'};
set('<div class="i-selects">'+sel("i-home",0)+'<span>VS</span>'+sel("i-away",1)+'</div><div id="i-matchup"></div>');
document.getElementById("i-home").onchange=paint;document.getElementById("i-away").onchange=paint;paint();
function paint(){var h=list.find(function(x){return x.id===document.getElementById("i-home").value}),a=list.find(function(x){return x.id===document.getElementById("i-away").value});if(!h||!a)return;
var ls=asList(lab?.teams),lh=ls.find(function(x){return x.id===h.id}),la=ls.find(function(x){return x.id===a.id});
var metrics=[["Power Index",h.power,a.power,false],["Διαφορά πόντων / αγώνα",h.margin,a.margin,false],["Επιθετικό rating",lh?.ortg,la?.ortg,false],["Αμυντικό rating",lh?.drtg,la?.drtg,true],["eFG%",lh?.efg==null?null:lh.efg*100,la?.efg==null?null:la.efg*100,false],["Turnover rate",lh?.tovPct==null?null:lh.tovPct*100,la?.tovPct==null?null:la.tovPct*100,true],["Επιθετικά ριμπάουντ %",lh?.orbPct==null?null:lh.orbPct*100,la?.orbPct==null?null:la.orbPct*100,false],["Free-throw rate",lh?.ftr==null?null:lh.ftr*100,la?.ftr==null?null:la.ftr*100,false],["Ρυθμός (pace)",lh?.pace,la?.pace,false]];
var txt='<div class="i-card"><div class="i-headtohead"><b>'+esc(h.abbr)+'</b><span>METRIC</span><b>'+esc(a.abbr)+'</b></div>'+metrics.map(function(m){var av=num(m[1]),bv=num(m[2]),better=av!=null&&bv!=null?(m[3]?av<bv:av>bv):false,other=av!=null&&bv!=null?(m[3]?bv<av:bv>av):false;
return '<div class="i-comparison"><strong class="'+(better?"i-up":"")+'">'+val(av,1)+'</strong><span>'+esc(m[0])+'</span><strong class="'+(other?"i-up":"")+'">'+val(bv,1)+'</strong></div>'}).join("")+'</div>';
if(!lab?.teams)txt+='<div class="i-card i-note">Δεν ήταν διαθέσιμα τα advanced team stats. Εμφανίζονται μόνο τα επαληθευμένα στοιχεία του power feed.</div>';
txt+=box("Πώς διαβάζεται",'<p class="i-note">Οι επισημάνσεις συγκρίνουν τρέχοντα μετρήσιμα μεγέθη. Δεν ισοδυναμούν με πιθανότητα νίκης. Τα advanced προέρχονται από επεξεργασία πρόσφατων ESPN box scores και ενδέχεται να έχουν μερική κάλυψη.</p>');
document.getElementById("i-matchup").innerHTML=txt+mark("ESPN public box scores / NBA ATLAS methodology · "+date(p.asOf||Date.now()))}
}catch(e){err(e.message)}
}
async function rotation(){
set(box("Rotation X-Ray","Εντοπισμός πρόσφατων ολοκληρωμένων αγώνων…"));
try{var dates=[];for(var i=0;i<5;i++){var d=new Date(Date.now()-i*86400000);dates.push(d.toISOString().slice(0,10).replace(/-/g,""))}
var scores=await many(dates.map(function(x){return "data?type=scoreboard&date="+x}));var games=[],seen=new Set();scores.forEach(function(s){asList(s?.games).forEach(function(g){if(g.state==="post"&&!seen.has(g.id)){games.push(g);seen.add(g.id)}})});games.sort(function(a,b){return String(b.date).localeCompare(String(a.date))});if(!games.length){err("Δεν βρέθηκαν ολοκληρωμένοι αγώνες στις τελευταίες πέντε ημερολογιακές ημέρες.");return}
set('<label class="i-field">Ολοκληρωμένος αγώνας <select id="i-rotgame">'+games.slice(0,30).map(function(g){return '<option value="'+esc(g.id)+'">'+esc(g.away?.abbr)+" @ "+esc(g.home?.abbr)+' · '+date(g.date)+'</option>'}).join("")+'</select></label><div id="i-rotation"></div>');
document.getElementById("i-rotgame").onchange=paint;await paint();
async function paint(){var id=document.getElementById("i-rotgame")?.value,host=document.getElementById("i-rotation");if(!host)return;host.innerHTML=box("Box score","Φόρτωση…");
try{var g=await get("data?type=game&id="+encodeURIComponent(id));var out='<div class="i-grid">';
asList(g.players).forEach(function(team){var athletes=asList(team.groups).flatMap(function(z){return asList(z.athletes).map(function(a){var stats=Object.fromEntries(asList(z.labels).map(function(k,i){return [String(k).toUpperCase(),a.stats?.[i]]}));return {a:a.athlete,starter:!!a.starter,points:num(stats.PTS),min:stats.MIN||"—",reb:num(stats.REB),ast:num(stats.AST)}})}).filter(function(x){return x.a?.name});
var starters=athletes.filter(function(x){return x.starter}),bench=athletes.filter(function(x){return !x.starter});var row=function(x){return '<div class="i-line"><strong>'+esc(x.a.name)+'</strong><span>'+val(x.points,0)+' PTS</span><small>'+esc(x.min)+' MIN · '+val(x.reb,0)+' REB · '+val(x.ast,0)+' AST</small></div>'};
out+=box(team.team?.abbr||"Ομάδα",'<p class="i-note">'+starters.length+' βασικοί · '+bench.length+' αναπληρωματικοί</p><h3>Βασική πεντάδα</h3><div class="i-stack">'+(starters.map(row).join("")||"Δεν υπάρχουν δεδομένα starters.")+'</div><h3>Πάγκος</h3><div class="i-stack">'+bench.map(row).join("")+'</div>')}
);out+='</div>'+box("Περιορισμός δεδομένων",'<p class="i-note">Πραγματικές αρχικές πεντάδες και λεπτά/πόντοι ανά παίκτη από το box score. Δεν παρουσιάζεται πλασματικό on/off ή five-man net rating: αυτά απαιτούν δεδομένα κατοχών και αλλαγών παικτών που δεν καλύπτει το συγκεκριμένο feed.</p>');
host.innerHTML=out+mark("ESPN game box score · "+date(Date.now()))}catch(e){host.innerHTML=box("Δεν φορτώθηκε ο αγώνας",esc(e.message))}}}
catch(e){err(e.message)}}
async function era(){
set('<div class="i-card"><p class="i-note">Υποθετική αριθμητική μεταφορά παραγωγής σε άλλο αγωνιστικό ρυθμό. Δεν προβλέπει πώς θα έπαιζε πράγματι κάποιος σε διαφορετική εποχή.</p></div><label class="i-field">Παίκτης <select id="i-era-player">'+FAV.map(function(x){return '<option value="'+x[0]+'">'+esc(x[1])+'</option>'}).join("")+'</select></label><label class="i-field">Υποθετικές κατοχές ανά 48 λεπτά <input id="i-era-pace" type="range" min="85" max="110" value="100" step="1"><strong id="i-era-pv">100</strong></label><div id="i-era-rows"></div>');
document.getElementById("i-era-player").onchange=load;document.getElementById("i-era-pace").oninput=function(){document.getElementById("i-era-pv").textContent=this.value;load(false)};
var saved=null;await load();
async function load(fetchAgain){var id=document.getElementById("i-era-player")?.value,host=document.getElementById("i-era-rows");if(!host)return;var pace=Number(document.getElementById("i-era-pace").value);if(fetchAgain!==false||!saved||saved.id!==id){host.innerHTML=box("Season history","Φόρτωση…");try{saved={id,data:await get("history?type=player&id="+id)}}catch(e){host.innerHTML=box("Δεν υπάρχουν δεδομένα",esc(e.message));return}}
var rows=asList(saved.data?.regular?.seasonRows),seen=new Map();rows.forEach(function(r){var g=num(r.stats?.gamesPlayed)||0;if(!seen.has(r.season)||(num(seen.get(r.season).stats.gamesPlayed)||0)<g)seen.set(r.season,r)});
var arr=[...seen.values()].filter(function(r){return num(r.stats.avgPoints)!=null&&num(r.stats.gamesPlayed)>=10}).sort(function(a,b){return a.season-b.season});
if(!arr.length){host.innerHTML=box("Ανεπαρκή δεδομένα","Δεν υπάρχουν συγκρίσιμες σεζόν.");return}
var html='<div class="i-grid">'+arr.map(function(r){var pts=num(r.stats.avgPoints),as=num(r.stats.avgAssists),re=num(r.stats.avgRebounds),factor=pace/100;return box(String(r.season-1)+"–"+String(r.season).slice(-2),'<div class="i-big">'+val(pts*factor,1)+' <small>PTS</small></div><p>'+val((as||0)*factor,1)+' AST · '+val((re||0)*factor,1)+' REB</p><p class="i-note">Πραγματικά '+val(pts,1)+' PPG · κανονικοποίηση από ουδέτερη βάση 100 σε '+pace+' κατοχές.</p>')}).join("")+'</div>';
html+=box("Μεθοδολογία",'<p class="i-note">Υποθετικός συντελεστής = επιλεγμένος ρυθμός / 100. Η βάση των 100 κατοχών είναι παράμετρος του σεναρίου, ΟΧΙ ιστορικά τεκμηριωμένος ρυθμός για κάθε έτος. Δεν γίνεται προσαρμογή ανά λεπτό συμμετοχής, αμυντικό περιβάλλον ή skill translation. Συνεπώς πρόκειται μόνο για what-if οπτικοποίηση.</p>');
host.innerHTML=html+mark("ESPN actual season averages / user-selected arithmetic scenario")}}
function dynasty(){
var A=window.ATLAS_DATA||{},f=asList(A.finals),teams=A.teams||{};
if(!f.length){err("Δεν υπάρχει διαθέσιμο ιστορικό τελικών.");return}
var groups=new Map();f.forEach(function(r){var y=+r[0],code=r[1],fr=teams[code]?.[1]||code;if(!Number.isFinite(y))return;if(!groups.has(fr))groups.set(fr,[]);groups.get(fr).push(y)});
var list=[...groups].map(function(e){var ys=e[1].sort(function(a,b){return a-b}),runs=[],current=[];ys.forEach(function(y){if(!current.length||y-current[current.length-1]===1)current.push(y);else{runs.push(current);current=[y]}});if(current.length)runs.push(current);
return {id:e[0],name:teams[e[0]]?.[0]||e[0],years:ys,count:ys.length,run:runs.sort(function(a,b){return b.length-a.length})[0]||[]}}).sort(function(a,b){return b.count-a.count||a.name.localeCompare(b.name)});
var controls='<label class="i-field">Franchise <select id="i-dynasty-team"><option value="">Όλες οι ομάδες</option>'+list.map(function(t){return '<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>'}).join("")+'</select></label><div id="i-dynasty-list"></div>';
set(controls);document.getElementById("i-dynasty-team").onchange=paint;paint();
function paint(){var selected=document.getElementById("i-dynasty-team").value,arr=selected?list.filter(function(t){return t.id===selected}):list;document.getElementById("i-dynasty-list").innerHTML='<div class="i-grid">'+arr.map(function(t){return box(t.name,'<div class="i-big">'+t.count+' <small>τίτλοι</small></div><p><b>Μεγαλύτερη συνεχόμενη σειρά:</b> '+t.run.length+' ('+t.run.join(", ")+')</p><div class="i-yearlist">'+t.years.map(function(y){return '<span>'+y+'</span>'}).join("")+'</div>')}).join("")+'</div>'+box("Πηγή και όρια",'<p class="i-note">Υπολογισμός από το ήδη ενσωματωμένο ιστορικό τελικών NBA ATLAS (1947–2026), με ομαδοποίηση franchise. Συνεχόμενη δυναστεία εδώ σημαίνει διαδοχικούς τίτλους, όχι υποκειμενική αξιολόγηση ισχύος. Διάδοχοι παλαιών franchises χρησιμοποιούν τη χαρτογράφηση του αρχείου.</p>')}}
function nav(){var links=document.getElementById("links");if(links&&!links.querySelector('[data-r="shift"]'))links.insertAdjacentHTML("beforeend",'<a href="#/shift" data-r="shift">SHIFT</a><a href="#/legacy" data-r="legacy">Legacy</a><a href="#/matchup" data-r="matchup">Matchups</a><a href="#/dynasty" data-r="dynasty">Dynasties</a>');
var path=(location.hash.replace(/^#\/?/,"").split(/[/?]/)[0]||"home");
if(pages[path]){document.querySelectorAll("#links [data-r]").forEach(function(a){a.classList.toggle("on",a.dataset.r===path)});
if(!document.getElementById("atlas-i-page-"+path)){root.innerHTML=shell(path,names[path],desc[path]);pages[path]()}return}
if(path==="menu"){var grid=root.querySelector(".grid.g2");if(grid&&!grid.querySelector("[data-i-card]"))grid.insertAdjacentHTML("afterbegin",Object.keys(pages).map(function(k){return '<a data-i-card class="card" href="#/'+k+'"><div class="eyebrow">ATLAS INTELLIGENCE</div><div class="h2" style="font-size:27px">'+names[k]+'</div><p class="muted">'+desc[k]+'</p></a>'}).join(""))}
if(path==="home"&&!document.getElementById("i-home-teaser")){var h=root.querySelector("#hero");if(h)h.insertAdjacentHTML("afterend",'<section class="sec i-home" id="i-home-teaser"><div class="i-kicker">ATLAS INTELLIGENCE</div><h2 class="h2">Discover what matters</h2><div class="i-tiles">'+Object.keys(pages).map(function(k){return '<a class="i-tile" href="#/'+k+'"><strong>'+names[k]+'</strong><small>'+desc[k]+'</small></a>'}).join("")+'</div></section>')}}
var delay;new MutationObserver(function(){clearTimeout(delay);delay=setTimeout(nav,90)}).observe(root,{subtree:true,childList:true});
addEventListener("hashchange",function(){setTimeout(nav,110)});nav();
})();
