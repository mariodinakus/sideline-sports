import test from 'node:test';import assert from 'node:assert/strict';
import {predictEnsemble,trainHistoricalOnline} from '../engine/ensemble-engine.js';
import {blendRating,leagueAverage} from '../engine/lab-math.js';
import {scoreLedger} from '../engine/forecast-engine.js';
test('forecast never invents validated extra sources',()=>{
 const h={abbr:'BOS',ppg:120,oppg:108,games:30,wins:22,losses:8},a={abbr:'NYK',ppg:112,oppg:114,games:30,wins:14,losses:16};
 const q=predictEnsemble(h,a,116,{}, {tip:'2026-12-04T23:00:00Z'},[]);
 assert.ok(q);assert.ok(q.activeModels>=3&&q.activeModels<9);
 assert.ok(q.homeWinProb>0&&q.homeWinProb<1);assert.ok(Number.isFinite(q.homePts)&&Number.isFinite(q.awayPts));
 assert.ok(!q.modelVotes.some(v=>v.id==='ridge'||v.id==='conditions'||v.id==='elo'));
});
test('prospective scoring excludes games without actual scores',()=>{
 const sample={id:'a',tip:'2026-10-22T22:00:00Z',forecast:{homePts:106,awayPts:101,margin:5,total:207,homeWinProb:.7,marginLow:-10,marginHigh:20}};
 assert.equal(scoreLedger([sample]).n,0);
 assert.equal(scoreLedger([{...sample,actual:{home:106,away:101}}]).n,1);
});
test('time-series trainer needs finished historical samples',()=>{
 const out=trainHistoricalOnline([{id:'X',date:'2026-10-22T20:00:00Z',homeCode:'BOS',awayCode:'NYK',homeScore:100,awayScore:90,final:false}]);
 assert.equal(out.backtest,0);assert.equal(out.validated,false);
});
