/* Daily Prediction Audit: NBA slate in America/New_York, original locked forecasts. */
(function(){
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const F=(x,k=1)=>N(x)===null?'—':Number(x).toFixed(k);
const P=x=>N(x)===null?'—':Math.round(x*100)+'%';
function summary(d){
 const a=d?.audit,day=a?.days?.find(x=>x.date===a.latestDate),l=d?.learning;
 if(!day)return '<a href="#/daily" class="card da-brief"><div class="eyebrow">PREDICTION AUDIT</div><b>Δεν έχουν καταγραφεί ολοκληρωμένα παιχνίδια.</b></a>';
 return '<a href="#/daily" class="card da-brief"><div><div class="eyebrow">PREDICTION AUDIT · '+E(day.date)+'</div><h3 class="h3">Τι πέτυχε το μοντέλο χθες;</h3><span class="muted">'+day.settled+' αξιολογημένοι · '+day.misses+' λάθη · '+(day.pending?'Μερική αγωνιστική':'Ολοκληρωμένη αγωνιστική')+'</span></div><div class="da-brief-k"><strong>'+P(day.accuracy)+'</strong><small>Σωστός νικητής</small></div><div class="da-brief-k"><strong>'+F(day.brier,3)+'</strong><small>Brier</small></div><span class="more">Πλήρης ανάλυση →</span></a>';
}
function explain(g){
 return '<ul>'+g.reasons.map(x=>'<li>'+E(x)+'</li>').join('')+'</ul><p class="da-caveat">Πρόκειται για ενδείξεις από το σκορ και το σφάλμα, όχι απόδειξη αιτίας (π.χ. τραυματισμός, άμυνα, προπονητής).</p>';
}
function match(g){
 const f=g.predicted||{},c=g.correct;
 return '<details class="da-game '+(c?'da-win':'da-loss')+'"><summary><span class="da-status '+(c?'good':'bad')+'">'+(c?'✓':'✗')+'</span><span class="da-game-name"><b>'+E(g.awayCode)+' @ '+E(g.homeCode)+'</b><small>Αρχικό '+P(g.p)+' γηπεδ. · νικητής '+E(g.winner==='HOME'?g.homeCode:g.awayCode)+'</small></span><span class="da-game-score"><b>'+g.actual.away+'–'+g.actual.home+'</b><small>Πρόβλ. '+(f.away===null?'—':Math.round(f.away))+'–'+(f.home===null?'—':Math.round(f.home))+'</small></span></summary><div class="da-game-detail"><div class="da-mini"><span>Brier: '+F(g.brier,3)+'</span><span>Διαφορά ±: '+(N(g.marginError)===null?'—':F(Math.abs(g.marginError)))+'</span><span>Σκορ MAE: '+F(g.scoreError)+'</span></div>'+explain(g)+'<a class="more" href="#/game/'+encodeURIComponent(g.id.split(':').pop())+'">Αγώνας & box score →</a></div></details>';
}
function kpi(v,label,sub){return '<div class="card da-kpi"><div class="lbl">'+E(label)+'</div><strong>'+E(v)+'</strong><small>'+E(sub)+'</small></div>'}
function ml(l,future){
 if(!l)return '<p class="muted">Δεν υπάρχουν δεδομένα ML.</p>';
 const verified=l.active;
 const left=l.baseline?.brier,right=l.challenger?.brier;
 return '<div class="da-ml-top"><div><div class="eyebrow">ONLINE ML · CHAMPION / CHALLENGER</div><h3 class="h3">'+(verified?'Βαθμονομητής ενεργός':'ML σε αξιολόγηση')+'</h3><p class="muted">'+E(l.reason||'')+'</p></div><div class="da-status-panel '+(verified?'good':'')+'">'+(verified?'VALIDATED':'SHADOW MODE')+'</div></div><div class="da-ml-grid">'+
 kpi(l.sample||0,'Ολοκληρωμένοι αγώνες','Κλειδωμένοι πριν τον αγώνα')+
 kpi(l.train||0,'Training sample','Τα παλιότερα 75%')+
 kpi(l.holdout||0,'Χρονικό holdout','Τα επόμενα 25%, εκτός εκπαίδευσης')+
 kpi(F(left,3)+' → '+F(right,3),'Brier: αρχικό → ML','Μικρότερο = καλύτερο')+'</div>'+
 '<p class="note">Μοντέλο: regularized logistic calibration (Platt scaling). Επανεκπαίδευση από το νεότερο αρχείο σε κάθε ενημέρωση· αυτόματη χρήση μόνο αν το χρονικό holdout μειώνει Brier και log loss τουλάχιστον κατά 0,003. Οι αρχικές προβλέψεις δεν ξαναγράφονται. Η αναδρομική δοκιμή δεν εξασφαλίζει μελλοντική βελτίωση.</p>'+
 (verified&&future?.length?'<div class="eyebrow">ML FORECAST SHADOW / UPCOMING</div><div class="da-ml-previews">'+future.filter(x=>x.ml?.used).slice(0,8).map(x=>'<div><b>'+E(x.awayCode)+' @ '+E(x.homeCode)+'</b><span>Αρχική '+P(x.forecast.homeWinProb)+' → ML '+P(x.ml.adjustedProb)+'</span></div>').join('')+'</div>':'<p class="muted">Η δημόσια πρόβλεψη παραμένει η αρχική. Η νέα βαθμονόμηση εμφανίζεται μόνο όταν περάσει το κριτήριο βελτίωσης.</p>');
}
async function render(view,get,valid,query){
 view.innerHTML='<div class="sec-h"><div><div class="eyebrow">NBA ATLAS · MODEL INTELLIGENCE</div><h1 class="h1">Prediction audit.</h1><p class="lede">Τι πετύχαμε, τι χάσαμε, τι μάθαμε.</p></div><a href="#/model" class="more">Συνολικό audit →</a></div><section class="card" id="da-body">Ανάκτηση κλειδωμένων προβλέψεων…</section>';
 try{const d=await get();if(!valid()||!view.isConnected)return;const a=d?.audit;if(!a?.days?.length){view.querySelector('#da-body').innerHTML='Δεν υπάρχουν ακόμη αποτελέσματα.';return}
 const dated=a.days.filter(x=>x.settled>0);
 let selected=dated.find(x=>x.date===query?.date)?.date||a.latestDate;
 view.innerHTML='<div class="sec-h"><div><div class="eyebrow">NBA ATLAS · MODEL INTELLIGENCE</div><h1 class="h1">Prediction audit.</h1><p class="lede">Κάθε αγωνιστική ημέρα, διαπιστωμένα λάθη και έλεγχος machine learning.</p></div><a href="#/model" class="more">Συνολικά στατιστικά →</a></div>'+
 '<section class="card da-toolbar"><label for="da-date">Αγωνιστική ημέρα (ώρα NBA / Ανατολικής ακτής)</label><select id="da-date">'+dated.map(x=>'<option value="'+E(x.date)+'">'+E(x.date)+' · '+x.settled+' ολοκληρωμένοι</option>').join('')+'</select><span class="muted">Τα αποτελέσματα βασίζονται σε κλειδωμένες προβλέψεις πριν από το τζάμπολ.</span></section>'+
 '<section id="da-report"></section>'+
 '<section class="sec card" id="da-ml"></section>'+
 '<section class="sec card"><div class="eyebrow">TRACK RECORD · DAILY</div><h3 class="h3">Πορεία αποτελεσμάτων</h3><div class="da-history" id="da-history"></div></section>';
 const $=s=>view.querySelector(s);
 $('#da-date').value=selected;
 const days=()=>dated.slice(0,21);
 $('#da-history').innerHTML=days().map(x=>'<button data-day="'+E(x.date)+'"><b>'+E(x.date)+'</b><strong>'+P(x.accuracy)+'</strong><i><em style="width:'+Math.round((x.accuracy||0)*100)+'%"></em></i><small>'+x.settled+' αγ. · Brier '+F(x.brier,3)+'</small></button>').join('');
 $('#da-history').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#da-date').value=b.dataset.day;selected=b.dataset.day;paint();$('#da-report').scrollIntoView({behavior:'smooth',block:'start'})});
 function paint(){const x=a.days.find(x=>x.date===selected);if(!x)return;
 $('#da-report').innerHTML='<div class="da-head"><div><div class="eyebrow">FINAL / '+E(x.date)+'</div><h2 class="h2">'+(x.settled-x.misses)+' / '+x.settled+' σωστοί νικητές</h2><p class="muted">'+(x.pending?'Μερική κάλυψη: '+x.pending+' αγώνες χωρίς τελικό στο αρχείο.':'Όλοι οι καταγεγραμμένοι αγώνες έχουν τελικό.')+'</p></div><span class="da-big">'+P(x.accuracy)+'</span></div>'+
 '<div class="da-kpis">'+kpi(P(x.accuracy),'Ακρίβεια νικητή','Επί των αξιολογημένων')+kpi(F(x.brier,3),'Brier Score','Πιθανότητες, 0 = τέλειο')+kpi(F(x.marginMAE),'Διαφορά MAE','Σφάλμα πόντων')+kpi(x.highConfidenceMisses,'High-confidence misses','Λάθη με βεβαιότητα ≥75%')+'</div>'+
 '<section class="card"><div class="eyebrow">WHAT MISSED & WHY</div><h3 class="h3">Αγώνες που δεν προβλέφθηκαν σωστά</h3>'+(x.misses?x.games.filter(g=>!g.correct).sort((a,b)=>a.actualWinnerProb-b.actualWinnerProb).map(match).join(''):'<p class="muted">Όλοι οι διαθέσιμοι νικητές προβλέφθηκαν σωστά.</p>')+'</section>'+
 '<section class="card da-correct"><div class="eyebrow">WHAT WORKED</div><h3 class="h3">Επιτυχημένες προβλέψεις</h3>'+x.games.filter(g=>g.correct).sort((a,b)=>b.confidence-a.confidence).map(match).join('')+'</section>'+
 '<p class="note">Το Brier αξιολογεί ολόκληρη την πιθανότητα, όχι μόνο αν πετύχαμε τον νικητή. Η εξήγηση κάθε αστοχίας είναι παρατηρησιακή (score residuals), όχι αιτιώδης ανάλυση τραυματισμών, rotations ή τακτικής χωρίς αντίστοιχα δεδομένα.</p>';
 }
 $('#da-date').onchange=e=>{selected=e.target.value;paint()};
 $('#da-ml').innerHTML=ml(d.learning,d.records?.filter(x=>x.ml?.used));paint();
 }catch(e){if(valid()&&view.isConnected)view.innerHTML='<section class="card"><h2 class="h3">Prediction Audit</h2><p>Το αρχείο δεν είναι διαθέσιμο αυτή τη στιγμή.</p></section>'}
}
window.AtlasDaily={render,summary};
})();