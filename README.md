# FixMaadi

A WhatsApp-native, 0% commission home services platform for Bagalkot, Karnataka.

- **Live dashboard / investor landing page:** set once the Render service is created — see Deployment below
- **Architecture & tech stack:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Maintenance checklist:** [`docs/MAINTENANCE_CALENDAR.md`](docs/MAINTENANCE_CALENDAR.md)
- **Brand kit:** [`public/branding_kit.pdf`](public/branding_kit.pdf)

## Quick start (local development)

```bash
npm install
cp .env.example .env   # fill in RESEND_API_KEY / GEMINI_API_KEY / ADMIN_USERNAME / ADMIN_PASSWORD
node server.js
```

Opens the admin dashboard at `http://localhost:3000`, and the WhatsApp socket will print a QR code to scan.

### Admin dashboard login

The dashboard (everything except the public `investors.html` landing page) is protected by HTTP Basic Auth. `ADMIN_USERNAME` and `ADMIN_PASSWORD` are **required** — if either is missing, the server returns 503 for the dashboard and every admin API instead of opening unauthenticated. Set both in `.env` locally and in Render's environment variables in production.

## Deployment

Deployed on **Render** (free tier, no card required), auto-deploying on every push to `main`. Render's free tier has no persistent disk, so `bookings`/`vendors`/`customerDatabase`/etc. are stored in **MongoDB Atlas** (also free, no card) instead of a local file — set `MONGODB_URI` in Render's environment variables (see `.env.example`). Without it set, the app falls back to a local `database.json` file, which is fine for local dev but would lose data on every restart in production.

**Known limitation:** the WhatsApp session (`baileys_auth_info/`) and any uploaded vendor photo/Aadhaar files still live on Render's local disk, which is wiped on restart — so a restart means rescanning the WhatsApp QR code once, and any vendor added since the last restart needs its photo/Aadhaar re-uploaded. The self-ping in `server.js` (pings `RENDER_EXTERNAL_URL` every 12 minutes) keeps the free instance from sleeping due to inactivity, but Render can still restart the container periodically for its own maintenance — that's an accepted tradeoff of the free tier, not a bug.

## Repository layout

```
server.js              — the entire backend: WhatsApp bot + dashboard API
public/                — admin dashboard (index.html), landing page (investors.html), branding assets, downloadable docs
docs/                  — architecture + maintenance documentation
deploy/                — deployment helper scripts
.env.example           — required environment variables (copy to .env, never commit .env)
```

## Health check

The dashboard's **🔍 Health Scan** tab checks for stuck bookings, incomplete provider onboarding, missing config, and WhatsApp connection issues — run it any time something feels off, and it'll generate a ready-to-paste prompt if it finds anything.
