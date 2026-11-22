/* NBA Archive — read-only ESPN public endpoints. Not an official/contracted NBA data feed. */
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
const SEARCH = 'https://site.web.api.espn.com/apis/search/v2';
const V3 = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
const TEAMS = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';
const numberId = x => /^[0-9]{1,12}$/.test(String(x||''));
const validYear = y => Number.isInteger(y) && y >= 1947 && y <= 2027;
async function pull(url, timeout=9500) {
  const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),timeout);
  try {
    const res=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'},next:{revalidate:600}});
    if (!res.ok) throw Error('ESPN HTTP '+res.status);
    return res.json();
  } finally {clearTimeout(timer)}
}
const img=x=>typeof x==='string'&&x.startsWith('https://')?x:null;
function playerRecord(x) {
  return {id:String(x.id||''), name:x.displayName||x.fullName||'', active:!!x.active,
    headshot:img(x.headshot?.href), debutYear:x.debutYear||null,
    position:x.position?.abbreviation||'', height:x.displayHeight||'', weight:x.displayWeight||'',
    birthPlace:x.birthPlace?.city||null};
}
function rows(cat) {
  if(!cat?.statistics || !Array.isArray(cat.names)) return [];
  return cat.statistics.map(x=>{
    const stats={};cat.names.forEach((k,i)=>{stats[k]=x.stats?.[i]??null});
    return {season:Number(x.season?.year)||null,seasonLabel:x.season?.displayName||'',teamId:String(x.teamId||''),
      teamSlug:x.teamSlug||'',stats};
  }).filter(x=>x.season).sort((a,b)=>b.season-a.season);
}
function values(cat) {
  if(!cat?.totals || !Array.isArray(cat.names)) return {};
  return Object.fromEntries(cat.names.map((n,i)=>[n,cat.totals[i]??null]));
}
function snapshot(s) {
  const averages=(s.categories||[]).find(x=>x.name==='averages');
  const totals=(s.categories||[]).find(x=>x.name==='totals');
  const misc=(s.categories||[]).find(x=>x.name==='miscellaneous');
  return {seasonRows:rows(averages),totalRows:rows(totals),miscRows:rows(misc),
    careerAverages:values(averages),careerTotals:values(totals),
    columns:averages?.names||[],yearCount:new Set(rows(averages).map(x=>x.season)).size};
}
async function playerDetail(id) {
  const req=[
    pull(CORE+'/athletes/'+id,8500),
    pull(V3+'/athletes/'+id+'/stats?seasontype=2',10000),
    pull(V3+'/athletes/'+id+'/stats?seasontype=3',10000),
    pull(V3+'/athletes/'+id+'/bio',7500)
  ];
  const [profile,season,playoffs,bio]=await Promise.allSettled(req);
  if(profile.status!=='fulfilled'&&season.status!=='fulfilled')throw Error('Historic player is unavailable from ESPN');
  return {id,athlete:profile.status==='fulfilled'?playerRecord(profile.value):null,
    regular:season.status==='fulfilled'?snapshot(season.value):null,
    playoffs:playoffs.status==='fulfilled'?snapshot(playoffs.value):null,
    awards:bio.status==='fulfilled'?(bio.value.awards||[]).filter(a=>a.league==='nba').slice(0,60).map(a=>({name:a.name||'',count:a.displayCount||'',seasons:a.seasons||[]})):[],
    teamHistory:bio.status==='fulfilled'?(bio.value.teamHistory||[]).slice(0,35):[],
    warnings:[profile,season,playoffs,bio].map((v,i)=>v.status==='rejected'?['Profile','Regular season','Playoffs','Honors'][i]+' unavailable':null).filter(Boolean)};
}
async function searchPlayers(q) {
  if(q.length<2)return {matches:[],total:0};
  const url=SEARCH+'?query='+encodeURIComponent(q)+'&sport=basketball&limit=50';
  const data=await pull(url,8000);
  const lists=(data.results||[]).filter(x=>x.type==='player');
  let all=lists.flatMap(x=>x.contents||[]);
  all=all.filter(x=>x.defaultLeagueSlug==='nba'||x.description==='NBA'||/espn\.com\/nba\/player\//.test(x.link?.web||''));
  const seen=new Set();
  const matches=all.map(x=>{
    let id=String(x.uid||'').match(/~a:([0-9]+)/)?.[1]||String(x.link?.web||'').match(/\/id\/([0-9]+)/)?.[1]||'';
    return {id,name:x.displayName||'',team:x.subtitle||'',headshot:img(x.image?.default)||null};
  }).filter(p=>numberId(p.id)&&p.name&&!seen.has(p.id)&&seen.add(p.id));
  return {matches:matches.slice(0,50),total:lists.reduce((a,v)=>a+(v.totalFound||0),0),note:'ESPN search results may be limited or incomplete.'};
}
function extractStandings(data) {
  const groups=data.children||[data];
  return {year:data.season?.year, seasonName:data.season?.displayName||'',
    groups:groups.map(g=>({name:g.name||'NBA',entries:(g.standings?.entries||[]).map(e=>({
      team:{id:String(e.team?.id||''),name:e.team?.displayName||e.team?.name||'',abbr:e.team?.abbreviation||'',logo:img(e.team?.logos?.[0]?.href)||null},
      stats:Object.fromEntries((e.stats||[]).map(x=>[x.name,x.displayValue??x.value??null]))
    })).filter(e=>e.team.id)})).filter(g=>g.entries.length)};
}
async function historicalRoster(id,year) {
  const url=CORE+'/seasons/'+year+'/teams/'+id+'/athletes?limit=100&page=1';
  const index=await pull(url,8500);
  const refs=(index.items||[]).slice(0,100).map(x=>String(x.$ref||'').match(/\/athletes\/([0-9]+)/)?.[1]).filter(Boolean);
  const data=[];
  for(let i=0;i<refs.length;i+=8) {
    const pack=await Promise.allSettled(refs.slice(i,i+8).map(id=>pull(CORE+'/athletes/'+id,6500)));
    pack.forEach((v,k)=>{if(v.status==='fulfilled')data.push(playerRecord(v.value));});
  }
  return {year,teamId:id,players:data,requested:refs.length,partial:data.length<refs.length};
}
module.exports=async function handler(req,res) {
  const q=req.query||{},type=q.type,year=Number(q.year||2027);
  try {
    let data;
    if(type==='encyclopedia') {
      data=await require('../lib/encyclopedia').query(q);
    } else if(type==='search') {
      const query=String(q.query||'').trim().slice(0,90);
      if(query.length<2) return res.status(200).json({data:{matches:[],total:0}});
      data=await searchPlayers(query);
    } else if(type==='player') {
      if(!numberId(q.id))return res.status(400).json({error:'Invalid player ID'});
      data=await playerDetail(String(q.id));
    } else if(type==='standings') {
      if(!validYear(year))return res.status(400).json({error:'Season out of range'});
      data=extractStandings(await pull(TEAMS+'?season='+year));
    } else if(type==='roster') {
      if(!numberId(q.id)||!validYear(year))return res.status(400).json({error:'Invalid team or season'});
      data=await historicalRoster(String(q.id),year);
    } else return res.status(400).json({error:'Unknown archive type'});
    res.setHeader('Cache-Control',type==='search'?'s-maxage=120, stale-while-revalidate=240':'s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({source:type==='encyclopedia'?'Basketball-Reference / sumitrodatta historical snapshot':'ESPN public/unofficial',data,updatedAt:new Date().toISOString()});
  }catch(err){res.setHeader('Cache-Control','no-store');res.status(503).json({source:'ESPN public/unofficial',error:err?.message||'ESPN service unavailable'});}
}