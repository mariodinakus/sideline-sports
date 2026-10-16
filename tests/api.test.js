const test=require('node:test');
const assert=require('node:assert/strict');
const {parseRss,groupArticles,similarity,classify}=require('../api/news')._test;
const {mappedEvent}=require('../api/scores')._test;
test('RSS parser sanitizes HTML and keeps source',()=>{
 const xml=`<rss><channel><item><title><![CDATA[Olympiacos &amp; Panathinaikos face off - Sports Wire]]></title><link>https://example.com/a</link><source>Sports Wire</source><pubDate>Fri, 16 Oct 2026 08:00:00 GMT</pubDate><description><![CDATA[<b>Big story</b> today]]></description></item></channel></rss>`;
 const [a]=parseRss(xml,{name:'test',sport:'football',locale:'en'});
 assert.equal(a.title,'Olympiacos & Panathinaikos face off');assert.equal(a.source,'Sports Wire');assert.equal(a.description,'Big story today');
});
test('near-duplicate titles cluster but unrelated stories do not',()=>{
 const entries=[
  {title:'Real Madrid confirms major injury ahead of Barcelona clash',sport:'football',source:'BBC',publishedAt:'2026-10-16T08:00:00Z',link:'https://bbc.com/a'},
  {title:'Real Madrid confirms major injury before Barcelona clash',sport:'football',source:'ESPN',publishedAt:'2026-10-16T09:00:00Z',link:'https://espn.com/b'},
  {title:'Lakers name starting lineup for tomorrow against Celtics',sport:'basketball',source:'ESPN',publishedAt:'2026-10-16T08:00:00Z',link:'https://espn.com/c'}];
 const groups=groupArticles(entries);assert.equal(groups.length,2);assert.equal(groups.find(x=>x.sport==='football').sourceCount,2);
});
test('uncertain words are not classified as confirmed',()=>{assert.equal(classify('Transfer rumour grows').label,'Αναφορά / σενάριο');assert.ok(similarity({title:'Team A defeat Team B'},{title:'Different tennis result'})<.39);});
test('ESPN events map defensively',()=>{const event={id:'123',date:'2026-10-16T18:00:00Z',status:{type:{state:'in',shortDetail:'65\''}},competitions:[{competitors:[{homeAway:'home',team:{shortDisplayName:'A'},score:'2'},{homeAway:'away',team:{shortDisplayName:'B'},score:'1'}]}]};const result=mappedEvent(event,{id:'epl',title:'Premier League',sport:'soccer'});assert.equal(result.home.score,'2');assert.equal(result.state,'in');});
test('EuroLeague public v2 games map and day in Greece',()=>{
 const {euroleagueEvent,athensDay}=require('../api/scores')._test;
 const result=euroleagueEvent({gameCode:22,utcDate:'2026-10-16T18:00:00Z',gameStatus:'result',played:true,local:{club:{name:'Olympiacos',abbreviatedName:'OLY'},score:88},road:{club:{name:'Panathinaikos',abbreviatedName:'PAN'},score:80}});
 assert.equal(result.home.name,'OLY');assert.equal(result.away.score,80);assert.equal(result.state,'post');assert.equal(athensDay('2026-10-15T22:30:00Z'),'20261016');
});
