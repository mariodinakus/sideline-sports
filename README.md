# SIDELINE — Sports Intelligence v4

**News is not just a feed. It's a network of sources.**

## v4: BASKETBALL DATA LAB

- **NBA / WNBA:** every team in each available ESPN standings group, win-loss records, points scored and conceded, point differential, winning percentage, and sourced points per game when supplied. Select any club to inspect its metrics.
- **EuroLeague / EuroCup:** public EuroLeague competition data — **season and round-correct standings** from `v3/basicstandings` (with documented v2 fallback), wins, losses, total points for and against, and full tables by group.
- **Season-level basketball analytics:** official public EuroLeague v3 traditional and advanced per-game team statistics including PPG, rebounds, assists, eFG%, TS%, 3-point accuracy and assist/turnover ratio. Player leaders show PTS, REB, AST and PIR when available.
- **Per-game box score:** all available player lines on game reports (not just the first 6–8), structured columns such as MIN/PTS/REB/AST, team aggregate stats, and period-by-period scoring. ESPN NBA box scores additionally show *calculated* eFG%, TS% and AST/TO **only when all raw inputs exist**.
- **Data honesty:** no mocked values are shipped. A missing upstream metric appears as `—`. Standings and game data are subject to upstream API coverage, stale caches and undocumented schema changes. The Greek GBL does not have a verified standings feed in this version and is not falsely presented as supported.
- **Sources:** ESPN public site API; EuroLeague public live v2/v3 endpoints. These are public but unofficial/uncontracted integrations.

**Season scope:** EuroLeague start-year code (`E2026` for 2026/27), EuroCup code `U2026`; a new season can have empty standings until a round is played. The NBA and WNBA use ESPN's season availability.

## v2: YOUR FEED + MARKET SIGNALS

- **My Feed:** user-selectable sports, competitions and teams saved to browser localStorage; selectable For You/All news. Profile triggers extra targeted RSS searches for the selected teams/tournaments (bounded to four queries), while the overview can be filtered to the selected interests.
- **Market Signals:** read-only Polymarket and Kalshi public market displays at `/api/markets`; provider and sport selectors, market-outcome indicative percentages, provider disclosure, explicit source errors, no trading. Market contracts are **not verified forecasts** and are not compared unless contract terms match.
- **Limitations:** Kalshi feed may omit sports events due to the API event pagination and Polymarket tag filtering; absence of results does not mean zero markets exist. No paid data APIs, polling every four minutes while app is visible.


Responsive Greek/English sports news PWA designed for GitHub → Vercel deployment. No npm dependencies, API keys, database, scraping service, or paid subscription required.

## What's different

- **Story Radar:** Groups near-duplicate headlines across publishers by an explained Jaccard word-overlap heuristic (0.39 threshold). It links to individual articles rather than republishing them.
- **Coverage map:** Counts article groups by sport, and **unique publishers observed in the connected feeds** per story. This is *not* a full census of press coverage.
- **Under the radar:** Surfaces one-source articles that match a higher-priority keyword category; not a claim of objective importance or accuracy.
- **Match center:** Live/recent/scheduled fixtures by date (Europe/Athens) for ESPN's publicly accessible site feeds: Super League (subject to availability), Champions League, Premier League, La Liga, NBA, F1; plus optional EuroLeague public v2. Availability, exact field shapes, and upstream rate limits can change.
- **Save for later:** Bookmark news locally with `localStorage`.
- **Personalization:** Follow teams, filter sports, search headlines and publishers, switch languages and dark/light, install as a web app where the browser supports it.
- **Source transparency:** Source and publication times shown; warnings for missing feeds. No fabricated stories, scores, or trust scores.

## Deployment — GitHub to Vercel

1. Download the ZIP, extract it and open the `sideline-sports` folder.
2. In GitHub, create an **empty repository**. Upload *the contents of the folder* to the repository root, not the enclosing folder.
3. Go to **Vercel → Add New → Project → Import Git Repository** and choose that repository.
4. In Vercel, choose **Framework Preset: Other** (or allow automatic detection), **Root Directory: `./`**. The project has **no build command** and **no output directory**. Deploy.
5. The site is served from `/` and the Node.js serverless endpoints are `/api/news`, `/api/scores?date=YYYYMMDD`, and `/api/markets`, `/api/standings?league=euro`, `/api/basketball?league=euro`, and `/api/match?league=euro&event=CODE&season=E2026`.

No `npm install`, token, API key, or `.env` variables are necessary. `vercel.json` configures Node functions.

### Run on your computer

Requires Node 20+. From this folder:

```bash
npm run dev
```

Open `http://localhost:3000`. The Node server is only for local development; Vercel uses the `api` folder as serverless functions.

### Tests

```bash
npm test
```

The test suite validates RSS parsing, grouping and both scoreboard mappers. UI navigation was smoke-tested separately with mocked responses in Chromium for desktop and mobile layouts. We **could not make live external requests from the file-building environment**, so after deployment you must confirm the actual RSS/score endpoints work from Vercel's network.

## Data sources and restrictions

News feeds: Google News RSS queries, Gazzetta public RSS, SPORT24 public RSS, BBC Sport RSS, ESPN public site news feeds. RSS providers can block, redirect, or change feeds. Media copyrights remain with each publisher. Show short snippets and deep links only, not complete articles. Check publisher feed and reuse terms before promoting a public/commercial instance.

Scores: `site.api.espn.com/apis/site/v2/sports/.../scoreboard` and `api-live.euroleague.net/v2/competitions/E/seasons/EYYYY/games`. These are not contracted or supported production APIs. Throttle/cache or replace them with a licensed provider for reliable large-scale production use.

The **EuroLeague** source is an optional best-effort adapter. If its rate limiter or schema changes, EuroLeague may show zero fixtures and the unavailable source is reported in the API metadata. EuroLeague season snapshot is cached in-process for 10 minutes; on serverless many cold instances can still hit the upstream separately.

**Algorithm:** Each fetched article is classified with a transparent keyword heuristic and similar titles are grouped by normalized token Jaccard overlap. It is **not ML, AI reasoning, sentiment analysis, fact-checking, or a comprehensive media audit**. Word similarities can mistakenly combine or separate related stories.

**Language:** Interface is localized to Greek and English. Article headlines and publisher excerpts **remain in the original publication language**, without automated translation.

**Location and personal data:** Only `Europe/Athens` is used as the display timezone; no geolocation request. Bookmarks and followed teams remain in the browser's local storage, with no authentication/backend database.

**PWA:** Shell assets can be cached for offline browsing. API routes are intentionally not cached by the service worker; offline news won't be mislabeled as current.

## Structure

- `index.html` — page structure and views
- `style.css` — custom responsive editorial design
- `app.js` — all browser interactivity
- `api/news.js` — RSS and ESPN articles, matching, coverage
- `api/scores.js` — ESPN and EuroLeague fixtures
- `lib/shared.js` — HTTP caching, XML sanitization and utilities
- `server.js` — zero-dependency local server
- `sw.js` and `manifest.webmanifest` — installable PWA shell
- `tests/` — Node test runner suite

## Improvements for v3

A licensed multi-source data agreement; deeper entity resolution for identical stories; proper live EuroLeague scores with longer-lived distributed caching; optional user profiles/sync; native-language translation with explicit machine-translation attribution; user-configured push alerts; audited topic clustering and cross-source corrections timeline.



## SIDELINE v3 — October 2026

- New live team-directory endpoint `/api/teams` loads ESPN clubs from multiple soccer/basketball leagues; the client falls back to a large curated **selection list** when no directory response is available. The fallback is not a current squad/league roster assertion.
- `api/standings?league=epl` returns league standings, wins, points, team metadata and subgroups. Data comes from public, **unofficial** ESPN endpoints. Competitions unsupported by ESPN return explicit unavailable states.
- `api/match?league=nba&event=...` provides match box statistics for available ESPN fixtures. Unsupported events return empty without invented values.
- Expanded scoreboard covers 21 competitions with provider errors surfaced transparently.
- Improved sports market discovery: Polymarket Gamma sports tagged events; Kalshi live sports series/events via the external public Trade API; only real market prices are shown and read-only. Provider data may still be unreachable, restricted, missing or sparse.
- `api/translate?from=en&to=el&text=...` supports **on-demand**, explicitly machine-labeled title + short preview translation via MyMemory. It is subject to third-party rate limits; original headlines are preserved. Full licensed article bodies are not redistributed.
- Responsive visual redesign, search for teams, independent leagues section, standings previews, more news RSS inputs and localized controls.
- Run `npm test` for local unit tests. Interactive visual QA performed with mocked upstream API responses, not a substitute for production feed checks.

### Limitations
All external feeds (ESPN, EuroLeague, BBC, Google News RSS, Polymarket, Kalshi, MyMemory) are third-party interfaces and may restrict use, change fields or throttle requests. No sports, markets, scores or other data are invented when a provider does not respond. Prices of prediction contracts are not statistical forecasts. Original article links remain credited to publishers and require navigating to their source to read full text.
