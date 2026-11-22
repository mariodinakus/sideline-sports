/* Team talent radar: observed production and recent game-log changes, not projected potential. */
(function(){
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const F=(v,d=1)=>N(v)===null?'—':Number(v).toFixed(d);
const H=p=>E(p.headshot||'https://a.espncdn.com/i/headshots/nba/players/full/'+p.id+'.png');
const ratio=(a,b)=>N(a)!==null&&N(b)>0?a/b:null;
const per=(p,k)=>{const v=ratio(p[k],p.mpg);return v===null?null:v*36};
const three=p=>{const v=ratio(p.fg3m,p.fg3a);return v===null?null:100*v};
const cats=[
 {id:'shoot',title:'Καλύτεροι σουτέρ',sub:'3P% + όγκος (≥2.5 3PA/αγ.)',ok:p=>N(p.fg3a)>=2.5&&three(p)!==null,score:p=>.65*Math.min(1,three(p)/45)+.35*Math.min(1,p.fg3a/9),stats:p=>F(three(p))+'% 3P · '+F(p.fg3a)+' 3PA'},
 {id:'score',title:'Κορυφαίοι σκόρερ',sub:'Πόντοι ανά παιχνίδι',ok:p=>N(p.ppg)!==null,score:p=>p.ppg,stats:p=>F(p.ppg)+' PTS · '+F(p.tsPct)+'% TS'},
 {id:'create',title:'Καλύτεροι δημιουργοί',sub:'Ασίστ ανά 36΄ & AST/TO',ok:p=>per(p,'apg')!==null&&N(p.astTo)!==null,score:p=>.7*Math.min(1,per(p,'apg')/9)+.3*Math.min(1,p.astTo/4),stats:p=>F(p.apg)+' AST · '+F(p.astTo,2)+' AST/TO'},
 {id:'rim',title:'Προστασία ρακέτας',sub:'Κοψίματα ανά 36΄',ok:p=>per(p,'bpg')!==null,score:p=>per(p,'bpg'),stats:p=>F(per(p,'bpg'))+' BLK/36 · '+F(p.rpg)+' REB'},
 {id:'rebound',title:'Κορυφαίοι ριμπάουντερ',sub:'Ριμπάουντ ανά 36΄',ok:p=>per(p,'rpg')!==null,score:p=>per(p,'rpg'),stats:p=>F(per(p,'rpg'))+' REB/36 · '+F(p.rpg)+' REB'},
 {id:'steal',title:'Πίεση & κλεψίματα',sub:'Κλεψίματα ανά 36΄',ok:p=>per(p,'spg')!==null,score:p=>per(p,'spg'),stats:p=>F(per(p,'spg'))+' STL/36 · '+F(p.spg)+' STL'}
];
function leaders(players){return cats.map(c=>({...c,rows:players.filter(p=>N(p.games)>=5&&N(p.mpg)>=18&&c.ok(p)).sort((a,b)=>c.score(b)-c.score(a)||b.games-a.games).slice(0,3)}))}
function youth(roster,players,id){
 const by=new Map(players.filter(p=>String(p.teamId)===String(id)).map(p=>[String(p.id),p]));
 return roster.filter(p=>N(p.age)!==null&&p.age<=23&&p.age>=18).map(p=>({...p,st:by.get(String(p.id))})).sort((a,b)=>(b.st?.index??-1)-(a.st?.index??-1)||(a.age-b.age));
}
function form(games){
 const valid=(games||[]).filter(g=>N(g.min)>0&&N(g.pts)!==null).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(valid.length<10)return null;
 const window=gs=>{const av=k=>gs.reduce((s,g)=>s+Number(g[k]),0)/gs.length;return {pts:av('pts'),min:av('min'),reb:gs.every(g=>N(g.reb)!==null)?av('reb'):null,ast:gs.every(g=>N(g.ast)!==null)?av('ast'):null}};
 const last=window(valid.slice(-5)),prev=window(valid.slice(-10,-5));
 return {last,prev,delta:last.pts-prev.pts,minDelta:last.min-prev.min};
}
function row(p,i,c){return '<a class="tl-row" href="#/player/'+encodeURIComponent(p.id)+'"><span class="tl-rank">'+(i+1)+'</span><img src="'+H(p)+'" loading="lazy" alt=""><div><b>'+E(p.name)+'</b><small>'+E(c.stats(p))+'</small></div></a>'}
function install({id,roster,players,valid,getLog}){
 const a=document.getElementById('gm-lab')||document.getElementById('team-schedule')?.closest('section');if(!a)return;
 const own=players.filter(p=>String(p.teamId)===String(id)&&roster.some(r=>String(r.id)===String(p.id)));
 const young=youth(roster,players,id),best=leaders(own);
 const s=document.createElement('section');s.className='sec tl-root';s.id='talent-radar';a.before(s);
 s.innerHTML='<div class="sec-h"><div><div class="eyebrow">TALENT RADAR</div><h2 class="h2">Οι καλύτεροι & τα νέα ταλέντα</h2><p class="lede">Αγωνιστικοί ρόλοι, ειδικότητες και νεαροί παίκτες της ομάδας.</p></div></div>'+
 '<div class="tl-grid">'+best.map(c=>'<section class="card tl-card"><div class="eyebrow">'+c.id.toUpperCase()+'</div><h3 class="h3">'+E(c.title)+'</h3><p class="tl-sub">'+E(c.sub)+'</p>'+(c.rows.length?c.rows.map((p,i)=>row(p,i,c)).join(''):'<p class="muted">Μη επαρκή στοιχεία.</p>')+'</section>').join('')+'</div>'+
 '<section class="card tl-youth"><div class="eyebrow">NEXT GENERATION · U23</div><h3 class="h3">Ανερχόμενα ταλέντα</h3><p class="tl-sub">Παίκτες έως 23 ετών · σειρά βάσει τρέχοντος Atlas Index, όπου υπάρχει επαρκές δείγμα.</p>'+
 (young.length?young.map((p,i)=>'<div class="tl-young"><a class="tl-row" href="#/player/'+encodeURIComponent(p.id)+'"><img src="'+H(p)+'" alt="" loading="lazy"><div><b>'+E(p.name)+'</b><small>'+E(p.age)+' ετών · '+E(p.position||'—')+(p.st?' · '+F(p.st.ppg)+' PTS · '+F(p.st.rpg)+' REB · '+F(p.st.apg)+' AST':' · χωρίς επαρκές δείγμα στο Power feed')+'</small></div>'+(p.st?'<strong>'+F(p.st.index)+'<small>INDEX</small></strong>':'')+'</a>'+(i<3?'<div class="tl-trend" data-tl-id="'+E(p.id)+'">Έλεγχος πρόσφατης φόρμας…</div>':'')+'</div>').join(''):'<p class="muted">Δεν εντοπίστηκαν παίκτες 18–23 ετών με διαθέσιμη ηλικία στο ρόστερ.</p>')+
 '<p class="note">Οι μεταβολές συγκρίνουν τους 5 τελευταίους αγώνες συμμετοχής με τους 5 προηγούμενους. Δεν προβλέπουν μελλοντική εξέλιξη. Κοψίματα και κλεψίματα δεν μετρούν πλήρως την αμυντική ποιότητα.</p></section>';
 if(typeof getLog==='function')young.slice(0,3).forEach(p=>{
 Promise.resolve(getLog(p.id)).then(data=>{
 if(!valid()||!s.isConnected)return;
 const h=Array.from(s.querySelectorAll('[data-tl-id]')).find(x=>x.dataset.tlId===String(p.id));if(!h)return;
 const q=form(data?.games);
 if(!q){h.textContent='Φόρμα: χρειάζονται 10 αγώνες συμμετοχής.';return}
 const sign=v=>v>0?'+':'';
 h.innerHTML='<div><span>PTS · προηγ. 5 → τελευταία 5</span><b>'+F(q.prev.pts)+' → '+F(q.last.pts)+'</b></div><div><span>Μεταβολή PTS</span><b class="'+(q.delta>0?'good':q.delta<0?'bad':'')+'">'+sign(q.delta)+F(q.delta)+'</b></div><div><span>Μεταβολή MIN</span><b>'+sign(q.minDelta)+F(q.minDelta)+'</b></div>';
 }).catch(()=>{if(valid()&&s.isConnected){const h=Array.from(s.querySelectorAll('[data-tl-id]')).find(x=>x.dataset.tlId===String(p.id));if(h)h.textContent='Δεδομένα πρόσφατων αγώνων μη διαθέσιμα.'}});
 });
}
window.AtlasTalent={install,leaders,youth,form};
})();