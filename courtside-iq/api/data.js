import {euroPlayers,euroTeams,euroGames,nbaPlayers,nbaTeams,nbaGames,computeTeamRatingsFromGames,nbaPublicPlayers} from '../lib/normalize.js';
const endpoints={
  euroBase:'https://api-live.euroleague.net',
  nbaSite:'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
  nbaCore:'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba'
};
async function readJSON(url,timeout=9000){
  const response=await fetch(url,{headers:{'Accept':'application/json','User-Agent':'COURTSIDE-IQ/1.0 (+analytics; respect-cache)'},signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw new Error(`Upstream HTTP ${response.status}`);
  const body=await response.json();if(!body||typeof body!=='object')throw new Error('Invalid upstream payload');return body;
}
async function task(name,url){try{const data=await readJSON(url);return {name,ok:true,data};}catch(e){return {name,ok:false,error:String(e.message).slice(0,130)};}}
async function loadEuro(season){
  const params=`SeasonMode=Single&SeasonCode=E${season}&statisticMode=PerGame&limit=500`;
  const v3=`${endpoints.euroBase}/v3/competitions/E/statistics`;
  const tasks=await Promise.all([
    task('players',`${v3}/players/traditional?${params}`),
    task('playerAdvanced',`${v3}/players/advanced?${params}`),
    task('teams',`${v3}/teams/traditional?${params}`),
    task('teamAdvanced',`${v3}/teams/advanced?${params}`),
    task('games',`${endpoints.euroBase}/v2/competitions/E/seasons/E${season}/games?limit=500`),
  ]);
  const d=Object.fromEntries(tasks.map(t=>[t.name,t.ok?t.data:{}]));
  let players=euroPlayers(d.players,d.playerAdvanced),teams=euroTeams(d.teams,d.teamAdvanced),games=euroGames(d.games);
  teams=computeTeamRatingsFromGames(teams,games,'euroleague');
  return {league:'euroleague',season,players,teams,games:games.sort((a,b)=>String(b.date??'').localeCompare(String(a.date??''))),sources:tasks.map(({name,ok,error})=>({name,ok,count:name==='players'?players.length:name==='teams'?teams.length:name==='games'?games.length:undefined,error})),updatedAt:new Date().toISOString()};
}
async function loadNBA(season){
  const today=new Date(),day=today.toISOString().slice(0,10).replaceAll('-','');
  const tasks=await Promise.all([
    task('teams',`${endpoints.nbaSite}/teams?limit=50`),
    task('standings',`https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${season+1}`),
    task('players',`${endpoints.nbaCore}/statistics/byathlete?limit=100&page=1&seasontype=2&season=${season+1}`),
    task('games',`${endpoints.nbaSite}/scoreboard?dates=${day}&limit=100`),
    task('nbaTotals',`https://api.server.nbaapi.com/api/playertotals?season=${season+1}&page=1&pageSize=250&sortBy=points&ascending=false&isPlayoff=false`),
    task('nbaAdvanced',`https://api.server.nbaapi.com/api/playeradvancedstats?season=${season+1}&page=1&pageSize=250&sortBy=win_shares&ascending=false&isPlayoff=false`)
  ]);
  const d=Object.fromEntries(tasks.map(t=>[t.name,t.ok?t.data:{}]));
  let teams=nbaTeams(d.teams,d.standings),players=nbaPublicPlayers(d.nbaTotals,d.nbaAdvanced),games=nbaGames(d.games);
  if(!players.length)players=nbaPlayers(d.players);
  teams=computeTeamRatingsFromGames(teams,games,'nba');
  return {league:'nba',season,players,teams,games,sources:tasks.map(({name,ok,error})=>({name,ok,count:name==='players'?players.length:name==='teams'?teams.length:name==='games'?games.length:undefined,error})),updatedAt:new Date().toISOString()};
}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const league=req.query.league==='euroleague'?'euroleague':'nba';
  const now=new Date();const defaultSeason=now.getUTCMonth()>=8?now.getUTCFullYear():now.getUTCFullYear()-1;
  const incoming=Number(req.query.season);const season=Number.isInteger(incoming)&&incoming>=2015&&incoming<=now.getUTCFullYear()?incoming:defaultSeason;
  try{
    const data=league==='nba'?await loadNBA(season):await loadEuro(season);
    res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json(data);
  }catch(e){return res.status(502).json({error:'Data provider temporarily unavailable',detail:String(e.message).slice(0,140)});}
}
