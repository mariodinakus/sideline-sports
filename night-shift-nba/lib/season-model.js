/* ATLAS Season Forecast v1: deterministic Monte Carlo. */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),round=x=>Math.round(x*10)/10;
function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}}

const WEIGHTS={performance:.35,form:.10,roster:.25,history:.15,market:.15};
const num=x=>x!=null&&x!==''&&String(x).trim()!==''&&Number.isFinite(Number(x))?Number(x):null;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const key=s=>String(s||'').normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
const alias={GS:'GSW',NO:'NOP',NY:'NYK',SA:'SAS',UTAH:'UTA',WSH:'WAS',BKN:'BKN',PHX:'PHX'};
const playerValue=p=>{const mpg=num(p.mpg),gp=num(p.games),pts=num(p.ppg),reb=num(p.rpg),ast=num(p.apg);if(mpg==null||gp==null||pts==null||reb==null||ast==null||mpg<12||gp<3)return null;const ts=num(p.tsPct),st=num(p.spg),bl=num(p.bpg),to=num(p.turnovers);const production=(pts+.65*reb+1.15*ast+1.5*(st??0)+1.5*(bl??0)-.9*(to??0))*36/Math.max(18,mpg);return (production+clamp((ts??57)-57,-15,15)*.30)*(.75+.25*gp/(gp+12))};
function enrich(T,extras,now){
 const prior=(extras.prior||[]).filter(x=>x?.groups?.flatMap(g=>g.entries||[]).length===30);
 const priorMaps=prior.map(x=>new Map(x.groups.flatMap(g=>g.entries.map(e=>[String(e.team.id),e.stats]))));
 const historyMap=new Map();for(const t of T){let val=0,w=0;priorMaps.forEach((m,i)=>{let s=m.get(String(t.id)),x=num(s?.differential),win=num(s?.winPercent);if(x!=null&&win!=null){let wt=i===0?.7:.3;val+=wt*(.8*x+.2*14*(win-.5));w+=wt}});if(w)historyMap.set(t.id,val/w)}
 const pl=(extras.power?.players||[]).filter(p=>playerValue(p)!=null),playersByTeam=new Map();for(const p of pl){let id=String(p.teamId);if(!playersByTeam.has(id))playersByTeam.set(id,[]);playersByTeam.get(id).push({...p,value:playerValue(p)})}
 const rosterRaw=new Map(),rosters=new Map();for(const t of T){let a=(playersByTeam.get(String(t.id))||[]).sort((x,y)=>y.value-x.value).slice(0,8);rosters.set(t.id,a);if(a.length>=5){let w=a.map((p,i)=>(i<3?1.4:1)*clamp(p.mpg/28,.55,1.2));rosterRaw.set(t.id,a.reduce((s,p,i)=>s+p.value*w[i],0)/w.reduce((s,x)=>s+x,0))}}
 const rm=mean([...rosterRaw.values()]),rs=rm==null?null:Math.sqrt(mean([...rosterRaw.values()].map(v=>(v-rm)**2)))||1;
 const marketMaps=[];for(const [source,x] of Object.entries(extras.markets?.sources||{})){let map=new Map();for(const t of T){let code=alias[t.abbr]||t.abbr;let hit=(x.rows||[]).find(r=>source==='polymarket'?key(r.name)===key(t.name):String(r.code).toUpperCase()===code);let price=source==='kalshi'&&num(hit?.yesBid)!=null&&num(hit?.yesAsk)!=null?(Number(hit.yesBid)+Number(hit.yesAsk))/2:num(hit?.price);if(price!=null&&price>=0&&price<=100&&(source!=='polymarket'||(num(hit?.liquidity)??0)>=1000)&&(source!=='kalshi'||(num(hit?.yesAsk)??100)-(num(hit?.yesBid)??0)<=10))map.set(t.id,price)}
 const sum=[...map.values()].reduce((s,v)=>s+v,0);if(map.size>=27&&sum>=50&&sum<=200){marketMaps.push({source,values:new Map([...map].map(([id,v])=>[id,100*v/sum]))})}}
 const market=new Map();for(const t of T){let v=marketMaps.map(m=>m.values.get(t.id)).filter(x=>x!=null);if(v.length)market.set(t.id,mean(v))}
 const injured=new Map((extras.injuries?.teams||[]).map(x=>[String(x.id),x.players||[]]));
 const currentMean=mean(T.map(t=>t.rating)),formMean=mean(T.map(t=>t.form).filter(x=>x!=null)),historyMean=mean([...historyMap.values()]);
 const marketCenter=mean([...market.values()].map(v=>Math.log(Math.max(.15,v))));
 const sources={performance:30,form:T.filter(t=>t.form!=null).length,roster:rosterRaw.size,history:historyMap.size,market:market.size,injuries:injured.size,marketSources:marketMaps.map(m=>m.source),historicalSeasons:prior.map(x=>x.year||x.seasonName),playerCount:pl.length};
 for(const t of T){const fs={performance:t.rating-currentMean,form:t.form==null?null:t.form-(formMean??0),roster:rosterRaw.has(t.id)?clamp((rosterRaw.get(t.id)-rm)/rs*4,-10,10):null,history:historyMap.has(t.id)?historyMap.get(t.id)-(historyMean??0):null,market:market.has(t.id)?clamp((Math.log(Math.max(.15,market.get(t.id)))-marketCenter)*2.2,-9,9):null};
 const wt=Object.keys(WEIGHTS).filter(k=>fs[k]!=null).reduce((a,k)=>a+WEIGHTS[k],0);
 t.rating=Object.keys(WEIGHTS).filter(k=>fs[k]!=null).reduce((a,k)=>a+fs[k]*WEIGHTS[k],0)/wt;
 t.factors=Object.fromEntries(Object.keys(fs).map(k=>[k,{score:fs[k]==null?null:round(fs[k]),weight:fs[k]==null?0:round(100*WEIGHTS[k]/wt)}]));
 t.marketTitle=market.has(t.id)?round(market.get(t.id)):null;t.rotationPlayers=(rosters.get(t.id)||[]).map(p=>({id:p.id,name:p.name,mpg:round(p.mpg),value:round(p.value)}));
 const a=rosters.get(t.id)||[];const missing=(injured.get(String(t.id))||[]).map(p=>{let match=a.find(x=>String(x.id)===String(p.id));if(!match)return null;let flag=String(p.fantasy||p.status||'').toUpperCase(),likelihood=/OFS|OUT|DOUBTFUL/.test(flag)?1:/GTD|QUESTIONABLE|DAY-TO-DAY/.test(flag)?.5:0;if(!likelihood)return null;let until=Date.parse(p.ret||'');if(!Number.isFinite(until)||until<now)until=now+(/OFS/.test(flag)?365:7)*86400000;let cost=clamp((match.value-12)*match.mpg/36*.13,.2,4)*likelihood;return {name:p.name,status:p.fantasy||p.status,until,cost:round(cost)}}).filter(Boolean);
 t.injuryAdjustments=missing;t.injuryCoverage=injured.size>0;t.injuryPenalty=round(Math.min(8,missing.reduce((s,p)=>s+p.cost,0)));t.uncertainty=2.4+1.5*(1-wt);
 }
 return sources;
}

function simulate(stand,schedule,{N=10000,seed=2027,extras={},now=Date.now()}={}){
 const R=rng(seed),gauss=()=>Math.sqrt(-2*Math.log(Math.max(R(),1e-9)))*Math.cos(2*Math.PI*R());
 const T=(stand.groups||[]).flatMap(g=>(g.entries||[]).map(e=>{let s=Object.fromEntries(e.stats.map(v=>[v.name,v.value])),wins=Number(s.wins),losses=Number(s.losses),gp=wins+losses,m=Number(s.differential),wp=gp?wins/gp:.5;
 return {...e.team,conference:/east/i.test(g.name)?'East':/west/i.test(g.name)?'West':'?',wins,losses,currentSeed:Number(s.playoffSeed),form:(()=>{let m=String(s['Last Ten Games']||'').match(/(\d+)-(\d+)/);return m&&(+m[1]+ +m[2])>0?14*(+m[1]/(+m[1]+ +m[2])-.5):null})(),rating:(.8*clamp(m,-25,25)+.2*14*(wp-.5))*gp/(gp+15)}}));
 if(T.length!==30||new Set(T.map(t=>t.id)).size!==30||T.filter(t=>t.conference==='East').length!==15||T.filter(t=>t.conference==='West').length!==15||T.some(t=>!Number.isFinite(t.rating)||!Number.isInteger(t.wins)||!Number.isInteger(t.losses)||t.wins+t.losses>82))throw Error('Incomplete standings');
 const coverage=enrich(T,extras,now);
 const ids=new Map(T.map((t,i)=>[String(t.id),i])),C=['East','West'].map(k=>T.map((t,i)=>t.conference===k?i:-1).filter(i=>i>=0)),seen=new Set(),G=[],rem=T.map(t=>82-t.wins-t.losses);
 for(const g of schedule.games||[]){let h=ids.get(String(g.home)),a=ids.get(String(g.away));if(h==null||a==null||h===a||!g.id||seen.has(g.id))continue;seen.add(g.id);G.push([h,a,Date.parse(g.date)]);rem[h]--;rem[a]--}
 if(rem.some(x=>x<0||x>4)||rem.reduce((a,b)=>a+b,0)%2||Math.max(...rem)>rem.reduce((a,b)=>a+b,0)/2)throw Error('Schedule and standings inconsistent; no forecast issued');
 G.sort((a,b)=>a[2]-b[2]);const last=Array(30).fill(0),opps=T.map(()=>[]);for(const g of G){const [h,a,date]=g;const pen=(i)=>Math.min(8,T[i].injuryAdjustments.filter(x=>date<x.until).reduce((s,x)=>s+x.cost,0));const rest=(i)=>last[i]&&date-last[i]<30*3600000?1.1:0;g.push(pen(h)+rest(h),pen(a)+rest(a));last[h]=date;last[a]=date;opps[h].push(T[a].rating);opps[a].push(T[h].rating)}
 T.forEach((t,i)=>{t.scheduleDifficulty=mean(opps[i])==null?null:round(mean(opps[i]));t.remainingGames=opps[i].length;});
 const playoffStart=now+(Math.max(...T.map(t=>82-t.wins-t.losses))/3.5)*7*86400000;
 const playoffPenalty=T.map(t=>Math.min(8,t.injuryAdjustments.filter(x=>x.until>playoffStart).reduce((s,x)=>s+x.cost,0)));
 const missing=rem.reduce((a,b)=>a+b,0)/2,acc=T.map(()=>({wins:0,seed:0,hist:Array(15).fill(0),direct:0,playin:0,po:0,semi:0,cf:0,final:0,title:0,winHist:Array(83).fill(0)}));
 const match=[new Map(),new Map()],nba=new Map();
 const bump=(m,a,b,ordered=false)=>{if(!ordered&&a>b)[a,b]=[b,a];const k=a+'|'+b;m.set(k,(m.get(k)||0)+1)};
 const P=d=>1/(1+Math.exp(-d/6.5));
 for(let s=0;s<N;s++){
  const w=T.map(t=>t.wins),r=T.map(t=>t.rating+gauss()*t.uncertainty),tie=T.map(()=>R());
  for(const [h,a,date,hpen,apen] of G){if(R()<P(r[h]-r[a]+2.2-hpen+apen))w[h]++;else w[a]++}
  // Unassigned games: random feasible pairing of deficits, no invented fixture/date.
  const left=rem.slice();while(left.some(v=>v>0)){let order=left.map((v,i)=>[i,v,R()]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]||a[2]-b[2]);let a=order[0][0],b=order[1][0];left[a]--;left[b]--;w[R()<P(r[a]-r[b])?a:b]++}
  const ranks=C.map(c=>c.slice().sort((a,b)=>w[b]-w[a]||tie[a]-tie[b]));const cRank=new Map();ranks.forEach(c=>c.forEach((i,k)=>cRank.set(i,k)));
  const single=(home,away)=>R()<P(r[home]-r[away]+2.2-playoffPenalty[home]+playoffPenalty[away])?home:away;
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
 return {model:'atlas-season-v2',weights:WEIGHTS,coverage,season:new Date().getUTCMonth()>=6?new Date().getUTCFullYear()+1:new Date().getUTCFullYear(),asOf:new Date().toISOString(),simulations:N,knownGames:G.length,unassignedGames:missing,scheduleAsOf:schedule.updatedAt||null,rows,matchups:{East:top(match[0]),West:top(match[1]),NBA:top(nba)},notes:'Multi-factor heuristic: current margin and wins, recent form, observed rotation talent, previous two seasons, normalized championship-market prices. Injury and rest adjustments per known game, estimated longer-term availability for playoffs. Missing components reweighted. Random tiebreaks and unknown schedule pairings. Not calibrated.'};
}
module.exports={simulate};
