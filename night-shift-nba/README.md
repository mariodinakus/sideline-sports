# NIGHT SHIFT NBA — preview

Dedicated NBA-only dashboard, mobile-first charcoal / white / muted-red UI.

## Data
The app uses server-side read-only proxies for ESPN's public and **unofficial** JSON endpoints. No fake scores or statistics. ESPN can rate limit or change its schemas. Serverless caching is applied, and the app reports unavailable feeds instead of manufacturing values.

- Scoreboard by selected date + local Athens times
- All NBA teams directory and individual team rosters
- All rostered players available from ESPN (incremental full-directory fetch, failures reported)
- Player detail with ESPN athlete overview/stats
- Conference standings, game box scores, favorites saved locally
- Android-friendly PWA install with manifest
- Individual links in client hash routes

## Deploy
Production root: this folder (\`night-shift-nba\`). Vercel: Framework = Other; Node >=22. No installation or build step necessary. Endpoints run as Vercel Node functions (\`api/data.js\`).

## APK
This version is a functioning mobile PWA, not a signed Android .apk. Native APK packaging requires Capacitor/Android Gradle or an EAS build environment, Android signing configuration, and a successful build run. **Do not describe it as built** until a real artifact exists.

## Sources
Public ESPN site v2: /scoreboard, /teams, /teams/{id}/roster, /summary, /apis/v2/.../standings.
ESPN web v3: /athletes/{id}/overview and /stats.

This app is independent of NBA, ESPN, and sports providers.
