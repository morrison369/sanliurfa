#!/usr/bin/env bash
# CWP incident bundle collector
# Usage: bash scripts/cwp-incident-bundle.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
PM2_NAME="${PM2_NAME:-sanliurfa-app}"
STATE_DIR="$APP_DIR/backups/.ops"
BUNDLE_ROOT="$APP_DIR/backups/incidents"
TS="$(date +%Y%m%d_%H%M%S)"
BUNDLE_DIR="$BUNDLE_ROOT/incident_$TS"

mkdir -p "$BUNDLE_DIR" "$STATE_DIR"

# Ensure latest report exists (best effort)
if [ -f "$APP_DIR/scripts/cwp-ops-report.sh" ]; then
  bash "$APP_DIR/scripts/cwp-ops-report.sh" >/dev/null 2>&1 || true
fi

# PM2 process snapshot
pm2 status > "$BUNDLE_DIR/pm2-status.txt" 2>&1 || true
pm2 logs "$PM2_NAME" --lines 200 --nostream > "$BUNDLE_DIR/pm2-${PM2_NAME}-last200.log" 2>&1 || true

# Health + env snapshot (sanitized: only key names, no values)
{
  echo "generated_at=$(date -u +%FT%TZ)"
  echo "hostname=$(hostname 2>/dev/null || echo unknown)"
  echo "user=$(whoami 2>/dev/null || echo unknown)"
  echo "node=$(node -v 2>/dev/null || echo unknown)"
  echo "npm=$(npm -v 2>/dev/null || echo unknown)"
  echo "pm2=$(pm2 -v 2>/dev/null || echo unknown)"
} > "$BUNDLE_DIR/runtime.txt"

if [ -f "$APP_DIR/.env" ]; then
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$APP_DIR/.env" | cut -d= -f1 | sort -u > "$BUNDLE_DIR/env-keys.txt" || true
fi

# Include ops artifacts if available
cp "$STATE_DIR/report.json" "$BUNDLE_DIR/report.json" 2>/dev/null || true
cp "$STATE_DIR/report.md" "$BUNDLE_DIR/report.md" 2>/dev/null || true
cp "$STATE_DIR/events.log" "$BUNDLE_DIR/events.log" 2>/dev/null || true
cp "$STATE_DIR/cron-doctor.log" "$BUNDLE_DIR/cron-doctor.log" 2>/dev/null || true
cp "$STATE_DIR/cron-smoke.log" "$BUNDLE_DIR/cron-smoke.log" 2>/dev/null || true
cp "$STATE_DIR/cron-report.log" "$BUNDLE_DIR/cron-report.log" 2>/dev/null || true
cp "$STATE_DIR/cron-rotate.log" "$BUNDLE_DIR/cron-rotate.log" 2>/dev/null || true
cp "$STATE_DIR/cron-cleanup.log" "$BUNDLE_DIR/cron-cleanup.log" 2>/dev/null || true

# File list
find "$BUNDLE_DIR" -maxdepth 1 -type f -printf "%f\n" | sort > "$BUNDLE_DIR/files.txt"

echo "Incident bundle hazır: $BUNDLE_DIR"
