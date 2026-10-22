# MONO BASKET

Independent NBA forecasting radar for Render, developed alongside but **not served by Courtside IQ**.

## Features
- Basketball forecast interface inspired by MONO KAIROS: Game Radar, Model Lab, Accuracy Tracker, and Sources & Learning.
- Conditionally active 9-model consensus. Predictions include score, margin, total, win probability, and 1/2 picks.
- Models: scoring attack/defence, net rating, Pythagorean, Bayesian win rates, last-ten form, recent weighted momentum, Elo, sourced conditions, historical validated online ridge.
- Pre-tipoff locked forecasts **from a timestamped GitHub ledger** are distinct from mutable, provisional forecasts. No retrospective reconstruction.
- Historical online evaluation is explicitly **separate from prospective accuracy**. Only finished archived forecasts count as verified wins.
- ESPN public scores and standings fetched server-side without browser API keys.
- Works on phones, desktops and tablet screens.

## Deploy on Render
From the existing repository [mariodinakus/sideline-sports](https://github.com/mariodinakus/sideline-sports):
1. New > Blueprint, connect the GitHub repository and point it at the **root `render.yaml`**.
2. Render will provision a Node.js web service called **mono-basket**, region Frankfurt, root directory `mono-basket`.
3. The Render service will expose its own `*.onrender.com` URL. No URL exists until Render creates the service.

Alternative: New > Web Service, repo `mariodinakus/sideline-sports`, root `mono-basket`, build `npm install --omit=dev`, start `npm start`.

## Run locally
```bash
cd mono-basket
npm install
npm run check
npm test
npm start
# http://localhost:3000
```

## Data and limits
- ESPN unofficial public feeds may fail or change. The API returns a visible warning instead of fabricated results.
- Forecast archive is read from `courtside-iq/data/prediction-ledger.json` via GitHub raw; fetched every two minutes. The Courtside GitHub Actions scheduler still owns prediction creation and settling.
- Provisional matchups do NOT automatically qualify for success statistics; only locked pre-tip forecasts do.
- Training/backtesting is time-ordered but not a guaranteed untouched future holdout. Historical NBA-only. No verified minute-weighted injury effect, confirmed lineups, or sports betting guarantees.
- Render service is isolated under `mono-basket`; changes to the Courtside archive do not trigger Render deploys since `rootDir` filters them, while the running service fetches ledger updates.

## Routes
- `GET /`: interface
- `GET /api/dashboard?date=2026-10-22`: ESPN games, ensemble, true prediction archive and historical verification
- `GET /health`: service health

No authentication secrets, API tokens, or persistent databases are needed for the viewer. All verified source values remain attributed.
