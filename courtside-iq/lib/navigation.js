/**
 * COURTSIDE IQ information architecture.
 * One canonical, human-centered grouping for every view. The route identifiers
 * are intentionally preserved so existing deep links and page state keep working.
 */
export const NAV_GROUPS = [
  {
    id:'lab', label:'Data Lab', icon:'⌬', caption:'Query, run and export',
    description:'Charts, equations, score predictions and season outlooks on live data — with CSV/JSON export and a reproducible notebook.',
    pages:[
      {route:'labexplorer', label:'Dataset Explorer'},
      {route:'labnotebook', label:'Live Notebook'},
      {route:'labcharts', label:'Chart Studio'},
      {route:'labequations', label:'Equation Lab'},
      {route:'labpredict', label:'Score Predictor'},
      {route:'laboutlook', label:'Season Outlook'},
      {route:'labmodern', label:'Modern Game'}
    ]
  },
  {
    id:'live', label:'Live & Season', icon:'◉', caption:'What is happening now',
    description:'Scores, tables, the current season and the latest basketball stories.',
    pages:[
      {route:'livecenter', label:'Scores & Standings'},
      {route:'season', label:'Season Hub'},
      {route:'news', label:'News & Transfers'},
      {route:'rookies', label:'Rookie Radar'}
    ]
  },
  {
    id:'analysis', label:'Players & Teams', icon:'▥', caption:'Who plays how well',
    description:'Explore careers, team styles and the underlying performance metrics.',
    pages:[
      {route:'players', label:'Player Profiles'},
      {route:'teamlab', label:'Team DNA'},
      {route:'analytics', label:'Advanced Stats'},
      {route:'visuals', label:'Chart Playground'}
    ]
  },
  {
    id:'history', label:'History & Evolution', icon:'◷', caption:'How basketball changed',
    description:'Trophies, MVPs, national teams and the changing style of the game.',
    pages:[
      {route:'archive', label:'Championship History'},
      {route:'awards', label:'MVPs & Awards'},
      {route:'nations', label:'National Teams'},
      {route:'evolution', label:'Evolution of Basketball'}
    ]
  },
  {
    id:'compare', label:'GOAT & Comparison', icon:'♛', caption:'Compare across eras',
    description:'Head-to-head comparisons, adjustable GOAT scores and similar careers.',
    pages:[
      {route:'goat', label:'GOAT Head-to-Head'},
      {route:'globalgoat', label:'Global GOAT Equation'},
      {route:'twins', label:'Career Twins'}
    ]
  },
  {
    id:'predict', label:'Predictions', icon:'◈', caption:'What might happen next',
    description:'Transparent match models, title scenarios and MVP watchlists.',
    pages:[
      {route:'matchlab', label:'Match Prediction Lab'},
      {route:'future', label:'Future Champions & MVPs'}
    ]
  },
  {
    id:'learn', label:'Learn & Sources', icon:'?', caption:'Understand every metric',
    description:'Plain-English stat definitions, methods and verifiable data sources.',
    pages:[
      {route:'academy', label:'Stats Dictionary'},
      {route:'methodology', label:'Sources & Methods'}
    ]
  }
];

export const PAGE_MAP = new Map(NAV_GROUPS.flatMap(group=>
  group.pages.map(page=>[page.route, { ...page, groupId: group.id, groupLabel: group.label }])
));

export function groupFor(route){return NAV_GROUPS.find(group=>group.pages.some(page=>page.route===route)) ?? null;}
export function pageFor(route){return PAGE_MAP.get(route) ?? (route==='dashboard'?{route, label:'Overview', groupId:null, groupLabel:'Home'}:null);}
const SEARCH_ALIASES={
  livecenter:'live scores fixtures games results leaderboard standings table basketball nba euroleague',
  season:'2026 2027 season players teams nba euroleague',
  news:'rumours rumors transfers trade tracker updates',
  rookies:'draft rookies prospect first year',
  players:'headshots portraits photo biography career statistics',
  teamlab:'team style offensive defensive pace strength weakness four factors team dna',
  analytics:'raptor war bpm vorp ws per efg ts usage ortg drtg net rating',
  visuals:'graphs charts scatter spider radar plot visual playground',
  archive:'historical champions dynasties rings trophies titles nba euroleague',
  awards:'most valuable player mvp finals mvp champions accolades',
  nations:'fiba world cup eurobasket national teams international',
  evolution:'historical pace three point shooting modern vs old eras',
  goat:'greatest of all time head to head comparison rankings',
  globalgoat:'goat greatest of all time best basketball player ever equation weights international',
  twins:'similar careers player comps analogues raptor war',
  matchlab:'ml machine learning predictions games betting model',
  future:'future predictions championships mvp scenarios',
  academy:'what is raptor war bpm vorp per ws plus minus ts efg dictionary glossary definitions',
  labexplorer:'data lab dataset table csv json export download query filter sort standings records',
  labnotebook:'data lab notebook cells analysis pythagorean expectation descriptive statistics scatter reproducible',
  labcharts:'data lab charts graphs scatter regression histogram heatmap correlation leaderboard players teams visualise',
  labequations:'data lab equations formulas pythagorean elo log5 four factors efg ts ortg calculator maths',
  labpredict:'data lab predictions score predictor spread total win probability games today forecast',
  laboutlook:'data lab season outlook projection projected wins playoff odds forecast next season regression',
  labmodern:'data lab modern game trends league scoring pace three point era parity today',
  methodology:'sources methodology provenance model limitations data quality'
};
export function navigationMatches(route, query){
 const item=pageFor(route);if(!item)return false;
 const group=groupFor(route);
 return [item.label,item.route,group?.label,group?.description,SEARCH_ALIASES[route]||'']
   .join(' ').toLowerCase().includes(String(query||'').trim().toLowerCase());
}
export const NAV_ROUTES=['dashboard',...NAV_GROUPS.flatMap(g=>g.pages.map(p=>p.route))];