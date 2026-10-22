import test from 'node:test';
import assert from 'node:assert/strict';
import {predictEnsemble,elosFromSchedules,teamKey} from '../lib/ensemble-engine.js';

const home={abbr:'BOS',ppg:119,oppg:108,wins:14,losses:6,games:20};
const away={abbr:'NYK',ppg:116,oppg:113,wins:12,losses:8,games:20};
const dates=n=>Array.from({length:n},(_,i)=>({date:new Date(Date.UTC(2026,9,1+i)).toISOString(),final:true,for:110+i,against:105+i/2}));
test('multi-model excludes signals whose source data is not available',()=>{
 const out=predictEnsemble(home,away,114,{}, {tip:'2026-10-20T19:00:00Z'},[]);
 assert.ok(out);
 assert.ok(out.activeModels>=3 && out.activeModels<=5);
 assert.ok(!out.modelVotes.some(x=>['elo','form','conditions','ridge'].includes(x.id)));
 assert.ok(out.homeWinProb>0&&out.homeWinProb<1);
 assert.ok(Math.abs(out.modelVotes.reduce((s,x)=>s+x.weight,0)-1)<.01);
});
test('verified inputs enable form, Elo, availability and seasonal continuity votes',()=>{
 const athletes=Array.from({length:12},(_,i)=>({id:String(i)})),prior=Array.from({length:12},(_,i)=>({id:String(i+2)}));
 const context={tip:'2026-10-20T19:00:00Z',homeGames:dates(12),awayGames:dates(12).map(g=>({...g,for:g.against,against:g.for})),
  homeRoster:{athletes},awayRoster:{athletes},homePriorRoster:{athletes:prior},awayPriorRoster:{athletes:prior},
  homeInjuries:[{status:'Out',name:'Test player'}],awayInjuries:[],elo:{BOS:1580,NYK:1540}};
 const out=predictEnsemble(home,away,114,{status:'validated',marginValidated:true,marginWeights:[0,0,0,0,0],sigmaMargin:12},context,[]);
 const ids=new Set(out.modelVotes.map(x=>x.id));
 for(const key of ['form','momentum','elo','conditions','ridge'])assert.ok(ids.has(key),key);
 assert.equal(out.activeModels,9);
 assert.equal(out.conditions.sourceCoverage.previousRoster,true);
 assert.ok(out.modelVotes.every(x=>Number.isFinite(x.margin)&&Number.isFinite(x.homeWinProb)));
});
test('Elo uses final scores only and does not double-count event IDs',()=>{
 const games=[{id:'a',homeCode:'BOS',awayCode:'NY',homeScore:112,awayScore:101,final:true,date:'2026-10-01T01:00:00Z'},
 {id:'a',homeCode:'BOS',awayCode:'NY',homeScore:112,awayScore:101,final:true,date:'2026-10-01T01:00:00Z'},
 {id:'b',homeCode:'BOS',awayCode:'NY',homeScore:0,awayScore:0,final:false,date:'2026-10-02T01:00:00Z'}];
 const elo=elosFromSchedules(games);
 assert.equal(teamKey('NY'),'NYK');
 assert.ok(elo.BOS>1500&&elo.NYK<1500);
 assert.ok(Math.abs(elo.BOS+elo.NYK-3000)<1e-6);
});
