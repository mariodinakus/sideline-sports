/* NBA ATLAS: source-verified NBA/BAA regular-season career totals through 2025-26.
Source: https://hoopsavant.com/stats — no ABA games, no 2026-27 estimates. */
(function(){
'use strict';
const CATS=[{"id":"pts","label":"Πόντοι","en":"POINTS","unit":"PTS","since":"1946–47","nbaPath":"PTS","rows":[["LeBron James",43440],["Kareem Abdul-Jabbar",38387],["Karl Malone",36928],["Kobe Bryant",33643],["Kevin Durant",32597],["Michael Jordan",32292],["Dirk Nowitzki",31560],["Wilt Chamberlain",31419],["James Harden",29339],["Shaquille O'Neal",28596]]},{"id":"ast","label":"Ασίστ","en":"ASSISTS","unit":"AST","since":"1946–47","nbaPath":"AST","rows":[["John Stockton",15806],["Chris Paul",12552],["Jason Kidd",12091],["LeBron James",12016],["Russell Westbrook",10351],["Steve Nash",10335],["Mark Jackson",10334],["Magic Johnson",10141],["Oscar Robertson",9887],["Isiah Thomas",9061]]},{"id":"trb","label":"Ριμπάουντ","en":"REBOUNDS","unit":"REB","since":"1950–51","nbaPath":"REB","rows":[["Wilt Chamberlain",23924],["Bill Russell",21620],["Kareem Abdul-Jabbar",17440],["Elvin Hayes",16279],["Moses Malone",16212],["Tim Duncan",15091],["Karl Malone",14968],["Robert Parish",14715],["Kevin Garnett",14662],["Dwight Howard",14627]]},{"id":"stl","label":"Κλεψίματα","en":"STEALS","unit":"STL","since":"1973–74","nbaPath":"STL","rows":[["John Stockton",3265],["Chris Paul",2728],["Jason Kidd",2684],["Michael Jordan",2514],["Gary Payton",2445],["LeBron James",2417],["Maurice Cheeks",2310],["Scottie Pippen",2307],["Clyde Drexler",2207],["Hakeem Olajuwon",2162]]},{"id":"blk","label":"Κοψίματα","en":"BLOCKS","unit":"BLK","since":"1973–74","nbaPath":"BLK","rows":[["Hakeem Olajuwon",3830],["Dikembe Mutombo",3289],["Kareem Abdul-Jabbar",3189],["Mark Eaton",3064],["Tim Duncan",3020],["David Robinson",2954],["Patrick Ewing",2894],["Shaquille O'Neal",2732],["Tree Rollins",2542],["Robert Parish",2361]]},{"id":"fg3m","label":"Τρίποντα","en":"3-POINTERS MADE","unit":"3PM","since":"1979–80","nbaPath":"FG3M","rows":[["Stephen Curry",4248],["James Harden",3390],["Ray Allen",2973],["Klay Thompson",2899],["Damian Lillard",2804],["LeBron James",2636],["Reggie Miller",2560],["Kyle Korver",2450],["Paul George",2449],["Kevin Durant",2377]]},{"id":"gp","label":"Αγώνες","en":"GAMES PLAYED","unit":"GP","since":"1946–47","nbaPath":"GP","rows":[["LeBron James",1622],["Robert Parish",1611],["Kareem Abdul-Jabbar",1560],["Vince Carter",1541],["Dirk Nowitzki",1522],["John Stockton",1504],["Karl Malone",1476],["Kevin Garnett",1462],["Kevin Willis",1424],["Jason Terry",1410]]},{"id":"min","label":"Λεπτά","en":"MINUTES","unit":"MIN","since":"1951–52","nbaPath":"MIN","rows":[["LeBron James",61030],["Kareem Abdul-Jabbar",57446],["Karl Malone",54852],["Dirk Nowitzki",51368],["Kevin Garnett",50418],["Jason Kidd",50111],["Elvin Hayes",50000],["Kobe Bryant",48637],["Wilt Chamberlain",47859],["John Stockton",47764]]}];
const atState={metric:'pts',query:''};
const atEsc=x=>String(x===null||x===undefined?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const current=()=>CATS.find(c=>c.id===atState.metric)||CATS[0];
function resultRows(){
  const cat=current(),q=atState.query.trim().toLocaleLowerCase();
  const visible=cat.rows.map((r,i)=>({name:r[0],value:r[1],rank:i+1})).filter(p=>!q||p.name.toLocaleLowerCase().includes(q));
  const max=cat.rows[0][1];
  return '<div class="al-rank-header"><span>RANK / PLAYER</span><span>CAREER TOTAL</span></div>'+
   (visible.length?visible.map(p=>'<button type="button" class="al-row" data-al-player="'+atEsc(p.name)+'" title="Άνοιγμα προφίλ: '+atEsc(p.name)+'"><span class="al-person"><span class="al-place'+(p.rank<=3?' top':'')+'">'+String(p.rank).padStart(2,'0')+'</span><span class="al-person-name">'+atEsc(p.name)+'</span></span><span class="al-number">'+fmt(p.value)+' <small>'+cat.unit+'</small></span><span class="al-bar"><span style="width:'+Math.max(2,p.value/max*100).toFixed(1)+'%"></span></span></button>').join(''):'<div class="al-empty">Δεν βρέθηκε παίκτης σε αυτή την κατάταξη. Εμφανίζονται οι 10 πρώτοι μέχρι το 2025–26.</div>');
}
function allTimePage(){
  const cat=current(),one=cat.rows[0],other=cat.rows.slice(0,3);
  const chips=CATS.map(c=>'<button type="button" class="al-tab'+(c.id===cat.id?' selected':'')+'" data-al-cat="'+c.id+'" aria-pressed="'+(c.id===cat.id)+'"><span>'+atEsc(c.label)+'</span><small>'+c.unit+'</small></button>').join('');
  return '<div class="al-shell"><div class="al-overline">NBA RECORD BOOK / 1946 → 2026</div>'+
  '<div class="al-titlebar"><div><h1>ALL-TIME <em>LEADERS.</em></h1><p>Οι κορυφαίοι παίκτες στην ιστορία του NBA · αθροιστικά στατιστικά κανονικής περιόδου.</p></div><div class="al-snapshot"><span>HISTORICAL SNAPSHOT</span><b>THROUGH 2025–26</b><small>NBA / BAA · όχι ABA</small></div></div>'+
  '<div class="al-tabs">'+chips+'</div>'+
  '<div class="al-dashboard"><div class="al-leader"><div class="al-leader-kicker">01 / CAREER RECORD</div><div class="al-leader-metric">'+atEsc(cat.en)+'</div><div class="al-leader-value">'+fmt(one[1])+'</div><div class="al-leader-unit">'+atEsc(cat.unit)+' · '+atEsc(cat.label)+'</div><div class="al-leader-name">'+atEsc(one[0])+'</div><div class="al-leader-bottom"><span>STAT TRACKED SINCE '+atEsc(cat.since)+'</span><span>TOP 10</span></div></div>'+
  '<div class="al-topthree"><div class="al-topthree-kicker">THE RECORD HOLDERS / TOP 3</div>'+other.map((p,i)=>'<button type="button" class="al-podium" data-al-player="'+atEsc(p[0])+'"><span class="al-podium-rank">'+String(i+1).padStart(2,'0')+'</span><span class="al-podium-name">'+atEsc(p[0])+'</span><strong>'+fmt(p[1])+'</strong></button>').join('')+'<div class="al-history-note">Συνολικές επιδόσεις καριέρας — όχι μέσοι όροι και όχι συνολικά playoffs.</div></div></div>'+
  '<section class="al-ranking"><div class="al-ranking-top"><div><div class="al-overline">HISTORICAL LEADERBOARD</div><h2>'+atEsc(cat.label)+' <span>ALL TIME</span></h2></div><label class="al-search-wrap"><span>SEARCH TOP 10</span><input id="al-search" type="search" placeholder="Αναζήτηση παίκτη…" value="'+atEsc(atState.query)+'" autocomplete="off" aria-label="Αναζήτηση στα ιστορικά στατιστικά"></label></div><div id="al-results">'+resultRows()+'</div></section>'+
  '<div class="al-disclaimer"><div><b>DATA INTEGRITY</b> · Στοιχεία έως το τέλος της περιόδου 2025–26. Οι αγώνες του 2026–27 δεν έχουν προστεθεί στο ιστορικό snapshot. Τα ριμπάουντ καταγράφονται από το 1950–51, τα λεπτά από το 1951–52, τα κλεψίματα και κοψίματα από το 1973–74 και τα τρίποντα από το 1979–80.</div><div class="al-sources"><a href="https://hoopsavant.com/stats" target="_blank" rel="noopener noreferrer">SOURCE: HOOP SAVANT ↗</a><a href="https://www.nba.com/stats/alltime" target="_blank" rel="noopener noreferrer">NBA ALL-TIME STATS ↗</a><a href="https://www.basketball-reference.com/leaders/" target="_blank" rel="noopener noreferrer">BASKETBALL-REFERENCE ↗</a></div></div></div>';
}
document.addEventListener('click',event=>{
  const category=event.target.closest('[data-al-cat]');
  if(category){atState.metric=category.dataset.alCat;atState.query='';if(typeof render==='function')render();return}
  const player=event.target.closest('[data-al-player]');
  if(player){const name=player.dataset.alPlayer;state.q=name;state.histSearch=[];location.hash='/search';return}
});
document.addEventListener('input',event=>{
  if(event.target.id!=='al-search')return;
  atState.query=event.target.value;
  const out=document.getElementById('al-results');
  if(out)out.innerHTML=resultRows();
});
window.allTimePage=allTimePage;
window.allTimeData=CATS;
})();