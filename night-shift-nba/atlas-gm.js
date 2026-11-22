/* NBA ATLAS Scouting & GM Lab: empirical tendencies and role-fit, not tracking/contract or trade rumor data. */
(function(){
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const F=(v,d=1)=>N(v)===null?'—':Number(v).toFixed(d);
const clamp=v=>Math.max(0,Math.min(1,v));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const M=[
 ['pace','Ρυθμός',1,1,''],['tpaPg','Τρίποντα / αγ.',1,1,''],['tpPct','3P%',1,100,'%'],['efg','eFG%',1,100,'%'],['tovPct','Λάθη / κατοχή',-1,100,'%'],['orbPct','Επιθ. ριμπάουντ',1,100,'%'],['ftr','FTM / FGA',1,100,'%'],
 ['drtg','Defensive Rating',-1,1,''],['oefg','Αντίπαλο eFG%',-1,100,'%'],['opp3Pct','Αντίπαλο 3P%',-1,100,'%'],['opp3paPg','Αντίπαλα 3PA / αγ.',-1,1,''],['otovPct','Λάθη αντιπάλου',1,100,'%'],['drbPct','Αμυντ. ριμπάουντ',1,100,'%'],['oftr','Αντίπαλο FTM / FGA',-1,100,'%'],['ortg','Offensive Rating',1,1,'']
];
const def=k=>M.find(x=>x[0]===k);
function metrics(list,x){
 const out={};
 for(const [k,label,dir,m,suffix] of M){
  const v=N(x[k]),a=list.map(t=>N(t[k])).filter(z=>z!==null);
  if(v===null||a.length<15)continue;
  const better=a.filter(q=>dir>0?q>v:q<v).length,ties=a.filter(q=>q===v).length;
  out[k]={k,label,dir,v:v*m,avg:mean(a)*m,suffix,rank:1+better,count:a.length,p:1-(better+(ties-1)/2)/Math.max(1,a.length-1)};
 }
 return out;
}
const NEEDS=[
 {id:'shoot',name:'Περιφερειακό σουτ / spacing',why:'Αποδοτικό τρίποντο και μεγαλύτερη απειλή χωρίς την μπάλα.',keys:['tpPct','tpaPg','efg'],role:'Shooter'},
 {id:'create',name:'Δημιουργία & έλεγχος μπάλας',why:'Οργάνωση επίθεσης με λιγότερα λάθη.',keys:['tovPct','ortg'],role:'Playmaker'},
 {id:'rebound',name:'Μέγεθος & ριμπάουντ',why:'Περισσότερες δεύτερες κατοχές και ολοκλήρωση άμυνας.',keys:['orbPct','drbPct'],role:'Rebounder'},
 {id:'rim',name:'Εσωτερική άμυνα / rim protection',why:'Αναζήτηση ψηλού με κοψίματα και ριμπάουντ. Τα δεδομένα ομάδας δεν απομονώνουν τη ρακέτα.',keys:['oefg','drtg','drbPct'],role:'Rim protector'},
 {id:'pressure',name:'Πίεση στην μπάλα',why:'Περισσότερες ανακτήσεις κατοχής. Τα κλεψίματα είναι μόνο έμμεσος δείκτης άμυνας.',keys:['otovPct','opp3Pct','drtg'],role:'Ball pressure'}
];
function priorities(m){
 return NEEDS.map(q=>{const a=q.keys.map(k=>m[k]).filter(Boolean);return{...q,evidence:a,need:a.length>=2?1-mean(a.map(z=>z.p)):null}}).filter(q=>q.need!==null).sort((a,b)=>b.need-a.need);
}
function tendency(m){
 const p=k=>m[k]?.p??null,hi=k=>p(k)!==null&&p(k)>=.7,lo=k=>p(k)!==null&&p(k)<=.3;
 const off=[],defense=[];
 if(hi('pace'))off.push(['Γρήγορος ρυθμός','pace']);else if(lo('pace'))off.push(['Ελεγχόμενος ρυθμός','pace']);
 if(hi('tpaPg'))off.push(['Μεγάλος όγκος τριπόντων','tpaPg']);else if(lo('tpaPg'))off.push(['Χαμηλός όγκος τριπόντων','tpaPg']);
 if(hi('orbPct'))off.push(['Επιθετικό ριμπάουντ','orbPct']);if(hi('ftr'))off.push(['Παραγωγή από βολές','ftr']);if(hi('tovPct'))off.push(['Προστασία κατοχής','tovPct']);else if(lo('tovPct'))off.push(['Προβλήματα λαθών','tovPct']);
 if(hi('otovPct'))defense.push(['Πρόκληση λαθών','otovPct']);else if(lo('otovPct'))defense.push(['Λίγες ανακτήσεις από λάθη','otovPct']);
 if(hi('opp3paPg'))defense.push(['Περιορισμός όγκου τριπόντων αντιπάλου','opp3paPg']);else if(lo('opp3paPg'))defense.push(['Πολλά αντίπαλα τρίποντα','opp3paPg']);
 if(hi('drbPct'))defense.push(['Έλεγχος αμυντικού ριμπάουντ','drbPct']);else if(lo('drbPct'))defense.push(['Αδυναμία αμυντικού ριμπάουντ','drbPct']);
 if(hi('oefg'))defense.push(['Περιορισμός αποδοτικότητας σουτ','oefg']);else if(lo('oefg'))defense.push(['Υψηλή αποδοτικότητα αντιπάλου','oefg']);
 return {off,defense};
}
const parts=(p,id)=>{
 const min=N(p.mpg),per=k=>N(p[k])===null||!min?null:36*N(p[k])/min;
 const rate=k=>N(p[k]),a3=rate('fg3a'),m3=rate('fg3m'),pct=a3>0&&m3!==null?m3/a3:null;
 const A=[
  [per('fg3a'),8,.48],[pct,.43,.52]
 ],B=[[per('apg'),9,.65],[rate('astTo'),4,.35]],C=[[per('rpg'),14,.8],[per('orpg'),5,.2]],D=[[per('bpg'),3,.7],[per('rpg'),14,.3]],P=[[per('spg'),2.6,.8],[per('bpg'),2,.2]];
 const cfg={shoot:A,create:B,rebound:C,rim:D,pressure:P}[id]||[];
 // required primary metrics; no substitution of missing values
 if(cfg[0]?.[0]===null||id==='shoot'&&(pct===null||a3<1.5)||id==='create'&&rate('astTo')===null)return null;
 let a=cfg.filter(x=>x[0]!==null&&Number.isFinite(x[0]));
 if(!a.length)return null;return a.reduce((s,[v,max,w])=>s+clamp(v/max)*w,0)/a.reduce((s,x)=>s+x[2],0);
};
function pool(players,id,need,mode){
 return players.filter(p=>p.teamId&&String(p.teamId)!==String(id)&&N(p.games)>=5&&N(p.mpg)>=18&&(mode==='all'||p.mpg<=30)&&parts(p,need)!==null)
  .map(p=>({...p,fit:parts(p,need)*(.8+.2*clamp(p.games/15))})).sort((a,b)=>b.fit-a.fit||b.games-a.games);
}
function statline(p,id){
 const per=k=>N(p[k])===null||!(p.mpg>0)?null:36*p[k]/p.mpg;
 if(id==='shoot')return F(p.fg3a)+' 3PA · '+F(p.fg3a>0&&N(p.fg3m)!==null?100*p.fg3m/p.fg3a:null)+'% 3P';
 if(id==='create')return F(per('apg'))+' AST/36 · '+F(p.astTo,2)+' AST/TO';
 if(id==='rim')return F(per('bpg'))+' BLK/36 · '+F(per('rpg'))+' REB/36';
 if(id==='pressure')return F(per('spg'))+' STL/36 · '+F(per('bpg'))+' BLK/36';
 return F(per('rpg'))+' REB/36 · '+F(per('orpg'))+' OREB/36';
}
function rotation(roster,players,id){
 const by=new Map(players.filter(p=>String(p.teamId)===String(id)).map(p=>[String(p.id),p]));
 const seen=new Set();const rows=roster.map(p=>({...p,st:by.get(String(p.id))})).filter(p=>p.st&&p.st.games>=5&&p.st.mpg>=18&&p.position);
 const score=p=>.6*(p.st.index||0)+.4*(p.st.mpg||0);
 const slots=[['G','Guard 1'],['G','Guard 2'],['F','Forward 1'],['F','Forward 2'],['C','Center']];
 return slots.map(([pos,label])=>{const p=rows.filter(x=>!seen.has(String(x.id))&&x.position.toUpperCase().includes(pos)).sort((a,b)=>score(b)-score(a))[0];if(p)seen.add(String(p.id));return {label,p};});
}
const metric=z=>z?F(z.v)+z.suffix:'—';
function cardPlayer(p,id){return '<a class="gm-target" href="#/player/'+encodeURIComponent(p.id)+'"><img src="'+E(p.headshot||'https://a.espncdn.com/i/headshots/nba/players/full/'+p.id+'.png')+'" loading="lazy" alt=""><div><b>'+E(p.name)+'</b><small>'+E(p.teamName||p.team||'')+' · '+F(p.mpg)+' MIN · '+E(p.games)+' αγ.</small><span>'+E(statline(p,id))+'</span></div><strong>'+Math.round(p.fit*100)+'<small>FIT /100</small></strong></a>'}
function install({id,roster,players,season,valid}){
 const anchor=document.getElementById('team-schedule')?.closest('section');if(!anchor)return;
 const el=document.createElement('section');el.className='sec gm-root';el.id='gm-lab';anchor.before(el);
 el.innerHTML='<div class="sec-h"><div><div class="eyebrow">SCOUTING & GM LAB</div><h2 class="h2">Τακτική & ρόστερ</h2></div></div><div class="card muted">Ανάλυση δεδομένων ομάδας…</div>';
 Promise.resolve(season).then(s=>{
 if(!valid()||!el.isConnected)return;
 const list=(s?.teams||[]).filter(t=>N(t.boxGames)>=5&&N(t.g)>0&&t.boxGames/t.g>=.7);const x=list.find(t=>String(t.id)===String(id));
 if(!x||list.length<15){el.innerHTML='<div class="sec-h"><div><div class="eyebrow">SCOUTING & GM LAB</div><h2 class="h2">Τακτική & ρόστερ</h2></div></div><div class="card muted">Δεν υπάρχουν επαρκή box scores για αξιόπιστη σύγκριση. Δεν παράγονται προτάσεις.</div>';return}
 const m=metrics(list,x),t=tendency(m),needs=priorities(m),slots=rotation(roster,players,id);let selected=needs[0]?.id,mode='role';
 const lines=a=>a.length?a.map(([l,k])=>'<div class="gm-style"><b>'+E(l)+'</b><span>'+metric(m[k])+' · #'+m[k].rank+'/'+m[k].count+'</span></div>').join(''):'<p class="muted">Δεν προκύπτει έντονη τάση στα διαθέσιμα στοιχεία.</p>';
 const bars=keys=>keys.filter(k=>m[k]).map(k=>{const z=m[k];return '<div class="gm-bar-row"><span>'+E(z.label)+'</span><b>'+metric(z)+'</b><div class="gm-bar"><i style="width:'+Math.round(z.p*100)+'%"></i></div><small>#'+z.rank+'/'+z.count+' · NBA '+F(z.avg)+z.suffix+'</small></div>'}).join('');
 el.innerHTML='<div class="sec-h"><div><div class="eyebrow">SCOUTING & GM LAB</div><h2 class="h2">Τακτική & ρόστερ</h2><p class="lede">Αγωνιστικό προφίλ και υποθετικές ενισχύσεις από τα τρέχοντα δεδομένα.</p></div><small class="muted">'+E(s.season||'')+' · '+x.boxGames+'/'+x.g+' αγ. · '+list.length+' ομάδες</small></div>'+
 '<div class="gm-split"><section class="card"><div class="eyebrow">OFFENSIVE IDENTITY</div><h3 class="h3">Επίθεση</h3>'+lines(t.off)+bars(['ortg','pace','tpaPg','tpPct','efg','orbPct','tovPct','ftr'])+'</section>'+
 '<section class="card"><div class="eyebrow">DEFENSIVE IDENTITY</div><h3 class="h3">Άμυνα</h3>'+lines(t.defense)+bars(['drtg','oefg','opp3Pct','opp3paPg','otovPct','drbPct','oftr'])+'</section></div>'+
 '<p class="note gm-note">Οι μπάρες δείχνουν σχετική θέση στη λίγκα (ψηλότερα = καλύτερο για απόδοση, ή μεγαλύτερη ένταση για ρυθμό/όγκο). Τα box scores δεν επαρκούν για να διακρίνουμε switch, drop, zone, motion ή pick-and-roll συχνότητες. Οι τάσεις δεν αποτελούν επιβεβαιωμένα συστήματα προπονητή.</p>'+
 '<section class="card gm-sub"><div class="eyebrow">FRONT OFFICE</div><h3 class="h3">Προτεραιότητες ρόστερ</h3><div class="gm-needs">'+needs.map((q,i)=>'<button type="button" data-gm-need="'+q.id+'" aria-pressed="'+(q.id===selected)+'"><small>#'+(i+1)+' · '+(q.need>=.65?'Υψηλή':q.need>=.35?'Μέτρια':'Χαμηλή')+' ανάγκη</small><b>'+E(q.name)+'</b><span>'+q.evidence.map(z=>E(z.label)+' #'+z.rank).join(' · ')+'</span></button>').join('')+'</div><div id="gm-recommend"></div></section>'+
 '<section class="card gm-sub"><div class="eyebrow">ROTATION LAB</div><h3 class="h3">Ενδεικτική βασική πεντάδα</h3><div class="gm-five">'+slots.map(({label,p})=>'<div><small>'+label+'</small>'+(p?'<a href="#/player/'+encodeURIComponent(p.id)+'"><img src="'+E(p.headshot||'https://a.espncdn.com/i/headshots/nba/players/full/'+p.id+'.png')+'" alt=""><b>'+E(p.name)+'</b><span>'+F(p.st.ppg)+' PTS · '+F(p.st.mpg)+' MIN</span></a>':'<span class="muted">Μη επαρκές δείγμα</span>')+'</div>').join('')+'</div><p class="note">Επιλογή ανά δηλωμένη θέση με Atlas Index και λεπτά συμμετοχής. Όχι πραγματική ή βέλτιστη πεντάδα· δεν περιλαμβάνει τραυματισμούς ή συνδυασμούς lineup.</p></section>';
 function paint(){
 const q=needs.find(y=>y.id===selected),host=el.querySelector('#gm-recommend');if(!q||!host)return;
 const all=pool(players,id,q.id,mode),targets=all.slice(0,5);
 const ids=new Set(roster.map(p=>String(p.id)));
 const inside=players.filter(p=>String(p.teamId)===String(id)&&ids.has(String(p.id))&&parts(p,q.id)!==null).map(p=>({...p,fit:parts(p,q.id)*(.8+.2*clamp(p.games/15))})).sort((a,b)=>b.fit-a.fit);
 const own=inside[0];
 host.innerHTML='<div class="gm-rechead"><div><div class="lbl">TRADE / ACQUISITION FIT</div><h3 class="h3">'+E(q.name)+'</h3><p>'+E(q.why)+'</p></div><div class="gm-filter"><button data-gm-mode="role" aria-pressed="'+(mode==='role')+'">Role players</button><button data-gm-mode="all" aria-pressed="'+(mode==='all')+'">Όλοι</button></div></div>'+
 (own?'<div class="gm-own"><div class="lbl">Εσωτερική λύση · έλεγχος ρόλου</div><b>'+E(own.name)+'</b> · '+E(statline(own,q.id))+'<p>Δοκίμασε μεγαλύτερη αξιοποίηση στον συγκεκριμένο ρόλο, εφόσον το επιτρέπουν υγεία, matchups και rotation.</p></div>':'')+
 '<div class="gm-targets">'+(targets.length?targets.map(p=>cardPlayer(p,q.id)).join(''):'<p class="muted">Δεν βρέθηκαν παίκτες με επαρκή δείγμα.</p>')+'</div><p class="note">Fit 0–100: ευρετικός δείκτης από ανά 36 λεπτά στατιστικά και αγώνες. '+(mode==='role'?'Δείγμα 18–30 MIN/αγ. ':'Δείγμα ≥18 MIN/αγ. ')+'· '+all.length+' διαθέσιμες παρατηρήσεις. Ομάδα σύμφωνα με το feed. Δεν ελέγχονται συμβόλαια, διαθέσιμοι free agents, salary matching, draft picks, τραυματισμοί ή πρόθεση ανταλλαγής. Δεν είναι φήμες ή εφικτές προσφορές μεταγραφής.</p>';
 host.querySelectorAll('[data-gm-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.gmMode;paint()});
 }
 el.querySelectorAll('[data-gm-need]').forEach(b=>b.onclick=()=>{selected=b.dataset.gmNeed;el.querySelectorAll('[data-gm-need]').forEach(y=>y.setAttribute('aria-pressed',String(y===b)));paint()});paint();
 }).catch(()=>{if(valid()&&el.isConnected)el.innerHTML='<div class="card muted">Το Scouting Lab δεν είναι προσωρινά διαθέσιμο.</div>'});
}
window.AtlasGM={install,metrics,priorities,tendency,pool,rotation};
})();