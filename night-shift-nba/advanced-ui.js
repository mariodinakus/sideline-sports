/* NIGHT SHIFT — Internal Advanced Lab & GOAT. Fonts and compact cards defined in /style.css.
 * No iframe/external redirect for the Team DNA module.
 * All numbers are returned from ESPN or a labeled third-party advanced-stat data source.
 */
const advState={tab:'teams',tier:'01',team:'13',other:'2',year:2027,metric:'per',season:2026,players:null,playersBusy:false,playerQuery:'',goat:null,goatBusy:false,goatMode:'balanced',goatScope:'all',teamStats:{},teamEvo:{},profileStats:{},error:null,sortDescending:true};
const ADV_SOURCE='nbaapi.com / 2025–26';
const metrics=[['avgPoints','PPG'],['avgRebounds','RPG'],['avgAssists','APG'],['avgSteals','SPG'],['avgBlocks','BPG'],['avgTurnovers','TOV'],['fieldGoalPct','FG%'],['threePointFieldGoalPct','3PT%'],['freeThrowPct','FT%']];
const derivedMetrics=[['effectiveFieldGoalPct','eFG%'],['trueShootingPct','TS%'],['threePointAttemptRate','3PA RATE'],['freeThrowRate','FTA RATE'],['turnoverPctProxy','TOV% EST.']];
const playerAdvancedMetrics=[['per','PER'],['tsPercent','TS%'],['usagePercent','USG%'],['bpm','BPM'],['vorp','VORP'],['winShares','WS'],['ws48','WS/48'],['obpm','OBPM'],['dbpm','DBPM'],['assistPercent','AST%']];
const abbrName=k=>(state.teams.find(x=>x.id===k)?.name)||'TEAM '+k;
async function advancedApi(type,params={}){const u=new URL('/api/advanced',location.origin);u.searchParams.set('type',type);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u);const d=await r.json();if(!r.ok)throw Error(d.error||'Data unavailable');return d.data}
function ensureAdvanced(){if(!state.teams.length)return;advState.team=state.teams.some(t=>t.id===advState.team)?advState.team:state.teams[0].id;advState.other=state.teams.some(t=>t.id===advState.other)?advState.other:state.teams.at(1)?.id||advState.team;loadAdvTeam(advState.team,advState.year);if(advState.tab==='compare')loadAdvTeam(advState.other,advState.year);if(advState.tab==='evolution')loadTeamEvolution(advState.team);if(advState.tab==='players')loadAdvancedPlayers()}
async function loadAdvTeam(id,year=2027){let key=id+'@'+year;if(advState.teamStats[key])return;advState.teamStats[key]={loading:true};render();try{advState.teamStats[key]=await advancedApi('team',{id,season:year})}catch(e){advState.teamStats[key]={error:e.message}}render()}
async function loadTeamEvolution(id){if(advState.teamEvo[id])return;advState.teamEvo[id]={loading:true};render();try{advState.teamEvo[id]=await advancedApi('evolution',{id})}catch(e){advState.teamEvo[id]={error:e.message}}render()}
async function loadAdvancedPlayers(){let key=String(advState.season);if(advState.players?.season===advState.season||advState.playersBusy)return;advState.playersBusy=true;render();try{advState.players=await advancedApi('players',{season:advState.season});advState.error=null}catch(e){advState.error=e.message;advState.players={season:advState.season,players:[],available:false}}advState.playersBusy=false;render()}
async function loadAdvancedPlayer(id,name,year=2026){if(!name||advState.profileStats[id])return;advState.profileStats[id]={loading:true};render();try{advState.profileStats[id]=await advancedApi('player',{name,season:year})}catch(e){advState.profileStats[id]={error:e.message}}render()}
async function loadGoat(){if(advState.goat||advState.goatBusy)return;advState.goatBusy=true;render();try{const r=await fetch('/api/goat');const d=await r.json();if(!r.ok)throw Error(d.error||'ESPN GOAT data unavailable');advState.goat=d;advState.error=null}catch(e){advState.error=e.message}advState.goatBusy=false;render()}
const aVal=(v,d=1)=>v===null||v===undefined||Number.isNaN(Number(v))?'—':Number(v).toFixed(d);
function avNum(v){return v===null||v===undefined||!Number.isFinite(Number(v))?null:Number(v)}
function advTeamSelect(id,value){return'<select class="int-select" id="'+id+'">'+state.teams.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===value?' selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>'}
function advSeasonSelect(id,year){return'<select class="int-select" id="'+id+'">'+Array.from({length:11},(_,i)=>2027-i).map(y=>'<option value="'+y+'"'+(y===year?' selected':'')+'>'+esc((y-1)+'–'+String(y).slice(-2))+'</option>').join('')+'</select>'}
function advFigure(label,value,note='ESPN SOURCE',d=1){return'<div class="dna-metric"><span class="dna-label">'+esc(label)+'</span><strong>'+aVal(value,d)+'</strong><small>'+esc(note)+'</small></div>'}
function teamStatsGrid(d){
 const r=d.reported||{},p=d.derived||{},tier=advState.tier;
 const nav=[['01','01 / ΒΑΣΙΚΑ'],['02','02 / SHOOTING'],['03','03 / ADVANCED'],['04','04 / ECONOMICS']];
 const bar='<div class="int-tabs tier-tabs">'+nav.map(([k,n])=>'<button class="int-tab '+(tier===k?'selected':'')+'" data-advtier="'+k+'">'+n+'</button>').join('')+'</div>';
 const g=(key,label,category)=>advFigure(label,category==='derived'?p[key]:r[key],category==='derived'?'CALCULATED · ESPN':'REPORTED · ESPN',key==='gamesPlayed'?0:1);
 if(tier==='04')return bar+'<div class="economy-metrics">'+grEconomyOfficial.map(x=>'<div class="economy-metric"><small>'+esc(x.label)+'</small><strong>'+esc(x.value)+'</strong></div>').join('')+'</div><p class="int-note">2026–27 league-wide official thresholds, όχι η μισθοδοσία της επιλεγμένης ομάδας. <a class="inline-link" href="https://www.nba.com/news/nba-salary-cap-2026-27-season" target="_blank" rel="noopener noreferrer">NBA source ↗</a></p>';
 let cards=[];
 if(tier==='01')cards=[['gamesPlayed','GP','reported'],['avgPoints','PPG','reported'],['avgRebounds','RPG','reported'],['avgAssists','APG','reported'],['avgSteals','SPG','reported'],['avgBlocks','BPG','reported'],['avgTurnovers','TOV','reported'],['avgMinutes','MIN','reported']];
 if(tier==='02')cards=[['fieldGoalPct','FG%','reported'],['threePointFieldGoalPct','3PT%','reported'],['freeThrowPct','FT%','reported'],['effectiveFieldGoalPct','eFG%','derived'],['trueShootingPct','TS%','derived'],['threePointAttemptRate','3PA RATE','derived'],['freeThrowRate','FTA RATE','derived']];
 if(tier==='03')cards=[['assistTurnoverRatio','AST/TO','reported'],['turnoverPctProxy','TOV% EST.','derived'],['scoringEfficiency','SCORING EFF','reported'],['shootingEfficiency','SHOOTING EFF','reported'],['avgOffensiveRebounds','O-REB','reported'],['avgDefensiveRebounds','D-REB','reported']];
 const footer=tier==='03'?'<p class="int-note">PER, BPM, VORP, WS & pace-adjusted ORtg/DRtg δεν παρέχονται επιβεβαιωμένα για το 2026–27 από αυτή την πηγή. Δεν εμφανίζουμε υποκατάστατα ως αυθεντικές τιμές.</p>':'';
 return bar+'<div class="dna-metrics">'+cards.map(([k,n,cat])=>g(k,n,cat)).join('')+'</div>'+footer;
}
function advancedLoad(x){return !x||x.loading?'<div class="empty">Loading verified NBA statistics…</div>':x.error?error('ESPN: '+x.error):''}
function advHeading(k,t,desc){return'<div class="int-title"><span class="eyebrow">'+esc(k)+'</span><h2>'+esc(t)+'</h2><p>'+esc(desc||'')+'</p></div>'}
function teamDnaView(){const id=advState.team,year=advState.year,s=advState.teamStats[id+'@'+year],team=state.teams.find(x=>x.id===id);return'<div class="int-controls">'+advTeamSelect('adv-team',id)+advSeasonSelect('adv-year',year)+'</div>'+
'<div class="dna-profile"><div><span class="eyebrow">TEAM DOSSIER · '+(year-1)+'–'+String(year).slice(-2)+'</span><h3>'+esc(team?.name||abbrName(id))+'</h3><p>Team DNA, efficiency ratios, true shooting, pace-related proxies. Only reported or explicitly derived metrics.</p></div>'+ (team?.logo?'<img alt="" src="'+esc(team.logo)+'">':'')+'</div>'+
(advancedLoad(s)||teamStatsGrid(s))+'<p class="int-note">ESPN Team Statistics · eFG% = (FGM + 0.5×3PM) / FGA · TS% = PTS / [2 × (FGA + 0.44×FTA)]. Offensive Rating, Defensive Rating, Net Rating and Pace are not supplied reliably by this feed, so they are not invented.</p>'}
const compareMetrics=[...metrics,...derivedMetrics];
function comparisonsView(){const y=advState.year,a=advState.teamStats[advState.team+'@'+y],b=advState.teamStats[advState.other+'@'+y];let vals=(s,k)=>s?.reported?.[k]??s?.derived?.[k]??null;
let rows=compareMetrics.map(([k,n])=>{const v1=avNum(vals(a,k)),v2=avNum(vals(b,k)),valid=v1!==null&&v2!==null;return'<div class="compare-stat"><span class="'+(valid&&v1>v2?'leader':'')+'">'+aVal(v1)+'</span><strong>'+esc(n)+'</strong><span class="'+(valid&&v2>v1?'leader':'')+'">'+aVal(v2)+'</span></div>'}).join('');
return'<div class="int-controls">'+advTeamSelect('adv-team',advState.team)+advTeamSelect('adv-other',advState.other)+advSeasonSelect('adv-year',y)+'</div>'+
'<div class="compare-labels"><strong>'+esc(abbrName(advState.team))+'</strong><span>VS</span><strong>'+esc(abbrName(advState.other))+'</strong></div>'+
(advancedLoad(a)||advancedLoad(b)||'<div class="compare-data">'+rows+'</div>')+'<p class="int-note">Higher is not always better: turnovers and TOV% are generally more desirable when lower. All data represent the selected ESPN season.</p>'}
function evolutionView(){const s=advState.teamEvo[advState.team];return'<div class="int-controls">'+advTeamSelect('adv-team',advState.team)+'</div>'+
(advancedLoad(s)||(()=>{const series=s.seasons||[];if(series.length<2)return error('Η ESPN δεν παρέχει αρκετές σεζόν για γραφήματα.');const axes=[['avgPoints','POINTS PER GAME','reported'],['avgThreePointFieldGoalsAttempted','3PT ATTEMPTS / GAME','reported'],['trueShootingPct','TRUE SHOOTING % (derived)','derived']];return axes.map(([key,label,src])=>{const nums=series.map(x=>avNum(x[src][key]));const max=Math.max(...nums.filter(x=>x!==null),1);return'<div class="evo-chart"><div class="eyebrow">'+label+'</div><div class="evo-bars">'+series.map((x,i)=>'<div class="evo-year"><span title="'+esc((x.season-1)+'–'+String(x.season).slice(-2))+' · '+aVal(nums[i])+' '+label+'" style="height:'+Math.max(2,nums[i]===null?2:nums[i]/max*100)+'%"></span><small>'+String(x.season).slice(-2)+'</small></div>').join('')+'</div><div class="evo-ends"><span>'+aVal(nums[0])+' · '+String(series[0].season)+'</span><span>'+aVal(nums.at(-1))+' · '+String(series.at(-1).season)+'</span></div></div>'}).join('')})())+
'<p class="int-note">Seasonal ESPN team statistics, 2016–17 to 2026–27 where published. No interpolation. Full-game team averages are not pace-adjusted.</p>'}
function bbrefUrl(id){return /^[a-z0-9]{6,12}$/i.test(id||'')?'https://www.basketball-reference.com/players/'+id[0].toLowerCase()+'/'+id.toLowerCase()+'.html':null}
function advPlayerTable(){const rows=advState.players?.players||[],query=advState.playerQuery.trim().toLowerCase(),k=advState.metric;
const data=rows.filter(p=>!query||p.name.toLowerCase().includes(query)||p.team.toLowerCase().includes(query)).sort((a,b)=>(avNum(b[k])??-1e12)-(avNum(a[k])??-1e12)).slice(0,75);
return'<div class="int-controls"><input id="adv-search" class="int-search" placeholder="Search player / team…" value="'+esc(advState.playerQuery)+'">'+
'<select class="int-select" id="adv-player-season"><option value="2026">2025–26</option><option value="2025">2024–25</option><option value="2024">2023–24</option><option value="2023">2022–23</option></select>'+
'<select class="int-select" id="adv-metric">'+playerAdvancedMetrics.map(([id,n])=>'<option value="'+id+'"'+(id===k?' selected':'')+'>'+n+'</option>').join('')+'</select></div>'+
(advState.playersBusy?'<div class="empty">Loading advanced player database…</div>':!advState.players?.available?error('Δεν υπάρχει διαθέσιμο ιστορικό advanced dataset για τη σεζόν.'):('<div class="int-info">'+esc(advState.players.coverage)+' players · '+esc(advState.players.season-1)+'–'+String(advState.players.season).slice(-2)+' · '+esc(advState.players.source)+(advState.players.complete?'':' · partial upstream data')+'</div><div class="advanced-table">'+data.map((p,i)=>'<div class="advanced-row"><span class="adv-rank">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.team)+' · '+esc(p.position)+' · '+(p.games??'—')+' GP</small></div><span class="adv-measure">'+aVal(p[k],k==='ws48'?3:1)+'</span>'+(bbrefUrl(p.bbrefId)?'<a href="'+esc(bbrefUrl(p.bbrefId))+'" target="_blank" rel="noopener noreferrer" class="ext-mini" title="Basketball Reference">BR ↗</a>':'<span class="ext-mini">—</span>')+'</div>').join('')+'</div>'))+
'<p class="int-note">Advanced data: third-party historical basketball dataset with Basketball-Reference style metrics. Its coverage differs from ESPN. Not a live NBA tracking feed. Basketball Reference opens only when tapped explicitly.</p>'}
function glossaryView(){const terms=[
['PER','Player Efficiency Rating','Box-score efficiency adjusted to a league baseline. Not a defense or wins guarantee.'],
['TS%','True Shooting','Scoring efficiency including 2PT, 3PT and free throws.'],
['eFG%','Effective Field Goal','(FGM + 0.5 × 3PM) / FGA. Makes 3PM worth 1.5 field goals.'],
['BPM','Box Plus/Minus','Estimated contribution per 100 possessions relative to league average from box-score data.'],
['VORP','Value Over Replacement','BPM-based aggregate estimate above replacement player, season-dependent.'],
['WS','Win Shares','Estimated wins attributable to a player, derived from team/player box scores.'],
['WS/48','Win Shares per 48','Win-share rate per 48 minutes.'],
['USG%','Usage Percentage','Estimated team possessions a player uses through attempts, FTs and turnovers while on floor.'],
['ORtg / DRtg','Ratings per 100 possessions','Not interchangeable with points per game or opponent points per game.'],
['PACE','Possessions per 48 minutes','Cannot be safely inferred from team points alone.'],
['3PA RATE','3-point attempt rate','3PA / FGA, proportion of field goal attempts from beyond arc.'],
['TOV%','Turnover frequency','A team approximation uses TOV / (FGA + 0.44 × FTA + TOV).']
];return'<div class="gloss-grid">'+terms.map(([abbr,title,desc])=>'<div class="gloss-card"><b>'+esc(abbr)+'</b><div><strong>'+esc(title)+'</strong><p>'+esc(desc)+'</p></div></div>').join('')+'</div><p class="int-note">Reference definitions: standard NBA analytics / Basketball Reference glossary. Calculated or estimated fields are explicitly labeled.</p>'}
function advancedPage(){const tabs=[['teams','Team DNA'],['compare','Compare'],['evolution','Evolution'],['players','Player Advanced'],['academy','Stats Academy']];
return pageTitle('NBA / INTELLIGENCE','Advanced Lab','Εσωτερική καρτέλα — χωρίς έξοδο από την εφαρμογή')+'<div class="int-shell"><div class="int-tabs">'+tabs.map(([id,title])=>'<button class="int-tab '+(advState.tab===id?'selected':'')+'" data-advtab="'+id+'">'+title+'</button>').join('')+'</div><div class="int-body">'+({teams:teamDnaView,compare:comparisonsView,evolution:evolutionView,players:advPlayerTable,academy:glossaryView}[advState.tab]||teamDnaView)()+'</div></div>'}
function goatScore(p,mode='balanced'){const score={
  awards:25*Math.min(1,(p.mvp||0)/5)+17*Math.min(1,(p.finalsMVP||0)/5)+13*Math.min(1,(p.allNBA1||0)/12)+5*Math.min(1,(p.dpoy||0)/2),
  peak:20*Math.min(1,Math.max(0,p.peakPPG||0)/36),
  longevity:10*Math.min(1,(p.seasons||0)/21),
  career:10*Math.min(1,(p.careerPPG||0)/31)
};if(mode==='peak')return score.peak*3.6+score.career*.6+score.awards*.12;
if(mode==='resume')return score.awards*1.6+score.longevity*.4;
if(mode==='longevity')return score.longevity*6+score.career*.7+score.awards*.15;
return score.awards+score.peak+score.longevity+score.career;}
function goatPage(){const g=advState.goat, modes=[['balanced','Overall'],['peak','Peak'],['resume','Awards'],['longevity','Longevity']];const rows=(g?.players||[]).filter(p=>advState.goatScope!=='active'||p.active).map(p=>({...p,score:goatScore(p,advState.goatMode)})).sort((a,b)=>b.score-a.score);
return pageTitle('NBA / GOAT INDEX','Greatness, measured.','Ζωντανός επανυπολογισμός με στοιχεία καριέρας και βραβείων ESPN — όχι επίσημη κατάταξη NBA')+
'<div class="goat-top"><div><span class="eyebrow">THE DEBATE IS IN THE NUMBERS</span><h2>THE<br>GOAT<br>INDEX.</h2></div><span class="goat-top-mark">#01</span></div>'+
'<div class="int-tabs">'+modes.map(([id,t])=>'<button data-goatmode="'+id+'" class="int-tab '+(advState.goatMode===id?'selected':'')+'">'+t+'</button>').join('')+'</div>'+
'<div class="int-controls goat-filters"><span class="int-info">Curated shortlist · '+(g?.players?.length||0)+' verifiable player records</span><button class="int-tab '+(advState.goatScope==='all'?'selected':'')+'" data-goatscope="all">All eras</button><button class="int-tab '+(advState.goatScope==='active'?'selected':'')+'" data-goatscope="active">Active (source)</button></div>'+
(advState.goatBusy?'<div class="empty">Retrieving career awards and season stats from ESPN…</div>':advState.error&&!g?error(advState.error):!g?error('Loading ranking…'):rows.length?'<div class="goat-list">'+rows.map((p,i)=>'<button class="goat-row" '+action('player',p.id)+'><div class="goat-rank">#'+String(i+1).padStart(2,'0')+'</div><img alt="" src="'+head(p)+'" loading="lazy"><div class="goat-name"><strong>'+esc(p.name)+'</strong><small>'+esc(p.seasons)+' seasons · '+aVal(p.careerPPG)+' career PPG</small></div><div class="goat-medals"><span>'+esc(p.mvp)+' MVP</span><span>'+esc(p.finalsMVP)+' FMVP</span></div><div class="goat-score">'+aVal(p.score,1)+'</div></button>').join('')+'</div>':error('Δεν βρέθηκαν αξιόπιστες ιστορικές εγγραφές.'))+
'<div class="goat-method"><h3>How the index works</h3><p>Overall: έως 25 μονάδες MVP, 17 Finals MVP, 13 All-NBA First Team, 5 DPOY, 20 peak scoring (μέσος όρος των τριών κορυφαίων σεζόν), 10 χρόνια παρουσίας, 10 μέσος όρος πόντων καριέρας. Τα άλλα tabs αλλάζουν τα σχετικά βάρη και επαναταξινομούν τους ίδιους παίκτες.</p><p>Δεν περιλαμβάνει επιβεβαιωμένα πρωταθλήματα, impact tracking, αντίπαλους ή προσαρμογή στην εποχή. Η λίστα είναι επιλεγμένη, όχι πλήρης. Το σκορ είναι υποκειμενικό εργαλείο σύγκρισης, όχι επίσημη NBA ή Basketball Reference κατάταξη. Κάποια παλαιότερα βραβεία μπορεί να απουσιάζουν από το ESPN.</p><small>Source: ESPN public career statistics & award records · cache refresh approximately every 2 hours</small></div>'}
const advancedProfileLabel=[['per','PER'],['tsPercent','TS%'],['usagePercent','USG%'],['bpm','BPM'],['vorp','VORP'],['winShares','WIN SHARES'],['ws48','WS/48']];
function advancedPlayerPanel(id){
const h=state.histPlayers[id],name=h?.athlete?.name||h?.athlete?.displayName||'',data=advState.profileStats[id],p=data?.players?.[0];let link=p?.bbrefId?bbrefUrl(p.bbrefId):null;
return'<section class="section"><div class="section-title"><div><div class="eyebrow">ADVANCED PLAYER IMPACT</div><h2>PER · BPM · VORP · Win Shares</h2></div><button class="ghost-btn" '+action('nav','advanced')+'>Advanced Lab →</button></div>'+
'<div class="panel"><div class="int-info">2025–26 verified historical dataset · not available for every player / era</div>'+
(!data||data.loading?'<p class="muted">Fetching advanced source…</p>':data.error?'<p class="muted">Advanced feed unavailable: '+esc(data.error)+'</p>':p?'<div class="dna-metrics">'+advancedProfileLabel.map(([k,n])=>advFigure(n,p[k],'2025–26 NBA ADVANCED',k==='ws48'?3:1)).join('')+'</div>':'<p class="muted">Οι συγκεκριμένες advanced μετρικές δεν είναι διαθέσιμες από τη συνδεδεμένη πηγή για αυτή τη σεζόν. Δεν συμπληρώνονται με εκτιμήσεις.</p>')+
'<div class="profile-ref-links">'+(link?'<a target="_blank" rel="noopener noreferrer" href="'+esc(link)+'">Basketball Reference ↗</a>':'<a target="_blank" rel="noopener noreferrer" href="https://www.basketball-reference.com/search/search.fcgi?search='+encodeURIComponent(name)+'">Search Basketball Reference ↗</a>')+'<a target="_blank" rel="noopener noreferrer" href="https://www.espn.com/nba/player/_/id/'+encodeURIComponent(id)+'">ESPN profile ↗</a></div></div></section>'}
function awardsSummary(h){
 const awards=h?.awards||[],k=n=>awards.filter(a=>a.name===n).reduce((a,v)=>a+(v.seasons?.length||0),0);
 const data={
 'jim loscutoff':[1957,1959,1960,1961,1962,1963,1964],
 'frank ramsey':[1957,1959,1960,1961,1962,1963,1964],
 'bill russell':[1957,1959,1960,1961,1962,1963,1964,1965,1966,1968,1969],
 'sam jones':[1959,1960,1961,1962,1963,1964,1965,1966,1968,1969],
 'john havlicek':[1963,1964,1965,1966,1968,1969,1974,1976],
 'tom heinsohn':[1957,1959,1960,1961,1962,1963,1964,1965],
 'kc jones':[1959,1960,1961,1962,1963,1964,1965,1966],
 'tom sanders':[1961,1962,1963,1964,1965,1966,1968,1969],
 'robert horry':[1994,1995,2000,2001,2002,2005,2007],
 'kareem abdul jabbar':[1971,1980,1982,1985,1987,1988],
 'bob cousy':[1957,1959,1960,1961,1962,1963],
 'michael jordan':[1991,1992,1993,1996,1997,1998],
 'scottie pippen':[1991,1992,1993,1996,1997,1998],
 'kobe bryant':[2000,2001,2002,2009,2010],
 'magic johnson':[1980,1982,1985,1987,1988],
 'tim duncan':[1999,2003,2005,2007,2014],
 'dennis rodman':[1989,1990,1996,1997,1998],
 'stephen curry':[2015,2017,2018,2022],
 'draymond green':[2015,2017,2018,2022],
 'klay thompson':[2015,2017,2018,2022],
 'andre iguodala':[2015,2017,2018,2022],
 'lebron james':[2012,2013,2016,2020],
 'shaquille oneal':[2000,2001,2002,2006],
 'tony parker':[2003,2005,2007,2014],
 'manu ginobili':[2003,2005,2007,2014],
 'kevin durant':[2017,2018],
 'nikola jokic':[2023],
 'jayson tatum':[2024],
 'jaylen brown':[2024],
 'jalen brunson':[2026],
 'mikal bridges':[2026],
 'josh hart':[2026]
 };
 const norm=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’\.]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const years=data[norm(h?.athlete?.name)],ring=years?years.length:null;
 const tiles=[['NBA CHAMPIONSHIPS',ring??'—'],['MVP',k('MVP')],['FINALS MVP',k('Finals MVP')],['ALL-NBA 1ST',k('All-NBA 1st Team')],['DPOY',k('Defensive Player of the Year')]];
 return '<section class="section"><div class="section-title"><h2>Awards &amp; rings</h2></div><div class="awards-summary">'+tiles.map(([n,v])=>'<div><b>'+v+'</b><span>'+n+'</span></div>').join('')+'</div><p class="int-note">'+(years?'NBA titles: '+years.join(' · ')+' · <a href="https://www.basketball-reference.com/leaders/most_championships.html" target="_blank" rel="noopener noreferrer">Championship sources ↗</a>':'NBA championships: not yet verified for this player; — does not mean zero.')+' · Other award counts: ESPN records.</p></section>'
}
