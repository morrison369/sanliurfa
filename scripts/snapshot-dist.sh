#!/bin/bash
# ============================================
# Snapshot dist/ before deploy
# Şanlıurfa.com — pair with rollback-deploy.sh
# ============================================
#
# Run BEFORE `npm run build` in deploy pipeline.
# Keeps last N snapshots for fast rollback.
#
# Usage:
#   bash scripts/snapshot-dist.sh                # default 5 snapshot retention
#   SNAPSHOT_RETENTION=10 bash scripts/snapshot-dist.sh

set -e

APP_DIR="${APP_DIR:-$(pwd)}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-${APP_DIR}/dist-snapshots}"
RETENTION="${SNAPSHOT_RETENTION:-5}"

cd "$APP_DIR"

if [ ! -d "dist" ]; then
  echo "ℹ️  No dist/ to snapshot (first deploy?). Skipping."
  exit 0
fi

mkdir -p "$SNAPSHOT_DIR"

SNAPSHOT_NAME="dist-$(date +%Y%m%d_%H%M%S)"
echo "📸 Snapshotting current dist → $SNAPSHOT_NAME"

# Use cp -al if available (hard links — instant), fall back to cp -r
if cp -al dist "$SNAPSHOT_DIR/$SNAPSHOT_NAME" 2>/dev/null; then
  echo "✅ Hardlinked snapshot (instant)"
else
  cp -r dist "$SNAPSHOT_DIR/$SNAPSHOT_NAME"
  echo "✅ Copied snapshot"
fi

# Cleanup old snapshots (keep last N)
COUNT=$(ls -1 "$SNAPSHOT_DIR" | wc -l)
if [ "$COUNT" -gt "$RETENTION" ]; then
  TO_DELETE=$((COUNT - RETENTION))
  echo "🧹 Cleaning $TO_DELETE old snapshot(s)"
  ls -1t "$SNAPSHOT_DIR" | tail -n +$((RETENTION + 1)) | while read snap; do
    echo "  - $snap"
    rm -rf "$SNAPSHOT_DIR/$snap"
  done
fi

echo ""
echo "Current snapshots:"
ls -1t "$SNAPSHOT_DIR"
