# FixMaadi 24/7 Cloud Deployment Guide

This guide details how to deploy **FixMaadi** to a free cloud server so it runs **24 hours a day, 7 days a week**, completely independent of your laptop.

---

## Option 1: Free 1-Click Deployment on Render.com (Recommended)

[Render.com](https://render.com) offers free 24/7 cloud server hosting for web applications.

### Steps:

1. **Upload Project to GitHub**:
   Push the code from `/Users/vinodchinnannavar/.gemini/antigravity/scratch/fixmaadi-bot` to a private or public GitHub repository.

2. **Connect to Render**:
   - Go to [Render.com](https://render.com) and create a free account.
   - Click **New +** ➔ **Web Service**.
   - Connect your GitHub repository.

3. **Deploy**:
   - Select **Docker** as the Environment.
   - Click **Create Web Service**.
   - Render will build the container using our included `Dockerfile` and start the server automatically!

4. **Link WhatsApp One Time**:
   - Once deployed, Render will give you a public URL (e.g. `https://fixmaadi-bot.onrender.com`).
   - Open that URL in your browser to view the **FixMaadi Control Panel**.
   - Scan the QR code with WhatsApp on your phone.
   - Done! Your phone is now paired to the cloud server, and your bot will answer customer messages 24/7 even if your laptop is closed.

---

## Option 2: Production Scaling with Meta WhatsApp Cloud API

When FixMaadi scales past the pilot phase (1,000+ daily orders), our Tech & Infrastructure Department will migrate the bot to the **Official Meta WhatsApp Cloud API**:

* **Zero QR Scanning**: Uses official phone number verification via Meta Developer Portal.
* **Infinite Concurrency**: Can handle 10,000+ messages per minute without rate limits.
* **Official Blue Checkmark Verification**: Gives FixMaadi official Meta verified business status.
* **Direct Webhook**: Integrates directly into cloud databases (Firebase / AWS DynamoDB).

---

## Summary of Completed Deployment Assets Created:
- 📄 `Dockerfile` ([scratch/fixmaadi-bot/Dockerfile](file:///Users/vinodchinnannavar/.gemini/antigravity/scratch/fixmaadi-bot/Dockerfile))
- 📄 `render.yaml` ([scratch/fixmaadi-bot/render.yaml](file:///Users/vinodchinnannavar/.gemini/antigravity/scratch/fixmaadi-bot/render.yaml))
- 📄 `server.js` ([scratch/fixmaadi-bot/server.js](file:///Users/vinodchinnannavar/.gemini/antigravity/scratch/fixmaadi-bot/server.js))
