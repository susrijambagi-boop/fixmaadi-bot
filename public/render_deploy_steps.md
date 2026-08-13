# Render.com 24/7 1-Click Free Cloud Deployment Guide

Follow these simple 1-click steps to deploy FixMaadi to **Render.com** so it runs 24/7 in the cloud even when your laptop is turned off!

---

## 🚀 1-Click Deployment Steps

### Step 1: Push Code to GitHub
Open your terminal in `/scratch/fixmaadi-bot` and run:
```bash
git init
git add .
git commit -m "FixMaadi 24/7 Production Release"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/fixmaadi-bot.git
git branch -M main
git push -u origin main
```

---

### Step 2: Connect to Render.com (100% Free)
1. Go to **[https://dashboard.render.com](https://dashboard.render.com)** (Sign in with GitHub).
2. Click **New +** -> Select **Web Service**.
3. Connect your `fixmaadi-bot` repository.
4. Render will automatically detect `Dockerfile` and `render.yaml`!

---

### Step 3: Deployment Settings
- **Name**: `fixmaadi-bagalkot`
- **Environment**: `Docker`
- **Region**: `Singapore (Asia Pacific)` or `Frankfurt`
- **Plan**: `Free ($0/mo)`
- **Start Command**: `node server.js`

Click **Deploy Web Service**! Render will build and launch your bot on a permanent 24/7 URL (e.g. `https://fixmaadi-bagalkot.onrender.com`).

---

🎉 FixMaadi will run 24/7 continuously in the cloud!
