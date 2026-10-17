// NBA league-average reference points: per TEAM per game, regular season.
// Basketball-Reference league averages https://www.basketball-reference.com/leagues/NBA_stats_per_game.html
// 1979–2014 comparison values cross-checked with Basketball-Reference share tables.
// A snapshot, not an interpolated annual series. Null means unverified/unavailable.
export const NBA_ERA=[
 {year:1980,label:'1979–80',threePA:2.8,pts:null,pace:null,efg:null,ortg:null,source:'NBA league averages / early three-point era'},
 {year:1990,label:'1989–90',threePA:6.6,pts:null,pace:null,efg:null,ortg:null,source:'Basketball-Reference league averages'},
 {year:2000,label:'1999–00',threePA:13.7,pts:97.5,pace:null,efg:null,ortg:null,source:'Basketball-Reference league averages'},
 {year:2010,label:'2009–10',threePA:18.1,pts:null,pace:null,efg:null,ortg:null,source:'Basketball-Reference league averages'},
 {year:2020,label:'2019–20',threePA:34.1,pts:null,pace:null,efg:null,ortg:null,source:'Basketball-Reference league averages'},
 {year:2024,label:'2023–24',threePA:35.1,pts:114.2,pace:98.5,efg:54.7,ortg:115.3,source:'Basketball-Reference league averages'},
 {year:2025,label:'2024–25',threePA:37.6,pts:113.8,pace:98.8,efg:54.3,ortg:114.5,source:'Basketball-Reference league averages'},
 {year:2026,label:'2025–26',threePA:37.0,pts:115.6,pace:99.4,efg:54.6,ortg:115.7,source:'Basketball-Reference league averages'}
];
export const LEAGUE_REFERENCE='https://www.basketball-reference.com/leagues/NBA_stats_per_game.html';
export const STAT_GLOSSARY=[
 ['PTS','Points per game','Points scored ÷ games played.','Volume; not possession-adjusted.'],
 ['PACE','Pace','Estimated possessions per 48 minutes (NBA); EuroLeague often per 40 minutes.','Never compare raw 40-minute and 48-minute pace without conversion.'],
 ['ORtg','Offensive Rating','Points scored ÷ estimated offensive possessions × 100.','Points per 100 possessions; better for era comparisons than PPG.'],
 ['DRtg','Defensive Rating','Points conceded ÷ estimated defensive possessions × 100.','Lower means fewer points conceded; source methodology can vary.'],
 ['Net Rating','Net Rating','Offensive Rating − Defensive Rating.','Positive: team outscores opponents on a per-possession basis.'],
 ['TS%','True Shooting Percentage','PTS ÷ [2 × (FGA + 0.44 × FTA)] × 100.','Balances 2s, 3s and free throws; the 0.44 is an approximation.'],
 ['eFG%','Effective Field Goal Percentage','(FGM + 0.5 × 3PM) ÷ FGA × 100.','Accounts for the extra point from made 3s; excludes free throws.'],
 ['3PAr','Three-Point Attempt Rate','3PA ÷ FGA × 100.','Share of shot attempts taken from three, not 3P accuracy.'],
 ['FTr','Free Throw Rate','FTA ÷ FGA (or FTM ÷ FGA by some providers).','Always check provider definition before comparisons.'],
 ['TOV%','Turnover Percentage','100 × TOV ÷ (FGA + 0.44 × FTA + TOV).','Percent of offensive plays ending in a turnover (estimate).'],
 ['ORB%','Offensive Rebound Percentage','ORB ÷ (ORB + opponent DRB) × 100.','How often a team recovers its missed shots.'],
 ['AST%','Assist Percentage','Assisted teammate field goals / eligible teammate field goals.','Estimate; provider denominator and assists rules matter.'],
 ['AST/TOV','Assist-to-Turnover Ratio','AST ÷ TOV.','Playmaking/security proxy; rewards different styles unevenly.'],
 ['USG%','Usage Percentage','Estimate of offensive possessions used by a player while on court.','Not the percent of time the player possesses the ball.'],
 ['PER','Player Efficiency Rating','John Hollinger’s pace-adjusted weighted box score index; league average 15.','Box-score-centric and not a complete defensive metric.'],
 ['BPM','Box Plus/Minus','Estimated points per 100 possessions versus league-average player.','Regression on box scores, role and team context; not raw on/off.'],
 ['OBPM','Offensive Box Plus/Minus','Offensive component of BPM, points per 100 possessions.','Model estimate, not points contributed directly.'],
 ['DBPM','Defensive Box Plus/Minus','Defensive component of BPM, points per 100 possessions.','Model uncertainty on defense can be substantial.'],
 ['VORP','Value Over Replacement Player','(BPM + 2.0) × share of team minutes/possessions × team games/82.','Accumulated BPM value relative to replacement player; not WAR.'],
 ['WS','Win Shares','Model allocation of estimated team wins to players.','Not direct causal attribution of victories.'],
 ['WS/48','Win Shares per 48 Minutes','Win Shares ÷ minutes played × 48.','Rate version of Win Shares, NBA game length based.'],
 ['RAPTOR','Robust Algorithm (using) Player Tracking (and) On/Off Ratings','FiveThirtyEight model estimating offensive, defensive and total player impact per 100 possessions.','Historical RAPTOR depends on available box/on-off components; not official NBA metric.'],
 ['RAPTOR WAR','RAPTOR Wins Above Replacement','FiveThirtyEight conversion from RAPTOR impact × playing time into wins above a replacement baseline.','Cumulative wins estimate, not actual team wins and not identical to VORP × 2.7.'],
 ['RAPM','Regularized Adjusted Plus/Minus','Lineup plus/minus model that adjusts for teammates and opponents with shrinkage.','Depends heavily on lineup coverage and model assumptions.'],
 ['PIR','Performance Index Rating','EuroLeague: (PTS + REB + AST + STL + BLK + fouls drawn) − (missed FG + missed FT + TOV + blocks against + fouls committed).','Traditional composite box score; not adjusted impact, and not PER.'],
 ['Elo','Elo rating','Team strength updated from past results and opponent quality.','Outcome-based; does not automatically know lineups or injuries.'],
 ['Brier Score','Brier score','Mean[(predicted win probability − actual outcome)²].','Lower is better; calibration and time-separated testing matter.'],
 ['Four Factors','Four Factors','eFG%, turnover rate, offensive rebound rate and free throw rate.','Dean Oliver’s framework for explaining efficiency rather than raw points.']
];