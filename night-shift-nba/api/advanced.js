/* NBA Advanced — source-backed team statistics (ESPN) and historical player advances (NBA API public mirror).
 * ESPN: 2026–27 where available. NBA API mirror: 2025–26 available, 2026–27 may not exist.
 * "Derived" means formulas calculated from reported field goals, FT attempts, etc.
 */
const ESPN='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams';
const NBA='https://api.server.nbaapi.com/api/playeradvancedstats';
const timeout=ms=>AbortSignal.timeout(ms);
const validId=v=>/^[0-9]{1,6}$/.test(String(v||''));
const validYear=v=>Number.isInteger(v)&&v>=1980&&v<=2027;
const numeric=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
async function pull(url,ms=9500){const r=await fetch(url,{signal:timeout(ms),headers:{accept:'application/json'},next:{revalidate:900}});if(!r.ok)throw Error('Source HTTP '+r.status);return r.json()}
function transformStats(raw,id,year){const list=raw.results?.stats?.categories||[];let fields={};for(const c of list)for(const s of c.stats||[])if(s.name&&numeric(s.value)!==null)fields[s.name]=numeric(s.value);
const take=k=>fields[k]??null, divide=(x,y)=>x!==null&&y>0?x/y:null;
const fgm=take('avgFieldGoalsMade'),fga=take('avgFieldGoalsAttempted'),three=take('avgThreePointFieldGoalsMade'),fta=take('avgFreeThrowsAttempted'),pts=take('avgPoints'),to=take('avgTurnovers');
const efg=fgm!==null&&three!==null&&fga>0?(fgm+0.5*three)/fga*100:null;
const ts=pts!==null&&fga!==null&&fta!==null&&fga+.44*fta>0?pts/(2*(fga+.44*fta))*100:null;
const ftr=divide(fta,fga),threeRate=divide(take('avgThreePointFieldGoalsAttempted'),fga);
const t=to!==null&&fga!==null&&fta!==null&&fga+.44*fta+to>0?to/(fga+.44*fta+to)*100:null;
return {teamId:String(id),season:year,teamName:raw.team?.displayName||null,reported:fields,derived:{effectiveFieldGoalPct:efg,trueShootingPct:ts,freeThrowRate:ftr===null?null:ftr*100,threePointAttemptRate:threeRate===null?null:threeRate*100,turnoverPctProxy:t},source:'ESPN team statistics',note:'Derived eFG%, TS%, 3PA rate, FTA rate, TOV% approximation from ESPN reported averages; not official NBA tracking data.'}}
function normalize(x){return String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/gi,'').toLowerCase().replace(/\s+/g,' ').trim()}
async function allAdvanced(year){const first=await pull(NBA+'?season='+year+'&page=1&pageSize=50&sortBy=win_shares&ascending=false&isPlayoff=false',10000);const count=first.pagination?.pages||0;
if(!count)return {season:year,source:'nbaapi.com public historical advanced dataset',available:false,players:[]};
if(count>30)throw Error('Unexpected player pagination limit');
const results=[first.data||[]];for(let a=2;a<=count;a+=7){const nums=Array.from({length:Math.min(7,count-a+1)},(_,i)=>i+a);
const pages=await Promise.allSettled(nums.map(p=>pull(NBA+'?season='+year+'&page='+p+'&pageSize=50&sortBy=win_shares&ascending=false&isPlayoff=false',10000)));
for(let i=0;i<pages.length;i++)if(pages[i].status==='fulfilled')results.push(pages[i].value.data||[]);}
const rows=results.flat().map(p=>({name:p.playerName||'',bbrefId:/^[a-z0-9]{6,12}$/i.test(p.playerId||'')?p.playerId:null,team:p.team||'',position:p.position||'',games:numeric(p.games),minutes:numeric(p.minutesPlayed),per:numeric(p.per),tsPercent:numeric(p.tsPercent)===null?null:Number(p.tsPercent)*100,usagePercent:numeric(p.usagePercent),assistPercent:numeric(p.assistPercent),rbPercent:numeric(p.totalRBPercent),winShares:numeric(p.winShares),offensiveWS:numeric(p.offensiveWS),defensiveWS:numeric(p.defensiveWS),ws48:numeric(p.winSharesPer),bpm:numeric(p.box),obpm:numeric(p.offensiveBox),dbpm:numeric(p.defensiveBox),vorp:numeric(p.vorp),turnoverPercent:numeric(p.turnoverPercent)})).filter(x=>x.name);
return {season:year,source:'nbaapi.com public historical advanced dataset (Basketball-Reference style)',available:rows.length>0,complete:results.length===count,players:rows,coverage:rows.length,pagesRead:results.length,pagesAvailable:count,note:'Third-party historic advanced metrics, not the official Basketball-Reference API. Unavailable data are blank; 2026–27 advanced data may not yet exist.'}}
module.exports=async(req,res)=>{if(req.method!=='GET')return res.status(405).json({error:'GET only'});let q=req.query||{},year=Number(q.season||2026);
try{let data;if(q.type==='team'||q.type==='evolution'){if(!validId(q.id))return res.status(400).json({error:'Invalid team ID'});if(q.type==='team'){const s=Number(q.season||2027);if(!validYear(s))return res.status(400).json({error:'Invalid season'});data=transformStats(await pull(ESPN+'/'+q.id+'/statistics?season='+s),q.id,s)}else{const years=Array.from({length:11},(_,i)=>2017+i);const all=await Promise.allSettled(years.map(y=>pull(ESPN+'/'+q.id+'/statistics?season='+y,6500).then(x=>transformStats(x,q.id,y))));data={teamId:String(q.id),seasons:all.filter(x=>x.status==='fulfilled').map(x=>x.value).filter(x=>x.reported.avgPoints!==undefined),source:'ESPN year-by-year team totals / rates',note:'Gaps are omitted, never interpolated.'}}}
else if(q.type==='players'||q.type==='player'){if(!validYear(year))return res.status(400).json({error:'Invalid season'});const all=await allAdvanced(year);if(q.type==='players')data=all;else{const n=normalize(String(q.name||''));if(n.length<3)return res.status(400).json({error:'Player name required'});let exact=all.players.filter(x=>normalize(x.name)===n);data={...all,players:exact,matched:exact.length===1,note:all.note+' Name matching is exact after punctuation/accent normalization.'}}}
else return res.status(400).json({error:'Unknown type'});
res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=7200');res.status(200).json({data});}catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}};
