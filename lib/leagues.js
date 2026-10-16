'use strict';
// IDs are stable internal IDs, slugs come from ESPN public site APIs, except EuroLeague.
const LEAGUES=[
{id:'gre',title:'Super League Greece',sport:'soccer',slug:'gre.1',region:'Greece'},
{id:'ucl',title:'Champions League',sport:'soccer',slug:'uefa.champions',region:'Europe'},
{id:'uel',title:'Europa League',sport:'soccer',slug:'uefa.europa',region:'Europe'},
{id:'uecl',title:'Conference League',sport:'soccer',slug:'uefa.europa.conf',region:'Europe'},
{id:'epl',title:'Premier League',sport:'soccer',slug:'eng.1',region:'England'},
{id:'laliga',title:'La Liga',sport:'soccer',slug:'esp.1',region:'Spain'},
{id:'seriea',title:'Serie A',sport:'soccer',slug:'ita.1',region:'Italy'},
{id:'bundesliga',title:'Bundesliga',sport:'soccer',slug:'ger.1',region:'Germany'},
{id:'ligue1',title:'Ligue 1',sport:'soccer',slug:'fra.1',region:'France'},
{id:'eredivisie',title:'Eredivisie',sport:'soccer',slug:'ned.1',region:'Netherlands'},
{id:'portugal',title:'Primeira Liga',sport:'soccer',slug:'por.1',region:'Portugal'},
{id:'turkey',title:'Süper Lig',sport:'soccer',slug:'tur.1',region:'Türkiye'},
{id:'mls',title:'MLS',sport:'soccer',slug:'usa.1',region:'USA'},
{id:'wc',title:'FIFA World Cup',sport:'soccer',slug:'fifa.world',region:'International'},
{id:'nba',title:'NBA',sport:'basketball',slug:'nba',region:'USA'},
{id:'wnba',title:'WNBA',sport:'basketball',slug:'wnba',region:'USA'},
{id:'nfl',title:'NFL',sport:'football',slug:'nfl',region:'USA'},
{id:'nhl',title:'NHL',sport:'hockey',slug:'nhl',region:'USA'},
{id:'mlb',title:'MLB',sport:'baseball',slug:'mlb',region:'USA'},
{id:'f1',title:'Formula 1',sport:'racing',slug:'f1',region:'International'},
{id:'euro',title:'EuroLeague',sport:'basketball',slug:'E',region:'Europe',external:'euroleague'}
];
const BY_ID=Object.fromEntries(LEAGUES.map(x=>[x.id,x]));
module.exports={LEAGUES,BY_ID};
