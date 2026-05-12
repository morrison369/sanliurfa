#!/usr/bin/env bash
# CWP weekly audit orchestrator
# Runs:
# 1) strict audit
# 2) ops report refresh
# 3) incident bundle only if audit fails
#
# Produces:
# - backups/.ops/weekly-audit-summary.json
# - backups/.ops/weekly-audit-summary.md
#
# Usage: bash scripts/cwp-weekly-audit.sh

set -u -o pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
STATE_DIR="$APP_DIR/backups/.ops"
JSON_FILE="$STATE_DIR/weekly-audit-summary.json"
MD_FILE="$STATE_DIR/weekly-audit-summary.md"
REPORT_JSON="$STATE_DIR/report.json"

mkdir -p "$STATE_DIR"
cd "$APP_DIR"

started_at="$(date -u +%FT%TZ)"
started_epoch="$(date +%s)"

read_report_access_log_probe() {
  if [ ! -f "$REPORT_JSON" ]; then
    echo "missing|false|-1|"
    return 0
  fi

  node -e '
    const fs = require("fs");
    const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const probe = report.access_log_probe || {};
    const blocker = Buffer.from(String(probe.blocker || ""), "utf8").toString("base64");
    console.log([
      probe.status || "missing",
      String(Boolean(probe.access_log_available)),
      String(probe.exit_code ?? -1),
      blocker,
    ].join("|"));
  ' "$REPORT_JSON" 2>/dev/null || echo "missing|false|-1|"
}

audit_status="fail"
audit_exit=1
report_status="skip"
report_exit=0
incident_status="skip"
incident_exit=0
access_log_probe_status="missing"
access_log_probe_available="false"
access_log_probe_exit=-1
access_log_probe_blocker=""

set +e
bash scripts/prod-cwp-ops.sh audit
audit_exit=$?
set -e
if [ "$audit_exit" -eq 0 ]; then
  audit_status="pass"
fi

set +e
bash scripts/prod-cwp-ops.sh report
report_exit=$?
set -e
if [ "$report_exit" -eq 0 ]; then
  report_status="pass"
  probe_fields="$(read_report_access_log_probe)"
  access_log_probe_status="$(printf '%s' "$probe_fields" | cut -d'|' -f1)"
  access_log_probe_available="$(printf '%s' "$probe_fields" | cut -d'|' -f2)"
  access_log_probe_exit="$(printf '%s' "$probe_fields" | cut -d'|' -f3)"
  access_log_probe_blocker_b64="$(printf '%s' "$probe_fields" | cut -d'|' -f4)"
  if [ -n "$access_log_probe_blocker_b64" ]; then
    access_log_probe_blocker="$(printf '%s' "$access_log_probe_blocker_b64" | base64 --decode 2>/dev/null || true)"
  fi
else
  report_status="fail"
fi

if [ "$audit_exit" -ne 0 ]; then
  set +e
  bash scripts/prod-cwp-ops.sh incident-bundle
  incident_exit=$?
  set -e
  if [ "$incident_exit" -eq 0 ]; then
    incident_status="pass"
  else
    incident_status="fail"
  fi
fi

overall_status="pass"
overall_exit=0
if [ "$audit_exit" -ne 0 ] || [ "$report_exit" -ne 0 ] || [ "$incident_exit" -ne 0 ]; then
  overall_status="fail"
  if [ "$audit_exit" -ne 0 ]; then
    overall_exit="$audit_exit"
  elif [ "$report_exit" -ne 0 ]; then
    overall_exit="$report_exit"
  else
    overall_exit="$incident_exit"
  fi
fi

ended_at="$(date -u +%FT%TZ)"
ended_epoch="$(date +%s)"
duration_sec=$((ended_epoch - started_epoch))

cat > "$JSON_FILE" <<EOF
{
  "started_at": "$started_at",
  "ended_at": "$ended_at",
  "duration_sec": $duration_sec,
  "status": "$overall_status",
  "exit_code": $overall_exit,
  "steps": {
    "audit": {
      "status": "$audit_status",
      "exit_code": $audit_exit
    },
    "report_refresh": {
      "status": "$report_status",
      "exit_code": $report_exit
    },
    "access_log_probe": {
      "status": "$access_log_probe_status",
      "exit_code": $access_log_probe_exit,
      "access_log_available": $access_log_probe_available,
      "blocker": "$(printf '%s' "$access_log_probe_blocker" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    },
    "incident_bundle_on_failure": {
      "status": "$incident_status",
      "exit_code": $incident_exit
    }
  }
}
EOF

{
  echo "# CWP Weekly Audit Summary"
  echo ""
  echo "- Started (UTC): $started_at"
  echo "- Ended (UTC): $ended_at"
  echo "- Duration (sec): $duration_sec"
  echo "- Status: $overall_status"
  echo "- Exit Code: $overall_exit"
  echo ""
  echo "## Steps"
  echo "- audit: $audit_status (exit=$audit_exit)"
  echo "- report refresh: $report_status (exit=$report_exit)"
  echo "- access log probe: $access_log_probe_status (exit=$access_log_probe_exit, available=$access_log_probe_available)"
  if [ -n "$access_log_probe_blocker" ]; then
    echo "- access log blocker: $access_log_probe_blocker"
  fi
  echo "- incident bundle on failure: $incident_status (exit=$incident_exit)"
} > "$MD_FILE"

echo "Weekly audit summary generated:"
echo "- $JSON_FILE"
echo "- $MD_FILE"

if [ "$overall_exit" -ne 0 ]; then
  exit "$overall_exit"
fi
