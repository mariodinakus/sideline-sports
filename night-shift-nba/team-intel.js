/* NBA ATLAS — Team dossiers, sortable rosters and ESPN transaction center. */
(function(){
  const teams={},tx={loading:false,loaded:false,items:[],updatedAt:null,error:null};
  let advanced=null,advancedLoading=false,advancedError=null;
  const controls={position:'ALL',sort:'min',descending:true,txTeam:'ALL',txType:'ALL',query:''};
  const sortOptions=[['min','MIN'],['gp','GP'],['pts','PPG'],['reb','RPG'],['ast','APG'],['stl','STL'],['blk','BLK'],['tov','TOV'],['fg','FG%'],['three','3P%'],['ft','FT%'],['ts','TS%'],['efg','eFG%'],['per','PER · 25–26'],['winShares','WS · 25–26'],['ws48','WS/48 · 25–26'],['bpm','BPM · 25–26'],['vorp','VORP · 25–26'],['usagePercent','USG% · 25–26']];
  const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/gi,'').toLowerCase().replace(/\s+/g,' ').trim();
  const val=(v,d=1)=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d);
  const pct=(v)=>v===null||v===undefined?'—':val(v,1)+'%';
  const date=(v)=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('el-GR',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Athens'}).format(d)};
  const escx=s=>typeof esc==='function'?esc(s):String(s||'');
  function getTeam(id){return(state.teams||[]).find(t=>String(t.id)===String(id))||{}}
  function fetchJson(url){return fetch(url,{headers:{Accept:'application/json'}}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'NBA feed unavailable');return d.data||d})}
  function loadTeamIntel(id,force){
    if(!id)return;
    if(!force&&teams[id]&&(teams[id].loading||teams[id].loaded))return;
    teams[id]={loading:true,loaded:false};
    fetchJson('/api/team-intel?type=team&id='+encodeURIComponent(id)).then(d=>{teams[id]={...d,loading:false,loaded:true}}).catch(e=>{teams[id]={loading:false,loaded:false,error:e.message}}).finally(()=>{if(state.page==='team'&&String(state.item)===String(id))render()});
  }
  function loadTransactions(force){
    if(!force&&(tx.loading||tx.loaded))return;
    tx.loading=true;tx.error=null;
    fetchJson('/api/team-intel?type=transactions').then(d=>{tx.items=d.transactions||[];tx.updatedAt=d.updatedAt||null;tx.source=d.source||'ESPN';tx.note=d.note||'';tx.loaded=true}).catch(e=>{tx.error=e.message;tx.loaded=false}).finally(()=>{tx.loading=false;if(state.page==='transactions'||state.page==='player')render()});
  }
  function loadAdvanced(){
    if(advanced||advancedLoading)return;
    advancedLoading=true;advancedError=null;render();
    fetchJson('/api/advanced?type=players&season=2026').then(d=>{advanced=d;}).catch(e=>{advancedError=e.message}).finally(()=>{advancedLoading=false;render()});
  }
  function advancedFor(p){
    if(!advanced?.players)return null;
    const n=norm(p.name);
    return advanced.players.find(x=>norm(x.name)===n)||null;
  }
  function playerPhoto(p){
    const src=typeof head==='function'?head(p):(p.headshot||'');
    const extra=typeof photoAttrs==='function'?photoAttrs(p):'';
    return'<img class="ti-player-photo" loading="lazy" alt="" src="'+escx(src)+'"'+extra+'>';
  }
  function teamPosition(id){
    const g=(state.groups||[]).find(x=>(x.entries||[]).some(e=>String(e.team?.id)===String(id)));
    if(!g)return null;
    const rows=typeof rankedStandings==='function'?rankedStandings(g.entries):g.entries;
    const i=rows.findIndex(e=>String(e.team?.id)===String(id));
    if(i<0)return null;
    return{seed:i+1,conference:g.name,zone:i<6?'PLAYOFF':i<10?'PLAY-IN':'OUTSIDE',entry:rows[i]};
  }
  function rotationByMinutes(roster){
    const positions=['PG','SG','SF','PF','C'],out=[];
    for(const pos of positions){
      const list=roster.filter(p=>String(p.position||'').toUpperCase().split(/[\/, -]+/).includes(pos)&&p.stats?.min!==null&&p.stats?.min!==undefined).sort((a,b)=>(b.stats.min||0)-(a.stats.min||0)).slice(0,2);
      if(list.length)out.push({position:pos,players:list});
    }
    return out;
  }
  function txDateLabel(x){return date(x.date)}
  function teamTxHtml(items){
    if(!items?.length)return'<div class="ti-empty">No team transactions returned by the ESPN feed.</div>';
    return'<div class="ti-tx-list">'+items.slice(0,5).map(x=>'<article class="ti-tx-row"><div><span class="ti-chip '+(x.category==='TRADE'?'trade':'move')+'">'+escx(x.category)+'</span><small>'+escx(txDateLabel(x))+'</small></div><div><strong>'+escx(x.description)+'</strong><small>'+escx((x.players||[]).join(' · '))+'</small></div>'+(x.url?'<a href="'+escx(x.url)+'" target="_blank" rel="noopener noreferrer">SOURCE ↗</a>':'<span class="ti-source">ESPN FEED</span>')+'</article>').join('')+'</div>';
  }
  function teamIntelPanel(id){
    const d=teams[id],t=getTeam(id),accent=/^[0-9a-f]{6}$/i.test(String(t.color||''))?'#'+t.color:'#b9a0a6',standing=teamPosition(id);
    if(!d||d.loading)return'<section class="ti-shell" style="--ti-accent:'+accent+'"><div class="ti-section-head"><div><small>TEAM INTELLIGENCE</small><h2>Starting five &amp; roster stats</h2></div><span class="ti-live">ESPN FEED</span></div><div class="ti-loading">Loading verified lineup, roster statistics and transactions…</div></section>';
    if(d.error)return'<section class="ti-shell" style="--ti-accent:'+accent+'"><div class="ti-section-head"><div><small>TEAM INTELLIGENCE</small><h2>Starting five &amp; roster stats</h2></div><button data-ti-reload="team">RETRY ↻</button></div><div class="ti-empty">'+escx(d.error)+'</div></section>';
    const roster=(d.roster||[]).map(p=>({...p,advanced:advancedFor(p)}));
    const positions=['PG','SG','SF','PF','C'];
    const starters=(d.starters||[]).slice().sort((a,b)=>{const order=['PG','SG','SF','PF','C'];return (order.indexOf(a.position)<0?99:order.indexOf(a.position))-(order.indexOf(b.position)<0?99:order.indexOf(b.position))});
    const rosterById=new Map(roster.map(p=>[String(p.id),p]));
    const seed=standing?'<span class="ti-rank">#'+standing.seed+' '+escx(standing.conference)+' · '+standing.zone+'</span>':'<span class="ti-rank">STANDING UNAVAILABLE</span>';
    const lineup=starters.length?'<div class="ti-five-grid">'+starters.map((p,i)=>{const season=rosterById.get(String(p.id))?.stats||null;const g=p.gameStats||{};return'<article class="ti-five-card"><div class="ti-five-top"><span>'+(p.position||positions[i]||'—')+'</span><small>#'+escx(p.jersey||'—')+'</small></div>'+playerPhoto(p)+'<strong>'+escx(p.name)+'</strong><small class="ti-season-line">'+(season?'2026–27 · '+val(season.pts)+' PPG / '+val(season.reb)+' RPG / '+val(season.ast)+' APG':'Season averages unavailable')+'</small><small class="ti-game-line">LAST GAME · '+val(g.pts,0)+' PTS / '+val(g.reb,0)+' REB / '+val(g.ast,0)+' AST</small></article>'}).join('')+'</div>':'<div class="ti-empty">No starting five was published in the latest available completed box score. The app will not guess a current lineup.</div>';
    const posOptions=['ALL','PG','SG','SF','PF','C'].map(x=>'<option value="'+x+'"'+(controls.position===x?' selected':'')+'>'+x+'</option>').join('');
    const sortSelect=sortOptions.map(x=>'<option value="'+x[0]+'"'+(controls.sort===x[0]?' selected':'')+'>'+x[1]+'</option>').join('');
    let rows=roster.filter(p=>controls.position==='ALL'||String(p.position||'').toUpperCase().includes(controls.position));
    rows.sort((a,b)=>{const get=p=>{const k=controls.sort;return k==='per'?p.advanced?.per:k==='winShares'?p.advanced?.winShares:k==='ws48'?p.advanced?.ws48:k==='bpm'?p.advanced?.bpm:k==='vorp'?p.advanced?.vorp:k==='usagePercent'?p.advanced?.usagePercent:p.stats?.[k]};const av=get(a),bv=get(b);if(av===null||av===undefined)return 1;if(bv===null||bv===undefined)return-1;return(Number(av)-Number(bv))*(controls.descending?-1:1)});
    const advancedColumns='<th>PER<br>25–26</th><th>WS<br>25–26</th><th>WS/48<br>25–26</th><th>BPM<br>25–26</th><th>VORP<br>25–26</th><th>USG%<br>25–26</th>';
    const table='<div class="table-wrap ti-table-wrap"><table class="ti-roster-table"><thead><tr><th>PLAYER</th><th>POS</th><th>GP</th><th>MIN</th><th>PPG</th><th>RPG</th><th>APG</th><th>STL</th><th>BLK</th><th>TOV</th><th>FG%</th><th>3P%</th><th>FT%</th><th>TS%</th><th>eFG%</th>'+advancedColumns+'</tr></thead><tbody>'+(rows.length?rows.map(p=>'<tr><td><button class="ti-player-link" data-go="player:'+escx(p.id)+'">'+playerPhoto(p)+'<span>'+escx(p.name)+'</span></button></td><td>'+escx(p.position||'—')+'</td><td>'+val(p.stats?.gp,0)+'</td><td>'+val(p.stats?.min)+'</td><td>'+val(p.stats?.pts)+'</td><td>'+val(p.stats?.reb)+'</td><td>'+val(p.stats?.ast)+'</td><td>'+val(p.stats?.stl)+'</td><td>'+val(p.stats?.blk)+'</td><td>'+val(p.stats?.tov)+'</td><td>'+pct(p.stats?.fg)+'</td><td>'+pct(p.stats?.three)+'</td><td>'+pct(p.stats?.ft)+'</td><td>'+pct(p.stats?.ts)+'</td><td>'+pct(p.stats?.efg)+'</td><td>'+val(p.advanced?.per)+'</td><td>'+val(p.advanced?.winShares)+'</td><td>'+val(p.advanced?.ws48,3)+'</td><td>'+val(p.advanced?.bpm)+'</td><td>'+val(p.advanced?.vorp)+'</td><td>'+pct(p.advanced?.usagePercent)+'</td></tr>').join(''):'<tr><td colspan="21">Roster statistics unavailable from ESPN for this team/season.</td></tr>')+'</tbody></table></div>';
    const rotation=rotationByMinutes(roster);
    const rotationHtml=rotation.length?'<div class="ti-rotation-grid">'+rotation.map(g=>'<div><small>'+g.position+' · MINUTES-BASED ESTIMATE</small>'+g.players.map(p=>'<span>'+escx(p.name)+' <b>'+val(p.stats?.min)+' MIN</b></span>').join('')+'</div>').join('')+'</div>':'<div class="ti-empty">No minute-based rotation estimate available.</div>';
    const txHtml=teamTxHtml(d.transactions||[]);
    const last=d.lastGame?'<div class="ti-last-game">LAST COMPLETED GAME · '+escx(date(d.lastGame.date))+' · '+escx(d.lastGame.opponent||'OPPONENT')+' · '+escx(d.lastGame.status||'FINAL')+'</div>':'<div class="ti-last-game">LATEST COMPLETED GAME / LINEUP UNAVAILABLE</div>';
    return'<section class="ti-shell" style="--ti-accent:'+accent+'"><div class="ti-section-head"><div><small>TEAM INTELLIGENCE / 2026–27</small><h2>Starting five &amp; roster stats</h2></div>'+seed+'</div><div class="ti-block"><div class="ti-block-head"><div><span>01 / LAST CONFIRMED STARTERS</span><h3>Starting five</h3></div><span class="ti-chip confirmed">BOX SCORE</span></div>'+last+lineup+'<p class="ti-note">These are starters recorded in the latest completed ESPN box score, not a projected lineup for the next game.</p></div><div class="ti-block"><div class="ti-block-head"><div><span>02 / DEPTH &amp; ROTATION</span><h3>Rotation map</h3></div><span class="ti-chip estimate">ESTIMATE</span></div>'+rotationHtml+'<p class="ti-note">Estimated from 2026–27 average minutes by listed position. It is not an official depth chart.</p></div><div class="ti-block"><div class="ti-block-head"><div><span>03 / PLAYER DATABASE</span><h3>Sortable roster</h3></div><span class="ti-count">'+roster.length+' PLAYERS</span></div><div class="ti-controls"><label>POSITION<select id="ti-position">'+posOptions+'</select></label><label>SORT BY<select id="ti-sort">'+sortSelect+'</select></label><button data-ti-sortdir="1">'+(controls.descending?'↓ DESC':'↑ ASC')+'</button><button data-ti-advanced="1" '+(advancedLoading?'disabled':'')+'>'+(advanced?'ADVANCED LOADED':'LOAD 2025–26 ADVANCED')+'</button></div><div class="ti-advanced-note">'+(advanced?'Advanced metrics: '+escx(advanced.source||'third-party dataset')+' · 2025–26 · '+(advanced.coverage||advanced.players?.length||0)+' players.':'PER / WS / WS48 / BPM / VORP / USG% use the last complete 2025–26 third-party dataset, not 2026–27 live stats.')+(advancedError?' · '+escx(advancedError):'')+'</div>'+table+'</div><div class="ti-block"><div class="ti-block-head"><div><span>04 / FRONT OFFICE</span><h3>Team transactions</h3></div><button data-go="nav:transactions">ALL TRANSACTIONS →</button></div>'+txHtml+'</div><div class="ti-foot">DATA: ESPN public feeds · roster and 2026–27 player stats · historical advanced dataset labelled by season. Missing fields remain unavailable.</div></section>';
  }
  function transactionCard(x){
    const people=(x.players||[]).join(' · '),teams=(x.teams||[]).map(t=>t.name).join(' / ');
    return'<article class="ti-tx-card"><div class="ti-tx-meta"><span class="ti-chip '+(x.category==='TRADE'?'trade':'move')+'">'+escx(x.category)+'</span><time>'+escx(date(x.date))+'</time></div><h3>'+escx(x.description)+'</h3>'+(people?'<p>PLAYERS · '+escx(people)+'</p>':'')+(teams?'<p>TEAMS · '+escx(teams)+'</p>':'')+'<footer><span>ESPN PUBLIC FEED</span>'+(x.url?'<a href="'+escx(x.url)+'" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>':'')+'</footer></article>';
  }
  function transactionsPage(){
    const teamsList=state.teams||[];
    const teamOptions='<option value="ALL">ALL TEAMS</option>'+teamsList.map(t=>'<option value="'+escx(t.id)+'"'+(controls.txTeam===String(t.id)?' selected':'')+'>'+escx(t.name)+'</option>').join('');
    const typeOptions=[['ALL','ALL TYPES'],['TRADE','TRADES'],['MOVE','SIGNINGS / MOVES'],['TRANSACTION','OTHER']].map(x=>'<option value="'+x[0]+'"'+(controls.txType===x[0]?' selected':'')+'>'+x[1]+'</option>').join('');
    let rows=(tx.items||[]).slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    if(controls.txTeam!=='ALL'){
      const team=getTeam(controls.txTeam),needles=[norm(team.name),norm(team.abbr)].filter(Boolean);
      rows=rows.filter(x=>(x.teamIds||[]).includes(String(controls.txTeam))||(x.teams||[]).some(t=>needles.some(n=>norm(t.name).includes(n)||n.includes(norm(t.name)))));
    }
    if(controls.txType!=='ALL')rows=rows.filter(x=>x.category===controls.txType);
    if(controls.query){const q=norm(controls.query);rows=rows.filter(x=>norm([x.description,x.type,(x.players||[]).join(' '),(x.teams||[]).map(t=>t.name).join(' ')].join(' ')).includes(q))}
    const content=tx.loading?'<div class="ti-loading">Loading ESPN transactions…</div>':tx.error?'<div class="ti-empty">'+escx(tx.error)+' <button data-ti-reload="transactions">RETRY ↻</button></div>':rows.length?'<div class="ti-tx-grid">'+rows.map(transactionCard).join('')+'</div>':'<div class="ti-empty">No matching records in the ESPN transaction feed. Rumors and speculative packages are intentionally excluded.</div>';
    return pageTitle('FRONT OFFICE','Trades & transactions','ESPN-listed NBA transactions · filter by team, player and transaction type')+'<section class="ti-shell ti-transactions"><div class="ti-section-head"><div><small>NBA TRANSACTION WIRE</small><h2>Trades, signings &amp; roster moves</h2></div><span class="ti-live">ESPN PUBLIC FEED</span></div><div class="ti-tx-toolbar"><label>TEAM<select id="ti-tx-team">'+teamOptions+'</select></label><label>TYPE<select id="ti-tx-type">'+typeOptions+'</select></label><label>SEARCH PLAYER / TEAM<input id="ti-tx-search" type="search" value="'+escx(controls.query)+'" placeholder="Player, team, transaction…"></label><button data-ti-reload="transactions">REFRESH ↻</button></div><div class="ti-tx-summary"><strong>'+rows.length+'</strong><span>matching records</span><small>'+(tx.updatedAt?'Updated '+escx(date(tx.updatedAt)):'Source timestamp unavailable')+'</small></div>'+content+'<div class="ti-foot">Source: ESPN public NBA transactions endpoint. ESPN feed entries are displayed as published; no independent claim of league verification is made. Rumors are not mixed into this feed.</div></section>';
  }
  function playerTransactionsPanel(id){
    if(!tx.loaded||!tx.items.length)return'';
    const p=(state.players||[]).find(x=>String(x.id)===String(id))||Object.values(state.rosters||{}).flatMap(x=>x?.players||[]).find(x=>String(x.id)===String(id))||{};
    const items=tx.items.filter(x=>(x.playerIds||[]).includes(String(id))||(p.name&&(x.players||[]).some(n=>norm(n)===norm(p.name))));
    if(!items.length)return'';
    return'<section class="section ti-player-transactions"><div class="ti-block-head"><div><span>FRONT OFFICE HISTORY</span><h3>Transactions involving '+escx(p.name||'this player')+'</h3></div><button data-go="nav:transactions">OPEN TRADES →</button></div>'+teamTxHtml(items)+'</section>';
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('[data-ti-advanced]');if(a){loadAdvanced();return}
    const dir=e.target.closest('[data-ti-sortdir]');if(dir){controls.descending=!controls.descending;render();return}
    const retry=e.target.closest('[data-ti-reload]');if(retry){if(retry.dataset.tiReload==='team')loadTeamIntel(state.item,true);else loadTransactions(true);return}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='ti-position'){controls.position=e.target.value;render()}
    if(e.target.id==='ti-sort'){controls.sort=e.target.value;render()}
    if(e.target.id==='ti-tx-team'){controls.txTeam=e.target.value;render()}
    if(e.target.id==='ti-tx-type'){controls.txType=e.target.value;render()}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='ti-tx-search'){
      controls.query=e.target.value;const pos=e.target.selectionStart;
      clearTimeout(window._tiSearchTimer);window._tiSearchTimer=setTimeout(()=>{if(state.page==='transactions'){render();const el=document.getElementById('ti-tx-search');if(el){el.focus();el.setSelectionRange(pos,pos)}}},120);
    }
  });
  window.loadTeamIntel=loadTeamIntel;
  window.loadTransactions=loadTransactions;
  window.teamIntelPanel=teamIntelPanel;
  window.transactionsPage=transactionsPage;
  window.playerTransactionsPanel=playerTransactionsPanel;
})();