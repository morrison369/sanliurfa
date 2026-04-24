#!/bin/bash
# Şanlıurfa.com - CWP Shared Hosting Deployment Script
# Kullanım: bash scripts/deploy-cwp.sh
# Not: Domain kullanıcısı ile çalıştırılır, root gerektirmez.

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
PM2_NAME="${PM2_NAME:-sanliurfa-app}"
PORT="${PORT:-4321}"
BRANCH="${BRANCH:-main}"

echo "CWP deploy başlatılıyor"
echo "Kullanıcı: $(whoami)"
echo "Dizin: $APP_DIR"

if [ "$(id -u)" -eq 0 ]; then
  echo "Hata: Bu script root ile değil, CWP domain kullanıcısı ile çalıştırılmalıdır."
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "Hata: APP_DIR bulunamadı: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

if [ -d .git ]; then
  echo "Kod güncelleniyor (branch: $BRANCH)"
  git pull origin "$BRANCH" || echo "Uyarı: git pull başarısız, yerel kodla devam ediliyor."
else
  echo "Uyarı: .git dizini yok, git pull atlanıyor."
fi

echo "Bağımlılıklar kuruluyor"
if [ -f package-lock.json ]; then
  npm ci --omit=dev || npm install --legacy-peer-deps --production
else
  npm install --legacy-peer-deps --production
fi

echo "Build alınıyor"
npm run build

echo "PM2 process güncelleniyor: $PM2_NAME"
pm2 restart "$PM2_NAME" 2>/dev/null || pm2 start ecosystem.config.cjs --name "$PM2_NAME"
pm2 save

echo "Health check"
sleep 3
HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/api/health" || echo "000")"

if [ "$HTTP_STATUS" != "200" ]; then
  echo "Hata: Health check başarısız (HTTP $HTTP_STATUS)"
  pm2 logs "$PM2_NAME" --lines 30 --nostream || true
  exit 1
fi

echo "Deployment başarılı (HTTP $HTTP_STATUS)"
