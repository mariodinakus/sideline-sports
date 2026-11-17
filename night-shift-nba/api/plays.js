/* Live game feed: status, score, shot locations and latest plays (ESPN public summary, unofficial). */
const B='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=';
module.exports=async(req,res)=>{
 const id=String(req.query?.id||'');if(!/^\d{4,12}$/.test(id))return res.status(400).json({error:'Invalid game'});
 try{
  const r=await fetch(B+id,{signal:AbortSignal.timeout(9000),headers:{accept:'application/json'}});if(!r.ok)throw Error('ESPN HTTP '+r.status);
  const j=await r.json(),comp=j.header?.competitions?.[0]||{},st=comp.status?.type||{};
  const teams=(comp.competitors||[]).map(c=>({id:String(c.team?.id||''),abbr:c.team?.abbreviation||'',homeAway:c.homeAway,score:c.score??null,color:c.team?.color||'',logo:c.team?.logos?.[0]?.href||null}));
  const plays=j.plays||[];
  const ok=p=>p.coordinate&&p.coordinate.x>=0&&p.coordinate.x<=50&&p.coordinate.y>=0&&p.coordinate.y<=94;
  const shots=plays.filter(p=>p.shootingPlay&&ok(p)&&!/free throw/i.test(p.type?.text||'')).map(p=>({x:p.coordinate.x,y:p.coordinate.y,made:!!p.scoringPlay,pts:p.scoreValue||0,team:String(p.team?.id||''),q:p.period?.number||0,clock:p.clock?.displayValue||'',text:String(p.text||'').slice(0,140)}));
  const last=plays.slice(-15).reverse().map(p=>({text:String(p.text||'').slice(0,160),q:p.period?.number||0,clock:p.clock?.displayValue||'',score:`${p.awayScore??''}-${p.homeScore??''}`,scoring:!!p.scoringPlay,team:String(p.team?.id||'')}));
  res.setHeader('Cache-Control',st.state==='in'?'s-maxage=15, stale-while-revalidate=30':'s-maxage=600, stale-while-revalidate=1200');
  res.status(200).json({id,state:st.state||'pre',detail:st.detail||st.shortDetail||'',teams,shots,last,updatedAt:new Date().toISOString()});
 }catch(e){res.setHeader('Cache-Control','no-store');res.status(503).json({error:String(e.message||e)})}
};
