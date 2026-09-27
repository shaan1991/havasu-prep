# Havasu Prep

A public trip planner for Havasupai hikers. Sign in with Google, take a 60 second activity quiz, get a week by week training plan matched to your fitness and trip date, log every session, keep an editable packing list, save notes, and carry the trail guide with permits, rules, safety, and emergency contacts.

Stack: Node 24, Express 4, node:sqlite, Passport Google OAuth, vanilla HTML CSS JS. No build step.

## Run it locally

```bash
npm install
cp .env.example .env   # then fill in your Google OAuth credentials
node server.js
```

Open http://localhost:3000.

For a quick look without Google credentials, testing only:

```bash
ALLOW_DEV_LOGIN=1 node server.js
```

then open http://localhost:3000/auth/dev in the browser. Never enable `ALLOW_DEV_LOGIN` on a public server.

## Google OAuth setup

1. Go to the Google Cloud Console, create a project, and enable the Google People API (or just OAuth consent).
2. Create an OAuth client ID of type Web application.
3. Under Authorized redirect URIs add:
   - `http://localhost:3000/auth/google/callback` for local dev
   - `https://YOUR-DOMAIN/auth/google/callback` for production
4. Put the client ID and secret in `.env`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
PUBLIC_URL=https://YOUR-DOMAIN   # only needed in production
JWT_SECRET=a-long-random-string
```

`PUBLIC_URL` sets the callback URL in production. Without it, the callback defaults to the request host, which works behind most proxies.

## Deploy notes

### Recommended: Vercel + Neon ($0, no card)

Vercel Hobby is free with no credit card, wakes from idle in about a second,
and deploys straight from GitHub. The app ships a serverless entry
(`api/index.js` + `vercel.json`); the same code still runs as a plain Node
server anywhere else (`node server.js`).

Render free web services have no persistent disk, so the hosted copy stores its
data in Postgres instead of the SQLite file. Set `DATABASE_URL` and the app
switches automatically. Neon free tier (512 MB, no credit card, hard caps so it
can never bill you) is plenty for this app.

1. Create a free Neon project, copy the connection string.
2. Push this folder to a GitHub repo.
3. On Vercel: Add New, Project, import the repo. No build step needed.
4. In the Vercel dashboard set env vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `JWT_SECRET` (any long random string), and `APP_URL`
   to the Vercel URL (for example `https://havasu-prep.vercel.app`).
5. Add `https://YOUR-VERCEL-URL/auth/google/callback` as an authorized redirect
   URI in the Google Cloud Console OAuth client.

### Alternative: Render + Neon ($0, no card)

Same database setup. On Render: New, Web Service, point it at the repo. Build
command `npm install`, start command `node server.js`, same env vars as above.
Tradeoff: the service sleeps after 15 minutes idle, so the first visit after a
quiet spell takes about 30 to 60 seconds to wake. Data is safe in Neon across
sleeps and redeploys.

### Local dev

No `DATABASE_URL` means SQLite at `./data/havasu.db`, zero setup. `JWT_SECRET`
falls back to `./data/jwt.secret` when the env var is unset.

## What is inside

- `server.js` — Express API, OAuth flow, all endpoints (runs standalone, or exports the app for serverless)
- `api/index.js` + `vercel.json` — Vercel serverless entry, every request routes through the same Express app
- `db.js` — data layer (SQLite locally, Postgres via DATABASE_URL in production), JWT issue and verify
- `plan.js` — quiz scoring, plan engine, packing list template
- `public/index.html` — public landing page
- `public/app.html` — the logged in app shell
- `public/js/` — one file per tab: home, quiz (plan), train, pack, notes, guide, settings, plus core

## Content verification

Trail distances, permit prices, rules, and contact numbers in the Guide tab were verified against official sources (NPS, the Havasupai Tribe official FAQ, Coconino County, hospital listings) in September 2026. Permit rules and fees change by season, so travelers should always confirm with the Tribe official site before their trip. The app is an independent planner and is not affiliated with the Havasupai Tribe.
