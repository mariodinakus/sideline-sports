/* NBA ATLAS Lab data (ESPN public endpoints, unofficial).
   type=season  -> team advanced stats (pace, ratings, four factors), luck components and each team's game log
   type=gamelog -> a player's regular-season game log (&id=athleteId)
   type=shots   -> shot zones, shot types, assisted share and clutch splits (teams + players) from recent play-by-play
   type=replay  -> compact play-by-play with home win probability for one game (&id=eventId) */
const B='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
async function get(u,ms=9000){const r=await fetch(u,{signal:AbortSignal.timeout(ms),headers:{accept:'application/json'}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return r.json()}
const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,'');
const secs=c=>{const m=String(c||'0').split(':');return m.length>1?(+m[0])*60+(+m[1]):+m[0]||0};
const pair=v=>{const m=String(v||'').split('-');return[+m[0]||0,+m[1]||0]};

function teamBox(t){const s={};for(const x of t.statistics||[])s[x.name]=x.displayValue;
  const [fgm,fga]=pair(s['fieldGoalsMade-fieldGoalsAttempted']),[tpm,tpa]=pair(s['threePointFieldGoalsMade-threePointFieldGoalsAttempted']),[ftm,fta]=pair(s['freeThrowsMade-freeThrowsAttempted']);
  const orb=+s.offensiveRebounds||0,drb=+s.defensiveRebounds||Math.max(0,(+s.totalRebounds||0)-orb),tov=+(s.totalTurnovers??s.turnovers)||0;
  return{id:String(t.team?.id||''),fgm,fga,tpm,tpa,ftm,fta,orb,drb,tov,ast:+s.assists||0}}

async function season(){
  const now=new Date(),y=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1,start=new Date(Date.UTC(y,9,18));
  const dates=[];for(let d=new Date(now);d>=start;d=new Date(d.getTime()-864e5))dates.push(ymd(d));
  const boards=[];for(let i=0;i<dates.length;i+=10){const r=await Promise.allSettled(dates.slice(i,i+10).map(d=>get(`${B}/scoreboard?dates=${d}&limit=40`)));boards.push(...r)}
  const evs=[];const seen=new Set();
  for(const b of boards){if(b.status!=='fulfilled')continue;for(const e of b.value.events||[]){if(seen.has(e.id)||!e.status?.type?.completed)continue;if(String(e.season?.type)!=='2')continue;seen.add(e.id);evs.push(e)}}
  evs.sort((a,b)=>String(b.date).localeCompare(String(a.date)));const use=evs.slice(0,420);
  const games=[];
  for(let i=0;i<use.length;i+=15){const r=await Promise.allSettled(use.slice(i,i+15).map(e=>get(`${B}/summary?event=${e.id}`).then(j=>({e,j}))));
    for(const x of r){if(x.status!=='fulfilled')continue;const {e,j}=x.value,cs=e.competitions?.[0]?.competitors||[];
      const h=cs.find(c=>c.homeAway==='home'),a=cs.find(c=>c.homeAway==='away');if(!h||!a)continue;
      const bx=(j.boxscore?.teams||[]).map(teamBox),hb=bx.find(b=>b.id===String(h.team?.id)),ab=bx.find(b=>b.id===String(a.team?.id));
      const ot=Math.max(0,(h.linescores||[]).length-4);
      games.push({id:String(e.id),date:e.date,h:String(h.team?.id),a:String(a.team?.id),hs:+h.score||0,as:+a.score||0,ot,hb,ab,neutral:!!e.competitions?.[0]?.neutralSite})}}
  const T={};const tm=id=>T[id]||(T[id]={id,g:0,w:0,l:0,pf:0,pa:0,poss:0,min:0,f:{fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,orb:0,drb:0,tov:0},o:{fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,orb:0,drb:0,tov:0},cw:0,cl:0,box:0,log:[]});
  const add=(acc,b)=>{for(const k in acc)acc[k]+=b[k]||0};
  const P=b=>b.fga-b.orb+b.tov+.44*b.fta;
  for(const g of games){for(const [me,op,ms,os,mb,ob,home] of [[g.h,g.a,g.hs,g.as,g.hb,g.ab,true],[g.a,g.h,g.as,g.hs,g.ab,g.hb,false]]){
    const t=tm(me);t.g++;ms>os?t.w++:t.l++;t.pf+=ms;t.pa+=os;t.min+=48+5*g.ot;
    if(Math.abs(ms-os)<=5||g.ot){ms>os?t.cw++:t.cl++}
    if(mb&&ob&&mb.fga&&ob.fga){t.box++;add(t.f,mb);add(t.o,ob);t.poss+=(P(mb)+P(ob))/2}
    t.log.push({id:g.id,date:g.date,opp:op,home,m:ms-os,ot:g.ot,neutral:g.neutral})}}
  const L={fga:0,tpm:0,tpa:0,pts:0,poss:0,min:0};
  for(const t of Object.values(T)){L.tpm+=t.f.tpm;L.tpa+=t.f.tpa;L.pts+=t.pf;L.min+=t.min}
  const lg3=L.tpa?L.tpm/L.tpa:.36;
  const out=Object.values(T).map(t=>{const f=t.f,o=t.o,bg=t.box||1,pace=t.min&&t.box?t.poss/bg*48/((t.min/t.g)||48):null;
    const pfB=t.box?t.pf*(t.box/t.g):0;
    const exp=t.pf**14/(t.pf**14+t.pa**14||1),pyW=exp*t.g;
    const o3=o.tpa?o.tpm/o.tpa:null,threeLuck=o3==null?0:(lg3-o3)*3*(o.tpa/bg);
    const closeExcess=t.cw-(t.cw+t.cl)/2;
    return{id:t.id,g:t.g,w:t.w,l:t.l,ppg:t.pf/t.g,oppg:t.pa/t.g,margin:(t.pf-t.pa)/t.g,boxGames:t.box,
      pace,ortg:t.poss?100*(t.pf/t.g*bg)/t.poss:null,drtg:t.poss?100*(t.pa/t.g*bg)/t.poss:null,
      efg:f.fga?(f.fgm+.5*f.tpm)/f.fga:null,tovPct:t.poss?f.tov/(f.fga+.44*f.fta+f.tov):null,orbPct:(f.orb+o.drb)?f.orb/(f.orb+o.drb):null,ftr:f.fga?f.ftm/f.fga:null,
      oefg:o.fga?(o.fgm+.5*o.tpm)/o.fga:null,otovPct:(o.fga+.44*o.fta+o.tov)?o.tov/(o.fga+.44*o.fta+o.tov):null,drbPct:(o.orb+f.drb)?f.drb/(o.orb+f.drb):null,oftr:o.fga?o.ftm/o.fga:null,
      tpPct:f.tpa?f.tpm/f.tpa:null,tpaPg:f.tpa/bg,opp3Pct:o3,opp3paPg:o.tpa/bg,
      pythW:pyW,closeW:t.cw,closeL:t.cl,closeExcess,threeLuckPts:threeLuck,
      luckWins:(t.w-pyW)+threeLuck*t.g*0.03,
      log:t.log.sort((a,b)=>String(a.date).localeCompare(String(b.date)))}});
  return{source:'ESPN public scoreboards + summaries (unofficial)',season:`${y}-${String(y+1).slice(2)}`,games:games.length,totalCompleted:evs.length,league:{three:lg3,ppg:L.pts/Math.max(1,games.length*2)},teams:out,updatedAt:new Date().toISOString()};
}


/* Shot diet, shot types, assisted share and clutch splits from play-by-play of recent completed games. */
const ZONES=['rim','short','mid','c3','ab3'];
const TYPES=[['dunk',/dunk/i],['alley',/alley oop/i],['putback',/putback|tip shot|tip dunk|tip layup/i],['layup',/layup/i],['floater',/float|hook/i],['pullup',/pullup|pull-up/i],['iso',/step ?back|fadeaway|turnaround/i],['catch',/jumper|jump shot/i]];
function zoneOf(p){const t=String(p.text||''),three=/three point/i.test(t)||p.scoreValue===3;const fm=t.match(/(\d+)-foot/);const c=p.coordinate||{};const ok=c.x>=0&&c.x<=50&&c.y>=0&&c.y<=50;
  const dist=fm?+fm[1]:ok?Math.hypot(c.x-25,c.y):null;
  if(three)return ok&&c.y<=9&&Math.abs(c.x-25)>=21?'c3':'ab3';if(dist==null)return null;return dist<=4?'rim':dist<=14?'short':'mid'}
function typeOf(p){const t=String(p.text||'');for(const [k,re] of TYPES)if(re.test(t))return k;return'other'}
async function shots(){
  const now=new Date(),y=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1,start=new Date(Date.UTC(y,9,18));
  const dates=[];for(let d=new Date(now);d>=start&&dates.length<60;d=new Date(d.getTime()-864e5))dates.push(ymd(d));
  const evs=[],seen=new Set();for(let i=0;i<dates.length;i+=12){const r=await Promise.allSettled(dates.slice(i,i+12).map(d=>get(`${B}/scoreboard?dates=${d}&limit=40`)));for(const b of r){if(b.status!=='fulfilled')continue;for(const e of b.value.events||[]){if(seen.has(e.id)||!e.status?.type?.completed||String(e.season?.type)!=='2')continue;seen.add(e.id);evs.push(e)}}}
  evs.sort((a,b)=>String(b.date).localeCompare(String(a.date)));const use=evs.slice(0,240);
  const Z=()=>Object.fromEntries(ZONES.map(z=>[z,[0,0]])),TY=()=>Object.fromEntries([...TYPES.map(t=>t[0]),'other'].map(k=>[k,[0,0]]));
  const team=()=>({g:0,off:{z:Z(),ty:TY(),ast:0,fgm:0,fta:0,fga:0},def:{z:Z(),ty:TY(),ast:0,fgm:0,fta:0,fga:0},cl:{pf:0,pa:0,g:0}});
  const T={},Pl={},L={z:Z(),ty:TY(),ast:0,fgm:0,fta:0,fga:0};let n=0;
  const pl=(id,tid)=>Pl[id]||(Pl[id]={t:tid,g:new Set(),z:Z(),ty:TY(),ast:0,fgm:0,cl:{pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,g:new Set()}});
  for(let i=0;i<use.length;i+=16){const r=await Promise.allSettled(use.slice(i,i+16).map(e=>get(`${B}/summary?event=${e.id}`,8000).then(j=>({e,j}))));
    for(const x of r){if(x.status!=='fulfilled')continue;const {e,j}=x.value,cs=j.header?.competitions?.[0]?.competitors||[];const h=cs.find(c=>c.homeAway==='home'),a=cs.find(c=>c.homeAway==='away');if(!h||!a)continue;
      const hid=String(h.team?.id),aid=String(a.team?.id),plays=j.plays||[];if(plays.length<50)continue;n++;
      for(const id of [hid,aid]){(T[id]=T[id]||team()).g++}
      const clutchSeen=new Set();
      for(const p of plays){const tid=String(p.team?.id||'');if(tid!==hid&&tid!==aid)continue;const opp=tid===hid?aid:hid;
        const per=p.period?.number||0,sc=secs(p.clock?.displayValue),val=p.scoringPlay?(+p.scoreValue||0):0;
        let hs=+p.homeScore||0,as=+p.awayScore||0;if(val){if(tid===hid)hs-=val;else as-=val}
        const clutch=per>=4&&sc<=300&&Math.abs(hs-as)<=5;
        const ath=String(p.participants?.[0]?.athlete?.id||''),txt=String(p.type?.text||'')+' '+String(p.text||''),ft=/free throw/i.test(txt);
        if(clutch){if(!clutchSeen.has(tid)){clutchSeen.add(tid);T[tid].cl.g++}if(val){T[tid].cl.pf+=val;T[opp].cl.pa+=val}}
        if(ft){if(!/technical/i.test(txt)){T[tid].off.fta++;T[opp].def.fta++;L.fta++;if(ath){const q=pl(ath,tid);if(clutch){q.cl.fta++;if(val){q.cl.ftm++;q.cl.pts+=val}q.cl.g.add(e.id)}}}continue}
        if(!p.shootingPlay)continue;const z=zoneOf(p),ty=typeOf(p),made=!!p.scoringPlay,assisted=made&&(p.participants||[]).length>1;
        for(const side of [T[tid].off,T[opp].def,L]){side.fga++;if(made){side.fgm++;if(assisted)side.ast++}if(z){side.z[z][1]++;if(made)side.z[z][0]++}side.ty[ty][1]++;if(made)side.ty[ty][0]++}
        if(ath){const q=pl(ath,tid);q.g.add(e.id);if(z){q.z[z][1]++;if(made)q.z[z][0]++}q.ty[ty][1]++;if(made){q.ty[ty][0]++;q.fgm++;if(assisted)q.ast++}
          if(clutch){q.cl.g.add(e.id);q.cl.fga++;if(made){q.cl.fgm++;q.cl.pts+=val}if(z==='c3'||z==='ab3'){q.cl.tpa++;if(made)q.cl.tpm++}}}}}}
  const players={};for(const [id,q] of Object.entries(Pl)){const fga=ZONES.reduce((s,z)=>s+q.z[z][1],0);if(fga<10&&q.cl.fga+q.cl.fta<3)continue;players[id]={t:q.t,g:q.g.size,z:q.z,ty:q.ty,ast:q.ast,fgm:q.fgm,cl:{...q.cl,g:q.cl.g.size}}}
  return{source:'ESPN public play-by-play (unofficial)',games:n,from:use.length?use[use.length-1].date:null,to:use.length?use[0].date:null,league:L,teams:T,players,updatedAt:new Date().toISOString()};
}

async function gamelog(id){
  const g=await get(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/gamelog`);
  const N=g.names||[],ix=k=>N.indexOf(k),reg=(g.seasonTypes||[]).find(s=>/regular/i.test(s.displayName||''));
  const rows=[];
  for(const c of reg?.categories||[])for(const ev of c.events||[]){const meta=g.events?.[ev.eventId];if(!meta)continue;const s=ev.stats||[],v=k=>s[ix(k)];
    const [fgm,fga]=pair(v('fieldGoalsMade-fieldGoalsAttempted')),[tpm,tpa]=pair(v('threePointFieldGoalsMade-threePointFieldGoalsAttempted')),[ftm,fta]=pair(v('freeThrowsMade-freeThrowsAttempted'));
    rows.push({id:String(ev.eventId),date:meta.gameDate,opp:String(meta.opponent?.id||''),oppAbbr:meta.opponent?.abbreviation||'',home:meta.atVs==='vs',res:meta.gameResult||'',
      min:+v('minutes')||0,fgm,fga,tpm,tpa,ftm,fta,reb:+v('totalRebounds')||0,ast:+v('assists')||0,blk:+v('blocks')||0,stl:+v('steals')||0,pf:+v('fouls')||0,tov:+v('turnovers')||0,pts:+v('points')||0})}
  const uniq=[...new Map(rows.map(r=>[r.id,r])).values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  return{id,season:reg?.displayName||'',games:uniq};
}

async function replay(id){
  const j=await get(`${B}/summary?event=${id}`),comp=j.header?.competitions?.[0]||{},cs=comp.competitors||[];
  const side=k=>{const c=cs.find(x=>x.homeAway===k)||{};return{id:String(c.team?.id||''),abbr:c.team?.abbreviation||'',name:c.team?.displayName||'',color:c.team?.color||'',alt:c.team?.alternateColor||'',logo:c.team?.logos?.[0]?.href||null,score:+c.score||0}};
  const wp=new Map((j.winprobability||[]).map(x=>[String(x.playId),+x.homeWinPercentage]));
  let last=.5;const plays=[];
  for(const p of j.plays||[]){const q=p.period?.number||1,t=q<=4?(q-1)*720+(720-secs(p.clock?.displayValue)):2880+(q-5)*300+(300-secs(p.clock?.displayValue));
    const w=wp.has(String(p.id))?wp.get(String(p.id)):last;last=w;
    plays.push([Math.round(t),+p.homeScore||0,+p.awayScore||0,Math.round(w*1000)/1000,p.scoringPlay?(p.scoreValue||0):0,String(p.team?.id||''),q,p.clock?.displayValue||'',String(p.text||'').slice(0,110)])}
  return{id,state:comp.status?.type?.state||'',detail:comp.status?.type?.detail||'',date:comp.date,home:side('home'),away:side('away'),hasWP:wp.size>0,plays};
}

module.exports=async(req,res)=>{
  const type=String(req.query?.type||''),id=String(req.query?.id||'');
  try{
    let out,cc='s-maxage=21600, stale-while-revalidate=43200';
    if(type==='season')out=await season();
    else if(type==='shots')out=await shots();
    else if(type==='gamelog'){if(!/^\d{1,12}$/.test(id))return res.status(400).json({error:'Invalid player'});out=await gamelog(id);cc='s-maxage=3600, stale-while-revalidate=10800'}
    else if(type==='replay'){if(!/^\d{4,12}$/.test(id))return res.status(400).json({error:'Invalid game'});out=await replay(id);cc=out.state==='post'?'s-maxage=86400, stale-while-revalidate=86400':'s-maxage=20, stale-while-revalidate=40'}
    else return res.status(400).json({error:'Unknown type'});
    res.setHeader('Cache-Control',cc);res.status(200).json(out);
  }catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}
};
