/* NIGHT SHIFT GOAT INDEX — transparent user-adjustable index, not official NBA ranking.
   ESPN NBA athlete awards and regular-season averages only. Curated shortlist, not full all-time coverage.
   All candidate data are fetched from public ESPN feeds each cache window. No fabricated awards/rings. */
const BASE='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/';
const CANDIDATES=[
['1966','LeBron James'],['1035','Michael Jordan'],['110','Kobe Bryant'],['2334','Magic Johnson'],['4145','Kareem Abdul-Jabbar'],
['2335','Larry Bird'],['215','Tim Duncan'],['609','Dirk Nowitzki'],['614','Shaquille O’Neal'],['366','Allen Iverson'],
['619','Hakeem Olajuwon'],['4152','Bill Russell'],['4142','Wilt Chamberlain'],['3975','Stephen Curry'],['3202','Kevin Durant'],
['1987','Dwyane Wade'],['3032977','Giannis Antetokounmpo'],['3112335','Nikola Jokić'],['3945274','Luka Dončić'],['4594268','Anthony Edwards'],['5041939','Cooper Flagg'],['4119','Oscar Robertson'],['501','Karl Malone'],['37','Charles Barkley'],['261','Kevin Garnett'],['3992','James Harden'],['3468','Russell Westbrook'],['2779','Chris Paul'],['4065648','Jayson Tatum'],['4278073','Shai Gilgeous-Alexander'],['5104157','Victor Wembanyama'],['715','David Robinson'],['3507','Isiah Thomas'],['812','John Stockton'],['663','Scottie Pippen'],['6450','Kawhi Leonard'],['3776','Moses Malone'],['4135','Elgin Baylor'],['4151','Jerry West']
];
async function pull(url){const r=await fetch(url,{signal:AbortSignal.timeout(11000),headers:{accept:'application/json'},next:{revalidate:7200}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return r.json()}
function nums(v){const n=Number(v);return Number.isFinite(n)?n:null}
function col(stats,key,cat){const i=(cat.names||[]).indexOf(key);return i<0?null:nums(stats?.[i])}
function max3(arr){const sorted=arr.filter(Number.isFinite).sort((a,b)=>b-a).slice(0,3);return sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null}
async function getPlayer([id,fallback]){
  const [sb,bb]=await Promise.allSettled([pull(BASE+id+'/stats?seasontype=2'),pull(BASE+id+'/bio')]);
  if(sb.status!=='fulfilled')throw Error('ESPN stats unavailable');
  const d=sb.value,cat=(d.categories||[]).find(x=>x.name==='averages'),stats=cat?.statistics||[];
  const career=cat?.totals||[];
  if(!stats.length)throw Error('Career season data absent');
  const byYear=new Map();for(const s of stats){const y=s.season?.year;if(!y)continue;const p=col(s.stats,'avgPoints',cat);const prior=byYear.get(y);if(prior===undefined||p>prior)byYear.set(y,p)}
  const nbaAwards=bb.status==='fulfilled'?(bb.value.awards||[]).filter(x=>x.league==='nba'):[];
  function aw(name){return nbaAwards.filter(x=>x.name===name).reduce((sum,x)=>sum+(x.seasons?.length||Number.parseInt(x.displayCount,10)||0),0)}
  const out={id,name:fallback,active:stats.some(x=>x.season?.year>=2026),seasons:byYear.size,
     careerPPG:col(career,'avgPoints',cat),careerRPG:col(career,'avgRebounds',cat),careerAPG:col(career,'avgAssists',cat),
     games:col(career,'gamesPlayed',cat),peakPPG:max3([...byYear.values()]),
     mvp:aw('MVP'),finalsMVP:aw('Finals MVP'),allNBA1:aw('All-NBA 1st Team'),allNBA2:aw('All-NBA 2nd Team'),dpoy:aw('Defensive Player of the Year'),
     awardsAvailable:bb.status==='fulfilled',statsAvailable:true};
  return out;
}
module.exports=async(req,res)=>{if(req.method!=='GET')return res.status(405).json({error:'GET only'});try{
  const values=await Promise.allSettled(CANDIDATES.map(getPlayer));
  const players=values.filter(v=>v.status==='fulfilled').map(v=>v.value);
  res.setHeader('Cache-Control','s-maxage=7200, stale-while-revalidate=10800');
  res.status(200).json({source:'ESPN public NBA career statistics & honors',asOf:new Date().toISOString(),players,shortlistSize:CANDIDATES.length,missing:CANDIDATES.filter((x,i)=>values[i].status==='rejected').map(x=>x[1]),note:'This is a curated, non-exhaustive player shortlist. Index weights are editorial and editable on the client. Awards may be incomplete for older eras. No fabricated championships or tracking-based stats.'});
}catch(e){res.status(503).json({error:String(e.message||e)})}};
