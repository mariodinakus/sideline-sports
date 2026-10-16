'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const b=require('../lib/basketball');const standings=require('../api/standings')._test;const match=require('../api/match')._test;
test('EuroLeague season rolls in August; EuroCup uses U prefix',()=>{assert.equal(b.euroSeason('euro',new Date('2026-10-16')),'E2026');assert.equal(b.euroSeason('eurocup',new Date('2026-06-16')),'U2025')});
test('Euro standings preserve scored and conceded points, rank, wins, losses and pct',()=>{
 const data={data:[{position:1,clubCode:'PAN',clubName:'Panathinaikos',gamesPlayed:4,gamesWon:3,gamesLost:1,pointsFor:363,pointsAgainst:322,pointsDifference:'+41',winPercentage:'75.0%',homeRecord:'2-0'},{position:2,clubCode:'OLY',clubName:'Olympiacos',gamesPlayed:4,gamesWon:2,gamesLost:2,pointsFor:330,pointsAgainst:328}]};const rows=b.normalizedEuroStandings(data)[0].rows;
 assert.equal(rows.length,2);assert.equal(rows[0].for,363);assert.equal(rows[0].against,322);assert.equal(rows[0].pct,75);assert.equal(rows[1].losses,2);
});
test('EuroLeague advanced player and team statistics handle percent strings and missing figures',()=>{
 const team=b.euroMetricRow({teamCode:'OLY',teamName:'Olympiacos',points:90.4,totalRebounds:37.2,assists:19.5,effectiveFieldGoalPercentage:'55.2%',trueShootingPercentage:'58.1%',assistsToTurnoversRatio:1.53});assert.equal(team.ppg,90.4);assert.equal(team.reb,37.2);assert.equal(team.efg,55.2);assert.equal(team.astTo,1.53);
 const p=b.euroPlayerRow({playerName:'Example',playerTeamCode:'OLY',points:21.2,assists:4.8,totalRebounds:6.1});assert.equal(p.pts,21.2);assert.equal(p.ast,4.8);assert.equal(p.reb,6.1);
});
test('ESPN match summary keeps full player box and scores by quarter',()=>{
 const example={header:{competitions:[{competitors:[{team:{id:'1',displayName:'Boston'},homeAway:'home',linescores:[{period:1,value:27},{period:2,value:35}]},{team:{id:'2',displayName:'Miami'},homeAway:'away',linescores:[{period:1,value:23},{period:2,value:21}]}]}]},boxscore:{players:[{team:{displayName:'Boston'},statistics:[{name:'statistics',labels:['MIN','PTS','REB','AST'],athletes:Array.from({length:12},(_,i)=>({athlete:{displayName:'Player'+i},stats:['25',String(i),'4','3']}))}]}]}};
 const o=match.normalize(example);assert.equal(o.quarters[0].periods[1].score,35);assert.equal(o.box[0].categories[0].athletes.length,12);assert.equal(o.available,true);
});
test('Euro game box maps player totals without synthesizing data',()=>{
 const o=b.euroBoxScore({local:{club:{name:'Olympiacos'},players:[{name:'A',points:19,totalRebounds:8,assists:5,pir:24}],total:{points:84,totalRebounds:29,assists:20}},road:{club:{name:'Zalgiris'},players:[],total:{points:73}}});assert.equal(o.teams.length,2);assert.equal(o.stats[0].items[0].value,84);assert.equal(o.box[0].categories[0].athletes[0].stats[1],'19');assert.equal(o.available,true);
});
test('ESPN standings can expose average points for basketball',()=>{const r=standings.normalizeEntry({team:{id:'1',displayName:'Lakers'},stats:[{name:'wins',value:4},{name:'losses',value:2},{name:'avgPointsFor',value:118.3},{name:'avgPointsAgainst',value:111.2}]},0);assert.equal(r.ppg,118.3);assert.equal(r.oppg,111.2)});

test('NBA game eFG% TS% and AST/TO are calculated only from supplied counts',()=>{const m=require('../lib/metrics').fromTeamStats;const r=m([{name:'FG',displayValue:'40-80'},{name:'3PT',displayValue:'12-30'},{name:'FT',displayValue:'18-22'},{name:'PTS',value:110},{name:'AST',value:24},{name:'TO',value:12}]);assert.equal(r.efg,57.5);assert.equal(r.astTo,2);assert.equal(r.ts,61.3);assert.equal(m([{name:'FG',displayValue:'40-80'}]).ts,null);});
