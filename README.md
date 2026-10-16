# SIDELINE — Sports Intelligence

**News is not just a feed. It's a network of sources.**

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
5. The site is served from `/` and the Node.js serverless endpoints are `/api/news`, `/api/scores?date=YYYYMMDD`, and `/api/markets`.

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

