# best4.golf — Golf Pool Manager

Single-file web app for running a PGA tournament pool. Commissioner interface + player-facing leaderboard.

## Features

- **Leaderboard** — Best 4 of 5 scoring, cut elimination, Perfect Pick (+PP) benchmark
- **Score sync** — Fetch live scores from ESPN with one click (preview before applying)
- **What If** — Scenario modeling against any hypothetical score
- **Entries** — Player self-submission with Venmo/Zelle/cash payment tracking
- **Payouts** — Auto-calculated with tiebreaker resolution and bar staff tip pledge
- **Rules tab** — Printable one-page rule sheet that pulls from your config
- **QR code** — Auto-generated from your deployment URL for physical distribution

## Deployment (Vercel — ~2 minutes)

### First deploy

```bash
npm i -g vercel          # install Vercel CLI once
cd best4-golf
vercel                   # follow prompts — you get a live URL instantly
```

### Add shared database (optional but recommended)

1. Go to your project in [vercel.com/dashboard](https://vercel.com/dashboard)
2. Storage → Create → KV
3. Link to your project → Redeploy

Without KV, the app falls back to browser localStorage (data lives on the device that entered it).

### Set commissioner PIN

In Vercel dashboard → Project → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `COMMISSIONER_PIN` | your chosen PIN |

Redeploy after adding the variable.

### Point your domain

Vercel dashboard → Project → Settings → Domains → Add `best4.golf`

---

## Project structure

```
best4-golf/
├── public/
│   └── index.html      ← entire app (single file)
├── api/
│   ├── espn.js         ← ESPN score sync proxy
│   ├── data.js         ← shared KV data store
│   └── pin.js          ← commissioner PIN verification
├── vercel.json         ← routing config
├── package.json
└── README.md
```

## GitHub

Push this directory to a GitHub repo, then import it in Vercel for automatic deploys on every commit.

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/best4-golf.git
git push -u origin main
```

Then in Vercel: New Project → Import Git Repository → select your repo.

---

## Local testing

Open `public/index.html` directly in a browser. All features work except ESPN sync (needs the proxy) and shared data (needs KV). The app detects the missing API and falls back gracefully.

## Freemium pricing (future)

The app is architected for a freemium model: basic features free, premium features (additional rounds, multiple tournaments, advanced analytics) priced per entry. Pricing config lives in `public/index.html` — search for `FREEMIUM`.
