/**
 * MONO BASKET as a first-class, site-wide Courtside IQ experience.
 * One source, one archive, zero reconstructed "pregame" forecasts.
 */
const athensDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const pct=x=>Number.isFinite(x)?(x*100).toFixed(1)+'%':'—';
const n=(x,d=0)=>Number.isFinite(x)?x.toFixed(d):'—';
const dayShift=(day,delta)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)};
const when=x=>{if(!x)return '—';const d=new Date(x);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('el-GR',{timeZone:'Europe/Athens',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d):'—'};
export const MODEL_EXPLAIN=[
 ['scoring','Attack vs defence','Πόντοι υπέρ και κατά, προσαρμοσμένοι στον μέσο όρο του NBA.'],
 ['net','Net strength','Καθαρή διαφορά πόντων και έδρα.'],
 ['pyth','Pythagorean','Μοντέλο αναμενόμενων νικών από επίθεση και άμυνα.'],
 ['bayes','Bayesian / Log5','Εξομαλυμένο ιστορικό νικών και ηττών.'],
 ['form','Last 10','Πρόσφατα ολοκληρωμένα παιχνίδια.'],
 ['momentum','EWMA form','Μεγαλύτερο βάρος στις πιο πρόσφατες εμφανίσεις.'],
 ['elo','Historical Elo','Δυναμική ισχύς από ολοκληρωμένα προηγούμενα παιχνίδια.'],
 ['conditions','Rest / roster','Ημέρες ξεκούρασης, διαθεσιμότητα και συνέχεια ρόστερ μόνο όταν έχουν ελεγχθεί.'],
 ['ridge','Online ML','Χρονολογικά εκπαιδευμένο μοντέλο που ενεργοποιείται μόνο αν βελτιώνει το ιστορικό baseline.']
];
export function createMonoBasket({shell,esc,render}) {
 const S={day:athensDay(),view:'radar',data:new Map(),pending:new Set(),errors:new Map(),latest:null};
 const key=day=>'day:'+day;
 const read=day=>S.data.get(key(day))||null;
 const current=()=>read(athensDay());
 function load(day=athensDay(),force=false){
  const id=key(day);if(S.pending.has(id)||(!force&&S.data.has(id)))return;
  S.pending.add(id);S.errors.delete(id);
  fetch('/api/mono-basket?date='+encodeURIComponent(day),{cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
   .then(data=>{if(!data||!Array.isArray(data.games))throw Error('Invalid forecast feed');S.data.set(id,data);S.latest=Date.now()})
   .catch(err=>S.errors.set(id,String(err.message||err)))
   .finally(()=>{S.pending.delete(id);render()});
 }
 const tip=game=>game.homeCode&&game.awayCode?esc(game.awayCode+' @ '+game.homeCode):esc(game.away+' @ '+game.home);
 const signal=d=>{
  const games=(d?.games||[]).filter(g=>g.state==='pre'&&g.forecast);
  const withLocked=games.filter(g=>g.origin==='locked').length;
  return {total:d?.games?.length||0,upcoming:games.length,locked:withLocked,picked:games.filter(g=>['HOME','AWAY'].includes(g.pick)).length};
 };
 function strip(){
  const d=current(),stats=signal(d),loading=S.pending.has(key(athensDay())),err=S.errors.get(key(athensDay()));
  const label=err?'ΠΗΓΗ ΠΡΟΣΩΡΙΝΑ ΜΗ ΔΙΑΘΕΣΙΜΗ':loading?'ΣΥΓΧΡΟΝΙΣΜΟΣ NBA':d?'MONO BASKET · GAME SIGNAL':'MONO BASKET · FORECAST RADAR';
  const details=d?stats.total+' αγώνες σήμερα · '+stats.locked+' κλειδωμένες προβλέψεις · '+(d.stats?.n||0)+' επαληθευμένα':err?'Οι προβλέψεις δεν εμφανίζονται χωρίς πηγή':'Σκορ · 1/2 · Elo · ML · πραγματική ακρίβεια';
  return '<div class="mono-global" role="region" aria-label="MONO BASKET σε όλο το Courtside IQ">'+
   '<div class="mono-global-name"><span class="mono-global-ball" aria-hidden="true">◉</span><span><strong>'+esc(label)+'</strong><small>'+esc(details)+'</small></span></div>'+
   '<div class="mono-global-actions"><span class="mono-global-clock">NBA · '+esc(athensDay())+'</span><button class="mono-global-button" type="button" data-jump="monobasket">ΑΝΟΙΓΜΑ FORECAST RADAR ↗</button></div></div>';
 }
 function homeHTML(){
  const d=current(),a=d?.stats||{},h=d?.history||{},soon=(d?.games||[]).filter(g=>g.state==='pre'&&g.forecast).slice(0,3);
  return '<section class="mono-home-panel" aria-label="MONO BASKET Forecast Center"><div class="mono-home-top"><div>'+
   '<span class="mono-eyebrow">COURTSIDE IQ × MONO BASKET</span><h2>Forecast <em>intelligence.</em></h2>'+
   '<p>Ο μηχανισμός MONO BASKET είναι πλέον συνδεδεμένος με το Courtside. Κάθε μοντέλο, κάθε πρόβλεψη και η απόδοσή τους, σε ένα σημείο.</p></div>'+
   '<button class="mono-main-action" data-jump="monobasket">Open Forecast Center ↗</button></div>'+
   '<div class="mono-home-metrics"><div><span>ΧΡΟΝΟΛΟΓΙΚΗ ΙΣΤΟΡΙΚΗ ΑΚΡΙΒΕΙΑ</span><strong>'+pct(h.winAccuracy)+'</strong><small>'+esc(h.backtest||0)+' ιστορικά tests, όχι μελλοντική εγγύηση</small></div>'+
   '<div><span>ΜΕΤΡΗΜΕΝΑ ΠΡΟ ΤΖΑΜΠΟΛ</span><strong>'+esc(a.n||0)+'</strong><small>Προβλέψεις με τελικό αποτέλεσμα</small></div>'+
   '<div><span>ΠΡΑΓΜΑΤΙΚΟ HIT RATE</span><strong>'+pct(a.winnerAccuracy)+'</strong><small>Μόνο κλειδωμένες προβλέψεις</small></div></div>'+
   (soon.length?'<div class="mono-home-games">'+soon.map(g=>'<button data-jump="monobasket"><span>'+tip(g)+'</span><strong>'+n(g.forecast.awayPts)+'–'+n(g.forecast.homePts)+'</strong><small>'+pct(g.forecast.homeWinProb)+' γηπεδούχος</small></button>').join('')+'</div>':'<div class="mono-home-empty">'+(S.pending.size?'Συγχρονισμός δεδομένων…':S.errors.get(key(athensDay()))?'Η πηγή δεδομένων δεν απάντησε.':'Δεν υπάρχουν διαθέσιμες προβλέψεις για σήμερα.')+'</div>')+
   '</section>';
 }
 const kpi=(label,value,desc)=>'<div class="mono-metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(desc)+'</small></div>';
 function gameCard(g){
  const f=g.forecast,locked=g.origin==='locked',done=g.state==='post';
  const winner=f?.homeWinProb>=.58?'1 · '+(g.homeCode||g.home):f?.homeWinProb<=.42?'2 · '+(g.awayCode||g.away):'No confident pick';
  const voteList=(g.votes||[]).map(v=>'<div class="mono-vote"><span>'+esc(v.label||v.id)+'<small>'+esc(v.why||'')+'</small></span><b>'+pct(v.homeWinProb)+'</b><b>'+pct(v.weight)+'</b></div>').join('');
  const safeProb=f&&Number.isFinite(f.homeWinProb)?Math.max(0,Math.min(100,100*f.homeWinProb)):0;
  return '<article class="mono-game"><div class="mono-game-head"><span>'+esc(when(g.date))+'</span><span class="mono-status '+(locked?'is-locked':g.state==='in'?'is-live':'')+'">'+(done?'FINAL':g.state==='in'?'LIVE':locked?'PREGAME LOCKED':g.origin==='provisional'?'PROVISIONAL':'NO FORECAST')+'</span></div>'+
   '<div class="mono-match"><div><b>'+esc(g.awayCode||'AWAY')+'</b><small>'+esc(g.away)+'</small></div><span>@</span><div><b>'+esc(g.homeCode||'HOME')+'</b><small>'+esc(g.home)+'</small></div></div>'+
   '<div class="mono-game-score"><span>'+(done?'ΤΕΛΙΚΟ':'ΕΚΤΙΜΗΣΗ')+'</span><strong>'+(done?esc(n(g.awayScore)+'–'+n(g.homeScore)):f?esc(n(f.awayPts)+'–'+n(f.homePts)):'—')+'</strong></div>'+
   (done&&f?'<p class="mono-hint">Προ του αγώνα: '+n(f.awayPts)+'–'+n(f.homePts)+'</p>':'')+
   (f?'<div class="mono-prob-meta"><span>WIN PROBABILITY · HOME</span><b>'+pct(f.homeWinProb)+'</b></div><div class="mono-prob-track"><span style="width:'+safeProb.toFixed(1)+'%"></span></div>'+
   '<div class="mono-prob-ends"><span>'+esc(g.awayCode)+' '+pct(1-f.homeWinProb)+'</span><span>'+esc(g.homeCode)+' '+pct(f.homeWinProb)+'</span></div>'+
   '<div class="mono-pick">ΠΡΟΒΛΕΨΗ: <strong>'+esc(winner)+'</strong><span>'+esc(g.activeModels||0)+' διαθέσιμα μοντέλα</span></div>':'<p class="mono-hint">Δεν υπάρχουν επαρκή πραγματικά δεδομένα για εκτίμηση.</p>')+
   (voteList?'<details class="mono-details"><summary>Ανάλυση μοντέλων · '+esc(g.votes.length)+' ψήφοι</summary><div class="mono-votes"><div class="mono-vote-head">ΜΟΝΤΕΛΟ <span>P(HOME)</span> <span>ΒΑΡΟΣ</span></div>'+voteList+'</div></details>':'')+
   (locked?'<p class="mono-hint">Κλειδώθηκε: '+esc(when(g.lockedAt))+' · δεν τροποποιείται εκ των υστέρων</p>':g.origin==='provisional'?'<p class="mono-hint">Ζωντανή προσωρινή εκτίμηση · δεν μετρά στην ακρίβεια</p>':'')+'</article>';
 }
 function radar(d){
  if(!d?.games?.length)return '<div class="mono-empty">Δεν βρέθηκαν παιχνίδια ή το scoreboard δεν απάντησε για αυτή την ημερομηνία.</div>';
  return '<div class="mono-game-grid">'+[...d.games].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(gameCard).join('')+'</div>';
 }
 function models(d){
  const sample=(d?.games||[]).find(g=>g.votes?.length);
  return '<div class="mono-note"><strong>Εώς 9 μοντέλα · όχι πάντα 9.</strong> Κάθε μοντέλο ενεργοποιείται μόνο όταν υπάρχουν τα απαιτούμενα στοιχεία. Το αποτέλεσμα δεν είναι στοιχηματική εγγύηση.</div>'+
   (sample?'<section class="mono-wide"><h3>Πραγματική συναίνεση: '+tip(sample)+'</h3><p>'+esc(sample.votes.length)+' ενεργά μοντέλα. Οι ψήφοι ακολουθούν τον αγώνα.</p>'+
   '<div class="mono-votes">'+sample.votes.map(v=>'<div class="mono-vote"><span>'+esc(v.label||v.id)+'</span><b>'+pct(v.homeWinProb)+'</b><b>'+pct(v.weight)+'</b></div>').join('')+'</div></section>':'')+
   '<div class="mono-model-grid">'+MODEL_EXPLAIN.map(([id,name,why])=>'<article class="mono-model"><span>'+esc(id.toUpperCase())+'</span><h3>'+esc(name)+'</h3><p>'+esc(why)+'</p></article>').join('')+'</div>';
 }
 function archiveRow(r){
  const f=r.forecast||{},a=r.actual,hit=a?((f.homeWinProb>=.5)===(a.home>a.away)):null;
  return '<tr><td>'+esc(when(r.tip))+'</td><td>'+esc((r.awayCode||r.away)+' @ '+(r.homeCode||r.home))+'</td><td>'+n(f.awayPts)+'–'+n(f.homePts)+'</td><td>'+(a?n(a.away)+'–'+n(a.home):'—')+'</td><td>'+pct(f.homeWinProb)+'</td><td class="'+(a?(hit?'mono-good':'mono-bad'):'')+'">'+(a?(hit?'✓ HIT':'✕ MISS'):'PENDING')+'</td></tr>';
 }
 const table=(items,missing)=>items.length?'<div class="mono-table-scroll"><table class="mono-table"><thead><tr><th>TIPOFF</th><th>MATCH</th><th>FORECAST</th><th>ACTUAL</th><th>HOME %</th><th>RESULT</th></tr></thead><tbody>'+items.map(archiveRow).join('')+'</tbody></table></div>':'<div class="mono-empty">'+missing+'</div>';
 function accuracy(d){
  const s=d?.stats||{},h=d?.history||{},r=d?.records||{};
  return '<div class="mono-accuracy-grid">'+
   '<section class="mono-wide"><span class="mono-eyebrow">REAL PREGAME AUDIT</span><h3>Πραγματικά κλειδωμένες</h3><strong class="mono-big">'+pct(s.winnerAccuracy)+'</strong><p>Νικητής σε '+esc(s.n||0)+' ολοκληρωμένους αγώνες με καταγεγραμμένη πρόβλεψη πριν από το τζάμπολ.</p><div class="mono-rows"><div>Score MAE <b>'+n(s.scoreMAE,2)+' pts</b></div><div>Brier <b>'+n(s.brier,4)+'</b></div><div>1/2 picks <b>'+esc(s.decisiveN||0)+'</b></div></div></section>'+
   '<section class="mono-wide"><span class="mono-eyebrow">HISTORICAL WALK-FORWARD</span><h3>Ιστορική εκπαίδευση</h3><strong class="mono-big">'+pct(h.winAccuracy)+'</strong><p>'+esc(h.backtest||0)+' ιστορικά tests με ενημέρωση του μοντέλου μετά τη βαθμολόγηση κάθε αγώνα.</p><div class="mono-rows"><div>ML margin MAE <b>'+n(h.marginMAE,2)+' pts</b></div><div>Elo baseline MAE <b>'+n(h.eloBaselineMAE,2)+' pts</b></div><div>Training <b>'+esc(h.trained||0)+' games</b></div></div></section></div>'+
   '<h3 class="mono-section-title">Prediction vs Reality</h3>'+
   table(r.recent||[],'Δεν υπάρχουν ακόμη ολοκληρωμένες προοπτικές προβλέψεις.')+
   '<h3 class="mono-section-title">Locked · awaiting result</h3>'+
   table(r.upcoming||[],'Δεν υπάρχουν αυτή τη στιγμή κλειδωμένες προβλέψεις.')+
   '<div class="mono-note">Το ιστορικό rolling backtest και η πραγματική προοπτική ακρίβεια είναι διαφορετικά σύνολα δεδομένων. Δεν προσθέτουμε αναδρομικά προβλέψεις από τελικά σκορ.</div>';
 }
 function page(){
  const d=read(S.day),busy=S.pending.has(key(S.day)),err=S.errors.get(key(S.day)),stats=d?.stats||{},hist=d?.history||{};
  shell('MONO BASKET', '<section class="mono-hub">'+
   '<div class="mono-hero"><span class="mono-eyebrow">COURTSIDE IQ / MONO BASKET ENGINE</span><h1>Every game.<br><em>Every signal.</em></h1><p>Πρόβλεψη πραγματικού σκορ και νικητή, αναλυτική συναίνεση μοντέλων και διαρκής έλεγχος των επιδόσεων έναντι των τελικών αποτελεσμάτων.</p><span class="mono-hero-seal" aria-hidden="true">MB.</span></div>'+
   '<div class="mono-metrics">'+kpi('HISTORICAL WIN ACCURACY',pct(hist.winAccuracy),'Rolling, όχι υπόσχεση')+
    kpi('ARCHIVED PREGAME',String(stats.records??'—'),'Πριν από το τζάμπολ')+
    kpi('VERIFIED HIT RATE',pct(stats.winnerAccuracy),String(stats.n||0)+' τελικοί')+
    kpi('HISTORICAL MARGIN MAE',n(hist.marginMAE,2)+' pts','Elo '+n(hist.eloBaselineMAE,2)+' pts')+'</div>'+
   '<div class="mono-page-nav"><div class="mono-page-tabs"><button class="'+(S.view==='radar'?'active':'')+'" data-mono-view="radar">◉ Game Radar</button><button class="'+(S.view==='models'?'active':'')+'" data-mono-view="models">◫ Model Lab</button><button class="'+(S.view==='accuracy'?'active':'')+'" data-mono-view="accuracy">◎ Accuracy Tracker</button></div><div class="mono-day-picker"><button data-mono-action="prev" aria-label="Προηγούμενη μέρα">‹</button><input id="mono-day" type="date" aria-label="Ημερομηνία παιχνιδιών" value="'+esc(S.day)+'"><button data-mono-action="next" aria-label="Επόμενη μέρα">›</button><button data-mono-action="today">Σήμερα</button><button data-mono-action="refresh">↻</button></div></div>'+
   (err?'<div class="mono-note">Η πηγή προβλέψεων δεν απάντησε: '+esc(err)+'. Μπορείς να δοκιμάσεις ανανέωση.</div>':'')+
   (d?.warnings?.length?'<div class="mono-note">Περιορισμένη κάλυψη: '+esc(d.warnings.join(' · '))+'</div>':'')+
   (busy&&!d?'<div class="mono-empty">Φόρτωση πραγματικών δεδομένων NBA και ιστορικού ML…</div>':!d?'<div class="mono-empty">Τα δεδομένα θα εμφανιστούν μόλις συνδεθούν οι πηγές.</div>':S.view==='radar'?radar(d):S.view==='models'?models(d):accuracy(d))+
   '<div class="mono-footnote"><strong>Source:</strong> ESPN public NBA feeds · ώρα Ελλάδας · Ημερήσιο radar και χρονοσημασμένο GitHub ledger. Οι μη διαθέσιμες πηγές δεν αντικαθίστανται με πλασματικές πληροφορίες. Οι συνθήκες τραυματισμών είναι αδρό proxy, όχι επιβεβαιωμένη επιρροή παικτών.</div></section>');
 }
 function onClick(e){
  const action=e.target.closest?.('[data-mono-action]');
  if(action){
   const k=action.dataset.monoAction;
   if(k==='today')S.day=athensDay();
   if(k==='prev')S.day=dayShift(S.day,-1);
   if(k==='next')S.day=dayShift(S.day,1);
   load(S.day,k==='refresh');render();return true;
  }
  const tab=e.target.closest?.('[data-mono-view]');if(tab){S.view=tab.dataset.monoView;render();return true}
  return false;
 }
 function onChange(e){if(e.target.id!=='mono-day')return false;if(!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))return true;S.day=e.target.value;load(S.day);render();return true}
 function whenOpened(tab){load(athensDay());if(tab==='monobasket')load(S.day)}
 return {routes:{monobasket:page},onClick,onChange,whenOpened,strip,homeHTML,refresh:()=>load(athensDay(),true)};
}
