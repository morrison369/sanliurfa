#!/usr/bin/env bash
# CWP ops report generator (domain user)
# Produces:
# - backups/.ops/report.json
# - backups/.ops/report.md
#
# Usage: bash scripts/cwp-ops-report.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
PORT="${PORT:-4321}"
PM2_NAME="${PM2_NAME:-sanliurfa-app}"
HTTP_MAX_TIME="${HTTP_MAX_TIME:-15}"
STATE_DIR="$APP_DIR/backups/.ops"
RELEASE_DIR="$APP_DIR/backups/releases"
JSON_FILE="$STATE_DIR/report.json"
MD_FILE="$STATE_DIR/report.md"
EVENT_LOG="$STATE_DIR/events.log"
CRON_TAG="SANLIURFA_CWP_OPS"
HEARTBEAT_DIR="$STATE_DIR/cron-heartbeats"
INSTALLED_AT_FILE="$STATE_DIR/cron-installed-at"
CRON_DOCTOR_JSON_FILE="$STATE_DIR/cron-doctor.latest.json"
BOOTSTRAP_AUDIT_SUMMARY_JSON="$STATE_DIR/bootstrap-audit-summary.json"
DAILY_OPS_SUMMARY_JSON="$STATE_DIR/daily-ops-summary.json"
WEEKLY_AUDIT_SUMMARY_JSON="$STATE_DIR/weekly-audit-summary.json"
RELEASE_READINESS_SUMMARY_JSON="$STATE_DIR/release-readiness-summary.json"
ACCESS_LOG_PROBE_LATEST_JSON="$STATE_DIR/access-log-probe.latest.json"
ACCESS_LOG_PROBE_LATEST_ERR="$STATE_DIR/access-log-probe.latest.err"

json_read_field() {
  local json_file="$1"
  local field_path="$2"
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const path = process.argv[2].split(".");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    let current = data;
    for (const key of path) current = current?.[key];
    if (current === undefined || current === null) process.stdout.write("");
    else if (typeof current === "string") process.stdout.write(current);
    else process.stdout.write(String(current));
  ' "$json_file" "$field_path"
}

json_read_string_literal() {
  local json_file="$1"
  local field_path="$2"
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const path = process.argv[2].split(".");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    let current = data;
    for (const key of path) current = current?.[key];
    process.stdout.write(JSON.stringify(current ?? ""));
  ' "$json_file" "$field_path"
}

mkdir -p "$STATE_DIR" "$RELEASE_DIR"

now_utc="$(date -u +%FT%TZ)"
host_name="$(hostname 2>/dev/null || echo unknown)"
user_name="$(whoami 2>/dev/null || echo unknown)"
node_version="$(node -v 2>/dev/null || echo unknown)"
npm_version="$(npm -v 2>/dev/null || echo unknown)"

health_code="$(curl -s --max-time "$HTTP_MAX_TIME" -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/health" || echo 000)"
if [ "$health_code" = "200" ]; then
  health_state="ok"
else
  health_state="fail"
fi

pm2_state="missing"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2_state="present"
fi

release_count="$(ls -1 "$RELEASE_DIR" 2>/dev/null | wc -l | tr -d ' ')"
latest_release="$(ls -1t "$RELEASE_DIR" 2>/dev/null | head -n1 || true)"
current_release="$(cat "$STATE_DIR/current_release" 2>/dev/null || true)"
last_predeploy="$(cat "$STATE_DIR/last_predeploy_release" 2>/dev/null || true)"
event_count=0
if [ -f "$EVENT_LOG" ]; then
  event_count="$(wc -l < "$EVENT_LOG" 2>/dev/null || echo 0)"
fi
cron_status="missing"
if crontab -l 2>/dev/null | grep -q "$CRON_TAG"; then
  cron_status="present"
fi
incident_count="$(ls -1 "$APP_DIR/backups/incidents"/incident_* 2>/dev/null | wc -l | tr -d ' ')"
heartbeat_ok_count="$(ls -1 "$HEARTBEAT_DIR"/*.ok 2>/dev/null | wc -l | tr -d ' ')"
cron_install_age_sec=-1
if [ -f "$INSTALLED_AT_FILE" ]; then
  installed_at="$(cat "$INSTALLED_AT_FILE" 2>/dev/null || echo 0)"
  now_epoch="$(date +%s)"
  cron_install_age_sec=$((now_epoch - installed_at))
fi

cron_doctor_status="unknown"
cron_doctor_jobs="[]"
set +e
bash "$APP_DIR/scripts/cwp-cron-doctor.sh" --json-file "$CRON_DOCTOR_JSON_FILE" >/dev/null 2>&1
cron_doctor_exit="$?"
set -e
if [ -f "$CRON_DOCTOR_JSON_FILE" ]; then
  cron_doctor_status="$(sed -n 's/.*"status":"\([^"]*\)".*/\1/p' "$CRON_DOCTOR_JSON_FILE" | head -n1)"
  cron_doctor_jobs="$(sed -n 's/.*"jobs":\(\[.*\]\).*/\1/p' "$CRON_DOCTOR_JSON_FILE" | head -n1)"
  if [ -z "$cron_doctor_status" ]; then
    cron_doctor_status="unknown"
  fi
  if [ -z "$cron_doctor_jobs" ]; then
    cron_doctor_jobs="[]"
  fi
elif [ "$cron_doctor_exit" -eq 0 ]; then
  cron_doctor_status="pass"
else
  cron_doctor_status="fail"
fi

disk_free_kb="$(df -Pk "$APP_DIR" | awk 'NR==2 {print $4}')"
disk_used_pct="$(df -Pk "$APP_DIR" | awk 'NR==2 {print $5}')"

bootstrap_audit_status="missing"
bootstrap_audit_exit_code=-1
bootstrap_audit_duration_sec=-1
bootstrap_audit_ended_at=""
if [ -f "$BOOTSTRAP_AUDIT_SUMMARY_JSON" ]; then
  bootstrap_audit_status="$(sed -n 's/.*"status": "\([^"]*\)".*/\1/p' "$BOOTSTRAP_AUDIT_SUMMARY_JSON" | head -n1)"
  bootstrap_audit_exit_code="$(sed -n 's/.*"exit_code": \([0-9-]\+\).*/\1/p' "$BOOTSTRAP_AUDIT_SUMMARY_JSON" | head -n1)"
  bootstrap_audit_duration_sec="$(sed -n 's/.*"duration_sec": \([0-9-]\+\).*/\1/p' "$BOOTSTRAP_AUDIT_SUMMARY_JSON" | head -n1)"
  bootstrap_audit_ended_at="$(sed -n 's/.*"ended_at": "\([^"]*\)".*/\1/p' "$BOOTSTRAP_AUDIT_SUMMARY_JSON" | head -n1)"
  [ -z "$bootstrap_audit_status" ] && bootstrap_audit_status="unknown"
  [ -z "$bootstrap_audit_exit_code" ] && bootstrap_audit_exit_code=-1
  [ -z "$bootstrap_audit_duration_sec" ] && bootstrap_audit_duration_sec=-1
fi

daily_ops_status="missing"
daily_ops_exit_code=-1
daily_ops_duration_sec=-1
daily_ops_ended_at=""
if [ -f "$DAILY_OPS_SUMMARY_JSON" ]; then
  daily_ops_status="$(sed -n 's/.*"status": "\([^"]*\)".*/\1/p' "$DAILY_OPS_SUMMARY_JSON" | head -n1)"
  daily_ops_exit_code="$(sed -n 's/.*"exit_code": \([0-9-]\+\).*/\1/p' "$DAILY_OPS_SUMMARY_JSON" | head -n1)"
  daily_ops_duration_sec="$(sed -n 's/.*"duration_sec": \([0-9-]\+\).*/\1/p' "$DAILY_OPS_SUMMARY_JSON" | head -n1)"
  daily_ops_ended_at="$(sed -n 's/.*"ended_at": "\([^"]*\)".*/\1/p' "$DAILY_OPS_SUMMARY_JSON" | head -n1)"
  [ -z "$daily_ops_status" ] && daily_ops_status="unknown"
  [ -z "$daily_ops_exit_code" ] && daily_ops_exit_code=-1
  [ -z "$daily_ops_duration_sec" ] && daily_ops_duration_sec=-1
fi

weekly_audit_status="missing"
weekly_audit_exit_code=-1
weekly_audit_duration_sec=-1
weekly_audit_ended_at=""
if [ -f "$WEEKLY_AUDIT_SUMMARY_JSON" ]; then
  weekly_audit_status="$(sed -n 's/.*"status": "\([^"]*\)".*/\1/p' "$WEEKLY_AUDIT_SUMMARY_JSON" | head -n1)"
  weekly_audit_exit_code="$(sed -n 's/.*"exit_code": \([0-9-]\+\).*/\1/p' "$WEEKLY_AUDIT_SUMMARY_JSON" | head -n1)"
  weekly_audit_duration_sec="$(sed -n 's/.*"duration_sec": \([0-9-]\+\).*/\1/p' "$WEEKLY_AUDIT_SUMMARY_JSON" | head -n1)"
  weekly_audit_ended_at="$(sed -n 's/.*"ended_at": "\([^"]*\)".*/\1/p' "$WEEKLY_AUDIT_SUMMARY_JSON" | head -n1)"
  [ -z "$weekly_audit_status" ] && weekly_audit_status="unknown"
  [ -z "$weekly_audit_exit_code" ] && weekly_audit_exit_code=-1
  [ -z "$weekly_audit_duration_sec" ] && weekly_audit_duration_sec=-1
fi

release_readiness_status="missing"
release_readiness_exit_code=-1
release_readiness_duration_sec=-1
release_readiness_ended_at=""
if [ -f "$RELEASE_READINESS_SUMMARY_JSON" ]; then
  release_readiness_status="$(sed -n 's/.*"status": "\([^"]*\)".*/\1/p' "$RELEASE_READINESS_SUMMARY_JSON" | head -n1)"
  release_readiness_exit_code="$(sed -n 's/.*"exit_code": \([0-9-]\+\).*/\1/p' "$RELEASE_READINESS_SUMMARY_JSON" | head -n1)"
  release_readiness_duration_sec="$(sed -n 's/.*"duration_sec": \([0-9-]\+\).*/\1/p' "$RELEASE_READINESS_SUMMARY_JSON" | head -n1)"
  release_readiness_ended_at="$(sed -n 's/.*"ended_at": "\([^"]*\)".*/\1/p' "$RELEASE_READINESS_SUMMARY_JSON" | head -n1)"
  [ -z "$release_readiness_status" ] && release_readiness_status="unknown"
  [ -z "$release_readiness_exit_code" ] && release_readiness_exit_code=-1
  [ -z "$release_readiness_duration_sec" ] && release_readiness_duration_sec=-1
fi

access_log_probe_status="missing"
access_log_probe_exit_code=-1
access_log_probe_available="false"
access_log_probe_readable_paths_count=0
access_log_probe_access_like_paths_count=0
access_log_probe_blocker=""
access_log_probe_blocker_json='""'
rm -f "$ACCESS_LOG_PROBE_LATEST_JSON" "$ACCESS_LOG_PROBE_LATEST_ERR"
set +e
node "$APP_DIR/scripts/ops/access-log-probe.mjs" --no-write > "$ACCESS_LOG_PROBE_LATEST_JSON" 2> "$ACCESS_LOG_PROBE_LATEST_ERR"
access_log_probe_exit_code="$?"
set -e
if [ -s "$ACCESS_LOG_PROBE_LATEST_JSON" ]; then
  access_log_probe_available="$(json_read_field "$ACCESS_LOG_PROBE_LATEST_JSON" "accessLogAvailable" 2>/dev/null || echo false)"
  access_log_probe_readable_paths_count="$(json_read_field "$ACCESS_LOG_PROBE_LATEST_JSON" "readablePathsCount" 2>/dev/null || echo 0)"
  access_log_probe_access_like_paths_count="$(json_read_field "$ACCESS_LOG_PROBE_LATEST_JSON" "accessLikePathsCount" 2>/dev/null || echo 0)"
  access_log_probe_blocker="$(json_read_field "$ACCESS_LOG_PROBE_LATEST_JSON" "blocker" 2>/dev/null || true)"
  access_log_probe_blocker_json="$(json_read_string_literal "$ACCESS_LOG_PROBE_LATEST_JSON" "blocker" 2>/dev/null || echo '""')"
  if [ "$access_log_probe_available" = "true" ]; then
    access_log_probe_status="pass"
  elif [ "$access_log_probe_exit_code" -eq 2 ]; then
    access_log_probe_status="fail"
  else
    access_log_probe_status="error"
  fi
elif [ -s "$ACCESS_LOG_PROBE_LATEST_ERR" ]; then
  access_log_probe_blocker="$(tr '\n' ' ' < "$ACCESS_LOG_PROBE_LATEST_ERR" | sed 's/[[:space:]]\+/ /g' | sed 's/^ //; s/ $//')"
  access_log_probe_blocker_json="$(node -e 'process.stdout.write(JSON.stringify(process.argv[1] || ""))' "$access_log_probe_blocker")"
  access_log_probe_status="error"
fi

cat > "$JSON_FILE" <<EOF
{
  "generated_at": "$now_utc",
  "host": "$host_name",
  "user": "$user_name",
  "app_dir": "$APP_DIR",
  "port": "$PORT",
  "pm2_name": "$PM2_NAME",
  "runtime": {
    "node": "$node_version",
    "npm": "$npm_version"
  },
  "health": {
    "status": "$health_state",
    "http_code": "$health_code"
  },
  "pm2": {
    "status": "$pm2_state"
  },
  "releases": {
    "count": $release_count,
    "latest": "${latest_release:-}",
    "current": "${current_release:-}",
    "last_predeploy": "${last_predeploy:-}"
  },
  "events": {
    "count": $event_count
  },
  "incidents": {
    "count": $incident_count
  },
  "cron": {
    "status": "$cron_status",
    "heartbeat_ok_count": $heartbeat_ok_count,
    "install_age_sec": $cron_install_age_sec,
    "doctor": {
      "status": "$cron_doctor_status",
      "jobs": $cron_doctor_jobs
    }
  },
  "disk": {
    "free_kb": ${disk_free_kb:-0},
    "used_percent": "${disk_used_pct:-unknown}"
  },
  "bootstrap_audit": {
    "status": "$bootstrap_audit_status",
    "exit_code": $bootstrap_audit_exit_code,
    "duration_sec": $bootstrap_audit_duration_sec,
    "ended_at": "${bootstrap_audit_ended_at:-}"
  },
  "daily_ops": {
    "status": "$daily_ops_status",
    "exit_code": $daily_ops_exit_code,
    "duration_sec": $daily_ops_duration_sec,
    "ended_at": "${daily_ops_ended_at:-}"
  },
  "weekly_audit": {
    "status": "$weekly_audit_status",
    "exit_code": $weekly_audit_exit_code,
    "duration_sec": $weekly_audit_duration_sec,
    "ended_at": "${weekly_audit_ended_at:-}"
  },
  "release_readiness": {
    "status": "$release_readiness_status",
    "exit_code": $release_readiness_exit_code,
    "duration_sec": $release_readiness_duration_sec,
    "ended_at": "${release_readiness_ended_at:-}"
  },
  "access_log_probe": {
    "status": "$access_log_probe_status",
    "exit_code": $access_log_probe_exit_code,
    "access_log_available": $access_log_probe_available,
    "readable_paths_count": $access_log_probe_readable_paths_count,
    "access_like_paths_count": $access_log_probe_access_like_paths_count,
    "blocker": $access_log_probe_blocker_json
  }
}
EOF

{
  echo "# CWP Ops Report"
  echo ""
  echo "- Generated (UTC): $now_utc"
  echo "- Host: $host_name"
  echo "- User: $user_name"
  echo "- App Dir: $APP_DIR"
  echo "- Port: $PORT"
  echo "- PM2 Name: $PM2_NAME"
  echo "- Node: $node_version"
  echo "- npm: $npm_version"
  echo ""
  echo "## Runtime"
  echo "- Health: $health_state (HTTP $health_code)"
  echo "- PM2: $pm2_state"
  echo ""
  echo "## Releases"
  echo "- Count: $release_count"
  echo "- Latest: ${latest_release:-yok}"
  echo "- Current: ${current_release:-yok}"
  echo "- Last Predeploy: ${last_predeploy:-yok}"
  echo ""
  echo "## Events"
  echo "- Event lines: $event_count"
  echo ""
  echo "## Incidents"
  echo "- Incident bundle count: $incident_count"
  echo ""
  echo "## Cron"
  echo "- Status: $cron_status"
  echo "- Heartbeat OK files: $heartbeat_ok_count"
  echo "- Install age (sec): $cron_install_age_sec"
  echo "- Doctor status: $cron_doctor_status"
  echo ""
  echo "## Disk"
  echo "- Free KB: ${disk_free_kb:-0}"
  echo "- Used: ${disk_used_pct:-unknown}"
  echo ""
  echo "## Bootstrap Audit"
  echo "- Status: $bootstrap_audit_status"
  echo "- Exit code: $bootstrap_audit_exit_code"
  echo "- Duration (sec): $bootstrap_audit_duration_sec"
  echo "- Ended at (UTC): ${bootstrap_audit_ended_at:-yok}"
  echo ""
  echo "## Daily Ops"
  echo "- Status: $daily_ops_status"
  echo "- Exit code: $daily_ops_exit_code"
  echo "- Duration (sec): $daily_ops_duration_sec"
  echo "- Ended at (UTC): ${daily_ops_ended_at:-yok}"
  echo ""
  echo "## Weekly Audit"
  echo "- Status: $weekly_audit_status"
  echo "- Exit code: $weekly_audit_exit_code"
  echo "- Duration (sec): $weekly_audit_duration_sec"
  echo "- Ended at (UTC): ${weekly_audit_ended_at:-yok}"
  echo ""
  echo "## Release Readiness"
  echo "- Status: $release_readiness_status"
  echo "- Exit code: $release_readiness_exit_code"
  echo "- Duration (sec): $release_readiness_duration_sec"
  echo "- Ended at (UTC): ${release_readiness_ended_at:-yok}"
  echo ""
  echo "## Access Log Probe"
  echo "- Status: $access_log_probe_status"
  echo "- Exit code: $access_log_probe_exit_code"
  echo "- Access log erişimi: $access_log_probe_available"
  echo "- Okunabilen yol sayısı: $access_log_probe_readable_paths_count"
  echo "- Access-like yol sayısı: $access_log_probe_access_like_paths_count"
  if [ -n "$access_log_probe_blocker" ]; then
    echo "- Bloker: $access_log_probe_blocker"
  fi
} > "$MD_FILE"

echo "Report generated:"
echo "- $JSON_FILE"
echo "- $MD_FILE"
