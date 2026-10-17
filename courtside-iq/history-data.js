// Curated historical winner indices, sourced from NBA.com and EuroLeague's official Final Four archive.
// A season index is the year of the final (1947 means 1946–47).
export const NBA_CHAMPIONS = `
2026|New York Knicks
2025|Oklahoma City Thunder
2024|Boston Celtics
2023|Denver Nuggets
2022|Golden State Warriors
2021|Milwaukee Bucks
2020|Los Angeles Lakers
2019|Toronto Raptors
2018|Golden State Warriors
2017|Golden State Warriors
2016|Cleveland Cavaliers
2015|Golden State Warriors
2014|San Antonio Spurs
2013|Miami Heat
2012|Miami Heat
2011|Dallas Mavericks
2010|Los Angeles Lakers
2009|Los Angeles Lakers
2008|Boston Celtics
2007|San Antonio Spurs
2006|Miami Heat
2005|San Antonio Spurs
2004|Detroit Pistons
2003|San Antonio Spurs
2002|Los Angeles Lakers
2001|Los Angeles Lakers
2000|Los Angeles Lakers
1999|San Antonio Spurs
1998|Chicago Bulls
1997|Chicago Bulls
1996|Chicago Bulls
1995|Houston Rockets
1994|Houston Rockets
1993|Chicago Bulls
1992|Chicago Bulls
1991|Chicago Bulls
1990|Detroit Pistons
1989|Detroit Pistons
1988|Los Angeles Lakers
1987|Los Angeles Lakers
1986|Boston Celtics
1985|Los Angeles Lakers
1984|Boston Celtics
1983|Philadelphia 76ers
1982|Los Angeles Lakers
1981|Boston Celtics
1980|Los Angeles Lakers
1979|Seattle SuperSonics
1978|Washington Bullets
1977|Portland Trail Blazers
1976|Boston Celtics
1975|Golden State Warriors
1974|Boston Celtics
1973|New York Knicks
1972|Los Angeles Lakers
1971|Milwaukee Bucks
1970|New York Knicks
1969|Boston Celtics
1968|Boston Celtics
1967|Philadelphia 76ers
1966|Boston Celtics
1965|Boston Celtics
1964|Boston Celtics
1963|Boston Celtics
1962|Boston Celtics
1961|Boston Celtics
1960|Boston Celtics
1959|Boston Celtics
1958|St. Louis Hawks
1957|Boston Celtics
1956|Philadelphia Warriors
1955|Syracuse Nationals
1954|Minneapolis Lakers
1953|Minneapolis Lakers
1952|Minneapolis Lakers
1951|Rochester Royals
1950|Minneapolis Lakers
1949|Minneapolis Lakers
1948|Baltimore Bullets
1947|Philadelphia Warriors`.trim().split('\n').map(s=>{let [year,winner]=s.split('|');return {year:+year,winner}});
export const NBA_MVPS = `
2026|Shai Gilgeous-Alexander
2025|Shai Gilgeous-Alexander
2024|Nikola Jokic
2023|Joel Embiid
2022|Nikola Jokic
2021|Nikola Jokic
2020|Giannis Antetokounmpo
2019|Giannis Antetokounmpo
2018|James Harden
2017|Russell Westbrook
2016|Stephen Curry
2015|Stephen Curry
2014|Kevin Durant
2013|LeBron James
2012|LeBron James
2011|Derrick Rose
2010|LeBron James
2009|LeBron James
2008|Kobe Bryant
2007|Dirk Nowitzki
2006|Steve Nash
2005|Steve Nash
2004|Kevin Garnett
2003|Tim Duncan
2002|Tim Duncan
2001|Allen Iverson
2000|Shaquille O'Neal
1999|Karl Malone
1998|Michael Jordan
1997|Karl Malone
1996|Michael Jordan
1995|David Robinson
1994|Hakeem Olajuwon
1993|Charles Barkley
1992|Michael Jordan
1991|Michael Jordan
1990|Magic Johnson
1989|Magic Johnson
1988|Michael Jordan
1987|Magic Johnson
1986|Larry Bird
1985|Larry Bird
1984|Larry Bird
1983|Moses Malone
1982|Moses Malone
1981|Julius Erving
1980|Kareem Abdul-Jabbar
1979|Moses Malone
1978|Bill Walton
1977|Kareem Abdul-Jabbar
1976|Kareem Abdul-Jabbar
1975|Bob McAdoo
1974|Kareem Abdul-Jabbar
1973|Dave Cowens
1972|Kareem Abdul-Jabbar
1971|Kareem Abdul-Jabbar
1970|Willis Reed
1969|Wes Unseld
1968|Wilt Chamberlain
1967|Wilt Chamberlain
1966|Wilt Chamberlain
1965|Bill Russell
1964|Oscar Robertson
1963|Bill Russell
1962|Bill Russell
1961|Bill Russell
1960|Wilt Chamberlain
1959|Bob Pettit
1958|Bill Russell
1957|Bob Cousy
1956|Bob Pettit`.trim().split('\n').map(s=>{let [year,winner]=s.split('|');return {year:+year,winner}});
// European top-tier champions since the 1958 European Champions Cup (including predecessor competitions).
// 2000–01 had rival competitions; this championship index follows the EuroLeague title (Virtus Bologna).
export const EURO_CHAMPIONS = `
2026|Olympiacos
2025|Fenerbahce
2024|Panathinaikos
2023|Real Madrid
2022|Anadolu Efes
2021|Anadolu Efes
2020|NO CHAMPION
2019|CSKA Moscow
2018|Real Madrid
2017|Fenerbahce
2016|CSKA Moscow
2015|Real Madrid
2014|Maccabi Tel Aviv
2013|Olympiacos
2012|Olympiacos
2011|Panathinaikos
2010|Barcelona
2009|Panathinaikos
2008|CSKA Moscow
2007|Panathinaikos
2006|CSKA Moscow
2005|Maccabi Tel Aviv
2004|Maccabi Tel Aviv
2003|Barcelona
2002|Panathinaikos
2001|Virtus Bologna
2000|Panathinaikos
1999|Zalgiris Kaunas
1998|Virtus Bologna
1997|Olympiacos
1996|Panathinaikos
1995|Real Madrid
1994|Joventut Badalona
1993|Limoges CSP
1992|Partizan Belgrade
1991|KK Split
1990|KK Split
1989|KK Split
1988|Olimpia Milano
1987|Olimpia Milano
1986|Cibona Zagreb
1985|Cibona Zagreb
1984|Virtus Roma
1983|Pallacanestro Cantu
1982|Pallacanestro Cantu
1981|Maccabi Tel Aviv
1980|Real Madrid
1979|Bosna Sarajevo
1978|Real Madrid
1977|Maccabi Tel Aviv
1976|Pallacanestro Varese
1975|Pallacanestro Varese
1974|Real Madrid
1973|Pallacanestro Varese
1972|Pallacanestro Varese
1971|CSKA Moscow
1970|Pallacanestro Varese
1969|CSKA Moscow
1968|Real Madrid
1967|Real Madrid
1966|Olimpia Milano
1965|Real Madrid
1964|Real Madrid
1963|CSKA Moscow
1962|Dinamo Tbilisi
1961|CSKA Moscow
1960|ASK Riga
1959|ASK Riga
1958|ASK Riga`.trim().split('\n').map(s=>{let [year,winner]=s.split('|');return {year:+year,winner,winnerKnown:winner!=='NO CHAMPION'}});
// Season-long EuroLeague MVP award, not Final Four MVP; first introduced in 2004–05.
export const EURO_MVPS = `
2026|Sasha Vezenkov
2025|Kendrick Nunn
2024|Mike James
2023|Sasha Vezenkov
2022|Nikola Mirotic
2021|Vasilije Micic
2020|NO AWARD
2019|Jan Vesely
2018|Luka Doncic
2017|Sergio Llull
2016|Nando De Colo
2015|Nemanja Bjelica
2014|Sergio Rodriguez
2013|Vassilis Spanoulis
2012|Andrei Kirilenko
2011|Dimitris Diamantidis
2010|Milos Teodosic
2009|Juan Carlos Navarro
2008|Ramunas Siskauskas
2007|Theodoros Papaloukas
2006|Anthony Parker
2005|Anthony Parker`.trim().split('\n').map(s=>{let [year,winner]=s.split('|');return {year:+year,winner}});
export const NBA_AWARDS={
  2026:{roy:'Cooper Flagg',dpoy:'Victor Wembanyama',finals:'Jalen Brunson',sixth:'Keldon Johnson',mip:'Nickeil Alexander-Walker'},
  2025:{roy:'Stephon Castle',dpoy:'Evan Mobley',finals:'Shai Gilgeous-Alexander'},
  2024:{roy:'Victor Wembanyama',dpoy:'Rudy Gobert',finals:'Jaylen Brown'},
  2023:{roy:'Paolo Banchero',dpoy:'Jaren Jackson Jr.',finals:'Nikola Jokic'},
  2022:{roy:'Scottie Barnes',dpoy:'Marcus Smart',finals:'Stephen Curry'},
  2021:{roy:'LaMelo Ball',dpoy:'Rudy Gobert',finals:'Giannis Antetokounmpo'},
  2020:{roy:'Ja Morant',dpoy:'Giannis Antetokounmpo',finals:'LeBron James'},
  2019:{roy:'Luka Doncic',dpoy:'Rudy Gobert',finals:'Kawhi Leonard'},
  2018:{roy:'Ben Simmons',dpoy:'Rudy Gobert',finals:'Kevin Durant'},
  2017:{roy:'Malcolm Brogdon',dpoy:'Draymond Green',finals:'Kevin Durant'},
  2016:{roy:'Karl-Anthony Towns',dpoy:'Kawhi Leonard',finals:'LeBron James'},
};
export const NBA_DRAFT_2026 = [
 {pick:1,name:'AJ Dybantsa',team:'Washington Wizards',school:'BYU'},
 {pick:2,name:'Darryn Peterson',team:'Utah Jazz',school:'Kansas'},
 {pick:3,name:'Cameron Boozer',team:'Memphis Grizzlies',school:'Duke'},
 {pick:4,name:'Caleb Wilson',team:'Chicago Bulls',school:'North Carolina'},
 {pick:5,name:'Keaton Wagler',team:'LA Clippers',school:'Illinois'},
 {pick:6,name:'Mikel Brown Jr.',team:'Brooklyn Nets',school:''},
 {pick:7,name:'Darius Acuff Jr.',team:'Sacramento Kings',school:''},
 {pick:8,name:'Kingston Flemings',team:'Atlanta Hawks',school:''},
 {pick:9,name:'Morez Johnson Jr.',team:'Dallas Mavericks',school:''},
 {pick:10,name:'Brayden Burries',team:'Milwaukee Bucks',school:''},
];
export const SOURCES={nbaChamp:'https://www.nba.com/news/history-nba-champions',nbaMvp:'https://www.nba.com/news/history-mvp-award-winners',nbaAwards:'https://pr.nba.com/voting-results-2025-26-nba-regular-season-awards/',nbaDraft:'https://www.nba.com/news/2026-nba-draft-order',euro:'https://mediacentre.euroleague.net/en/app/2/communication/communication/preview/523',euro2026:'https://mediacentre.euroleague.net/mediacentre/en/press_releases',historicalRaptor:'https://github.com/fivethirtyeight/data/tree/master/nba-raptor'};