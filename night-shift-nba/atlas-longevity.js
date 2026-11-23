/* All-time Longevity Lab: production, prime, decline and peer-relative comparisons. */
(function(){
'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=(v,d=1)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('el-GR',{minimumFractionDigits:d,maximumFractionDigits:d});
const yr=y=>Number(y)?(Number(y)-1)+'–'+String(y).slice(-2):'—';
const get=async params=>{const r=await fetch('/api/history?'+new URLSearchParams({type:'encyclopedia',mode:'longevity',...params}),{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'History feed not available');return d.data||d};
const palette=['var(--hot2)','#7cc4ff'];
const metrics=[['pra','PRA / αγώνα'],['relative','Εκατοστημόριο εποχής']];
const n=(x)=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const poly=(points,color,area)=>points.length?'<polyline points="'+points.map(x=>x.join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />':'';
function chart(a,b,mode){
 const w=800,h=230,pt=32,pb=34,top=18,left=44,right=18;
 const all=[...(a?.rows||[]),...(b?.rows||[])],valid=all.filter(s=>n(mode==='pra'?s.pra:s.percentile)!==null);
 if(!valid.length)return '<p class="muted">Δεν υπάρχουν συγκρίσιμες σεζόν.</p>';
 const maxX=Math.max(5,...all.map(x=>x.careerYear));const maxY=mode==='pra'?Math.ceil(Math.max(10,...valid.map(x=>x.pra))*1.1/10)*10:100;
 const x=i=>left+(i-1)/(maxX-1)*(w-left-right),y=v=>h-pb-(v/maxY)*(h-pb-top);
 const axes=[0,.25,.5,.75,1].map(q=>{let yy=y(maxY*q);return '<line x1="'+left+'" x2="'+(w-right)+'" y1="'+yy+'" y2="'+yy+'" stroke="currentColor" opacity=".16"/><text x="'+(left-9)+'" y="'+(yy+4)+'" text-anchor="end" fill="currentColor" opacity=".7" font-size="11">'+Math.round(maxY*q)+'</text>'}).join('');
 const lines=[a,b].map((p,i)=>{if(!p)return'';const pts=p.rows.filter(r=>n(mode==='pra'?r.pra:r.percentile)!==null).map(r=>[x(r.careerYear),y(mode==='pra'?r.pra:r.percentile)]);
 return poly(pts,palette[i])+(mode==='pra'&&p.primeStart?'<rect x="'+x(Math.max(1,p.rows.find(r=>r.season===p.primeStart)?.careerYear||1))+'" width="'+Math.max(4,x((p.rows.find(r=>r.season===p.primeEnd)?.careerYear||1))-x(p.rows.find(r=>r.season===p.primeStart)?.careerYear||1))+'" y="'+top+'" height="'+(h-top-pb)+'" fill="'+palette[i]+'" opacity=".055"/>':'')+
 p.rows.map(r=>n(mode==='pra'?r.pra:r.percentile)!==null?'<circle cx="'+x(r.careerYear)+'" cy="'+y(mode==='pra'?r.pra:r.percentile)+'" r="3.2" fill="'+palette[i]+'"><title>'+E(p.name)+' · '+yr(r.season)+' · PRA '+F(r.pra)+' · Top '+F(100-r.percentile,0)+'% εποχής</title></circle>':'').join('')}).join('');
 const labels=Array.from({length:Math.min(maxX,9)},(_,i)=>1+Math.round(i*(maxX-1)/Math.max(1,Math.min(maxX,9)-1))).filter((v,i,a)=>a.indexOf(v)===i);
 return '<div class="lo-svg-wrap"><svg class="lo-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Σύγκριση '+E(mode==='pra'?'PRA ανά αγώνα':'εκατοστημορίου εποχής')+' ανά καταγεγραμμένη αγωνιστική σεζόν"><g>'+axes+lines+'</g>'+labels.map(n=>'<text x="'+x(n)+'" y="'+(h-9)+'" text-anchor="middle" font-size="11" fill="currentColor">'+n+'</text>').join('')+'</svg></div><p class="lo-axis">Οριζόντια: αριθμός καταγεγραμμένης επιλέξιμης σεζόν · κάθε σημείο είναι πραγματική ολοκληρωμένη σεζόν. Ίσες αποστάσεις δεν σημαίνουν πάντα ίσες ημερολογιακές χρονιές.</p>';
}
const stat=(label,a,b,unit='')=>'<div><small>'+E(label)+'</small><b>'+F(a,unit?1:0)+E(unit)+'</b><span>'+F(b,unit?1:0)+E(unit)+'</span></div>';
const phase=x=>'<div class="lo-phase">'+[['rise','ΑΝΟΔΟΣ'],['prime','PEAK'],['post-prime','ΜΕΤΑ-PEAK'],['decline','DECLINE']].map(([k,label])=>{const n=x.rows.filter(s=>s.phase===k).length;return n?'<div class="lo-phase-'+k+'" style="flex:'+n+'"><b>'+label+'</b><span>'+n+'</span></div>':''}).join('')+'</div>';
function panel(data,host,refresh){
 const a=data.player,b=data.compare;if(!a){host.innerHTML='<p class="muted">Δεν βρέθηκε ιστορική εγγραφή για τον συγκεκριμένο παίκτη. Δοκίμασε την αναζήτηση παρακάτω.</p>'+searchbox();return}
 let mode='pra',compareId=b?.id||'';
 const btn=(metric,label)=>'<button data-lo-metric="'+metric+'" aria-pressed="'+(mode===metric)+'">'+label+'</button>';
 const options=data.top.map(p=>'<option value="'+E(p.id)+'" '+(p.id===compareId?'selected':'')+'>'+E(p.name)+' · '+p.score.toFixed(1)+'</option>').join('');
 host.innerHTML='<div class="lo-head"><div class="eyebrow">CAREER LONGEVITY · ALL ERAS</div><h3 class="h2">Prime. Decline. Legacy.</h3><p class="lede">Πραγματική παραγωγή και σχετική υπεροχή στη δική τους εποχή.</p></div>'+
 '<div class="lo-stats"><div><small>'+E(a.name)+'</small><strong>'+F(a.peakPRA)+'</strong><span>Peak 3-season PRA</span></div><div><small>Prime (90% peak)</small><strong>'+a.primeYears+'</strong><span>σεζόν υψηλής παραγωγής</span></div><div><small>Elite σεζόν</small><strong>'+a.eliteYears+'</strong><span>Top 10% της εποχής</span></div><div><small>Longevity Index</small><strong>'+F(a.score)+'</strong><span>#'+(a.rank||'—')+' · '+a.qualifiedSeasons+' καταγεγρ. σεζόν</span></div></div>'+
 '<div class="lo-controls"><div class="lo-tabs" id="lo-tabs">'+metrics.map(([k,l])=>btn(k,l)).join('')+'</div><label>Σύγκριση με θρύλο<select id="lo-comparator">'+options+'</select></label><form id="lo-other" class="lo-search"><input type="search" id="lo-name" placeholder="Άλλος θρύλος, π.χ. Kobe Bryant…" aria-label="Αναζήτηση παίκτη"><button type="submit">Σύγκρινε</button></form></div>'+
 '<div class="lo-legend"><span><i></i>'+E(a.name)+'</span><span><i></i>'+E(b?.name||'—')+'</span></div><div id="lo-graph"></div>'+
 '<div class="lo-meta">'+
 '<div class="lo-profile"><div class="eyebrow">'+E(a.name)+'</div>'+phase(a)+'<div class="lo-milestones"><span><b>'+yr(a.primeStart)+' – '+yr(a.primeEnd)+'</b> καλύτερη τριετία</span><span><b>'+(a.declineSeason?yr(a.declineSeason):'Δεν εντοπίστηκε')+'</b> πιθανό decline*</span><span><b>'+F(a.totalPRA,0)+'</b> καταγεγραμμένο συνολικό PRA</span><span><b>'+F(a.games,0)+'</b> αγώνες με επαρκή στοιχεία</span></div></div>'+
 (b?'<div class="lo-profile"><div class="eyebrow">'+E(b.name)+'</div>'+phase(b)+'<div class="lo-milestones"><span><b>'+yr(b.primeStart)+' – '+yr(b.primeEnd)+'</b> καλύτερη τριετία</span><span><b>'+(b.declineSeason?yr(b.declineSeason):'Δεν εντοπίστηκε')+'</b> πιθανό decline*</span><span><b>'+F(b.totalPRA,0)+'</b> καταγεγραμμένο συνολικό PRA</span><span><b>'+F(b.eliteYears,0)+'</b> σεζόν κορυφαίου 10%</span></div></div>':'')+'</div>'+
 '<details class="lo-rankings"><summary>All-time Longevity Ranking · '+data.sample.qualified+' παίκτες με ≥6 επιλέξιμες σεζόν</summary><div class="lo-rank-list">'+data.top.slice(0,50).map(p=>'<button data-lo-player="'+E(p.id)+'"><span>#'+p.rank+'</span><b>'+E(p.name)+'</b><small>'+p.eliteYears+' elite · '+p.qualifiedSeasons+' sez.</small><strong>'+F(p.score)+'</strong></button>').join('')+'</div></details>'+
 '<p class="note lo-note">* Decline: πρώτη από δύο συνεχόμενες επιλέξιμες σεζόν με PRA κάτω από 80% της καλύτερης τριετούς επίδοσης, μετά το peak. Δεν προβλέπει οριστική πτώση ή δυνατότητα επιστροφής. Peak: μέγιστος μέσος όρος PRA σε 3 διαδοχικές ολοκληρωμένες σεζόν. Ελίτ: Top 10% έναντι των παικτών της ίδιας σεζόν με επαρκείς αγώνες. Index: 55% elite years / 16 + 25% σεζόν /22 + 20% αγώνες /1600 (με ανώτατο 100). Πρόκειται για διαφανή περιγραφική κατάταξη, όχι επιστημονική εκτίμηση της πραγματικής αξίας. Ιστορικό από 1950–51 λόγω απουσίας αξιόπιστων ριμπάουντ πριν, χωρίς τρέχουσα μερική 2026–27. Πηγή: Basketball-Reference historical snapshot 1/11/2026.</p>';
 // repair templated token if any; public DOM only
 host.innerHTML=host.innerHTML.replace('<b>—</b> σεζόν κορυφαίου 10%','<b>'+b?.eliteYears+'</b> σεζόν κορυφαίου 10%');
 const graph=()=>{host.querySelectorAll('[data-lo-metric]').forEach(bt=>bt.setAttribute('aria-pressed',String(bt.dataset.loMetric===mode)));host.querySelector('#lo-graph').innerHTML=chart(a,b,mode)};
 host.querySelectorAll('[data-lo-metric]').forEach(bt=>bt.onclick=()=>{mode=bt.dataset.loMetric;graph()});
 host.querySelector('#lo-comparator').onchange=e=>refresh({id:a.id,compare:e.target.value});
 host.querySelector('#lo-other').onsubmit=e=>{e.preventDefault();const value=host.querySelector('#lo-name').value.trim();if(value)refresh({id:a.id,compareName:value})};
 host.querySelectorAll('[data-lo-player]').forEach(bt=>bt.onclick=()=>refresh({id:bt.dataset.loPlayer,compare:a.id}));
 graph();
}
function searchbox(){return '<a href="#/archive">Αναζήτηση όλων των παικτών →</a>'}
async function embed({name,id,valid}){
 const section=document.createElement('section');section.className='sec card lo-root';section.id='atlas-longevity';
 const archive=document.querySelector('#ar-main');const playerPage=document.querySelector('.phero');const career=document.querySelector('.phero~section.sec.card');
 if(archive){archive.append(section)}else if(career){career.after(section)}else if(playerPage){playerPage.after(section)}else return;
 section.innerHTML='<p class="muted">Υπολογισμός σύγκρισης εποχών…</p>';
 let cycle=0;
 async function refresh(q){const current=++cycle;section.innerHTML='<p class="muted">Ανάλυση ιστορικών δεδομένων…</p>';try{const data=await get(q);if(!valid()||!section.isConnected||current!==cycle)return;panel(data,section,refresh)}catch(e){if(valid()&&section.isConnected)section.innerHTML='<p class="muted">Ιστορική σύγκριση προσωρινά μη διαθέσιμη.</p>'}}
 await refresh(id?{id}:{name});
}
async function page(view,valid){
 view.innerHTML='<header class="ad-head"><div class="eyebrow">NBA ATLAS / LONGEVITY LAB</div><h1>Prime to decline<span>.</span></h1><p>Όλες οι εποχές · από την παραγωγή στην αντοχή του χρόνου.</p></header><section class="sec card lo-root" id="lo-content"><p class="muted">Ανάκτηση ιστορικού…</p></section>';
 const section=view.querySelector('#lo-content');let cycle=0;
 async function refresh(q){const current=++cycle;section.innerHTML='<p class="muted">Φόρτωση…</p>';try{const data=await get(q);if(!valid()||!section.isConnected||current!==cycle)return;panel(data,section,refresh)}catch{if(valid()&&section.isConnected)section.innerHTML='<p class="muted">Η ιστορική κατάταξη δεν είναι διαθέσιμη.</p>'}}
 await refresh({name:'LeBron James',compareName:'Michael Jordan'});
}
window.AtlasLongevity={embed,page,chart};
})();