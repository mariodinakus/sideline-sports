// Primary record: FIBA all-time medalist tables. Historical teams are separate states.
export const WORLD_CUP_SOURCE='https://www.fiba.basketball/en/events/fiba-basketball-world-cup-2027/all-time-medalists';
export const EUROBASKET_SOURCE='https://www.fiba.basketball/en/events/fiba-eurobasket-2025/all-time-medalists';
// year|gold|silver|bronze|MVP (FIBA's retroactive awards classification)
export const WORLD_CUP=`
2023|Germany|Serbia|Canada|Dennis Schroder
2019|Spain|Argentina|France|Ricky Rubio
2014|United States|Serbia|France|Kyrie Irving
2010|United States|Turkey|Lithuania|Kevin Durant
2006|Spain|Greece|United States|Pau Gasol
2002|Yugoslavia|Argentina|Germany|Dirk Nowitzki
1998|Yugoslavia|Russia|United States|Dejan Bodiroga
1994|United States|Russia|Croatia|Shaquille O'Neal
1990|Yugoslavia|Soviet Union|United States|Toni Kukoc
1986|United States|Soviet Union|Yugoslavia|Drazen Petrovic
1982|Soviet Union|United States|Yugoslavia|Rolando Frazer
1978|Yugoslavia|Soviet Union|Brazil|Drazen Dalipagic
1974|Soviet Union|Yugoslavia|United States|Dragan Kicanovic
1970|Yugoslavia|Brazil|Soviet Union|Sergei Belov
1967|Soviet Union|Yugoslavia|Brazil|Ivo Daneu
1963|Brazil|Yugoslavia|Soviet Union|Wlamir Marques
1959|Brazil|United States|Chile|Amaury Pasos
1954|United States|Brazil|Philippines|James Kirby Minter
1950|Argentina|United States|Chile|Oscar Furlong`.trim().split('\n').map(parseLine);
export const EUROBASKET=`
2025|Germany|Turkey|Greece|Dennis Schroder
2022|Spain|France|Germany|Willy Hernangomez
2017|Slovenia|Serbia|Spain|Goran Dragic
2015|Spain|Lithuania|France|Pau Gasol
2013|France|Lithuania|Spain|Tony Parker
2011|Spain|France|Russia|Juan Carlos Navarro
2009|Spain|Serbia|Greece|Pau Gasol
2007|Russia|Spain|Lithuania|Andrei Kirilenko
2005|Greece|Germany|France|Dirk Nowitzki
2003|Lithuania|Spain|Italy|Sarunas Jasikevicius
2001|Yugoslavia|Turkey|Spain|Predrag Stojakovic
1999|Italy|Spain|Yugoslavia|Gregor Fucka
1997|Yugoslavia|Italy|Russia|Aleksandar Djordjevic
1995|Yugoslavia|Lithuania|Croatia|Sarunas Marciulionis
1993|Germany|Russia|Croatia|Chris Welp
1991|Yugoslavia|Italy|Spain|Toni Kukoc
1989|Yugoslavia|Greece|Soviet Union|Drazen Petrovic
1987|Greece|Soviet Union|Yugoslavia|Nikos Galis
1985|Soviet Union|Czechoslovakia|Italy|Arvydas Sabonis
1983|Italy|Spain|Soviet Union|Juan Antonio Corbalan
1981|Soviet Union|Yugoslavia|Czechoslovakia|Valdis Valters
1979|Soviet Union|Israel|Yugoslavia|Mickey Berkowitz
1977|Yugoslavia|Soviet Union|Czechoslovakia|Drazen Dalipagic
1975|Yugoslavia|Soviet Union|Italy|Kresimir Cosic
1973|Yugoslavia|Spain|Soviet Union|Wayne Brabender
1971|Soviet Union|Yugoslavia|Italy|Kresimir Cosic
1969|Soviet Union|Yugoslavia|Czechoslovakia|Sergei Belov
1967|Soviet Union|Czechoslovakia|Poland|Jiri Zednicek
1965|Soviet Union|Yugoslavia|Poland|Modestas Paulauskas
1963|Soviet Union|Poland|Yugoslavia|Emiliano Rodriguez
1961|Soviet Union|Yugoslavia|Bulgaria|Radivoj Korac
1959|Soviet Union|Czechoslovakia|France|Viktor Zubkov
1957|Soviet Union|Bulgaria|Czechoslovakia|Jiri Baumruk
1955|Hungary|Czechoslovakia|Soviet Union|Janos Greminger
1953|Soviet Union|Hungary|France|Anatoly Konev
1951|Soviet Union|Czechoslovakia|France|Ivan Mrazek`.trim().split('\n').map(parseLine);
function parseLine(s){const [year,gold,silver,bronze,mvp]=s.split('|');return {year:+year,gold,silver,bronze,mvp:mvp||null};}
export function medals(rows){const out=new Map();for(const game of rows){for(const [i,color] of ['gold','silver','bronze'].entries()){const name=game[color];const item=out.get(name)||{name,gold:0,silver:0,bronze:0};item[color]++;out.set(name,item)}}return [...out.values()].map(x=>({...x,total:x.gold+x.silver+x.bronze,points:5*x.gold+2*x.silver+x.bronze})).sort((a,b)=>b.points-a.points||b.gold-a.gold)}