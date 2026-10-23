import test from 'node:test';
import assert from 'node:assert/strict';
import {createMonoBasket,MODEL_EXPLAIN} from '../lib/mono-basket-ui.js';
import handler from '../api/mono-basket.js';

test('native Courtside forecast has the conditional nine-model roster',()=>{
 assert.equal(MODEL_EXPLAIN.length,9);
 assert.deepEqual(MODEL_EXPLAIN.map(x=>x[0]),['scoring','net','pyth','bayes','form','momentum','elo','conditions','ridge']);
});
test('Courtside global MONO BASKET banner remains source-honest before data loads',()=>{
 let body='';
 const mono=createMonoBasket({esc:s=>String(s),shell:(title,html)=>{body=html},render(){}});
 assert.match(mono.strip(),/MONO BASKET/);
 assert.match(mono.strip(),/Forecast Radar/i);
 assert.match(mono.homeHTML(),/COURTSIDE IQ × MONO BASKET/);
 mono.routes.monobasket();
 assert.match(body,/Game Radar/);
 assert.match(body,/Accuracy Tracker/);
 assert.match(body,/πραγματικ/i);
});
test('integrated serverless forecast endpoint rejects invalid dates offline',async()=>{
 const res={
  statusCode:200,headers:{},body:'',setHeader(k,v){this.headers[k]=v;return this},
  end(text){this.body=JSON.parse(text)}
 };
 await handler({method:'GET',url:'/api/mono-basket?date=invalid'},res);
 assert.equal(res.statusCode,400);
 assert.match(res.body.error,/valid date/i);
});
