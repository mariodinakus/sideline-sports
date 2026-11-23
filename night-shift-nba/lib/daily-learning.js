'use strict';
/* Frozen pregame audit and chronological Platt-scaling challenger. */
const N=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const day=t=>{const x=new Date(t);if(!Number.isFinite(x.getTime()))return null;const v=Object.fromEntries(fmt.formatToParts(x).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return v.year+'-'+v.month+'-'+v.day};
function valid(r){const t=Date.parse(r.tip),lock=Date.parse(r.lockedAt),f=r.forecast||{},p=N(f.homeWinProb);
 if(!r.id||!Number.isFinite(t)||!Number.isFinite(lock)||lock>t||p===null||p<0||p>1)return null;
 const a=r.actual||{},h=N(a.home),aw=N(a.away),settled=h!==null&&aw!==null&&h>=0&&aw>=0&&h!==aw;
 const margin=N(f.margin)??(N(f.homePts)!==null&&N(f.awayPts)!==null?f.homePts-f.awayPts:null);
 return{id:String(r.id),day:day(r.tip),tip:r.tip,lockedAt:r.lockedAt,homeCode:String(r.homeCode||''),awayCode:String(r.awayCode||''),model:r.model||'unknown',
 p,margin,homePts:N(f.homePts),awayPts:N(f.awayPts),marginLow:N(f.marginLow),marginHigh:N(f.marginHigh),
 settled,actual:settled?{home:h,away:aw}:null}}
const logit=p=>Math.log(clamp(p,.001,.999)/(1-clamp(p,.001,.999)));
const logistic=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const estimate=(p,m)=>clamp(logistic(m.a+m.b*logit(p)),.001,.999);
function fit(rows){let a=0,b=1;for(let k=0;k<850;k++){let ga=0,gb=0;for(const r of rows){const z=logit(r.p),delta=logistic(a+b*z)-Number(r.actual.home>r.actual.away);ga+=delta;gb+=delta*z}const lr=.16/Math.max(35,rows.length);a-=lr*(ga+rows.length*.018*a);b=clamp(b-lr*(gb+rows.length*.018*(b-1)),.15,3.5)}return{a,b}}
function performance(rows,model){return{n:rows.length,brier:mean(rows.map(r=>{const y=Number(r.actual.home>r.actual.away),p=model?estimate(r.p,model):r.p;return(p-y)**2})),logloss:mean(rows.map(r=>{const y=Number(r.actual.home>r.actual.away),p=clamp(model?estimate(r.p,model):r.p,.001,.999);return -(y*Math.log(p)+(1-y)*Math.log(1-p))})),accuracy:mean(rows.map(r=>Number(Number((model?estimate(r.p,model):r.p)>=.5)===Number(r.actual.home>r.actual.away))))}}
function learning(rows){
 const done=rows.filter(r=>r.settled).sort((a,b)=>Date.parse(a.tip)-Date.parse(b.tip)||a.id.localeCompare(b.id));
 const n=Math.floor(done.length*.75),train=done.slice(0,n),test=done.slice(n),base=performance(test);
 if(train.length<80||test.length<30)return{status:'insufficient',sample:done.length,train:train.length,holdout:test.length,baseline:base,challenger:null,active:false,reason:'Απαιτούνται τουλάχιστον 80 αγώνες εκπαίδευσης και 30 μεταγενέστεροι αξιολόγησης.'};
 const candidate=fit(train),challenger=performance(test,candidate),deltaBrier=base.brier-challenger.brier,deltaLogloss=base.logloss-challenger.logloss,active=deltaBrier>=.003&&deltaLogloss>=.003;
 return{status:active?'validated':'monitor',sample:done.length,train:train.length,holdout:test.length,baseline:base,challenger,active,deltaBrier,deltaLogloss,coefficients:active?fit(done):null,
 reason:active?'Ο χρονικός έλεγχος δείχνει βελτίωση Brier και log loss. Εφαρμόζεται μόνο σε μελλοντικές προβλέψεις.':'Δεν αποδείχθηκε βελτίωση σε μεταγενέστερους αγώνες. Παραμένει το αρχικό μοντέλο.'}
}
function detail(r){
 const y=Number(r.actual.home>r.actual.away),pick=Number(r.p>=.5),h=r.actual.home,a=r.actual.away,margin=h-a,pMargin=r.margin,swing=pMargin===null?null:margin-pMargin,confidence=Math.max(r.p,1-r.p);
 const reasons=[];
 if(y!==pick)reasons.push(confidence>=.75?'Υπερβολική βεβαιότητα '+Math.round(confidence*100)+'% στην ομάδα που έχασε.':'Το φαβορί του μοντέλου έχασε ('+Math.round(confidence*100)+'%).');
 if(swing!==null&&Math.abs(swing)>=10)reasons.push('Σφάλμα διαφοράς '+Math.abs(swing).toFixed(1)+' πόντοι, προς '+(swing>0?r.homeCode:r.awayCode)+'.');
 if(r.homePts!==null&&Math.abs(h-r.homePts)>=12)reasons.push(r.homeCode+': '+(h-r.homePts>0?'+':'')+(h-r.homePts).toFixed(1)+' πόντοι από πρόβλεψη.');
 if(r.awayPts!==null&&Math.abs(a-r.awayPts)>=12)reasons.push(r.awayCode+': '+(a-r.awayPts>0?'+':'')+(a-r.awayPts).toFixed(1)+' πόντοι από πρόβλεψη.');
 if(Math.abs(margin)<=5)reasons.push('Κρίθηκε σε '+Math.abs(margin)+' πόντους: μικρή απόκλιση μπορεί να αντιστρέψει νικητή.');
 if(!reasons.length)reasons.push('Οι μετρήσιμες διαφορές είναι σχετικά μικρές.');
 return{id:r.id,tip:r.tip,homeCode:r.homeCode,awayCode:r.awayCode,p:r.p,correct:y===pick,pick:pick?'HOME':'AWAY',winner:y?'HOME':'AWAY',confidence,actual:r.actual,predicted:{home:r.homePts,away:r.awayPts,margin:pMargin},marginError:swing,
 scoreError:r.homePts!==null&&r.awayPts!==null?(Math.abs(h-r.homePts)+Math.abs(a-r.awayPts))/2:null,brier:(r.p-y)**2,actualWinnerProb:y?r.p:1-r.p,
 coverage80:r.marginLow!==null&&r.marginHigh!==null?margin>=r.marginLow&&margin<=r.marginHigh:null,reasons}
}
function days(records){
 const grouped=new Map();for(const r of records){if(!r.day)continue;if(!grouped.has(r.day))grouped.set(r.day,[]);grouped.get(r.day).push(r)}
 return [...grouped.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([date,records])=>{const games=records.filter(r=>r.settled).map(detail).sort((a,b)=>Date.parse(a.tip)-Date.parse(b.tip));
 const margin=games.map(x=>x.marginError===null?null:Math.abs(x.marginError)).filter(x=>x!==null),score=games.map(x=>x.scoreError).filter(x=>x!==null),coverage=games.map(x=>x.coverage80===null?null:Number(x.coverage80)).filter(x=>x!==null);
 return{date,settled:games.length,pending:records.length-games.length,total:records.length,accuracy:mean(games.map(g=>Number(g.correct))),brier:mean(games.map(g=>g.brier)),marginMAE:mean(margin),scoreMAE:mean(score),coverage80:mean(coverage),
 highConfidenceMisses:games.filter(g=>!g.correct&&g.confidence>=.75).length,misses:games.filter(g=>!g.correct).length,games}})}
function audit(records,{now=Date.now()}={}){
 const accepted=records.map(valid).filter(Boolean),reports=days(accepted),l=learning(accepted),latest=reports.find(x=>x.settled>0),future=accepted.filter(r=>!r.settled&&Date.parse(r.tip)>now).map(r=>({id:r.id,originalProb:r.p,adjustedProb:l.active?estimate(r.p,l.coefficients):null,used:l.active}));
 return{source:'COURTSIDE IQ pre-tipoff ledger',asOf:day(now),coverage:{received:records.length,eligible:accepted.length,settled:accepted.filter(r=>r.settled).length,excluded:records.length-accepted.length},
 latestDate:latest?.date||null,days:reports,learning:l,future}
}
module.exports={audit,valid,learning,days,fit,performance};
