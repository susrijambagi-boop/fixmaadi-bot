# FixMaadi

A WhatsApp-native, 0% commission home services platform for Bagalkot, Karnataka.

- **Live dashboard:** https://fixmaadiadmin.up.railway.app
- **Investor / info landing page:** https://fixmaadiadmin.up.railway.app/investors.html
- **Architecture & tech stack:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Maintenance checklist:** [`docs/MAINTENANCE_CALENDAR.md`](docs/MAINTENANCE_CALENDAR.md)
- **Brand kit:** [`public/branding_kit.md`](public/branding_kit.md)

## Quick start (local development)

```bash
npm install
cp .env.example .env   # fill in RESEND_API_KEY / GEMINI_API_KEY if you have them
node server.js
```

Opens the admin dashboard at `http://localhost:3000`, and the WhatsApp socket will print a QR code to scan.

## Deployment

Deployed on Railway, auto-deploying on every push to `main`. A persistent Volume mounted at `/data` keeps `database.json` and the WhatsApp session (`baileys_auth_info/`) alive across redeploys — see `docs/ARCHITECTURE.md` for why that matters.

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
