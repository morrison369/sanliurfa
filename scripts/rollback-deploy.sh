#!/bin/bash
# ============================================
# PM2 Rollback Playbook
# Şanlıurfa.com production rollback
# ============================================
#
# Use case: deployment broke prod (5xx, OOM, regression)
# Strategy: snapshot dist/ before each deploy → restore previous
#
# Usage:
#   bash scripts/rollback-deploy.sh                # latest snapshot
#   bash scripts/rollback-deploy.sh dist-2026-05-01 # specific snapshot
#
# Prerequisite: deploy script must call snapshot_dist() before npm run build

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="${APP_DIR:-$(pwd)}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-${APP_DIR}/dist-snapshots}"

cd "$APP_DIR"

echo "🔄 Şanlıurfa.com — PM2 Rollback Playbook"
echo "========================================"
echo "App dir:      $APP_DIR"
echo "Snapshot dir: $SNAPSHOT_DIR"
echo ""

# 1. Pick snapshot to restore
if [ -z "$1" ]; then
  SNAPSHOT=$(ls -1t "$SNAPSHOT_DIR" 2>/dev/null | head -1)
  if [ -z "$SNAPSHOT" ]; then
    echo -e "${RED}❌ No snapshot found in $SNAPSHOT_DIR${NC}"
    echo "Did you run scripts/snapshot-dist.sh before deploy?"
    exit 1
  fi
  echo -e "${YELLOW}Auto-selected latest snapshot: $SNAPSHOT${NC}"
else
  SNAPSHOT="$1"
  if [ ! -d "$SNAPSHOT_DIR/$SNAPSHOT" ]; then
    echo -e "${RED}❌ Snapshot not found: $SNAPSHOT_DIR/$SNAPSHOT${NC}"
    echo "Available snapshots:"
    ls -1t "$SNAPSHOT_DIR" 2>/dev/null
    exit 1
  fi
fi

# 2. Confirm
echo ""
echo -e "${YELLOW}⚠️  About to:${NC}"
echo "  1. pm2 stop sanliurfa"
echo "  2. mv dist/ to dist-broken-$(date +%s)/"
echo "  3. cp snapshot $SNAPSHOT → dist/"
echo "  4. pm2 start sanliurfa"
echo "  5. health check"
echo ""
read -p "Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# 3. Stop PM2 (graceful, kill_timeout 10s)
echo "🛑 Stopping PM2..."
pm2 stop sanliurfa || true

# 4. Backup current broken dist (forensic — keep for inspection)
if [ -d "dist" ]; then
  BROKEN_NAME="dist-broken-$(date +%Y%m%d_%H%M%S)"
  echo "💾 Saving current broken dist → $BROKEN_NAME"
  mv dist "$SNAPSHOT_DIR/$BROKEN_NAME"
fi

# 5. Restore snapshot
echo "📦 Restoring snapshot: $SNAPSHOT"
cp -r "$SNAPSHOT_DIR/$SNAPSHOT" dist

# 6. Start PM2
echo "🚀 Starting PM2..."
pm2 start ecosystem.config.cjs --env production

# 7. Wait for app to be ready
echo "⏳ Waiting 10s for app to boot..."
sleep 10

# 8. Health check
HEALTH_URL="${SITE_URL:-http://localhost:3000}/api/health"
echo "🏥 Health check: $HEALTH_URL"
if curl -fsS "$HEALTH_URL" > /dev/null; then
  echo -e "${GREEN}✅ Rollback successful — app is healthy${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Investigate broken dist: $SNAPSHOT_DIR/$BROKEN_NAME"
  echo "  2. git log to identify regression commit"
  echo "  3. Fix issue, deploy again with snapshot-dist.sh"
else
  echo -e "${RED}❌ ROLLBACK FAILED — app is not healthy${NC}"
  echo "Investigate immediately:"
  echo "  pm2 logs sanliurfa --lines 100"
  exit 1
fi
