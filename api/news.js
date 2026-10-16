'use strict';
const {send,json,xml,cached,clean,tag,firstHttpLink,hash,normalize}=require('../lib/shared');
const google=(query,lang='el')=>`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}&gl=${lang==='el'?'GR':'US'}&ceid=${lang==='el'?'GR:el':'US:en'}`;
const FEEDS = [
 {name:'Ελληνικό ποδόσφαιρο',kind:'rss',sport:'football',locale:'el',url:google('(Super League OR Ολυμπιακός OR Παναθηναϊκός OR ΠΑΟΚ OR ΑΕΚ OR Άρης) when:2d')},
 {name:'Ελληνικό μπάσκετ',kind:'rss',sport:'basketball',locale:'el',url:google('(Euroleague OR Ευρωλίγκα OR μπάσκετ OR NBA) when:2d')},
 {name:'Formula 1',kind:'rss',sport:'motorsport',locale:'el',url:google('(Formula 1 OR F1 OR Φόρμουλα 1) when:3d')},
 {name:'Τένις',kind:'rss',sport:'tennis',locale:'el',url:google('(τένις OR ATP OR WTA) when:3d')},
 {name:'Gazzetta',kind:'rss',sport:'football',locale:'el',url:'https://www.gazzetta.gr/rssfeeds/allnewsfeed'},
 {name:'SPORT24',kind:'rss',sport:'football',locale:'el',url:'https://www.sport24.gr/rss.ashx'},
 {name:'BBC Football',kind:'rss',sport:'football',locale:'en',url:'https://feeds.bbci.co.uk/sport/football/rss.xml'},
 {name:'BBC Sport',kind:'rss',sport:'other',locale:'en',url:'https://feeds.bbci.co.uk/sport/rss.xml'},
 {name:'ESPN NBA',kind:'espn',sport:'basketball',locale:'en',url:'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=35'},
 {name:'ESPN Football',kind:'espn',sport:'football',locale:'en',url:'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=35'},
];
function detectSport(text,hint){const s=normalize(text);if(/tennis|τενις|wimbledon|atp|wta|sinner|alcaraz/.test(s))return 'tennis';if(/formula 1|formula one|f1|verstappen|norris|leclerc|ferrari|mercedes f1|φορμουλα/.test(s))return 'motorsport';if(/basketball|μπασκετ|euroleague|ευρωλιγκα|nba|wnba|νβα/.test(s))return 'basketball';if(/football|ποδοσφαιρο|soccer|premier league|champions league|super league|οσφπ|παναθηναικος|παοκ|αεκ|ολυμπιακος/.test(s))return 'football';return hint;}
function parseRss(raw, f){
 const matches=[...raw.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,26);
 return matches.map(m=>{
   const item=m[1];let title=tag(item,'title');const sourceTag=item.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i);
   const source=sourceTag?clean(sourceTag[1]):f.name;
   if(title.endsWith(` - ${source}`))title=title.slice(0,-(` - ${source}`).length).trim();
   const link=firstHttpLink(tag(item,'link')||item.match(/<link>([^<]+)/i)?.[1]);
   let description=tag(item,'description');
   if(description===title)description='';
   const pub=new Date(tag(item,'pubDate')||tag(item,'published')).getTime();
   const enclosure=item.match(/<media:content\b[^>]*url="([^"]+)"/i)||item.match(/<enclosure\b[^>]*url="([^"]+)"/i);
   const image=enclosure?firstHttpLink(enclosure[1]):'';
   return {title,description:description.slice(0,460),source,sourceType:f.name,link,image,publishedAt:Number.isFinite(pub)?new Date(pub).toISOString():null,lang:f.locale,sport:detectSport(title+' '+description,f.sport)};
 }).filter(a=>a.title.length>10&&a.link);
}
function parseEspn(data,f){return (Array.isArray(data.articles)?data.articles:[]).slice(0,28).map(a=>({
 title:clean(a.headline),description:clean(a.description||a.story||'').slice(0,460),source:'ESPN',sourceType:f.name,
 link:firstHttpLink(a.links?.web?.href||a.links?.api?.news?.href),image:firstHttpLink(a.images?.[0]?.url),
 publishedAt:Number.isFinite(Date.parse(a.published))?new Date(a.published).toISOString():null,
 lang:f.locale,sport:detectSport(a.headline||'',f.sport)})).filter(a=>a.title.length>10&&a.link);}
const STOP=new Set(['the','and','for','with','after','from','against','that','this','have','into','over','will','their','who','what','when','been','are','new','has','was','των','του','της','την','στην','στον','στις','απο','και','για','στο','στη','στης','τον','του','των','τους','μια','ενας','μιας','οτι','μετα','πριν','εχει','ειναι','αυτο','στη','την','στις','δεν','αλλα','στον','εναν','εναντιον']);
function words(title){return new Set(normalize(title).split(' ').filter(x=>x.length>=4&&!STOP.has(x)));}
function similarity(a,b){const aW=words(a.title),bW=words(b.title);if(!aW.size||!bW.size)return 0;let intersect=0;for(const t of aW)if(bW.has(t))intersect++;return intersect/Math.max(1,aW.size+bW.size-intersect);}
const KEYWORDS = [
 {test:/φημ|rumou?r|reportedly|unconfirmed|φέρεται|σεναρι|could|ενδέχεται|ίσως/i,label:'Αναφορά / σενάριο',score:2},
 {test:/τραυματισ|injur|αποθεραπ|surgery|χειρουργ|out for|ρήξη/i,label:'Τραυματισμός',score:4},
 {test:/οριστικ|official|ανακοιν|υπεγραψ|confirmed|ανανεωσ|συμβολαιο|contract/i,label:'Ανακοινώσεις / δηλώσεις',score:4},
 {test:/μεταγραφ|transfer|deal|προτασ|bid|υπογραφ|signing/i,label:'Μεταγραφές',score:3},
 {test:/παραιτησ|απολυ|sack|dismiss|resign|προπονητ|coach|manager/i,label:'Πάγκος',score:3},
 {test:/νικη|ηττα|ρεκορ|record|τελικο|final|προκρι|knockout|title|τίτλ/i,label:'Αποτελέσματα',score:3},
];
function classify(text){for(const e of KEYWORDS)if(e.test.test(text))return {label:e.label,importance:e.score};return {label:'Εξέλιξη',importance:2};}
function groupArticles(articles){
 const groups=[];
 // Deterministic near-title clustering; never claim that two items are definitively the same event.
 for(const a of articles){
  let winner=null,best=0;
  for(const g of groups.slice(0,130)) {if(g.sport!==a.sport)continue;
    const sim=Math.max(...g.articles.slice(0,5).map(x=>similarity(x,a)));
    if(sim>=0.39&&sim>best){best=sim;winner=g;}}
  if(winner)winner.articles.push(a);
  else groups.push({sport:a.sport,articles:[a]});
 }
 return groups.map(g=>{
   g.articles.sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0));
   const a=g.articles[0];const sources=[...new Set(g.articles.map(x=>x.source))];
   const type=classify(g.articles.map(x=>x.title).join(' '));
   const ageHours=Math.max(0,(Date.now()-Date.parse(a.publishedAt||0))/3600000);
   const attention=sources.length;
   return {id:'st-'+hash(normalize(a.title).slice(0,90)),title:a.title,description:a.description,sport:g.sport,image:g.articles.find(x=>x.image)?.image||'',publishedAt:a.publishedAt,lang:a.lang,
   kind:type.label,importance:type.importance,sourceCount:sources.length,articleCount:g.articles.length,
   sourceNames:sources,lowCoverage:sources.length===1&&type.importance>=3&&ageHours<=48,
   coverageNote:'Η κάλυψη υπολογίζεται μόνο από τις πηγές που ανακτήθηκαν, όχι από το σύνολο του Τύπου.',
   articles:g.articles.slice(0,12).map(x=>({title:x.title,description:x.description,source:x.source,link:x.link,publishedAt:x.publishedAt,lang:x.lang})),
   primaryLink:a.link};
 }).sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0));
}
function targetedFeeds(topics){return topics.slice(0,4).map((topic,i)=>({name:'My Feed '+(i+1),kind:'rss',sport:'other',locale:'el',url:google('\"'+topic.replace(/[\"']/g,'')+'\" sports OR ποδόσφαιρο OR μπάσκετ when:3d')}));}
async function load(topics=[]){
 const feeds=[...FEEDS,...targetedFeeds(topics)];
 const runs=await Promise.allSettled(feeds.map(async f=>({name:f.name,items:f.kind==='rss'?parseRss(await xml(f.url),f):parseEspn(await json(f.url),f)})));
 const live=runs.filter(x=>x.status==='fulfilled');let articles=live.flatMap(x=>x.value.items);
 const dedup=new Set();articles=articles.filter(a=>{const key=normalize(a.title).slice(0,150);if(dedup.has(key))return false;dedup.add(key);return true;});
 articles.sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0));
 const stories=groupArticles(articles.slice(0,185));
 return {stories,meta:{asOf:new Date().toISOString(),fetchedArticles:articles.length,stories:stories.length,
 sourcesOnline:live.length,sourcesConfigured:feeds.length,onlineNames:live.map(x=>x.value.name),
 feedErrors:runs.flatMap((x,i)=>x.status==='rejected'?[feeds[i].name]:[]),
 methodology:'RSS από Google News και BBC, με άρθρα από ESPN. Ομαδοποίηση τίτλων βάσει ομοιότητας λέξεων (ευρετικός κανόνας). Οι ετικέτες/ενδείξεις δεν αποτελούν δημοσιογραφική επαλήθευση.',
 sourceWarning:'Οι Google News σύνδεσμοι ενδέχεται να οδηγούν πρώτα σε ανακατεύθυνση του Google News. Η χρήση feeds υπόκειται στους όρους των εκδοτών.'}};
}
module.exports=async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 try{const raw=String(req.query?.topics||new URL(req.url||'/', 'https://sideline.local').searchParams.get('topics')||'');const topics=raw.split('|').map(x=>x.trim().slice(0,60)).filter(x=>/^[\p{L}\p{N} .'-]{2,60}$/u.test(x)).slice(0,4);const result=await cached('news-v4-'+topics.join('|'),180000,()=>load(topics));send(res,200,result);}catch(e){send(res,503,{stories:[],meta:{asOf:new Date().toISOString(),sourcesOnline:0,sourcesConfigured:FEEDS.length,feedErrors:FEEDS.map(x=>x.name),error:'Οι πηγές ειδήσεων δεν είναι προσωρινά διαθέσιμες.'}});}
};
module.exports._test={parseRss,parseEspn,groupArticles,similarity,detectSport,classify};
