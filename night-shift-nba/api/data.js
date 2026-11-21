const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const WEB='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
async function get(url,timeout=8000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json','User-Agent':'NightShiftNBA/1.0 (public basketball data viewer)'},next:{revalidate:120}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
const img=(v)=>typeof v==='string'&&v.startsWith('https://')?v:null;
function team(t){if(!t)return null;return{id:String(t.id||''),name:t.displayName||t.name||'',short:t.shortDisplayName||t.name||'',abbr:t.abbreviation||'',logo:img(t.logo)||img(t.logos&&t.logos[0]&&t.logos[0].href),color:t.color||''}}
function athlete(a,t){if(!a)return null;const z=a.athlete||a;return{id:String(z.id||''),name:z.displayName||z.fullName||z.name||'',position:z.position&&z.position.abbreviation||'',jersey:z.jersey||'',headshot:img(z.headshot&&z.headshot.href)||img(z.headshot)||null,team:t?team(t):null,age:z.age||null,height:z.displayHeight||'',weight:z.displayWeight||'',status:z.status&&z.status.type&&z.status.type.name||'',heightIn:Number(z.height)||null,weightLb:Number(z.weight)||null,country:z.birthPlace&&z.birthPlace.country||'',city:z.birthPlace&&z.birthPlace.city||'',exp:z.experience&&Number.isFinite(+z.experience.years)?+z.experience.years:null,dob:z.dateOfBirth||null}}
const games=(j)=>(j.events||[]).map(e=>{const c=e.competitions&&e.competitions[0]||{};const sides=c.competitors||[];const side=k=>{let x=sides.find(y=>y.homeAway===k)||{};return {...team(x.team),score:x.score===undefined?null:String(x.score),record:(x.records||[]).find(r=>r.type==='total')?.summary||'',winner:!!x.winner}};return{id:String(e.id),date:e.date,state:e.status&&e.status.type&&e.status.type.state||'pre',status:e.status&&e.status.type&&e.status.type.shortDetail||'',period:e.status&&e.status.period||0,clock:e.status&&e.status.displayClock||'',away:side('away'),home:side('home'),venue:c.venue&&c.venue.fullName||'',leaders:(c.leaders||[]).flatMap(x=>(x.leaders||[]).slice(0,1).map(v=>({type:x.displayName||x.name,player:v.athlete&&v.athlete.displayName||'',value:v.displayValue||''}))).slice(0,4)}}).filter(x=>x.id);
function statsOf(entries){return(entries||[]).map(s=>({name:s.name||s.abbreviation||'',value:s.displayValue??s.value??null}))}
function teamSchedule(j,id,now=Date.now()){
 const result=[],seen=new Set();
 const score=x=>{const v=typeof x==='object'&&x!==null?(x.value??x.displayValue):x;return v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v)};
 for(const e of j.events||[]){
  const c=e.competitions?.[0]||{},st=c.status?.type||e.status?.type||{},sortDate=e.date||c.date,when=Date.parse(sortDate);
  if(!/^\d+$/.test(String(e.id||''))||!Number.isFinite(when)||seen.has(String(e.id))||/cancel|postpon|suspend/i.test([st.name,st.description,st.detail].join(' '))||String(e.seasonType?.id??e.season?.type??'')==='1')continue;
  const sides=c.competitors||[],side=k=>{const x=sides.find(y=>y.homeAway===k);if(!x)return null;const t=team(x.team);return t?.id?{...t,score:score(x.score)}:null};
  const home=side('home'),away=side('away');if(!home||!away||![home.id,away.id].includes(String(id)))continue;
  const state=st.state||(st.completed?'post':null);
  if(state==='post'&&(home.score===null||away.score===null||home.score===away.score))continue;
  if(state!=='post'&&state!=='in'&&!(state==='pre'&&when>=now))continue;
  seen.add(String(e.id));
  result.push({id:String(e.id),date:sortDate,state,home,away});
 }
 return {recent:result.filter(g=>g.state==='post').sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,10),upcoming:result.filter(g=>g.state==='pre').sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,10),live:result.filter(g=>g.state==='in')};
}
async function run(type,q){if(type==='teamSchedule'){if(!/^\d{1,6}$/.test(q.id||''))throw Error('Invalid team');const now=new Date(),season=now.getUTCFullYear()+(now.getUTCMonth()>=6?1:0);const base=ROOT+'/teams/'+q.id+'/schedule',stamp=now.getTime(),all=new Map();
const add=j=>{for(const e of j?.events||[]){if(e.id)all.set(String(e.id),e)}};
const read=()=>teamSchedule({events:[...all.values()]},q.id,stamp);
const first=await Promise.allSettled([get(base,8000),get(base+'?season='+season+'&seasontype=2',8000)]);
first.forEach(r=>{if(r.status==='fulfilled')add(r.value)});
let data=read();
if(data.recent.length<10||data.upcoming.length<10){
 const ymd=t=>new Date(t).toISOString().slice(0,10).replace(/-/g,'');
 const dates=[];
 if(data.recent.length<10)dates.push(ymd(stamp-32*86400000)+'-'+ymd(stamp));
 if(data.upcoming.length<10)dates.push(ymd(stamp)+'-'+ymd(stamp+35*86400000));
 const fallback=await Promise.allSettled(dates.map(d=>get(ROOT+'/scoreboard?limit=500&dates='+d,8000)));
 fallback.forEach(r=>{if(r.status==='fulfilled')add(r.value)});data=read();
}
if(!all.size)throw Error('Schedule feed unavailable');
return data}if(type==='scoreboard'){const d=/^\d{8}$/.test(q.date||'')?q.date:null;const j=await get(ROOT+'/scoreboard?limit=100'+(d?'&dates='+d:''));return{games:games(j),date:d,league:j.leagues&&j.leagues[0]&&j.leagues[0].name||'NBA'}}
if(type==='teams'){const j=await get(ROOT+'/teams');return{teams:(j.sports?.[0]?.leagues?.[0]?.teams||[]).map(x=>team(x.team)).filter(x=>x?.id)}}
if(type==='standings'){const j=await get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings');const groups=j.children||[j];return{groups:groups.map(g=>({name:g.name||g.abbreviation||'NBA',entries:(g.standings?.entries||[]).map(e=>({team:team(e.team),stats:statsOf(e.stats)})).filter(e=>e.team?.id)})).filter(g=>g.entries.length)}}
if(type==='roster'){if(!/^[a-z0-9]{1,6}$/i.test(q.id||''))throw Error('Invalid team');const j=await get(ROOT+'/teams/'+q.id+'/roster');const list=(j.athletes||[]).flatMap(a=>Array.isArray(a.items)?a.items:[a]);return{team:team(j.team),players:list.map(a=>athlete(a,j.team)).filter(a=>a?.id)}}
if(type==='players'){const j=await get(ROOT+'/teams');const ts=(j.sports?.[0]?.leagues?.[0]?.teams||[]).map(x=>team(x.team)).filter(x=>x?.id);const players=[],missing=[];for(let i=0;i<ts.length;i+=5){const batch=await Promise.allSettled(ts.slice(i,i+5).map(t=>get(ROOT+'/teams/'+t.id+'/roster',6500)));batch.forEach((r,k)=>{const t=ts[i+k];if(r.status!=='fulfilled'){missing.push(t.abbr);return}const a=r.value.athletes||[];a.flatMap(x=>Array.isArray(x.items)?x.items:[x]).map(x=>athlete(x,t)).filter(x=>x?.id).forEach(p=>players.push(p))})}return{players,missing,teamsChecked:ts.length}}
if(type==='player'){if(!/^\d{1,10}$/.test(q.id||''))throw Error('Invalid player');const [o,s]=await Promise.allSettled([get(WEB+'/athletes/'+q.id+'/overview',7000),get(WEB+'/athletes/'+q.id+'/stats',7000)]);if(o.status==='rejected'&&s.status==='rejected')throw Error('Player feed unavailable');return{overview:o.status==='fulfilled'?o.value:null,stats:s.status==='fulfilled'?s.value:null,id:q.id}}
if(type==='news'){const j=await get(ROOT+'/news?limit=24');return{stories:(j.articles||[]).map(a=>{const im=(a.images||[]).find(i=>/^https:\/\//.test(i.url||''));const u=a.links&&a.links.web&&a.links.web.href;return{title:a.headline||'',url:/^https:\/\//.test(u||'')?u:null,source:'ESPN',publishedAt:a.published||null,image:im?im.url:null,desc:a.description||''}}).filter(x=>x.title&&x.url)}}
if(type==='injuries'){const j=await get(ROOT+'/injuries');return{teams:(j.injuries||[]).map(t=>({id:String(t.id||''),name:t.displayName||'',players:(t.injuries||[]).map(x=>{const a=x.athlete||{},h=(a.links||[]).map(l=>l.href||'').find(u=>/\/id\/\d+/.test(u))||'',m=h.match(/\/id\/(\d+)/);return{id:m?m[1]:'',name:a.displayName||'',pos:a.position&&a.position.abbreviation||'',headshot:img(a.headshot&&a.headshot.href),status:x.status||'',date:x.date||null,part:x.details&&x.details.type||'',detail:x.details&&x.details.detail||'',side:x.details&&x.details.side||'',ret:x.details&&x.details.returnDate||null,fantasy:x.details&&x.details.fantasyStatus&&x.details.fantasyStatus.abbreviation||'',note:x.shortComment||''}}).filter(x=>x.name)})).filter(t=>t.id)}}
if(type==='tvgr'){
/* Greek TV listings for MagentaTV sport channels, read from the public guide at programmatv.gr (cached 30 min). */
const NB=[['ATL','χοκς'],['BOS','σελτικ'],['BKN','νετς'],['CHA','χορνετ'],['CHI','μπουλ'],['CLE','καβαλιερ'],['DAL','μαβερικ'],['DEN','ναγκετ'],['DET','πιστον'],['GS','ουοριορ'],['HOU','ροκετ'],['IND','πεισερ'],['LAC','κλιπερ'],['LAL','λεικερ'],['MEM','γκριζλ'],['MIA','χιτ'],['MIL','μπακς'],['MIN','τιμπεργουλ'],['NO','πελικαν'],['NY','νικς'],['OKC','θαντερ'],['ORL','ματζικ'],['PHI','76ερ'],['PHX','σανς'],['POR','μπλειζερ'],['SAC','κινγκ'],['SA','σπερ'],['TOR','ραπτορ'],['UTAH','τζαζ'],['WSH','ουιζαρντ']];
const norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const tm=x=>{const w=norm(x).split(/\s+/);for(const [a,st] of NB)if(w.some(t=>t.startsWith(st)))return a;return null};
const ath=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hour12:false});
const parts=d=>Object.fromEntries(ath.formatToParts(d).map(x=>[x.type,x.value]));
const toUTC=(y,mo,d,h,mi)=>{for(const off of [2,3]){const t=Date.UTC(y,mo-1,d,h-off,mi),p=parts(new Date(t));if(+p.hour%24===h&&+p.minute===mi&&+p.day===d)return t}return Date.UTC(y,mo-1,d,h-2,mi)};
const SLUG={Mon:'deytera',Tue:'triti',Wed:'tetarti',Thu:'pempti',Fri:'paraskeyi',Sat:'savvato',Sun:'kyriaki'};
const now=new Date(),today=parts(now),tmr=parts(new Date(now.getTime()+86400e3));
const ent=s=>s.replace(/&#8211;|&ndash;/g,'–').replace(/&amp;/g,'&').replace(/&#039;|&#8217;/g,"'").replace(/&quot;/g,'"');
const jobs=[];for(let n=1;n<=9;n++)for(const [day,path] of [[today,''],[tmr,SLUG[tmr.weekday]+'/']])jobs.push({n,day,url:'https://programmatv.gr/kanali/magenta-sport-'+n+'/'+path});
const html=async u=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);try{const r=await fetch(u,{signal:c.signal,headers:{Accept:'text/html','User-Agent':'NightShiftNBA/1.0 (NBA ATLAS tv listings; nba-atlas.vercel.app)'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.text()}finally{clearTimeout(t)}};
const res=await Promise.allSettled(jobs.map(j=>html(j.url)));
const out=[],seen=new Set();let ok=0;
res.forEach((r,i)=>{if(r.status!=='fulfilled')return;ok++;const {n,day}=jobs[i];let y=+day.year,mo=+day.month,d=+day.day,prev=-1,shift=0;
  for(const row of r.value.split(/<a [^>]*class="ptv-show-row/).slice(1)){const tt=row.match(/ptv-show-time[^>]*>\s*(\d{1,2}):(\d{2})/),ti=row.match(/ptv-show-title[^>]*>([\s\S]*?)<\/div>/);if(!tt||!ti)continue;
    const h=+tt[1],mi=+tt[2],mins=h*60+mi;if(prev>=0&&mins<prev-180)shift++;prev=mins;
    const title=ent(ti[1].replace(/<[^>]+>/g,' ')).replace(/ΤΩΡΑ/,'').replace(/\s+/g,' ').trim(),g=title.match(/^Μπάσκετ:\s*(.+?)\s+[–-]\s+(.+?)(\s*\(Ζ\))?\s*$/);if(!g)continue;
    const ho=tm(g[1]),aw=tm(g[2]);if(!ho||!aw||ho===aw)continue;
    const base=new Date(Date.UTC(y,mo-1,d+shift)),t=toUTC(base.getUTCFullYear(),base.getUTCMonth()+1,base.getUTCDate(),h,mi);
    const k=n+'|'+t;if(seen.has(k))continue;seen.add(k);
    out.push({start:new Date(t).toISOString(),channel:'Magenta Sport '+n,live:!!g[3],home:ho,away:aw})}});
/* ESPN/ABC national games: shown in Greece on Disney+ (ESPN hub) on selected nights. */
const ny=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const days=[-1,0,1].map(k=>ny.format(new Date(Date.now()+k*86400e3)).replace(/-/g,''));
const sb=await Promise.allSettled(days.map(d=>get(ROOT+'/scoreboard?limit=100&dates='+d,6000)));
const espn=[];sb.forEach(r=>{if(r.status!=='fulfilled')return;for(const e of r.value.events||[]){const c=(e.competitions||[])[0]||{};const nat=[...new Set((c.geoBroadcasts||[]).filter(b=>b.market&&b.market.type==='National').map(b=>b.media&&b.media.shortName).filter(Boolean))];if(nat.length)espn.push({id:String(e.id),date:e.date,national:nat,disney:nat.some(n=>/^(ESPN|ESPN2|ABC)$/i.test(n))})}});
if(!ok&&!espn.length)throw Error('TV guide unavailable');
return{provider:'MagentaTV',source:'programmatv.gr',broadcasts:out.sort((x,y)=>x.start<y.start?-1:1),checked:ok,espn}}
if(type==='game'){if(!/^\d{4,12}$/.test(q.id||''))throw Error('Invalid game');const j=await get(ROOT+'/summary?event='+q.id);const b=j.boxscore||{};return{header:j.header||{},players:(b.players||[]).map(x=>({team:team(x.team),groups:(x.statistics||[]).map(s=>({labels:s.labels||[],names:s.names||[],athletes:(s.athletes||[]).map(z=>({athlete:athlete(z.athlete,x.team),stats:z.stats||[],starter:!!z.starter}))}))})),leaders:j.leaders||[],scoring:j.scoringPlays||[],periods:(j.header?.competitions?.[0]?.competitors||[]).map(c=>({team:team(c.team),homeAway:c.homeAway,linescores:(c.linescores||[]).map((p,i)=>({period:p.period||i+1,points:Number(p.value??p.displayValue??0)}))})),winProbability:(j.winprobability||j.winProbability||[]).map(p=>({period:Number(p.period??0),clock:p.clock?.displayValue||p.clock||'',homeWinPercentage:Number(p.homeWinPercentage??p.homeWinProbability??NaN),playId:p.playId||'',secondsLeft:Number(p.secondsLeft??NaN)})).filter(p=>Number.isFinite(p.homeWinPercentage)).slice(0,1200),id:q.id}}
throw Error('Unsupported type')}
module.exports=async function handler(req,res){const q=req.query||{},types=['scoreboard','teams','standings','roster','players','player','game','news','injuries','tvgr','teamSchedule'];if(!types.includes(q.type)){res.status(400).json({error:'Invalid type'});return}try{const data=await run(q.type,q);res.setHeader('Cache-Control',q.type==='scoreboard'?'s-maxage=45, stale-while-revalidate=90':q.type==='injuries'||q.type==='tvgr'?'s-maxage=900, stale-while-revalidate=1800':'s-maxage=600, stale-while-revalidate=1200');res.status(200).json({source:'ESPN public, unofficial',updatedAt:new Date().toISOString(),data})}catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:e.message||'Upstream unavailable',source:'ESPN public, unofficial'})}}