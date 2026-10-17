import test from 'node:test';
import assert from 'node:assert/strict';
import {axisScore,radarChart,scatterChart,trendChart} from '../lib/visuals.js';

test('axis normalization clips and never imputes unavailable values',()=>{
 assert.equal(axisScore(null,0,10),null);
 assert.equal(axisScore(undefined,0,10),null);
 assert.equal(axisScore('',0,10),null);
 assert.equal(axisScore(5,0,10),50);
 assert.equal(axisScore(-4,0,10),0);
 assert.equal(axisScore(15,0,10),100);
 assert.equal(axisScore(3,1,1),null);
});
const axes=[{key:'off',label:'Offense',min:-3,max:9},{key:'def',label:'Defense',min:-3,max:6},{key:'war',label:'WAR',min:0,max:190}];
test('spider radar uses real observations, legend and accessible svg',()=>{
 const html=radarChart([{name:'A & B',values:{off:4,def:2,war:100}},{name:'Second',values:{off:1,def:1,war:20}}],axes);
 assert.match(html,/class="radar-svg"/);assert.match(html,/polygon/);assert.match(html,/A &amp; B/);assert.match(html,/Second/);
 assert.match(html,/WAR/);
});
test('no invented data for radar with insufficient comparable axes',()=>{
 const html=radarChart([{name:'A',values:{off:4,def:1,war:null}},{name:'B',values:{off:2,def:2,war:10}}],axes);
 assert.match(html,/at least 3 comparable, observed metrics/);
 assert.doesNotMatch(html,/radar-svg/);
});
test('career timeline only draws supplied actual season ratings',()=>{
 assert.match(trendChart([{name:'Reference',points:[{year:1998,rating:4},{year:1999,rating:5}]}]),/Career season number/);
 assert.match(trendChart([{name:'Reference',points:[]}]),/unavailable/);
});
test('modern season efficiency scatter requires sufficiently complete data',()=>{
 assert.match(scatterChart([{name:'A',ts:60,pts:23}]),/At least four players/);
 const p=Array.from({length:5},(_,i)=>({name:`Test ${i}`,ts:56+i,pts:13+i,reb:5}));
 assert.match(scatterChart(p),/TRUE SHOOTING/);
 assert.match(scatterChart(p),/Test 3/);
});