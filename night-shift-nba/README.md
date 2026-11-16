# NBA ATLAS v10

Clean rebuild of the NBA-only dashboard (nba-atlas.vercel.app).

## Structure
- `index.html`, `style.css`, `app.js` — single client, hash routes: home, games, game/:id, standings, power, players, player/:id, teams, team/:id, goat, history, model, search.
- `atlas-data.js` — static history: Finals 1947–2026, ring holders, career leaders (through 2025–26).
- `api/` — Vercel Node functions: `data` (ESPN scoreboard/standings/teams/roster/game), `power` (power index & player stats), `goat`, `history` (player career/search), `intel` (Courtside IQ forecast ledger), `markets` (Polymarket/Kalshi, read-only), `sideline` (news).

## Design
Ink black, basketball orange accent, team colours per page. Anton / Fira Sans Extra Condensed display, Inter body.

## Data honesty
No fabricated values. Missing upstream data shows as `—`. Models are labelled estimates.
