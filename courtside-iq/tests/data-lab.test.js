import test from 'node:test';
import assert from 'node:assert/strict';
import {describe,pythagorean,toCSV,sortRows,flattenStandings} from '../lib/data-lab.js';
import {NAV_GROUPS,groupFor} from '../lib/navigation.js';

test('describe computes sample statistics and ignores missing values',()=>{
 const d=describe([2,4,4,4,5,5,7,9,null,'']);
 assert.equal(d.n,8);assert.equal(d.mean,5);assert.equal(d.median,4.5);
 assert.ok(Math.abs(d.sd-2.138)<0.001);assert.equal(d.min,2);assert.equal(d.max,9);
 assert.deepEqual(describe([]),{n:0,mean:null,median:null,sd:null,min:null,max:null});
});

test('pythagorean expectation is .500 for equal scoring and rejects bad input',()=>{
 assert.equal(pythagorean(110,110),0.5);
 assert.ok(pythagorean(120,110)>0.5);assert.ok(pythagorean(110,120)<0.5);
 assert.equal(pythagorean(null,110),null);assert.equal(pythagorean(0,110),null);
});

test('CSV export quotes commas, quotes and newlines',()=>{
 const csv=toCSV([{a:'x,y',b:'say "hi"',c:null}],[{key:'a',label:'A'},{key:'b',label:'B'},{key:'c',label:'C'}]);
 assert.equal(csv,'A,B,C\r\n"x,y","say ""hi""",');
});

test('sorting puts missing values last in both directions',()=>{
 const rows=[{v:2},{v:null},{v:9},{v:5}];
 assert.deepEqual(sortRows(rows,'v',1).map(r=>r.v),[2,5,9,null]);
 assert.deepEqual(sortRows(rows,'v',-1).map(r=>r.v),[9,5,2,null]);
});

test('sorting orders text columns alphabetically',()=>{
 const rows=[{t:'Utah'},{t:'Boston'},{t:null},{t:'Denver'}];
 assert.deepEqual(sortRows(rows,'t',1).map(r=>r.t),['Boston','Denver','Utah',null]);
 assert.deepEqual(sortRows(rows,'t',-1).map(r=>r.t),['Utah','Denver','Boston',null]);
});

test('standings flattening never invents missing values',()=>{
 const rows=flattenStandings([{name:'East',rows:[{name:'A',abbr:'A',wins:0,losses:1,ppg:100,oppg:106},{name:'B',wins:null,losses:null,ppg:null,oppg:null}]}]);
 assert.equal(rows[0].games,1);assert.equal(rows[0].winPct,0);assert.ok(rows[0].pythWinPct<0.5);assert.ok(rows[0].luck<0);
 assert.equal(rows[1].games,null);assert.equal(rows[1].winPct,null);assert.equal(rows[1].pythWinPct,null);assert.equal(rows[1].luck,null);
});

test('Data Lab workspace is registered with both pages',()=>{
 assert.equal(groupFor('labexplorer')?.id,'lab');assert.equal(groupFor('labnotebook')?.id,'lab');
 assert.ok(NAV_GROUPS.some(g=>g.id==='lab'));
});
