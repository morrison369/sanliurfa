#!/usr/bin/env bash
# CWP cron freshness checker
# Usage: bash scripts/cwp-cron-freshness.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
OPS_DIR="$APP_DIR/backups/.ops"
HEARTBEAT_DIR="$OPS_DIR/cron-heartbeats"
NOW_TS="$(date +%s)"
INSTALLED_AT_FILE="$OPS_DIR/cron-installed-at"
CRON_FRESHNESS_STRICT="${CRON_FRESHNESS_STRICT:-0}"

# job:max_age_seconds
checks=(
  "doctor-hourly:7200"
  "smoke-6hour:28800"
  "report-daily:93600"
  "rotate-events-daily:93600"
  "cleanup-weekly:691200"
  "incident-cleanup-weekly:691200"
  "daily-ops:93600"
  "weekly-audit:691200"
  "release-readiness:93600"
)

fail=0

get_mtime() {
  local file="$1"
  stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null || echo 0
}

for item in "${checks[@]}"; do
  job="${item%%:*}"
  max_age="${item##*:}"
  ok_path="$HEARTBEAT_DIR/$job.ok"
  fail_path="$HEARTBEAT_DIR/$job.fail"

  if [ ! -f "$ok_path" ]; then
    if [ -f "$fail_path" ]; then
      fail_mtime="$(get_mtime "$fail_path")"
      fail_age=$((NOW_TS - fail_mtime))
      echo "[FAIL] son heartbeat fail: $job age=${fail_age}s"
      fail=1
    else
      grace_ok=0
      if [ -f "$INSTALLED_AT_FILE" ] && [ "$CRON_FRESHNESS_STRICT" != "1" ]; then
        installed_at="$(cat "$INSTALLED_AT_FILE" 2>/dev/null || echo 0)"
        install_age=$((NOW_TS - installed_at))
        if [ "$install_age" -le "$max_age" ]; then
          echo "[WARN] heartbeat yok ama grace aktif: $job install_age=${install_age}s max=${max_age}s"
          grace_ok=1
        fi
      fi
      if [ "$grace_ok" -eq 0 ]; then
        echo "[FAIL] heartbeat yok: $job"
        fail=1
      fi
    fi
    continue
  fi

  mtime="$(get_mtime "$ok_path")"
  age=$((NOW_TS - mtime))
  if [ "$age" -gt "$max_age" ]; then
    echo "[FAIL] stale heartbeat: $job age=${age}s max=${max_age}s"
    fail=1
  else
    echo "[OK] $job age=${age}s"
  fi
done

if [ "$fail" -eq 1 ]; then
  echo "Cron freshness FAILED"
  exit 1
fi

echo "Cron freshness PASSED"
