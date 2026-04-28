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

mkdir -p "$STATE_DIR"
cd "$APP_DIR"

started_at="$(date -u +%FT%TZ)"
started_epoch="$(date +%s)"

audit_status="fail"
audit_exit=1
report_status="skip"
report_exit=0
incident_status="skip"
incident_exit=0

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
  echo "- incident bundle on failure: $incident_status (exit=$incident_exit)"
} > "$MD_FILE"

echo "Weekly audit summary generated:"
echo "- $JSON_FILE"
echo "- $MD_FILE"

if [ "$overall_exit" -ne 0 ]; then
  exit "$overall_exit"
fi

