// MONO BASKET — accessible, no-framework client. Immutable vs provisional is explicit.
const $=id=>document.getElementById(id);
const S={view:'radar',day:new Date().toLocaleDateString('en-CA'),data:null,loading:false,serial:0};
const esc=x=>String(x??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const pct=n=>Number.isFinite(n)?(100*n).toFixed(1)+'%':'—';
const num=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
const dt=s=>{try{return new Intl.DateTimeFormat('el-GR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s))}catch{return '—'}};
const tile=(name,val,desc,cls='')=>'<div class="kpi"><div class="label">'+esc(name)+' <span>↗</span></div><strong class="'+cls+'">'+esc(val)+'</strong><p>'+esc(desc)+'</p></div>';
const sample=(n)=>n>0?String(n)+' παιχνίδια':'Δεν υπάρχουν ακόμη ολοκληρωμένα στοιχήματα πρόβλεψης';
function nav(view){
 S.view=view;document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
 const labels={radar:['GAME RADAR','LIVE PREDICTIONS','Game Radar','Προβλέψεις και αναλυτικά σήματα για κάθε παιχνίδι.'],
  models:['MODEL LAB','THE MODEL LAB','Model Lab','Πώς ψηφίζει το κάθε μοντέλο και τι γνωρίζει πραγματικά.'],
  accuracy:['ACCURACY TRACKER','VERIFIED OUTCOMES','Accuracy Tracker','Πραγματική αξιολόγηση μόνο σε προβλέψεις που καταγράφηκαν πριν από το τζάμπολ.'],
  source:['SOURCES & LEARNING','TRANSPARENCY','Sources & Learning','Από πού προέρχονται τα δεδομένα και πώς εκπαιδεύεται το engine.']};
 const [crumb,over,title,desc]=labels[view];$('page-name').textContent=crumb;$('section-overline').textContent=over;$('section-title').textContent=title;$('section-description').textContent=desc;
 $('date-control').hidden=view!=='radar';render();window.scrollTo({top:0,behavior:'smooth'});
}
function stats(data){
 const a=data.stats||{},h=data.history||{};
 $('kpis').innerHTML=tile('HISTORICAL ML ACCURACY',pct(h.winAccuracy),'Χρονολογική ιστορική αξιολόγηση · '+(h.backtest||0)+' παιχνίδια','accent')
 +tile('LOCKED FORECASTS',a.records||0,'Καταγεγραμμένες προ του αγώνα')
 +tile('VERIFIED HIT RATE',pct(a.winnerAccuracy),'Πραγματικές μελλοντικές προβλέψεις · '+(a.n||0)+' τελικοί','orange')
 +tile('HISTORICAL MARGIN MAE',Number.isFinite(h.marginMAE)?num(h.marginMAE,2)+' pts':'—','Elo baseline '+num(h.eloBaselineMAE,2)+' pts');
}
function gameCard(g){
 const f=g.forecast,locked=g.origin==='locked',post=g.state==='post',live=g.state==='in';
 const status=post?'FINAL':live?'LIVE':locked?'LOCKED BEFORE TIPOFF':g.origin==='provisional'?'LIVE MODEL / PROVISIONAL':'NO FORECAST';
 const h=Number.isFinite(f?.homeWinProb)?f.homeWinProb:null;
 const pick=g.pick==='HOME'?'1 · '+g.homeCode:g.pick==='AWAY'?'2 · '+g.awayCode:'Χωρίς ισχυρό σήμα';
 const score=f?num(f.awayPts,0)+' — '+num(f.homePts,0):'Δεν υπάρχει εκτίμηση';
 const votes=(g.votes||[]).map(v=>'<div class="vote"><div><strong>'+esc(v.label||v.id)+'</strong><small>'+esc(v.why||'')+'</small></div><span class="num">'+pct(v.homeWinProb)+'</span><span class="num">'+pct(v.weight)+'</span></div>').join('');
 const cover=Object.entries(g.coverage||{}).filter(([,v])=>v===true).map(([k])=>k).join(' · ')||'Μόνο διαθέσιμα ομαδικά στατιστικά';
 return '<article class="game"><div class="game-head"><span>'+esc(dt(g.date))+' · NBA</span><span class="status-pill '+(locked?'locked':live?'live':'')+'">'+status+'</span></div>'
 +'<div class="matchup"><div class="team"><div class="team-code">'+esc(g.awayCode||'AWAY')+'</div><div class="team-name">'+esc(g.away)+'</div></div><div class="at">@</div><div class="team" style="text-align:right"><div class="team-code">'+esc(g.homeCode||'HOME')+'</div><div class="team-name">'+esc(g.home)+'</div></div></div>'
 +'<div class="scoreline"><span>'+(post?'ΠΡΑΓΜΑΤΙΚΟ':'ΠΡΟΒΛΕΠΟΜΕΝΟ')+' ΣΚΟΡ</span><strong>'+(post&&Number.isFinite(g.awayScore)?esc(g.awayScore)+' — '+esc(g.homeScore):esc(score))+'</strong></div>'
 +(post&&f?'<div class="micro">Πρόβλεψη πριν από τον αγώνα: '+esc(score)+'</div>':'')
 +(f?'<div class="prob-head"><span>ΝΙΚΗ ΓΗΠΕΔΟΥΧΟΥ</span><b>'+pct(h)+'</b></div><div class="bar"><span style="width:'+Math.max(0,Math.min(100,100*h))+'%"></span></div><div class="bar-legends"><span>'+esc(g.awayCode)+' '+pct(1-h)+'</span><span class="right">'+esc(g.homeCode)+' '+pct(h)+'</span></div><div class="pick-row"><span class="pick">Σήμα: <b>'+esc(pick)+'</b></span><span class="model-count">'+esc(g.activeModels||0)+' ΕΝΕΡΓΑ ΜΟΝΤΕΛΑ</span></div>':'<p class="subtle">Το μοντέλο δεν έχει επαρκή στοιχεία για αξιόπιστη εκτίμηση.</p>')
 +(votes?'<details class="details"><summary>Ανάπτυξη μοντέλων &amp; βαρών ('+g.votes.length+')</summary><div class="vote-list">'+votes+'</div><p class="source-tag">Διαθεσιμότητα: '+esc(cover)+'</p></details>':'')
 +(locked?'<div class="source-tag">Κλειδωμένο: '+esc(dt(g.lockedAt))+'. Η πρόβλεψη δεν αλλάζει εκ των υστέρων.</div>':g.origin==='provisional'?'<div class="source-tag">Προσωρινό — ανανεώνεται και ΔΕΝ μετρά ακόμη στην ακρίβεια.</div>':'')+'</article>';
}
function radar(d){
 if(!d.games.length)return '<div class="empty">Δεν βρέθηκαν αγώνες για αυτήν την ημερομηνία ή το upstream feed δεν απάντησε.<br>Δοκίμασε προηγούμενη/επόμενη ημέρα. Το ιστορικό προβλέψεων παραμένει στο Accuracy Tracker.</div>';
 const games=d.games.slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 return '<div class="game-grid">'+games.map(gameCard).join('')+'</div>';
}
function modelLab(d){
 const all=d.games.filter(g=>g.votes?.length);
 const first=all.find(g=>g.state==='pre')||all[0];
 const names=[['scoring','Attack / defence','Επίθεση και άμυνα, προσαρμοσμένες στο μέσο σκοράρισμα του NBA.'],
 ['net','Net-rating strength','Καθαρή διαφορά πόντων των δύο ομάδων.'],
 ['pyth','Pythagorean expectation','Ιστορική σχέση σκοραρίσματος και αναμενόμενων νικών.'],
 ['bayes','Bayesian win rates','Εξομάλυνση νικών–ηττών πριν από το head-to-head.'],
 ['form','Last-10 form','Αποτέλεσμα τελευταίων διαθέσιμων ολοκληρωμένων αγώνων.'],
 ['momentum','Recency-weighted form','Οι πρόσφατοι αγώνες παίρνουν μεγαλύτερο βάρος.'],
 ['elo','Historical Elo','Δυναμική βαθμολογία από προηγούμενα πραγματικά παιχνίδια.'],
 ['conditions','Rest / roster / availability','Ξεκούραση, αριθμός απόντων και σύμπτωση ρόστερ, μόνο όπου υπάρχουν δεδομένα.'],
 ['ridge','Online / validated ridge','Μοντέλο που εκπαιδεύεται χρονολογικά και χρησιμοποιείται μόνο όταν βελτιώνει ιστορικά το baseline.']];
 return '<div class="notice">Δεν «τρέχουν» πάντα εννέα μοντέλα. Το MONO BASKET ενεργοποιεί μια ψήφο μόνο όταν έχει τις απαιτούμενες πηγές. Ιστορικά 66,9% δεν σημαίνει 66,9% σε μελλοντικούς αγώνες.</div>'
 +(first?'<div class="info-card" style="margin-bottom:16px"><h3>Συνδυαστική ψήφος · '+esc(first.awayCode)+' @ '+esc(first.homeCode)+'</h3><p>Διαθέσιμες ψήφοι: '+first.votes.length+' / 9. Πάτησε στο Game Radar για όλες τις προβλέψεις.</p><div class="vote-list">'+first.votes.map(v=>'<div class="vote"><strong>'+esc(v.label||v.id)+'</strong><span class="num">'+pct(v.homeWinProb)+'</span><span class="num">'+pct(v.weight)+'</span></div>').join('')+'</div></div>':'')
 +'<div class="info-grid">'+names.map(([id,n,why])=>'<article class="info-card"><div class="eyebrow small">'+esc(id.toUpperCase())+'</div><h3 style="margin-top:12px">'+esc(n)+'</h3><p>'+esc(why)+'</p></article>').join('')+'</div>';
}
function forecastRow(r){
 const f=r.forecast||{},a=r.actual,hit=a?(f.homeWinProb>=.5)===(a.home>a.away):null;
 return '<tr><td>'+esc(dt(r.tip))+'</td><td>'+esc((r.awayCode||r.away)+' @ '+(r.homeCode||r.home))+'</td>'
 +'<td>'+esc(num(f.awayPts,0)+'–'+num(f.homePts,0))+'</td><td>'+esc(a?num(a.away,0)+'–'+num(a.home,0):'—')+'</td>'
 +'<td>'+pct(f.homeWinProb)+'</td><td class="'+(a?(hit?'tag-ok':'tag-no'):'tag-neutral')+'">'+(a?(hit?'✓ ΕΠΙΤΥΧΙΑ':'✕ ΑΣΤΟΧΙΑ'):'ΑΝΑΜΟΝΗ')+'</td></tr>';
}
function accuracy(d){
 const s=d.stats,h=d.history||{},recent=d.records?.recent||[],pending=d.records?.upcoming||[];
 return '<div class="info-grid">'
 +'<div class="info-card"><span class="eyebrow small">REAL PREGAME FORECASTS</span><h3 style="margin-top:13px">Επαληθευμένες προβλέψεις</h3><div class="metric-big">'+pct(s.winnerAccuracy)+'</div><p>Σε <strong>'+esc(s.n||0)+'</strong> τελειωμένους αγώνες με πραγματικά κλειδωμένη πρόβλεψη, όχι ανακατασκευή εκ των υστέρων.</p><div class="rowline"><span>Score MAE</span><strong>'+num(s.scoreMAE,2)+' pts</strong></div><div class="rowline"><span>Brier</span><strong>'+num(s.brier,4)+'</strong></div><div class="rowline"><span>Confidence picks</span><strong>'+esc(s.decisiveN||0)+'</strong></div></div>'
 +'<div class="info-card"><span class="eyebrow small">HISTORICAL WALK-FORWARD</span><h3 style="margin-top:13px">Παλαιότερη εκπαίδευση</h3><div class="metric-big">'+pct(h.winAccuracy)+'</div><p>Μετρημένο σε <strong>'+esc(h.backtest||0)+'</strong> διαδοχικές ιστορικές δοκιμές. Ο αλγόριθμος μαθαίνει αφού πρώτα βαθμολογηθεί κάθε πρόβλεψη.</p><div class="rowline"><span>Model MAE</span><strong>'+num(h.marginMAE,2)+' pts</strong></div><div class="rowline"><span>Elo baseline MAE</span><strong>'+num(h.eloBaselineMAE,2)+' pts</strong></div><div class="rowline"><span>Training</span><strong>'+esc(h.trained||0)+' games</strong></div></div></div>'
 +'<h3 style="font-family:var(--display);margin-top:29px">Prediction vs reality · ολοκληρωμένα</h3>'
 +(recent.length?'<div class="data-table-wrap"><table><thead><tr><th>Tipoff</th><th>Αγώνας</th><th>Εκτίμηση</th><th>Πραγματικό</th><th>P(home)</th><th>Αποτέλεσμα</th></tr></thead><tbody>'+recent.map(forecastRow).join('')+'</tbody></table></div>':'<div class="empty">Οι πρώτες προβλέψεις έχουν κλειδώσει. Η πραγματική ακρίβεια θα υπολογιστεί όταν ολοκληρωθούν οι αγώνες.</div>')
 +'<h3 style="font-family:var(--display);margin-top:29px">Κλειδωμένα · αναμονή</h3>'
 +(pending.length?'<div class="data-table-wrap"><table><thead><tr><th>Tipoff</th><th>Αγώνας</th><th>Εκτίμηση</th><th>Πραγματικό</th><th>P(home)</th><th>Status</th></tr></thead><tbody>'+pending.map(forecastRow).join('')+'</tbody></table></div>':'<div class="empty">Δεν υπάρχουν αναμενόμενες κλειδωμένες προβλέψεις.</div>')
 +'<div class="notice">Η ιστορική επίδοση 1.021 χρονολογικών tests δεν συγχέεται με την εκτός δείγματος προοπτική ακρίβεια των αποθηκευμένων προβλέψεων. Δεν παρέχεται εγγύηση επιτυχίας ή στοιχηματική συμβουλή.</div>';
}
function sources(d){
 const ds=d.models?.sourceCounts||{},h=d.history||{};
 const rows=[['ESPN NBA scoreboard','Πρόγραμμα αγώνων, κατάσταση και τελικό σκορ'],['ESPN standings','Ομαδικά PPG / αμυντικά PPG και νίκες–ήττες'],['ESPN roster / injuries','Διαθεσιμότητα ρόστερ όπου εκτίθεται από την πηγή'],['GitHub pregame ledger','Χρονοσημασμένη προ του τζάμπολ πρόβλεψη · δεν ξαναγράφεται'],['Historical walk-forward model','Προσομοίωση συνεχούς μάθησης από ολοκληρωμένα παιχνίδια']];
 return '<div class="info-grid"><div class="info-card"><h3>Πηγές δεδομένων</h3>'+rows.map(([n,t])=>'<div class="rowline"><div><strong>'+esc(n)+'</strong><p style="margin:6px 0 2px">'+esc(t)+'</p></div><span>↗</span></div>').join('')+'</div>'
 +'<div class="info-card"><h3>Κάλυψη πηγών</h3><div class="rowline"><span>Ιστορικά ολοκληρωμένα παιχνίδια</span><strong>'+esc(ds.historicalFinals??'—')+'</strong></div><div class="rowline"><span>Ομάδες με roster</span><strong>'+esc(ds.rosterTeams??'—')+'</strong></div><div class="rowline"><span>Ομάδες με ιστορικό roster</span><strong>'+esc(ds.previousRosterTeams??'—')+'</strong></div><div class="rowline"><span>Ομάδες με injury source</span><strong>'+esc(ds.injuryTeams??'—')+'</strong></div><div class="rowline"><span>Παιχνίδια εκπαίδευσης</span><strong>'+esc(h.trained||0)+'</strong></div><div class="rowline"><span>Ιστορική βελτίωση vs Elo</span><strong>'+ (Number.isFinite(h.marginMAE)&&Number.isFinite(h.eloBaselineMAE)?num(h.eloBaselineMAE-h.marginMAE,2)+' pts':'—')+'</strong></div><p class="subtle">Κάλυψη πηγής ≠ γνώση πραγματικού χρόνου συμμετοχής, επιρροής παίκτη ή επιβεβαιωμένης πεντάδας.</p></div></div>'
 +'<div class="info-card" style="margin-top:15px"><h3>Πώς μαθαίνει</h3><p>1. Ο συλλέκτης καταγράφει προβλέψεις πριν από το τζάμπολ σε GitHub Actions.</p><p>2. Μετά το τελικό σκορ ελέγχει νικητή, διαφορά, σύνολο πόντων και πιθανότητα.</p><p>3. Το ιστορικό ML εκπαιδεύεται με χρονολογική σειρά, χρησιμοποιώντας μόνο προηγούμενα αποτελέσματα κατά τη στιγμή της πρόβλεψης.</p><p>4. Δεν εμφανίζουμε συνθετικά injury impacts ή βεβαιότητα όταν λείπουν δεδομένα.</p><p><a class="btn-inline" target="_blank" rel="noopener noreferrer" href="https://github.com/mariodinakus/sideline-sports/tree/main/mono-basket">Άνοιγμα κώδικα στο GitHub ↗</a></p></div>';
}
function render(){
 if(!S.data){$('view').innerHTML='<div class="loading">Φόρτωση μοντέλων…</div>';return}
 const d=S.data;stats(d);
 $('status-area').innerHTML=(d.warnings||[]).length?'<div class="warning">Μερικές πηγές δεν απάντησαν: '+d.warnings.map(esc).join(' · ')+'. Τα διαθέσιμα αποτελέσματα εμφανίζονται χωρίς να εφευρίσκουμε στοιχεία.</div>':'';
 $('view').innerHTML=S.view==='radar'?radar(d):S.view==='models'?modelLab(d):S.view==='accuracy'?accuracy(d):sources(d);
 $('updated').textContent='Sync: '+dt(d.generatedAt);
}
async function load(){
 if(S.loading)return;S.loading=true;
 const serial=++S.serial;$('sync').textContent='● Συγχρονισμός…';$('sync').style.color='#ffbc83';
 try{
  const res=await fetch('/api/dashboard?date='+encodeURIComponent(S.day),{cache:'no-store'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const data=await res.json();if(serial!==S.serial)return;S.data=data;
  $('sync').textContent='● ESPN + ML SYNC';$('sync').style.color='var(--green)';
  render();
 }catch(err){$('sync').textContent='● Δεδομένα προσωρινά μη διαθέσιμα';$('sync').style.color='#ffaa8e';
  if(!S.data)$('view').innerHTML='<div class="empty">Δεν ήταν δυνατή η φόρτωση: '+esc(err.message)+'.<br>Δοκίμασε ανανέωση.</div>';
 }finally{S.loading=false}
}
function changeDay(n){const d=new Date(S.day+'T12:00:00');d.setDate(d.getDate()+n);S.day=d.toLocaleDateString('en-CA');$('date').value=S.day;load()}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));
$('refresh').addEventListener('click',load);
$('date').value=S.day;$('date').addEventListener('change',e=>{if(!e.target.value)return;S.day=e.target.value;load()});
$('day-prev').addEventListener('click',()=>changeDay(-1));
$('day-next').addEventListener('click',()=>changeDay(1));
$('today').addEventListener('click',()=>{S.day=new Date().toLocaleDateString('en-CA');$('date').value=S.day;load()});
load();
