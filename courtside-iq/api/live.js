import {mapNbaLive,mapNbaStandings,mapEuroLive,mapEuroStandings,selectedRound} from '../lib/live-mappers.js';
async function get(url){let r=await fetch(url,{signal:AbortSignal.timeout(8500),headers:{accept:'application/json'}});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}
const dateStr=d=>d.toISOString().slice(0,10).replaceAll('-','');
async function safe(name,url){try{return {name,ok:true,data:await get(url)}}catch(e){return {name,ok:false,error:String(e.message).slice(0,100)}}}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const league=req.query.league==='euro'?'euro':'nba';const seasonNum=Number(req.query.season),current=new Date(),start=(current.getUTCMonth()>=8?current.getUTCFullYear():current.getUTCFullYear()-1);const season=Number.isInteger(seasonNum)&&seasonNum>=2000&&seasonNum<=current.getUTCFullYear()?seasonNum:start;
 const incoming=String(req.query.date||''),date=/^\d{8}$/.test(incoming)?incoming:dateStr(current);
 let result={league,season,date,games:[],groups:[],sourceStatus:[],updatedAt:new Date().toISOString(),officialStandings:false};
 if(league==='nba'){
  let roots='https://site.api.espn.com';const [score,stand]=await Promise.all([safe('ESPN scoreboard',`${roots}/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}&limit=100`),safe('ESPN standings',`${roots}/apis/v2/sports/basketball/nba/standings?season=${season+1}`)]);
  result.games=score.ok?mapNbaLive(score.data):[];result.groups=stand.ok?mapNbaStandings(stand.data):[];result.sourceStatus=[score,stand].map(x=>({name:x.name,ok:x.ok,error:x.error||null}));result.officialStandings=false;result.notes='ESPN public site feed. Not contracted or guaranteed real-time. Standings may not yet be populated for a new season.';
 }else{
  const base=`https://api-live.euroleague.net`,seasonCode=`E${season}`;
  const [score,rounds]=await Promise.all([safe('EuroLeague fixtures',`${base}/v2/competitions/E/seasons/${seasonCode}/games?limit=650`),safe('EuroLeague rounds',`${base}/v2/competitions/E/seasons/${seasonCode}/rounds`)]);
  const all=score.ok?mapEuroLive(score.data):[];
  const chosen=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T12:00:00Z`).getTime();
  const picked=all.filter(g=>{let d=Date.parse(g.date);return Number.isFinite(d)&&Math.abs(d-chosen)<3.5*86400000});result.games=picked.sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,65);
  const round=rounds.ok?selectedRound(rounds.data):null;
  const status=[score,rounds].map(x=>({name:x.name,ok:x.ok,error:x.error||null}));
  if(round){const table=await safe(`EuroLeague standings round ${round}`,`${base}/v3/competitions/E/seasons/${seasonCode}/rounds/${round}/basicstandings`);status.push({name:table.name,ok:table.ok,error:table.error||null});result.groups=table.ok?[{name:`EuroLeague · Round ${round}`,rows:mapEuroStandings(table.data)}]:[];result.officialStandings=table.ok&&result.groups[0]?.rows.length>0;}
  result.sourceStatus=status;result.notes='Round-specific public EuroLeague standings. If the upstream table is not parseable, no fabricated W/L ranking is displayed.';
 }
 res.setHeader('Cache-Control','public, s-maxage=50, stale-while-revalidate=180');return res.status(200).json(result);
}