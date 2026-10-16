'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {clean}=require('../lib/shared');
const {resultStandings}=require('../api/standings')._test;
test('RSS double-encoded HTML never reaches article title',()=>{
 const raw='&lt;a href="https://example.com"&gt;Ολυμπιακός - Παναθηναϊκός&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="red"&gt;ESPN&lt;/font&gt;';
 assert.equal(clean(raw),'Ολυμπιακός - Παναθηναϊκός ESPN');
 assert.ok(!clean(raw).includes('&lt;'));
});
test('Euro fallback uses only finished games and correct points totals',()=>{
 const games={data:[
  {played:true,gameStatus:'Result',local:{club:{code:'OLY',name:'Olympiacos'},score:91},road:{club:{code:'PAN',name:'Panathinaikos'},score:85}},
  {played:true,gameStatus:'Result',local:{club:{code:'PAN',name:'Panathinaikos'},score:77},road:{club:{code:'FEN',name:'Fenerbahce'},score:71}},
  {played:false,gameStatus:'Scheduled',local:{club:{code:'OLY',name:'Olympiacos'},score:0},road:{club:{code:'FEN',name:'Fenerbahce'},score:0}},
 ]};
 const r=resultStandings(games,{id:'euro',title:'EuroLeague'},'E2026');
 assert.equal(r.status,'derived-results');
 assert.equal(r.groups[0].rows.length,3);
 const o=r.groups[0].rows.find(x=>x.id==='OLY'),p=r.groups[0].rows.find(x=>x.id==='PAN');
 assert.deepEqual([o.wins,o.losses,o.played,o.for,o.against],[1,0,1,91,85]);
 assert.deepEqual([p.wins,p.losses,p.played,p.for,p.against],[1,1,2,162,162]);
 assert.match(r.source,/not official/);
});
test('no completed matches produces no fake standings',()=>{
 const res=resultStandings({data:[{played:false,local:{club:{code:'X'},score:0},road:{club:{code:'Y'},score:0}}]},{id:'euro',title:'EuroLeague'},'E2026');
 assert.equal(res.groups.length,0);
 assert.equal(res.status,'unavailable');
});
