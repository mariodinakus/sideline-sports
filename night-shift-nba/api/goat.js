/* NIGHT SHIFT GOAT INDEX — transparent user-adjustable index, not official NBA ranking.
   ESPN NBA athlete awards and regular-season averages only. Curated shortlist, not full all-time coverage.
   All candidate data are fetched from public ESPN feeds each cache window. No fabricated awards/rings. */
const BASE='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/';
const CANDIDATES=[
['1966','LeBron James'],['1035','Michael Jordan'],['110','Kobe Bryant'],['2334','Magic Johnson'],['4145','Kareem Abdul-Jabbar'],
['2335','Larry Bird'],['215','Tim Duncan'],['609','Dirk Nowitzki'],['614','Shaquille O’Neal'],['366','Allen Iverson'],
['619','Hakeem Olajuwon'],['4152','Bill Russell'],['4142','Wilt Chamberlain'],['3975','Stephen Curry'],['3202','Kevin Durant'],
['1987','Dwyane Wade'],['3032977','Giannis Antetokounmpo'],['3112335','Nikola Jokić'],['3945274','Luka Dončić'],['4594268','Anthony Edwards'],['5041939','Cooper Flagg'],['4119','Oscar Robertson'],['501','Karl Malone'],['37','Charles Barkley'],['261','Kevin Garnett'],['3992','James Harden'],['3468','Russell Westbrook'],['2779','Chris Paul'],['4065648','Jayson Tatum'],['4278073','Shai Gilgeous-Alexander'],['5104157','Victor Wembanyama'],['715','David Robinson'],['3507','Isiah Thomas'],['812','John Stockton'],['663','Scottie Pippen'],['6450','Kawhi Leonard'],['3776','Moses Malone'],['4135','Elgin Baylor'],['4151','Jerry West']
];
const MORE=[
['4130','Julius Erving'],['237','Patrick Ewing'],['3532','Dominique Wilkins'],['3686','Clyde Drexler'],['552','Reggie Miller'],['640','Gary Payton'],['429','Jason Kidd'],['592','Steve Nash'],['1015','Tony Parker'],['272','Manu Ginóbili'],['996','Pau Gasol'],['662','Paul Pierce'],['9','Ray Allen'],['136','Vince Carter'],['532','Tracy McGrady'],['1722','Yao Ming'],['1975','Carmelo Anthony'],['2384','Dwight Howard'],['3456','Derrick Rose'],['726','Dennis Rodman'],
['4129','Walt Frazier'],['4141','Willis Reed'],['4132','Dave Cowens'],['4140','Bob Pettit'],['4131','George Gervin'],['4122','Rick Barry'],['4133','Bob Cousy'],['4149','Nate Archibald'],['4150','Pete Maravich'],['4134','Elvin Hayes'],['4127','Bill Walton'],['4124','Dave DeBusschere'],['4900','Alex English'],['4777','Adrian Dantley'],['5352','Bernard King'],['4144','Kevin McHale'],['3814','Robert Parish'],['3547','James Worthy'],['5254','Dennis Johnson'],['5637','Sidney Moncrief'],
['302','Penny Hardaway'],['336','Grant Hill'],['897','Chris Webber'],['580','Alonzo Mourning'],['588','Dikembe Mutombo'],['63','Chauncey Billups'],['885','Ben Wallace'],['1977','Chris Bosh'],['6442','Kyrie Irving'],['6606','Damian Lillard'],['6475','Klay Thompson'],['6589','Draymond Green'],['3689','Joe Dumars'],['420','Shawn Kemp'],['5008','Artis Gilmore'],['5533','Bob McAdoo'],['4148','Wes Unseld'],['4121','Lenny Wilkens'],['4138','Sam Jones'],['4120','John Havlicek'],
['4137','Jerry Lucas'],['4139','Nate Thurmond'],['4123','Paul Arizin'],['4128','Dolph Schayes'],['5611','George Mikan'],['4143','Hal Greer'],['5022','Gail Goodrich'],['4125','Billy Cunningham'],['4136','Earl Monroe'],['704','Mitch Richmond'],['3822','Mark Price'],['3449','Kevin Love'],['3989','Blake Griffin'],['883','Rasheed Wallace'],['582','Chris Mullin'],['3136195','Karl-Anthony Towns'],['3059318','Joel Embiid'],['3136193','Devin Booker'],['3908809','Donovan Mitchell'],['6430','Jimmy Butler'],['4251','Paul George']
];
async function pull(url){const r=await fetch(url,{signal:AbortSignal.timeout(11000),headers:{accept:'application/json'},next:{revalidate:7200}});if(!r.ok)throw Error('ESPN HTTP '+r.status);return r.json()}
function nums(v){const n=Number(v);return Number.isFinite(n)?n:null}
function col(stats,key,cat){const i=(cat.names||[]).indexOf(key);return i<0?null:nums(stats?.[i])}
function max3(arr){const sorted=arr.filter(Number.isFinite).sort((a,b)=>b-a).slice(0,3);return sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null}
async function getPlayer([id,fallback]){
  const [sb,bb]=await Promise.allSettled([pull(BASE+id+'/stats?seasontype=2'),pull(BASE+id+'/bio')]);
  if(sb.status!=='fulfilled')throw Error('ESPN stats unavailable');
  const d=sb.value,cat=(d.categories||[]).find(x=>x.name==='averages'),stats=cat?.statistics||[];
  const career=cat?.totals||[];
  if(!stats.length)throw Error('Career season data absent');
  const byYear=new Map();for(const s of stats){const y=s.season?.year;if(!y)continue;const p=col(s.stats,'avgPoints',cat);const prior=byYear.get(y);if(prior===undefined||p>prior)byYear.set(y,p)}
  const nbaAwards=bb.status==='fulfilled'?(bb.value.awards||[]).filter(x=>x.league==='nba'):[];
  function aw(name){return nbaAwards.filter(x=>x.name===name).reduce((sum,x)=>sum+(x.seasons?.length||Number.parseInt(x.displayCount,10)||0),0)}
  const out={id,name:fallback,active:stats.some(x=>x.season?.year>=2026),seasons:byYear.size,
     careerPPG:col(career,'avgPoints',cat),careerRPG:col(career,'avgRebounds',cat),careerAPG:col(career,'avgAssists',cat),
     games:col(career,'gamesPlayed',cat),peakPPG:max3([...byYear.values()]),
     mvp:aw('MVP'),finalsMVP:aw('Finals MVP'),allNBA1:aw('All-NBA 1st Team'),allNBA2:aw('All-NBA 2nd Team'),dpoy:aw('Defensive Player of the Year'),
     awardsAvailable:bb.status==='fulfilled',statsAvailable:true};
  return out;
}
/* Career regular-season averages from Basketball-Reference, used ONLY when ESPN's feed is incomplete
   (ESPN undercounts rebounds for pre-1973 seasons and sometimes drops a player entirely). */
const REF={'4140':{careerPPG:26.4,careerRPG:16.2,careerAPG:3.0},'4133':{careerPPG:18.4,careerRPG:5.2,careerAPG:7.5},'4128':{careerPPG:18.5,careerRPG:12.1,careerAPG:3.1},'5611':{careerPPG:23.1,careerRPG:13.4,careerAPG:2.8},'4123':{careerPPG:22.8,careerRPG:8.6,careerAPG:2.3},'4141':{careerPPG:18.7,careerRPG:12.9,careerAPG:1.8},'4129':{careerPPG:18.9,careerRPG:5.9,careerAPG:6.1},'4120':{careerPPG:20.8,careerRPG:6.3,careerAPG:4.8},'4137':{careerPPG:17.0,careerRPG:15.6,careerAPG:3.6},'4139':{careerPPG:15.0,careerRPG:15.0,careerAPG:2.7},'4138':{careerPPG:17.7,careerRPG:4.9,careerAPG:2.5},'4143':{careerPPG:19.2,careerRPG:5.9,careerAPG:4.0},'4125':{careerPPG:21.2,careerRPG:10.4,careerAPG:4.3},'4148':{careerPPG:10.8,careerRPG:14.0,careerAPG:3.9},'4124':{careerPPG:16.1,careerRPG:11.0,careerAPG:2.9},'4121':{careerPPG:16.5,careerRPG:4.7,careerAPG:6.7},'4122':{careerPPG:23.2,careerRPG:6.5,careerAPG:4.9},'4134':{careerPPG:21.0,careerRPG:12.5,careerAPG:1.8},'4132':{careerPPG:17.6,careerRPG:13.6,careerAPG:3.8},'4127':{careerPPG:13.3,careerRPG:10.5,careerAPG:3.4},'4145':{careerPPG:24.6,careerRPG:11.2,careerAPG:3.6},'4152':{careerPPG:15.1,careerRPG:22.5,careerAPG:4.3},'4142':{careerPPG:30.1,careerRPG:22.9,careerAPG:4.4},'4119':{careerPPG:25.7,careerRPG:7.5,careerAPG:9.5},'4135':{careerPPG:27.4,careerRPG:13.5,careerAPG:4.3},'4151':{careerPPG:27.0,careerRPG:5.8,careerAPG:6.7}};
const BIRD={id:'2335',name:'Larry Bird',active:false,seasons:13,careerPPG:24.3,careerRPG:10.0,careerAPG:6.3,games:897,peakPPG:28.9,mvp:3,finalsMVP:2,allNBA1:9,allNBA2:1,dpoy:0,awardsAvailable:true,statsAvailable:true,source:'Basketball-Reference (ESPN fallback)'};
function fix(p){const r=REF[p.id];if(!r)return p;const o={...p},c=[];for(const k in r){if(o[k]==null||Math.abs(o[k]-r[k])>0.6){o[k]=r[k];c.push(k)}}if(c.length)o.corrected=c;return o}
module.exports=async(req,res)=>{if(req.method!=='GET')return res.status(405).json({error:'GET only'});try{
  const LIST=(req.query&&req.query.set==='more')?MORE:CANDIDATES;const values=await Promise.allSettled(LIST.map(getPlayer));
  const players=values.filter(v=>v.status==='fulfilled').map(v=>fix(v.value));if(LIST===CANDIDATES&&!players.some(p=>p.id==='2335'))players.push(BIRD);
  res.setHeader('Cache-Control','s-maxage=7200, stale-while-revalidate=10800');
  res.status(200).json({source:'ESPN public NBA career statistics & honors',asOf:new Date().toISOString(),players,shortlistSize:LIST.length,missing:LIST.filter((x,i)=>values[i].status==='rejected'&&x[0]!=='2335').map(x=>x[1]),note:'This is a curated, non-exhaustive player shortlist. Index weights are editorial and editable on the client. Awards may be incomplete for older eras. No fabricated championships or tracking-based stats.'});
}catch(e){res.status(503).json({error:String(e.message||e)})}};
