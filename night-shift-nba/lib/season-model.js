/* ATLAS Season Forecast v1: deterministic Monte Carlo. */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),round=x=>Math.round(x*10)/10;
function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}}
function simulate(stand,schedule,{N=8000,seed=2027}={}){
 const R=rng(seed),gauss=()=>Math.sqrt(-2*Math.log(Math.max(R(),1e-9)))*Math.cos(2*Math.PI*R());
 const T=(stand.groups||[]).flatMap(g=>(g.entries||[]).map(e=>{let s=Object.fromEntries(e.stats.map(v=>[v.name,v.value])),wins=Number(s.wins),losses=Number(s.losses),gp=wins+losses,m=Number(s.differential),wp=gp?wins/gp:.5;
 return {...e.team,conference:/east/i.test(g.name)?'East':/west/i.test(g.name)?'West':'?',wins,losses,currentSeed:Number(s.playoffSeed),rating:(.8*clamp(m,-25,25)+.2*14*(wp-.5))*gp/(gp+15)}}));
 if(T.length!==30||new Set(T.map(t=>t.id)).size!==30||T.filter(t=>t.conference==='East').length!==15||T.filter(t=>t.conference==='West').length!==15||T.some(t=>!Number.isFinite(t.rating)||!Number.isInteger(t.wins)||!Number.isInteger(t.losses)||t.wins+t.losses>82))throw Error('Incomplete standings');
 const ids=new Map(T.map((t,i)=>[String(t.id),i])),C=['East','West'].map(k=>T.map((t,i)=>t.conference===k?i:-1).filter(i=>i>=0)),seen=new Set(),G=[],rem=T.map(t=>82-t.wins-t.losses);
 for(const g of schedule.games||[]){let h=ids.get(String(g.home)),a=ids.get(String(g.away));if(h==null||a==null||h===a||!g.id||seen.has(g.id))continue;seen.add(g.id);G.push([h,a]);rem[h]--;rem[a]--}
 if(rem.some(x=>x<0||x>4)||rem.reduce((a,b)=>a+b,0)%2||Math.max(...rem)>rem.reduce((a,b)=>a+b,0)/2)throw Error('Schedule and standings inconsistent; no forecast issued');
 const missing=rem.reduce((a,b)=>a+b,0)/2,acc=T.map(()=>({wins:0,seed:0,hist:Array(15).fill(0),direct:0,playin:0,po:0,semi:0,cf:0,final:0,title:0,winHist:Array(83).fill(0)}));
 const match=[new Map(),new Map()],nba=new Map();
 const bump=(m,a,b,ordered=false)=>{if(!ordered&&a>b)[a,b]=[b,a];const k=a+'|'+b;m.set(k,(m.get(k)||0)+1)};
 const P=d=>1/(1+Math.exp(-d/6.5));
 for(let s=0;s<N;s++){
  const w=T.map(t=>t.wins),r=T.map(t=>t.rating+gauss()*2.4),tie=T.map(()=>R());
  for(const [h,a] of G){if(R()<P(r[h]-r[a]+2.2))w[h]++;else w[a]++}
  // Unassigned games: random feasible pairing of deficits, no invented fixture/date.
  const left=rem.slice();while(left.some(v=>v>0)){let order=left.map((v,i)=>[i,v,R()]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]||a[2]-b[2]);let a=order[0][0],b=order[1][0];left[a]--;left[b]--;w[R()<P(r[a]-r[b])?a:b]++}
  const ranks=C.map(c=>c.slice().sort((a,b)=>w[b]-w[a]||tie[a]-tie[b]));const cRank=new Map();ranks.forEach(c=>c.forEach((i,k)=>cRank.set(i,k)));
  const single=(home,away)=>R()<P(r[home]-r[away]+2.2)?home:away;
  const series=(a,b,cross=false)=>{let first=cross?(w[a]>w[b]||w[a]===w[b]&&tie[a]<tie[b]?a:b):(cRank.get(a)<cRank.get(b)?a:b),aw=0,bw=0;for(let g=0;g<7;g++){let home=[0,1,4,6].includes(g)?first:first===a?b:a;if(single(home,home===a?b:a)===a)aw++;else bw++;if(aw===4)return a;if(bw===4)return b}throw Error('series')};
  const champs=[];
  ranks.forEach((o,ci)=>{o.forEach((i,k)=>{let z=acc[i];z.wins+=w[i];z.winHist[w[i]]++;z.seed+=k+1;z.hist[k]++;if(k<6)z.direct++;else if(k<10)z.playin++});
   let seven=single(o[6],o[7]),loser=seven===o[6]?o[7]:o[6],nine=single(o[8],o[9]),eight=single(loser,nine),sd=[...o.slice(0,6),seven,eight];sd.forEach(i=>acc[i].po++);
   let a=series(sd[0],sd[7]),b=series(sd[3],sd[4]),c=series(sd[2],sd[5]),d=series(sd[1],sd[6]);[a,b,c,d].forEach(i=>acc[i].semi++);
   let f1=series(a,b),f2=series(c,d);[f1,f2].forEach(i=>acc[i].cf++);bump(match[ci],f1,f2);let champ=series(f1,f2);acc[champ].final++;champs.push(champ);
  });bump(nba,champs[0],champs[1],true);acc[series(champs[0],champs[1],true)].title++;
 }
 const pct=v=>round(v*100/N),quant=(hist,q,offset=0)=>{let n=0;for(let i=0;i<hist.length;i++){n+=hist[i];if(n>=N*q)return i+offset}return hist.length-1+offset};
 const rows=T.map((t,i)=>{let a=acc[i];return {...t,rating:round(t.rating),projectedWins:round(a.wins/N),projectedSeed:round(a.seed/N),modeSeed:a.hist.indexOf(Math.max(...a.hist))+1,seedLow:quant(a.hist,.1,1),seedHigh:quant(a.hist,.9,1),winsLow:quant(a.winHist,.1),winsHigh:quant(a.winHist,.9),seedProb:a.hist.map(pct),direct:pct(a.direct),playin:pct(a.playin),playoffs:pct(a.po),semi:pct(a.semi),conferenceFinal:pct(a.cf),finals:pct(a.final),champion:pct(a.title)}});
 const top=m=>[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({teams:k.split('|').map(i=>T[+i].id),prob:pct(v)}));
 return {model:'atlas-season-v1',season:new Date().getUTCMonth()>=6?new Date().getUTCFullYear()+1:new Date().getUTCFullYear(),asOf:new Date().toISOString(),simulations:N,knownGames:G.length,unassignedGames:missing,scheduleAsOf:schedule.updatedAt||null,rows,matchups:{East:top(match[0]),West:top(match[1]),NBA:top(nba)},notes:'Point differential and win rate, shrinkage, rating uncertainty, 2.2 home advantage, 82 games, random tiebreaks, simulated unassigned games. Play-in and best-of-seven bracket. Not calibrated; no injury or trade adjustments.'};
}
module.exports={simulate};
