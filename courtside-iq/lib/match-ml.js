// Time-ordered logistic regression trained on actual FINAL scores only.
// Epoch 1 uses an expanding pre-game Elo rating so no game leaks its outcome into its own features.
export const sigmoid=z=>1/(1+Math.exp(-Math.max(-24,Math.min(24,z))));
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function samplesFromGames(games){
 const input=games.filter(g=>g&&g.date&&g.home&&g.away&&Number.isFinite(Number(g.homeScore))&&Number.isFinite(Number(g.awayScore))&&g.homeScore!==null&&g.awayScore!==null).slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const elo=new Map();const arr=[];
 for(const g of input){const h=String(g.homeCode||g.home),a=String(g.awayCode||g.away);if(h===a)continue;
 const hr=elo.get(h)??1500,ar=elo.get(a)??1500;const homeWin=+g.homeScore>+g.awayScore?1:0;
 arr.push({date:g.date,home:h,away:a,x:[1,(hr-ar)/400],y:homeWin,scoreH:+g.homeScore,scoreA:+g.awayScore});
 const expected=sigmoid(((hr-ar)+65)/180),delta=22*(homeWin-expected);elo.set(h,hr+delta);elo.set(a,ar-delta);
 }
 return {samples:arr,elo};
}
export function fitLogistic(games,{minGames=65}={}){
 const {samples,elo}=samplesFromGames(games);if(samples.length<minGames)return {trained:false,n:samples.length,required:minGames,reason:'Not enough dated, completed matches for time-split training.',elo};
 const pivot=Math.max(40,Math.floor(samples.length*.8));const train=samples.slice(0,pivot),holdout=samples.slice(pivot);
 let w=[0.1,0.6];const lambda=.025;
 for(let epoch=0;epoch<1200;epoch++){let grad=[0,0];for(const s of train){const p=sigmoid(w[0]*s.x[0]+w[1]*s.x[1]);for(let i=0;i<2;i++)grad[i]+=(p-s.y)*s.x[i]}const rate=.055/Math.sqrt(1+epoch/130);for(let i=0;i<2;i++)w[i]-=rate*(grad[i]/train.length+lambda*(i===0?0:w[i]))}
 const test=holdout.map(s=>({p:sigmoid(w[0]+w[1]*s.x[1]),y:s.y}));
 const brier=test.reduce((s,r)=>s+(r.p-r.y)**2,0)/test.length;
 const accuracy=test.reduce((s,r)=>s+((r.p>=.5?1:0)===r.y?1:0),0)/test.length;
 const baseRate=train.reduce((sum,x)=>sum+x.y,0)/train.length;
 const baselineBrier=test.reduce((s,r)=>s+(baseRate-r.y)**2,0)/test.length;
 return {trained:true,n:samples.length,trainN:train.length,testN:test.length,w,brier:+brier.toFixed(4),baselineBrier:+baselineBrier.toFixed(4),accuracy:+accuracy.toFixed(3),elo,trainingEnd:train.at(-1).date,testStart:holdout[0].date,formula:'P(home win) = σ(intercept + β × (pregame Elo difference / 400))'};
}
export function predictGame(model,home,away){if(!model?.trained)return null;const h=model.elo.get(home)??1500,a=model.elo.get(away)??1500;return {homeProb:sigmoid(model.w[0]+model.w[1]*(h-a)/400),homeElo:h,awayElo:a,method:'Trained logistic regression · chronological 80/20 test split'}}