# FixMaadi — Maintenance Calendar

A recurring checklist. This isn't automated (no cron job runs this for you) — set a phone reminder for each cadence below, or just check this file when in doubt.

## Weekly

- [ ] **Run the Health Scan** — dashboard → 🔍 Health Scan tab → "Run Full Scan Now". Copy the generated prompt and paste it to Claude if anything comes back.
- [ ] **Check WhatsApp connection status** — dashboard top-right badge should say "Connected" (green). If not, rescan the QR under WhatsApp Connection.
- [ ] **Glance at pending bookings** — anything sitting unassigned for a while?

## Monthly

- [ ] **Check Railway billing/usage** — [railway.app](https://railway.app) → your project → Usage. Confirm you're within expected spend.
- [ ] **Check Resend email quota** — [resend.com](https://resend.com) dashboard, if you're using the email digest feature.
- [ ] **Review the provider roster** — any technicians who should be marked unavailable/removed? Any missing photo/Aadhaar (Health Scan will also flag this)?
- [ ] **Clean up test/duplicate data** — if you've been testing bookings, cancel or note them so they don't skew analytics.

## Quarterly

- [ ] **Rotate API keys** — Resend API key, Gemini API key. Generate new ones, update the `RESEND_API_KEY`/`GEMINI_API_KEY` env vars in Railway, revoke the old ones.
- [ ] **Review who has access** — Railway project members, GitHub repo collaborators. Remove anyone who shouldn't still have access.
- [ ] **Re-read `docs/ARCHITECTURE.md`'s "Known architectural constraints"** — is the no-auth dashboard or single-WhatsApp-connection limit still acceptable at your current scale?

## As-needed (not scheduled, but don't skip)

- **Any time you suspect a leaked credential** (shared a screenshot with something visible, repo was public longer than expected, etc.) — rotate it immediately, don't wait for the quarterly cycle.
- **Before onboarding a new developer/AI assistant to this repo** — read them `docs/ARCHITECTURE.md` first so they don't have to rediscover the constraints the hard way.
- **After any Railway domain or service rename** — update anywhere the old URL is hardcoded (this has bitten us before — check `docs/ARCHITECTURE.md` and any saved bookmarks).
