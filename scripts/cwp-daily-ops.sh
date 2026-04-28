#!/usr/bin/env bash
# CWP daily ops orchestrator
# Runs:
# 1) bootstrap-audit-summary
# 2) ops report refresh
# 3) triage on failure
#
# Usage: bash scripts/cwp-daily-ops.sh

set -u -o pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
STATE_DIR="$APP_DIR/backups/.ops"
SUMMARY_JSON="$STATE_DIR/bootstrap-audit-summary.json"
DAILY_JSON="$STATE_DIR/daily-ops-summary.json"
DAILY_MD="$STATE_DIR/daily-ops-summary.md"

mkdir -p "$STATE_DIR"
cd "$APP_DIR"

started_at="$(date -u +%FT%TZ)"
started_epoch="$(date +%s)"

bootstrap_status="fail"
bootstrap_exit=1
report_status="skip"
report_exit=0
triage_status="skip"
triage_exit=0

set +e
bash scripts/prod-cwp-ops.sh bootstrap-audit-summary
bootstrap_exit=$?
set -e
if [ "$bootstrap_exit" -eq 0 ]; then
  bootstrap_status="pass"
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

if [ "$bootstrap_exit" -ne 0 ]; then
  set +e
  bash scripts/prod-cwp-ops.sh triage
  triage_exit=$?
  set -e
  if [ "$triage_exit" -eq 0 ]; then
    triage_status="pass"
  else
    triage_status="fail"
  fi
fi

overall_status="pass"
overall_exit=0
if [ "$bootstrap_exit" -ne 0 ] || [ "$report_exit" -ne 0 ] || [ "$triage_exit" -ne 0 ]; then
  overall_status="fail"
  if [ "$bootstrap_exit" -ne 0 ]; then
    overall_exit="$bootstrap_exit"
  elif [ "$report_exit" -ne 0 ]; then
    overall_exit="$report_exit"
  else
    overall_exit="$triage_exit"
  fi
fi

ended_at="$(date -u +%FT%TZ)"
ended_epoch="$(date +%s)"
duration_sec=$((ended_epoch - started_epoch))

cat > "$DAILY_JSON" <<EOF
{
  "started_at": "$started_at",
  "ended_at": "$ended_at",
  "duration_sec": $duration_sec,
  "status": "$overall_status",
  "exit_code": $overall_exit,
  "bootstrap_audit_summary_file": "$SUMMARY_JSON",
  "steps": {
    "bootstrap_audit_summary": {
      "status": "$bootstrap_status",
      "exit_code": $bootstrap_exit
    },
    "report_refresh": {
      "status": "$report_status",
      "exit_code": $report_exit
    },
    "triage_on_failure": {
      "status": "$triage_status",
      "exit_code": $triage_exit
    }
  }
}
EOF

{
  echo "# CWP Daily Ops Summary"
  echo ""
  echo "- Started (UTC): $started_at"
  echo "- Ended (UTC): $ended_at"
  echo "- Duration (sec): $duration_sec"
  echo "- Status: $overall_status"
  echo "- Exit Code: $overall_exit"
  echo ""
  echo "## Steps"
  echo "- bootstrap-audit-summary: $bootstrap_status (exit=$bootstrap_exit)"
  echo "- report refresh: $report_status (exit=$report_exit)"
  echo "- triage on failure: $triage_status (exit=$triage_exit)"
} > "$DAILY_MD"

echo "Daily ops summary generated:"
echo "- $DAILY_JSON"
echo "- $DAILY_MD"

if [ "$overall_exit" -ne 0 ]; then
  exit "$overall_exit"
fi

