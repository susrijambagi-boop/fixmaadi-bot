#!/usr/bin/env bash
# One-time setup script for a fresh Oracle Cloud Always Free (Ubuntu ARM) instance.
# Run this ON the VM, over SSH, as the ubuntu user: bash oracle-setup.sh
set -euo pipefail

REPO_URL="https://github.com/susrijambagi-boop/fixmaadi-bot.git"
APP_DIR="$HOME/fixmaadi-bot"

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Installing PM2..."
sudo npm install -g pm2

echo "==> Cloning repo..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "==> Installing dependencies..."
npm ci --omit=dev

if [ ! -f "$APP_DIR/.env" ]; then
  echo "==> Creating .env from template — EDIT THIS with real values before starting:"
  cp .env.example .env
  echo "    nano $APP_DIR/.env"
fi

echo "==> Registering PM2 process..."
pm2 start server.js --name fixmaadi-command-center
pm2 save

echo "==> Enabling PM2 on boot (so a VM reboot auto-restarts the bot)..."
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash

echo ""
echo "Done. Visit http://<this-vm-public-ip>:3000 in a browser to scan the WhatsApp QR code."
echo "Check logs with: pm2 logs fixmaadi-command-center"
