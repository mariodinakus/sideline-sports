'use strict';
/* Dynamic pregame estimates. This read-only layer never changes the historic locked ledger.
 * ESPN unofficial public sources; predictions stop five minutes before the scheduled tip.
 */
const N=x=>x===null||x===undefined||x===''||!Number.isFinite(Number(x))?null:Number(x);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const logistic=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const logit=p=>Math.log(clamp(p,.001,.999)/(1-clamp(p,.001,.999)));
const LOCK_MS=5*60000;
const status=s=>String(s||'').toUpperCase();
function injuryCost(tid,injuries,players,tip){
 const list=(injuries?.teams||[]).find(t=>String(t.id)===String(tid))?.players||[];
 const byId=new Map((players||[]).filter(p=>String(p.teamId)===String(tid)).map(p=>[String(p.id),p]));
 let cost=0;const hits=[];
 for(const x of list){
  const p=byId.get(String(x.id));if(!p||N(p.games)<3||N(p.mpg)<12||N(p.ppg)===null)continue;
  const state=status(x.fantasy+' '+x.status);
  let likelihood=/\b(OFS|OUT|INACTIVE|DOUBTFUL)\b/.test(state)?1:/\b(GTD|QUESTIONABLE|DAY-TO-DAY)\b/.test(state)?.5:0;
  const ret=Date.parse(x.ret||'');if(Number.isFinite(ret)&&ret+86400000<Date.parse(tip))likelihood=0;
  if(!likelihood)continue;
  const impact=clamp((Number(p.ppg)+.4*(N(p.rpg)||0)+.6*(N(p.apg)||0))*Number(p.mpg)/36*.075,.15,2.5);
  let c=impact*likelihood;cost+=c;hits.push({name:x.name||p.name,status:x.status||x.fantasy||'',cost:Number(c.toFixed(2))});
 }
 return{cost:clamp(cost,0,5.5),players:hits.slice(0,6)}
}
function lastRest(events,teamId,tip){
 const dt=Date.parse(tip);
 const times=(events||[]).filter(e=>e.state==='post'&&e.ids?.includes(String(teamId))&&Date.parse(e.date)<dt).map(e=>Date.parse(e.date));
 if(!times.length)return{hours:null,penalty:0};
 const hours=(dt-Math.max(...times))/3600000;
 return{hours:Math.round(hours),penalty:hours<29?1.25:hours<47?.45:0};
}
function predict(game,{power,injuries,ledger,history,ml,now=Date.now()}={}){
 const tip=Date.parse(game.date),id=String(game.id),archive=ledger?.forecast||null;
 if(!Number.isFinite(tip)||game.state!=='pre'||tip<=now||!game.home?.id||!game.away?.id)return null;
 const beforeLock=tip-now>LOCK_MS;
 if(!beforeLock)return{id,date:game.date,home:game.home,away:game.away,state:'archive-only',lockAt:new Date(tip-LOCK_MS).toISOString(),asOf:new Date(now).toISOString(),source:'original pre-tipoff ledger',original:archive?{homeWinProb:archive.homeWinProb,homePts:archive.homePts,awayPts:archive.awayPts,margin:archive.margin}:null,live:null,reason:'Οι δυναμικές ενημερώσεις σταματούν 5 λεπτά πριν την έναρξη. Η μόνη διαθέσιμη παγκόσμια κλειδωμένη εκτίμηση είναι το αρχικό ιστορικό δελτίο.'};
 const h=(power?.teams||[]).find(x=>String(x.id)===String(game.home.id)),a=(power?.teams||[]).find(x=>String(x.id)===String(game.away.id));
 const baseP=N(archive?.homeWinProb);
 const pb=baseP!==null&&baseP>=0&&baseP<=1?baseP:null;
 if((!h||!a||N(h.power)===null||N(a.power)===null)&&pb===null)return{id,date:game.date,home:game.home,away:game.away,state:'unavailable',reason:'Δεν υπάρχει επαρκές αρχείο ισχύος για υπολογισμό.'};
 const rating=N(h?.power)!==null&&N(a?.power)!==null?.4*(h.power-a.power)+1.8:null;
 const marginBase=N(archive?.margin)??rating;
 if(marginBase===null)return null;
 const hp=pb===null?logistic(marginBase/7.8):pb;
 const calibrated=!!(ml?.active&&ml.coefficients&&N(ml.coefficients.intercept)!==null&&N(ml.coefficients.slope)!==null);
 const initial=calibrated?logistic(ml.coefficients.intercept+ml.coefficients.slope*logit(hp)):hp;
 const strength=rating===null?0:clamp(.33*(rating-marginBase),-4.5,4.5);
 const form=h&&a&&N(h.recentWinPct)!==null&&N(a.recentWinPct)!==null?clamp((h.recentWinPct-a.recentWinPct)*2,-1.5,1.5):0;
 const hi=injuryCost(game.home.id,injuries,power?.players,game.date),ai=injuryCost(game.away.id,injuries,power?.players,game.date);
 const injury=clamp(ai.cost-hi.cost,-5,5);
 const hr=lastRest(history,game.home.id,game.date),ar=lastRest(history,game.away.id,game.date),rest=clamp(ar.penalty-hr.penalty,-1.25,1.25);
 const adjustment=clamp(strength+form+injury+rest,-8,8),newMargin=marginBase+adjustment;
 const p=clamp(logistic(logit(initial)+adjustment/7.8),.03,.97);
 const baseHome=N(archive?.homePts)??(h&&a&&N(h.pointsFor)!==null&&N(a.pointsAgainst)!==null?(h.pointsFor+a.pointsAgainst)/2:null);
 const baseAway=N(archive?.awayPts)??(h&&a&&N(a.pointsFor)!==null&&N(h.pointsAgainst)!==null?(a.pointsFor+h.pointsAgainst)/2:null);
 const homePts=baseHome!==null?baseHome+adjustment/2:null,awayPts=baseAway!==null?baseAway-adjustment/2:null;
 const signals=[
 {name:'Ισχύς & τρέχουσα διαφορά ομάδων',points:strength,available:rating!==null},
 {name:'Φόρμα τελευταίων 10',points:form,available:h&&a&&N(h.recentWinPct)!==null&&N(a.recentWinPct)!==null},
 {name:'Απουσίες / αμφίβολοι',points:injury,available:!!injuries?.teams?.length,home:hi.players,away:ai.players},
 {name:'Χρόνος ανάπαυσης',points:rest,available:hr.hours!==null||ar.hours!==null,homeHours:hr.hours,awayHours:ar.hours}
 ];
 return{id,date:game.date,home:game.home,away:game.away,state:'live',lockAt:new Date(tip-LOCK_MS).toISOString(),asOf:new Date(now).toISOString(),source:'ESPN latest public + Courtside IQ archived pregame',
 original:archive?{homeWinProb:archive.homeWinProb,homePts:archive.homePts,awayPts:archive.awayPts,margin:archive.margin,lockedAt:ledger?.lockedAt}:null,
 live:{homeWinProb:Number(p.toFixed(4)),homePts:homePts===null?null:Number(homePts.toFixed(1)),awayPts:awayPts===null?null:Number(awayPts.toFixed(1)),margin:Number(newMargin.toFixed(1)),deltaPoints:Number(adjustment.toFixed(2)),originalProb:pb,probDiff:pb===null?null:Number(((p-pb)*100).toFixed(1)),mlCalibrated:calibrated,model:'pregame-feature-adjustment-v1',signals},
 limitations:['Εκτιμήσεις βάσει δημοσίων δεδομένων· όχι επίσημες πεντάδες.','Χωρίς ιστορική αποθήκευση των δυναμικών snapshots, η διαγνωστική αξιολόγηση χρησιμοποιεί μόνο το αρχικό pre-tipoff ledger.']};
}
module.exports={predict,injuryCost,lastRest,LOCK_MS};
