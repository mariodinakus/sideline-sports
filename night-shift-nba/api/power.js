/* NIGHT SHIFT NBA — 2026-27 live title power index & MVP race
 * Source ESPN public standings and current-season athlete box-score averages.
 * Editorial heuristic: model shares are NOT sportsbook odds, official NBA rankings,
 * award votes, calibrated probabilities, or guarantees.
 */
const STAND='https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2027';
const STATS='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?season=2027&seasontype=2&limit=100&page=';
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
async function fetchJson(url,ms=12500){const r=await fetch(url,{signal:AbortSignal.timeout(ms),headers:{accept:'application/json'},next:{revalidate:480}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return r.json()}
function extractTeams(raw){
 const out=[];
 for(const g of raw.children||[]){
 for(const e of g.standings?.entries||[]){
  const s=Object.fromEntries((e.stats||[]).map(v=>[v.name, v.value??v.displayValue??null]));
  const wins=number(s.wins)||0,losses=number(s.losses)||0,games=wins+losses;
  const margin=number(s.differential)??((number(s.avgPointsFor)!==null&&number(s.avgPointsAgainst)!==null)?number(s.avgPointsFor)-number(s.avgPointsAgainst):null);
  const recent=(e.stats||[]).find(x=>x.name==='Last Ten Games')?.displayValue||'';
  const rr=String(recent).match(/(\d+)-(\d+)/),recentPct=rr?Number(rr[1])/(Number(rr[1])+Number(rr[2])):null;
  const observed=games?wins/games:.5;
  const shrink=games/(games+18);
  const wp=.5+(observed-.5)*shrink;
  const net=margin===null?0:clamp(margin,-20,20);
  const form=recentPct===null?.5:recentPct;
  // 0..100 independent power strength. Uncertainty high until sufficient games played.
  const power=clamp(100*(.53*wp+.34*(.5+.5*Math.tanh(net/9))+.13*(.5+(form-.5)*shrink)),0,100);
  out.push({id:String(e.team?.id||''),name:e.team?.displayName||e.team?.name||'',abbr:e.team?.abbreviation||'',logo:e.team?.logos?.[0]?.href||null,conference:g.name||'',wins,losses,games,winPct:games?observed:null,margin,recent:recent||null,recentWinPct:recentPct,pointsFor:number(s.avgPointsFor),pointsAgainst:number(s.avgPointsAgainst),power:Number(power.toFixed(2)),uncertainty:games<10?'very high':games<25?'high':games<55?'moderate':'lower'});
 }
 }
 // Softmax over model power is a normalized editorial strength proxy.
 const max=Math.max(...out.map(x=>x.power),0);
 const exponent=out.map(x=>Math.exp((x.power-max)/7.8)),sum=exponent.reduce((a,b)=>a+b,0);
 out.forEach((x,i)=>{x.titleShare=sum?Number((100*exponent[i]/sum).toFixed(2)):null});
 out.sort((a,b)=>b.power-a.power);
 return out;
}
function statFor(a,defs,key) {
 const i=defs.indexOf(key);
 return i<0?null:number(a?.values?.[i]??a?.totals?.[i]);
}
function toPlayer(e,defs,teams){
 const c=Object.fromEntries((e.categories||[]).map(x=>[x.name,x]));
 const d=Object.fromEntries((defs||[]).map(x=>[x.name,x.names||[]]));
 const pick=(cat,key)=>statFor(c[cat],d[cat]||[],key);
 const id=String(e.athlete?.id||''),name=e.athlete?.displayName||'',teamId=String(e.athlete?.teamId||'');
 const games=pick('general','gamesPlayed'),ppg=pick('offensive','avgPoints'),rpg=pick('general','avgRebounds'),apg=pick('offensive','avgAssists');
 const spg=pick('defensive','avgSteals'),bpg=pick('defensive','avgBlocks'),mpg=pick('general','avgMinutes'),fg=pick('offensive','fieldGoalPct');
 const team=teams.find(x=>x.id===teamId),wp=team?.winPct??.5;
 if(!id||!name||games===null||ppg===null)return null;
 const eligible=games>=5&&mpg!==null&&mpg>=18;
 const gpFactor=clamp(games/13,.45,1);
 const production=clamp(ppg/35,0,1)*.38+clamp(rpg/14,0,1)*.17+clamp(apg/12,0,1)*.20+clamp(((spg||0)+(bpg||0))/4,0,1)*.10;
 const context=(.45+.55*wp)*.15;
 const mvp=100*(production+context)*gpFactor;
 return {id,name,teamId,team:team?.abbr||null,teamName:team?.name||null,headshot:e.athlete?.headshot?.href||null,
   games,mpg,ppg,rpg,apg,spg,bpg,fg,teamWinPct:team?.winPct??null,teamRank:team?teams.indexOf(team)+1:null,
   index:Number(mvp.toFixed(2)),eligible,uncertainty:games<12?'high':games<40?'moderate':'lower'};
}
async function athletes(teams) {
 const first=await fetchJson(STATS+'1',15000);
 const count=Math.min(first.pagination?.pages||1,6);
 const rest=count>1?await Promise.allSettled(Array.from({length:count-1},(_,i)=>fetchJson(STATS+(i+2),15000))):[];
 const pages=[first,...rest.filter(x=>x.status==='fulfilled').map(x=>x.value)];
 const all=pages.flatMap(x=>(x.athletes||[]).map(y=>toPlayer(y,x.categories,teams))).filter(Boolean);
 // Duplicate athlete/team entries should not rank multiple times.
 const seen=new Set(),sorted=all.sort((a,b)=>b.index-a.index);
 return{players:sorted.filter(x=>!seen.has(x.id)&&seen.add(x.id)),total:first.pagination?.count||all.length,partial:pages.length<count};
}
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 try{
 const raw=await fetchJson(STAND);
 const teams=extractTeams(raw);
 if(teams.length<25)throw Error('Insufficient NBA standings coverage');
 const source={league:'NBA',season:2027,seasonName:raw.season?.displayName||'2026-27',asOf:new Date().toISOString(),sources:['ESPN 2026–27 current standings','ESPN 2026–27 player averages'],method:'Editorial heuristic, not sportsbook odds'};
 let playerData=null,playerError=null;
 try{playerData=await athletes(teams)}catch(e){playerError=String(e.message||e)}
 const result={...source,teams,teamCount:teams.length,players:playerData?.players.filter(p=>p.eligible).slice(0,60)||[],playerCount:playerData?.total||0,playerPartial:playerData?.partial||false,
 notes:{title:'TITLE SHARE is a normalized softmax over team power ratings, not a calibrated championship probability. Index mixes season win rate (53%), adjusted point differential (34%) and last-ten form (13%), with sample-size shrinkage toward league average. Not a playoff simulation.',mvp:'MVP INDEX is a custom 0–100 score: scoring 38%, rebounding 17%, assists 20%, steals+blocks 10%, team winning context 15%. It is scaled for games played and requires at least 5 games and 18 MPG. Not an official award forecast or voting poll.',data:'Earlier-season advanced metrics (PER/BPM/WS) are unavailable for 2026–27 and are excluded. No fabricated statistics. ESPN public feeds are unofficial and subject to revision.'},
 errors:playerError?[{type:'MVP',message:playerError}]:[]};
 res.setHeader('Cache-Control','public, s-maxage=360, stale-while-revalidate=900');
 res.status(200).json(result);
 }catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e),source:'ESPN live feeds'})}
};