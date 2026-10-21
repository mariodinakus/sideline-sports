import test from 'node:test';
import assert from 'node:assert/strict';
import {ols,pearson,histogram,pythagorean,fitPythagoreanExponent,eloExpected,eloUpdate,log5,blendRating,predictMatchup,leagueAverage,normalCdf,fourFactorScore,eFG,trueShooting,possessions,corrMatrix} from '../lib/lab-math.js';

const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);

test('OLS recovers an exact line and reports r = 1',()=>{
 const f=ols([1,2,3,4,5].map(x=>({x,y:3+2*x})));
 close(f.slope,2);close(f.intercept,3);close(f.r,1);close(f.r2,1);assert.equal(f.n,5);
});
test('OLS ignores missing pairs and refuses degenerate data',()=>{
 assert.equal(ols([{x:1,y:1},{x:2,y:null},{x:3,y:3}]),null);
 assert.equal(ols([{x:1,y:1},{x:1,y:2},{x:1,y:3}]),null);
 close(pearson([1,2,3,4],[8,6,4,2]),-1);
});
test('correlation matrix is symmetric with a unit diagonal',()=>{
 const rows=[{a:1,b:2,c:9},{a:2,b:4,c:7},{a:3,b:5,c:8},{a:4,b:9,c:1}];
 const m=corrMatrix(rows,['a','b','c']);
 for(let i=0;i<3;i++){close(m[i][i],1);for(let j=0;j<3;j++)close(m[i][j],m[j][i])}
});
test('histogram counts every value exactly once',()=>{
 const h=histogram([1,2,2,3,9,10],3);assert.equal(h.reduce((s,b)=>s+b.count,0),6);assert.equal(histogram([1]),null);
});
test('Pythagorean expectation is symmetric and fits its own generator',()=>{
 close(pythagorean(100,100),0.5);close(pythagorean(110,100)+pythagorean(100,110),1);
 const teams=Array.from({length:30},(_,i)=>{const pf=105+i*.6,pa=118-i*.4;return {ppg:pf,oppg:pa,winPct:pythagorean(pf,pa,11.5)}});
 const fit=fitPythagoreanExponent(teams);assert.ok(Math.abs(fit.exponent-11.5)<0.1);assert.ok(fit.mae<0.005);
 assert.equal(fitPythagoreanExponent(teams.slice(0,3)),null);
});
test('shooting formulas match hand calculation',()=>{
 close(eFG(41,88,14),(41+7)/88);close(trueShooting(110,88,22),110/(2*(88+9.68)));close(possessions(88,10,13,22),88-10+13+9.68);
 close(fourFactorScore({efg:.5,tov:.1,orb:.25,ftr:.2}),.4*.5-.25*.1+.2*.25+.15*.2);
});
test('Elo and Log5 behave like probabilities',()=>{
 close(eloExpected(1500,1500),0.5);assert.ok(eloExpected(1700,1500)>0.7);
 const u=eloUpdate(1500,1500,1,10);assert.ok(u.a>1500&&u.b<1500);close(u.a-1500,1500-u.b);
 close(log5(.5,.5),.5);assert.ok(log5(.7,.5)>.5);assert.equal(log5(1,1),null);
});
test('rating blend shifts weight toward the current season as games accumulate',()=>{
 const prev={ppg:110,oppg:110},w0=blendRating({games:0,ppg:null,oppg:null},prev),w20=blendRating({games:20,ppg:120,oppg:100},prev),w80=blendRating({games:80,ppg:120,oppg:100},prev);
 assert.equal(w0.ppg,110);close(w20.weightCurrent,.5);close(w20.ppg,115);assert.ok(w80.ppg>w20.ppg);assert.ok(w80.weightCurrent>.79);
});
test('matchup prediction is internally consistent',()=>{
 const t={ppg:114,oppg:114},lg=114,p=predictMatchup(t,t,lg);
 close(p.margin,3);close(p.total,228);assert.ok(p.homeWinProb>.5&&p.homeWinProb<.7);
 const strong=predictMatchup({ppg:122,oppg:106},{ppg:108,oppg:120},lg);assert.ok(strong.homeWinProb>.9);assert.ok(strong.marginLow<strong.margin&&strong.margin<strong.marginHigh);
 assert.equal(predictMatchup({ppg:null,oppg:1},t,lg),null);
 close(leagueAverage([{ppg:100},{ppg:120},{ppg:null}]),110);close(normalCdf(0),.5,1e-6);
});
