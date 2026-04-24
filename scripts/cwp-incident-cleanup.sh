#!/usr/bin/env bash
# CWP incident bundle cleanup
# Usage: bash scripts/cwp-incident-cleanup.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
INCIDENT_ROOT="$APP_DIR/backups/incidents"
RETAIN_INCIDENTS="${RETAIN_INCIDENTS:-30}"

mkdir -p "$INCIDENT_ROOT"

count=0
deleted=0
while read -r dir; do
  [ -z "$dir" ] && continue
  count=$((count + 1))
  if [ "$count" -le "$RETAIN_INCIDENTS" ]; then
    continue
  fi
  rm -rf "$INCIDENT_ROOT/$dir"
  deleted=$((deleted + 1))
done < <(ls -1dt "$INCIDENT_ROOT"/incident_* 2>/dev/null | sed 's#^.*/##')

echo "Incident cleanup tamamlandı. Silinen: $deleted, korunan: $RETAIN_INCIDENTS"
