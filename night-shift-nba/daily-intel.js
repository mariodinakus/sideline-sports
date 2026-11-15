/* NIGHT SHIFT — Yesterday / Today Radar & official NBA 2026–27 economics.
 * ESPN scoreboard & independently sourced Greece broadcast listings.
 * Do not invent game recaps, broadcaster, highlight videos, prices or salary payrolls.
 */
function previousAthensDate(){
 const v=athensDate(),dt=new Date(Date.UTC(+v.slice(0,4),+v.slice(4,6)-1,+v.slice(6,8),12));dt.setUTCDate(dt.getUTCDate()-1);return dt.toISOString().slice(0,10).replaceAll('-')
}
async function getYesterdayGames(){
 const key=previousAthensDate();
 if(state.yesterdayDate===key&&(state.yesterdayGames||state.yesterdayBusy))return;
 state.yesterdayDate=key;state.yesterdayBusy=true;state.yesterdayError=null;
 try{const out=await getJson('scoreboard',{date:key});state.yesterdayGames=out.games||[]}
 catch(e){state.yesterdayGames=[];state.yesterdayError=e.message}
 state.yesterdayBusy=false;if(state.page==='home')render();
}
const grEconomyOfficial=[
 {label:'SALARY CAP',value:'$164.961M'},
 {label:'LUXURY TAX LINE',value:'$200.428M'},
 {label:'MINIMUM TEAM SALARY',value:'$148.465M'},
 {label:'FIRST APRON',value:'$209.015M'},
 {label:'SECOND APRON',value:'$221.686M'},
 {label:'NON-TAXPAYER MLE',value:'$15.044M'}
];
function nbaEconomyPanel(){
 return'<section class="section nba-economics"><div class="section-title"><div><div class="eyebrow">2026–27 · ECONOMICS / COLLECTIVE BARGAINING</div><h2>Money in the NBA</h2></div><a class="eyebrow" href="https://www.nba.com/news/nba-salary-cap-2026-27-season" target="_blank" rel="noopener noreferrer">NBA OFFICIAL RELEASE ↗</a></div>'+
 '<div class="economy-metrics">'+grEconomyOfficial.map(x=>'<div class="economy-metric"><small>'+esc(x.label)+'</small><strong>'+esc(x.value)+'</strong></div>').join('')+'</div>'+
 '<p class="int-note">Επίσημα όρια NBA για το 2026–27 (30 Ιουνίου 2026). Πρόκειται για όρια μισθοδοσίας της λίγκας, όχι για τρέχοντα payrolls ομάδων ή έσοδα. Οι μισθοί ανά παίκτη δεν εμφανίζονται χωρίς επαληθευμένη πηγή.</p></section>'
}
function finalMargin(g){const a=Number(g.away?.score),b=Number(g.home?.score);return g.state==='post'&&Number.isFinite(a)&&Number.isFinite(b)?Math.abs(a-b):null}
function bestScorer(g){
 const choices=(g.leaders||[]).map(l=>{const n=String(l.value||'').match(/\d+(?:\.\d+)?/);return {...l,score:n?Number(n[0]):null}})
 .filter(l=>l.score!==null&&l.score>=25&&/points|scoring|ποντ/i.test(l.type||''));
 return choices.sort((a,b)=>b.score-a.score)[0]||null;
}
function yesterdayPriority(g){
 const closeness=finalMargin(g),scorer=bestScorer(g);
 const favorite=stars.some(p=>(g.leaders||[]).some(x=>String(x.player||'').toLowerCase()===p.name.toLowerCase()||String(x.player||'').toLowerCase().includes(p.name.split(' ').at(-1).toLowerCase())));
 return(closeness!==null&&closeness<=5?38-closeness:0)+(scorer?scorer.score:0)+(favorite?15:0);
}
function radarGame(g){
 const margin=finalMargin(g),scorer=bestScorer(g);
 let label=margin!==null&&margin<=5?'CLOSE GAME · '+margin+' PT MARGIN':scorer?'SCORING PERFORMANCE':'FINAL RESULT';
 return'<button class="radar-game" '+action('game',g.id)+'><span class="eyebrow">'+esc(label)+'</span><div class="radar-match"><span>'+esc(g.away?.abbr||'AWY')+' <b>'+esc(g.away?.score??'—')+'</b></span><span>'+esc(g.home?.abbr||'HOME')+' <b>'+esc(g.home?.score??'—')+'</b></span></div>'+(scorer?'<small>'+esc(scorer.player)+' · '+esc(scorer.value)+' · '+esc(scorer.type||'scoring')+'</small>':'<small>Box score & game details →</small>')+'</button>'
}
function radarUpcoming(g){
 const tv=greekBroadcast(g),f=forecastForGame(g);
 const prob=f?.forecast?.homeWinProb;
 return'<button class="radar-game" '+action('game',g.id)+'><span class="eyebrow">'+(tv?'GR TV · '+esc(tv.channel):'NBA · ATHENS TIME')+'</span><div class="radar-match"><span>'+esc(g.away?.abbr||'AWY')+' @ '+esc(g.home?.abbr||'HOME')+'</span><strong>'+time(g.date)+'</strong></div><small>'+(tv?'<span class="tv-positive">'+esc(tv.status==='confirmed'?'CONFIRMED LIVE':'BROADCAST LISTING')+'</span>':'Δεν έχει επιβεβαιωθεί ελληνικό κανάλι')+(Number.isFinite(prob)?' · archived IQ home '+Math.round(prob*100)+'%':'')+'</small></button>'
}
function homeRadar(){
 const today=athensDate(),yKey=previousAthensDate(),games=(state.yesterdayGames||[]).filter(g=>g.state==='post').sort((a,b)=>yesterdayPriority(b)-yesterdayPriority(a)).slice(0,3);
 const todayGames=state.date===today?state.games:[],featured=todayGames.filter(g=>g.state!=='post').slice().sort((a,b)=>{const x=Number(!!greekBroadcast(b))-Number(!!greekBroadcast(a));return x||Date.parse(a.date)-Date.parse(b.date)}).slice(0,3);
 const local=state.greekTV[today.slice(0,4)+'-'+today.slice(4,6)+'-'+today.slice(6,8)];
 return'<section class="section nba-radar"><div class="section-title"><div><div class="eyebrow red">START HERE · DAILY NBA RADAR</div><h2>Τι αξίζει να δεις</h2></div><span class="eyebrow">'+esc(today.slice(6,8)+'/'+today.slice(4,6)+'/'+today.slice(0,4))+' · ATH</span></div>'+
 '<div class="radar-columns"><div class="radar-panel"><div class="radar-label"><span>01 / ΧΘΕΣ · '+esc(yKey.slice(6,8)+'/'+yKey.slice(4,6))+'</span><small>Close games & scoring · ESPN</small></div>'+
 (games.length?games.map(radarGame).join(''):state.yesterdayBusy?'<p class="muted">Loading yesterday scoreboard…</p>':'<p class="muted">'+esc(state.yesterdayError?'Δεν ήταν διαθέσιμα τα χθεσινά αποτελέσματα.':'Δεν υπάρχουν επιβεβαιωμένα τελικά παιχνίδια στο διαθέσιμο ESPN feed.')+'</p>')+'</div>'+
 '<div class="radar-panel"><div class="radar-label"><span>02 / ΣΗΜΕΡΑ · ΣΤΗΝ ΕΛΛΑΔΑ</span><small>NBA & ελληνικές μεταδόσεις</small></div>'+
 (featured.length?featured.map(radarUpcoming).join(''):'<p class="muted">Δεν εμφανίζονται προγραμματισμένα παιχνίδια για σήμερα στο επιλεγμένο scoreboard.</p>')+
 '<div class="radar-tv"><small>ΕΛΛΗΝΙΚΟ ΤΗΛΕΟΠΤΙΚΟ ΠΡΟΓΡΑΜΜΑ</small><strong>'+(local?.listings?.some(x=>x.status==='confirmed')?'Υπάρχουν δημοσιευμένες επιβεβαιωμένες καταχωρίσεις':local?.listings?.length?'Δημοσιευμένες καταχωρίσεις · έλεγξε το κανάλι':local?'Δεν βρέθηκε επιβεβαιωμένο κανάλι σήμερα':'Έλεγχος προγράμματος…')+'</strong><a href="'+esc(local?.sourceUrl||'https://sportstvradar.com/en/gr/nba/')+'" target="_blank" rel="noopener noreferrer">Πρόγραμμα Ελλάδα ↗</a></div>'+
 '</div></div><p class="int-note">Επιλογή βάσει τελικού σκορ (διαφορά έως 5 πόντων), καταγεγραμμένων σκόρερ και διαθέσιμων τηλεοπτικών καταχωρίσεων. Δεν αποτελούν επαληθευμένα video highlights· το άνοιγμα οδηγεί στο game detail.</p></section>';
}
