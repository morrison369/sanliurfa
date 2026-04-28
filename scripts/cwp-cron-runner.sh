#!/usr/bin/env bash
# CWP cron runner with heartbeat + journal
# Usage:
#   bash scripts/cwp-cron-runner.sh <job-name> <command...>

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
OPS_DIR="$APP_DIR/backups/.ops"
HEARTBEAT_DIR="$OPS_DIR/cron-heartbeats"
JOURNAL_FILE="$OPS_DIR/cron-journal.log"

job_name="${1:-}"
if [ -z "$job_name" ]; then
  echo "Usage: bash scripts/cwp-cron-runner.sh <job-name> <command...>"
  exit 1
fi
shift

if [ "$#" -eq 0 ]; then
  echo "Hata: çalıştırılacak komut yok."
  exit 1
fi

mkdir -p "$OPS_DIR" "$HEARTBEAT_DIR"

start_ts="$(date -u +%FT%TZ)"
start_epoch="$(date +%s)"

{
  printf '{"ts":"%s","job":"%s","phase":"start","cmd":"%s"}\n' \
    "$start_ts" "$job_name" "$*"
} >> "$JOURNAL_FILE"

set +e
"$@"
exit_code=$?
set -e

end_ts="$(date -u +%FT%TZ)"
end_epoch="$(date +%s)"
duration=$((end_epoch - start_epoch))

if [ "$exit_code" -eq 0 ]; then
  printf '{"ts":"%s","job":"%s","status":"ok","duration_sec":%s}\n' \
    "$end_ts" "$job_name" "$duration" >> "$JOURNAL_FILE"
  printf '%s\n' "$end_epoch" > "$HEARTBEAT_DIR/${job_name}.ok"
  exit 0
fi

printf '{"ts":"%s","job":"%s","status":"fail","duration_sec":%s,"exit_code":%s}\n' \
  "$end_ts" "$job_name" "$duration" "$exit_code" >> "$JOURNAL_FILE"
printf '%s\n' "$end_epoch" > "$HEARTBEAT_DIR/${job_name}.fail"
exit "$exit_code"
