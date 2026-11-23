(()=>{'use strict';
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p=x=>x==null?'—':Math.round(100*x)+'%';
const n=x=>x==null||!Number.isFinite(Number(x))?'—':Number(x).toFixed(1);
const date=x=>new Date(x).toLocaleString('el-GR',{timeZone:'Europe/Athens',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
let cache,at=0,timer;
async function load(force=false){if(!force&&cache&&Date.now()-at<90000)return cache;const r=await fetch('/api/intel?type=pregame',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Feed unavailable');at=Date.now();return cache={data:d,map:Object.fromEntries((d.games||[]).map(x=>[x.id,x]))}}
function block(x){
 const a=x.away||{},h=x.home||{},v=x.live||x.original,live=x.state==='live',signals=x.live?.signals||[];
 return '<article class="card pg-card"><div class="pg-top"><span class="eyebrow">'+(live?'LIVE · 2 MIN':x.state==='archive-only'?'ORIGINAL LOCKED':'INCOMPLETE')+'</span><small>'+e(date(x.date))+'</small></div><div class="pg-teams"><div><img src="'+e(a.logo||'')+'" alt=""><b>'+e(a.abbr)+'</b></div><span>VS</span><div><img src="'+e(h.logo||'')+'" alt=""><b>'+e(h.abbr)+'</b></div></div>'+
 (v?'<div class="pg-probs"><div><strong>'+p(1-v.homeWinProb)+'</strong><small>'+e(a.abbr)+'</small></div><div><strong>'+p(v.homeWinProb)+'</strong><small>'+e(h.abbr)+'</small></div></div><div class="pg-track"><i style="width:'+(v.homeWinProb*100)+'%"></i></div><p class="pg-score">Πρόβλεψη '+(v.awayPts==null?'—':Math.round(v.awayPts))+'–'+(v.homePts==null?'—':Math.round(v.homePts))+'</p>':'<p class="muted">'+e(x.reason||'Χωρίς εκτίμηση')+'</p>')+
 (live?'<div class="pg-drivers">'+signals.filter(s=>s.available).map(s=>'<div><span>'+e(s.name)+'</span><b class="'+(s.points>0?'good':s.points<0?'bad':'')+'">'+(s.points>0?'+':'')+n(s.points)+' π.</b></div>').join('')+'</div><small class="pg-asof">Ανανεώθηκε '+e(date(x.asOf))+' · κλείδωμα '+e(date(x.lockAt))+'</small>':'')+
 '<a href="#/game/'+encodeURIComponent(x.id)+'" class="more">Αγώνας →</a></article>'
}
function digest(d){
 const a=(d?.games||[]).filter(x=>x.state==='live');
 return '<a class="card pg-digest" href="#/pregame"><div><div class="eyebrow">ATLAS LIVE PREGAME</div><h3 class="h3">Οι προβλέψεις αλλάζουν έως 5΄ πριν τον αγώνα</h3><small>'+a.length+' ζωντανές εκτιμήσεις · ανανέωση ανά 2 λεπτά</small></div>'+(a.length?'<div class="pg-brief"><strong>'+p(a[0].live.homeWinProb)+'</strong><small>'+e(a[0].home.abbr)+' @ '+e(a[0].away.abbr)+'</small></div>':'')+'<span class="more">Άνοιγμα →</span></a>';
}
function stop(){if(timer){clearInterval(timer);timer=null}}
function page(view,valid){
 stop();view.innerHTML='<header class="pg-hero"><div class="eyebrow">PREGAME ENGINE · LIVE</div><h1 class="h1">Before tipoff.</h1><p class="lede">Νέα ανάλυση ισχύος, φόρμας, απουσιών, ξεκούρασης και ML πριν από κάθε παιχνίδι.</p><div id="pg-status" class="pg-status">Ανάκτηση δεδομένων…</div></header><div class="pg-grid" id="pg-grid"><div class="card">Φόρτωση…</div></div><section class="sec card"><div class="eyebrow">HOW THE MODEL WORKS</div><h3 class="h3">Έλεγχος διαφάνειας</h3><p>Τα δεδομένα ανανεώνονται στον server όταν ζητούνται και ανά 2 λεπτά όσο αυτή η οθόνη είναι ανοιχτή. Μόνο οι ML διορθώσεις που περνούν τον χρονικό έλεγχο Brier και log loss ενεργοποιούνται.</p><p class="note">Σταματά η δυναμική επανεκτίμηση 5 λεπτά πριν από το τζάμπολ. Έπειτα προβάλλεται η αρχική αρχειοθετημένη πρόβλεψη, όχι υποτιθέμενο τελικό live snapshot. Χωρίς μόνιμη καταγραφή, τα δυναμικά snapshots δεν αποτελούν αποδεικτικό ιστορικό. Δεν διαθέτουμε επίσημες τελευταίες πεντάδες ή εγγυημένες προβλέψεις.</p><a href="#/daily" class="more">Daily Prediction Audit →</a></section>';
 async function paint(force=false){try{const {data}=await load(force);if(!valid()||!view.querySelector('#pg-grid'))return;const s=view.querySelector('#pg-status'),c=data.coverage||{};s.innerHTML='<span class="pg-dot"></span> '+e(date(data.asOf))+' · '+(c.live||0)+' LIVE · '+(c.locked||0)+' LOCKED · ML '+(data.ml?.active?'VALIDATED':'SHADOW')+' <button id="pg-reload">Ανανέωση</button>';s.querySelector('#pg-reload').onclick=()=>paint(true);view.querySelector('#pg-grid').innerHTML=data.games?.length?data.games.map(block).join(''):'<div class="card">Δεν υπάρχουν διαθέσιμες προβλέψεις για το επόμενο τριήμερο.</div>'}catch{if(valid()&&view.querySelector('#pg-status'))view.querySelector('#pg-status').textContent='Αδυναμία ενημέρωσης· δοκίμασε ανανέωση.'}}
 paint();timer=setInterval(()=>valid()?paint(true):stop(),120000);
}
function attach(id,valid){const a=document.getElementById('game-insight');if(!a)return;const el=document.createElement('section');el.className='sec';a.before(el);async function paint(){try{const d=await load(true);if(valid()&&el.isConnected)el.innerHTML=d.map[id]?block(d.map[id]):''}catch{}}paint();const t=setInterval(()=>!valid()||!el.isConnected?clearInterval(t):paint(),120000)}
window.AtlasPregame={load,page,digest,attach,stop};
})();