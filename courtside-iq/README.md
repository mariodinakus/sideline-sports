# COURTSIDE IQ — Basketball Intelligence Platform

A deployable, bilingual **NBA + EuroLeague** analytics web app. Vanilla JavaScript/HTML/CSS front end, zero runtime npm dependencies, and a Vercel serverless data proxy.

## Features

- Responsive, dark, analytics-terminal UI with desktop sidebar and mobile layouts.
- **NBA / EuroLeague** switch; selectable seasons; Greek/English interface.
- **Player Intelligence:** sort and search point/rebound/assist/steal/block/turnover rates, shooting efficiency (TS%, eFG%), usage, EuroLeague PIR and, when available, NBA PER/BPM/VORP/Win Shares.
- **Team Intelligence:** records, points for/against and available possession-normalized ratings; scatterplots and sortable league tables.
- **Comparison Lab:** two players with head-to-head metric plots and clear blanks for metrics not provided.
- **Prediction Lab:** two-team head-to-head, pace and home-court/roster scenarios, estimated scoring difference, seeded 5,000-draw Monte Carlo simulation, win probability and a simulated distribution. Model is a **transparent heuristic**, *not fitted or cross-validated machine learning*.
- **Match Center:** NBA daily ESPN scores and EuroLeague schedule/results if public feed responds.
- **Methodology:** transparency on data sources, inferred fields, formulas and unavailable information.
- Individual upstream-source health reporting, no fictional player statistics, and `null` values shown as missing.

## Upstream data feeds

No keys are needed for the current implementation, but public/unofficial feeds **are not guaranteed to remain available** and some may enforce CORS, access restrictions, rate limits or API changes. The browser accesses only `/api/data`, never the external feeds directly.

| League | Adapter | Data | Operational caveat |
| --- | --- | --- | --- |
| NBA | ESPN site APIs | Team directory, standings, player stats, current-day games | Undocumented; structures/access may change |
| NBA | NBA-Go public API `api.server.nbaapi.com` | Player totals and advanced metrics if reachable | Unofficial; pagination currently capped at 250 players, availability not guaranteed |
| EuroLeague | EuroLeague `api-live.euroleague.net` v3 | Traditional/advanced season stats for players and teams | Public but subject to changes/restrictions |
| EuroLeague | EuroLeague `api-live.euroleague.net` v2 | Schedule and scores | Same caveats |

The app does **not** claim to calculate tracking-based stats (such as shot quality or on/off splits) without the necessary event/possession data. It also does not infer missing offensive/defensive ratings from points per game and call them measured ratings. When detailed ratings are missing, the Prediction Lab may fall back to averages with an explicit note; if even averages are missing it disables the forecast.

**Data licensing:** Verify the terms of every source and obtain an authorized commercial feed before monetizing or mass redistributing the data or league/player branding. The app is independent of NBA and EuroLeague.

## Deploy on GitHub + Vercel

1. Create an **empty GitHub repository**, e.g. `courtside-iq`.
2. Extract this ZIP and upload **all contents** of the `courtside-iq` folder to the repository root, including `api/` and `lib/`.
3. Visit [Vercel](https://vercel.com/new) and import that GitHub repository.
4. Keep **Framework Preset: Other** (static site + Vercel Functions), **Root Directory: `./`**. Do not configure `dist` or other Output Directory.
5. Deploy. The function `/api/data?league=nba&season=2025` should return JSON and the home page should load as a static website. Select EuroLeague and a season in the app to query its feeds.

Every future GitHub push automatically triggers a new Vercel build once connected. No environment variables or API keys are currently required. An upgrade to licensed feeds would use encrypted Vercel environment variables and server-side adapters.

## Local development

With Node.js 20+ and Vercel CLI installed:

```bash
npm i -g vercel
vercel dev
```

`vercel dev` serves both static files and the `/api/data` function. Opening `index.html` directly in a browser bypasses the Vercel function and will **not** show live data.

Static/syntax checks and unit tests:

```bash
npm run check
npm test
```

## Prediction methodology

1. Use actual source offensive/defensive ratings and pace **if present**. Otherwise, using recorded team scoring averages is an explicitly labeled fallback.
2. Estimate home and away points from matchup attack/defense plus a user-adjustable home advantage.
3. Draw 5,000 pseudo-random, normally distributed score margins with a fixed seed (reproducible). Display simulation share with home margin > 0, mean difference and 10th/90th percentiles.
4. Adjust pace and relative scoring to conduct *scenario analysis*, **not** claims about injuries or actual roster changes.

This model **has not been backtested on historical seasons**, calibrated or compared against betting markets. Treat output as an educational baseline, not a reliable quantitative edge, and do not use it for betting recommendations.

## Important limitations and status

- Code and 8 unit checks are ready. **Live integration with the upstream data sources was not verified from this build environment**; the endpoints may fail or schemas may differ on deployment. The UI surfaces missing feeds rather than showing demo numbers as live statistics.
- EuroLeague advanced stats depend on fields returned in the actual provider payload.
- This project has no historical data warehouse, possession-by-possession event feed, trained ML model, injury feed, player-prop forecasting model, calibration study, account management or push notifications yet.
- NBA game feed currently shows the day's slate, not a whole-season archive. Season selection applies to player/team feeds.
- If a provider fails, the related section may be empty or prediction may be unavailable until another valid data feed is configured.

## Future architecture

For production-grade forecasts: archive official licensed box scores/play-by-play, normalize seasons into Postgres, train rolling-window Elo + hierarchical team models, run walk-forward validation, and expose Brier/log-loss/calibration metrics. Add injury/rest/travel features only with an authorized reliable feed.

## Code layout

```
index.html             Single-page UI
styles.css             Responsive visual system
app.js                 Screens, interactions, charts and client rendering
api/data.js            Vercel API + provider fallback/health + 10-min caching
lib/normalize.js       Defensive normalizers for NBA/EuroLeague feeds
lib/models.js          Four Factors, probability and Monte Carlo baseline
tests/models.test.js   Unit tests
vercel.json            Vercel settings and response headers
```

## v2 — HISTORICAL INTELLIGENCE STUDIO (17 October 2026)

The home screen and navigation are now **English-only**. New editorial dashboard (ivory/lavender/acid-green) replaces the previous dark analytics terminal. Pages: Overview, History Atlas, MVP & Awards, Advanced Stats, GOAT Lab, Career Twins, Future Forecasts and Rookie Radar.

**Historical coverage:**
- NBA champions 1947–2026 and regular-season MVP winners 1956–2026, curated from official NBA.com historical indices.
- EuroLeague modern-era champions 2000–2026, EuroLeague season MVP 2005–2026 (no award in canceled 2020 season). Earlier 1958–1999 predecessor champions are intentionally not included in the new History Atlas, despite the broader European competition history.
- Additional 2026 NBA awards, select previous-year honors, NBA Draft 2026 top 10 sourced from the NBA official awards and draft posts.
- Historical player impact is fetched separately using the public FiveThirtyEight historical RAPTOR CSV (1977–2023 era); this source is not continuously updated and its data availability varies. **Not all modern advanced stats can be reconstructed back to 1947.** Values and similarity scores must not be interpreted as a cross-era objective truth.

**Forecast method:** indicative *scenario* simulations that perturb available prior-season team strength (5,000 deterministic draws). The displayed shares are NOT calibrated title probabilities or betting odds. The MVP list is a descriptive prior-season production index, not a model of 2027 voting. The 2027 Rookie of the Year class is a draft watchlist without fictional season stats or odds.

**Data dependencies:** `api/legacy.js` connects to GitHub raw FiveThirtyEight CSV and can fail from Vercel network; `api/data.js` still connects to public NBA / EuroLeague endpoints which may be unreliable. The UI degrades explicitly to empty states. Historical award and championship indices remain accessible offline without those APIs.

**Sources:**
- https://www.nba.com/news/history-nba-champions
- https://www.nba.com/news/history-mvp-award-winners
- https://www.nba.com/news/2026-nba-draft-order
- https://pr.nba.com/voting-results-2025-26-nba-regular-season-awards/
- https://f4athens.org/en/final-four
- https://mediacentre.euroleague.net/mediacentre/en/press_releases
- https://github.com/fivethirtyeight/data/tree/master/nba-raptor


## Visual Intelligence Studio (v2.1)

- GOAT Lab now features **interactive two-player spider/radar comparisons** built in dependency-free accessible SVG. Six evidence dimensions: regular-season MVP awards, Offensive RAPTOR, Defensive RAPTOR, overall RAPTOR, peak RAPTOR, and career RAPTOR WAR.
- Radar normalization uses disclosed, fixed illustrative reference bands and truncates values outside the bands. It is **not a league percentile, cross-era adjustment, or objective GOAT score**.
- GOAT Lab and Career Twins feature actual historical **season-by-season RAPTOR trajectories** (career-season index, not calendar-year alignment). This uses available season-level values from FiveThirtyEight's historical RAPTOR dataset.
- Advanced Stats now includes a **True Shooting vs points-per-game scatter plot** for players with both underlying values from the live provider. There is no fake data fallback.
- Career Twins adds a radar profile overlay against the nearest historical analog.
- All visualizations adapt to mobile screens without any third-party chart dependency.
- The historical RAPTOR adapter now includes a `timeline` field for each player. Source and coverage remain unchanged.
- Run `npm test`: includes radar normalization, missing-data safeguards, accessible SVG and chart-output tests.

### Historical coverage extension

The History Atlas now includes **European top-tier champions from the 1958 European Champions Cup through 2026**, in addition to NBA title history since 1947. European competition identity and governance changed over time; this is a cross-era winners index, not a claim that the pre-2000 tournament used the same regulations as today's EuroLeague. In 2000–01 two top-tier competitions ran in parallel: Virtus Bologna won the EuroLeague, while Maccabi Tel Aviv won the separate SuproLeague. For the full year-by-year European winners index see EuroLeague's official historical record: https://mediacentre.euroleague.net/en/app/2/communication/communication/preview/523 . Season-long MVPs are only shown for years when that award existed (from 2005).