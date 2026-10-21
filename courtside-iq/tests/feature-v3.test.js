import test from 'node:test';
import assert from 'node:assert/strict';
import {sigmoid,clamp,samplesFromGames,fitLogistic,predictGame} from '../lib/match-ml.js';
import {logisticWinProbability,normalCdf,mulberry32,simulateMatch} from '../lib/models.js';

test('sigmoid is symmetric, bounded and numerically safe',()=>{
 assert.equal(sigmoid(0),0.5);
 assert.ok(Math.abs(sigmoid(2)+sigmoid(-2)-1)<1e-12);
 assert.ok(sigmoid(1e9)<=1&&sigmoid(-1e9)>=0);
});

test('clamp limits values to the interval',()=>{
 assert.equal(clamp(5,0,3),3);assert.equal(clamp(-1,0,3),0);assert.equal(clamp(2,0,3),2);
});

test('win probability is monotonic in expected margin and never certain',()=>{
 const lo=logisticWinProbability(-10),mid=logisticWinProbability(0),hi=logisticWinProbability(10);
 assert.ok(lo<mid&&mid<hi);assert.ok(Math.abs(mid-0.5)<1e-6);
 assert.ok(logisticWinProbability(500)<1&&logisticWinProbability(-500)>0);
 assert.ok(Math.abs(normalCdf(0)-0.5)<1e-6);
});

test('seeded simulation is reproducible',()=>{
 const a=simulateMatch({meanMargin:4,draws:500,seed:7}),b=simulateMatch({meanMargin:4,draws:500,seed:7});
 assert.deepEqual(a,b);
 const r1=mulberry32(1),r2=mulberry32(1);assert.equal(r1(),r2());
});

test('logistic match model refuses to train on too few games',()=>{
 const model=fitLogistic([],{minGames:65});
 assert.ok(!model?.trained);
 assert.equal(predictGame(model,'A','B'),null);
 assert.ok(Array.isArray(samplesFromGames([]))||samplesFromGames([])!==undefined);
});
