'use strict';
function num(x){if(x===null||x===undefined||x==='')return null;const v=Number(String(x).replace('%','').trim());return Number.isFinite(v)?v:null;}
function shotPair(value){if(typeof value==='string'){const match=value.trim().match(/^(\d+)\s*[-/]\s*(\d+)$/);if(match)return {made:Number(match[1]),attempts:Number(match[2])};}if(Array.isArray(value)&&value.length===2)return {made:num(value[0]),attempts:num(value[1])};return null;}
function fromTeamStats(statistics){const src=statistics||[];function find(...names){const match=src.find(s=>names.some(n=>String(s.name||s.label||s.abbreviation||'').toLowerCase().replace(/[^a-z0-9]/g,'')===n.toLowerCase().replace(/[^a-z0-9]/g,'')));return match?.displayValue??match?.value??null;}
 const fg=shotPair(find('fieldGoalsMadeFieldGoalsAttempted','fieldGoals','FG','FGM-FGA'));
 const three=shotPair(find('threePointFieldGoalsMadeThreePointFieldGoalsAttempted','threePointFieldGoals','3PT','3PM-3PA'));
 const ft=shotPair(find('freeThrowsMadeFreeThrowsAttempted','freeThrows','FT','FTM-FTA'));
 const pts=num(find('points','totalPoints','PTS'));const ast=num(find('assists','AST'));const turnovers=num(find('turnovers','TO'));
 const efg=fg?.attempts>0&&three?.made!==null&&three?.made!==undefined?100*(fg.made+0.5*three.made)/fg.attempts:null;
 const ts=fg?.attempts>0&&ft?.attempts!==null&&ft?.attempts!==undefined&&pts!==null?100*pts/(2*(fg.attempts+0.44*ft.attempts)):null;
 const astTo=turnovers>0&&ast!==null?ast/turnovers:null;
 return {efg:finite(efg),ts:finite(ts),astTo:finite(astTo),fg,three,ft,points:pts,source:'Calculated from game box score (eFG% / TS% / AST:TO)'};
}
function finite(v){return typeof v==='number'&&Number.isFinite(v)?Math.round(v*10)/10:null;}
module.exports={num,shotPair,fromTeamStats,finite};
