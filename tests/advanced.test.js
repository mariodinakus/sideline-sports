'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const standings=require('../api/standings')._test;
const teams=require('../api/teams')._test;
const markets=require('../api/markets')._test;
const score=require('../api/scores')._test;
const {LEAGUES}=require('../lib/leagues');
test('extended catalog has unique league IDs and covers Greek, Europe and US sport',()=>{
 assert.ok(LEAGUES.length>=20);assert.equal(new Set(LEAGUES.map(l=>l.id)).size,LEAGUES.length);
 for(const id of ['gre','ucl','epl','laliga','seriea','bundesliga','ligue1','nba','wnba','nfl','euro'])assert.ok(LEAGUES.some(x=>x.id===id));
});
test('ESPN team directories normalize real team metadata, not guessed IDs',()=>{
 const a=teams.normalize({sports:[{leagues:[{teams:[{team:{id:'359',displayName:'Arsenal',abbreviation:'ARS',logos:[{href:'https://example.org/arsenal.png'}]}}]}]}]},LEAGUES.find(x=>x.id==='epl'));
 assert.equal(a[0].id,'epl:359');assert.equal(a[0].name,'Arsenal');assert.equal(a[0].sport,'football');
});
test('standings supports nested ESPN groups and defensive missing stats',()=>{
 const payload={name:'Premier League',children:[{name:'Regular Season',standings:{entries:[{team:{id:'1',displayName:'Arsenal'},stats:[{name:'gamesPlayed',value:8},{name:'wins',value:6},{name:'points',value:19}]},{team:{id:'2',displayName:'Chelsea'},stats:[]}]}}]};
 const g=standings.extractGroups(payload);assert.equal(g.length,1);assert.equal(g[0].rows[0].points,19);assert.equal(g[0].rows[0].played,8);assert.equal(g[0].rows[1].played,null);
});
test('football fixtures use profile compatible sport and source metadata',()=>{
 const e=score.mappedEvent({id:2,date:'2026-10-16T16:00:00Z',status:{type:{state:'pre'}},competitions:[{competitors:[{homeAway:'home',team:{displayName:'Arsenal'}},{homeAway:'away',team:{displayName:'Liverpool'}}]}]},LEAGUES.find(x=>x.id==='epl'));
 assert.equal(e.sport,'football');assert.equal(e.home.name,'Arsenal');assert.equal(e.league,'epl');
});
test('Polymarket event maps valid original priced outcomes',()=>{
 const e=markets.polyEvent({id:'42',slug:'nba-finals',title:'NBA Finals winner?',volume24hr:1200,markets:[{outcomes:'["Celtics","Lakers"]',outcomePrices:'["0.61","0.39"]',active:true}]});
 assert.equal(e.outcomes[0].value,61);assert.equal(e.sport,'basketball');
});
test('Kalshi cents, decimal midquote and unknown price handled strictly',()=>{
 assert.equal(markets.kalshiProbability({yes_bid_dollars:'0.4200',yes_ask_dollars:'0.4400'}),43);
 assert.equal(markets.kalshiProbability({yes_bid_dollars:'0.0000',yes_ask_dollars:'0.0000'}),null);
 assert.equal(markets.kalshiProbability({last_price_dollars:'0.4800'}),48);
});
