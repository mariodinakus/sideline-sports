/* Game insight for completed NBA games (ESPN public summary, unofficial):
   spoiler-free excitement rating, comeback depth (lowest win probability of the eventual winner),
   lead changes, clutch time, top performer and the score-difference curve. */
const B='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
async function get(u,ms=9000){const r=await fetch(u,{signal:AbortSignal.timeout(ms),headers:{accept:'application/json'}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return r.json()}
const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,'');
const secs=c=>{const m=String(c||'0').split(':');return m.length>1?(+m[0])*60+(+m[1]):+m[0]||0};
function analyse(j,id){
  const comp=j.header?.competitions?.[0]||{},cs=comp.competitors||[];
  const side=k=>{const c=cs.find(x=>x.homeAway===k)||{};return{id:String(c.team?.id||''),abbr:c.team?.abbreviation||'',name:c.team?.displayName||'',color:c.team?.color||'',logo:c.team?.logos?.[0]?.href||null,score:+c.score||0,winner:!!c.winner}};
  const home=side('home'),away=side('away'),homeWon=home.score>away.score;
  const periods=Math.max(4,...(cs[0]?.linescores||[]).map((_,i)=>i+1));
  const pts=[];let lc=0,last=0,maxDefWinner=0,clutch=0,clutchN=0;
  for(const p of j.plays||[]){const q=p.period?.number||1,t=(q<=4?(q-1)*720+(720-secs(p.clock?.displayValue)):2880+(q-5)*300+(300-secs(p.clock?.displayValue)));
    const d=(+p.homeScore||0)-(+p.awayScore||0);
    if(p.scoringPlay){pts.push([Math.round(t),d]);const s=Math.sign(d);if(s&&last&&s!==last)lc++;if(s)last=s}
    const wd=homeWon?d:-d;if(-wd>maxDefWinner)maxDefWinner=-wd;
    if(q>=4&&t>=2580){clutchN++;if(Math.abs(d)<=5)clutch++}}
  const wp=(j.winprobability||[]).map(x=>+x.homeWinPercentage).filter(Number.isFinite);
  const minWP=wp.length?Math.min(...wp.map(h=>homeWon?h:1-h)):null;
  let top=null,triple=false;
  for(const t of j.boxscore?.players||[]){const g=t.statistics?.[0];if(!g)continue;const L=g.labels||[],iP=L.indexOf('PTS'),iR=L.indexOf('REB'),iA=L.indexOf('AST');
    for(const a of g.athletes||[]){const s=a.stats||[],P=+s[iP]||0,R=+s[iR]||0,A=+s[iA]||0;if(!top||P>top.pts)top={name:a.athlete?.displayName||'',id:String(a.athlete?.id||''),pts:P,reb:R,ast:A,team:t.team?.abbreviation||''};if(P>=10&&R>=10&&A>=10)triple=true}}
  const margin=Math.abs(home.score-away.score),ot=periods-4;
  const e=2.2*Math.max(0,1-margin/15)+2.0*(clutchN?clutch/clutchN:0)+1.5*Math.min(lc/14,1)+2.0*(minWP==null?Math.min(maxDefWinner/20,1):Math.max(0,(.5-minWP)/.5))+1.5*Math.min(ot,1)+.8*((top&&top.pts>=40)||triple?1:0);
  const score=Math.max(1,Math.min(10,Math.round(e*10)/10));
  const tags=[];if(clutchN&&clutch/clutchN>.6)tags.push('Θρίλερ μέχρι τέλους');if(minWP!=null&&minWP<.15||maxDefWinner>=15)tags.push('Μεγάλη ανατροπή');if(lc>=10)tags.push('Πολλές αλλαγές προβαδίσματος');if((top&&top.pts>=40)||triple)tags.push('Ατομικό σόου');if(ot)tags.push('Ίσως κάτι παραπάνω…');if(!tags.length&&score<4)tags.push('Μονόπλευρο');
  return{id,date:comp.date||j.header?.competitions?.[0]?.date,home,away,score,tags,
    spoiler:{homeScore:home.score,awayScore:away.score,winner:homeWon?home.abbr:away.abbr,minWinnerWP:minWP,maxDeficit:maxDefWinner,leadChanges:lc,ot,top,triple,curve:pts.filter((_,i)=>i%2===0||i===pts.length-1)}};
}
module.exports=async(req,res)=>{
  const days=Math.max(1,Math.min(21,parseInt(req.query?.days)||1));
  try{
    const now=new Date(),dates=Array.from({length:days+1},(_,i)=>ymd(new Date(now.getTime()-i*864e5)));
    const boards=await Promise.allSettled(dates.map(d=>get(`${B}/scoreboard?dates=${d}&limit=40`)));
    const ids=[...new Set(boards.flatMap(b=>b.status==='fulfilled'?(b.value.events||[]).filter(e=>e.status?.type?.completed).map(e=>String(e.id)):[]))];
    const out=[];
    for(let i=0;i<ids.length;i+=12){const r=await Promise.allSettled(ids.slice(i,i+12).map(id=>get(`${B}/summary?event=${id}`).then(j=>analyse(j,id))));r.forEach(x=>{if(x.status==='fulfilled')out.push(x.value)})}
    out.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    res.setHeader('Cache-Control',days<=2?'s-maxage=900, stale-while-revalidate=1800':'s-maxage=10800, stale-while-revalidate=21600');
    res.status(200).json({source:'ESPN public summaries (unofficial)',days,count:out.length,games:out,updatedAt:new Date().toISOString()});
  }catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}
};
