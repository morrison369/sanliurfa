#!/usr/bin/env bash
# CWP bootstrap + strict audit summary runner
# Produces:
# - backups/.ops/bootstrap-audit-summary.json
# - backups/.ops/bootstrap-audit-summary.md
#
# Usage: bash scripts/cwp-bootstrap-audit-summary.sh

set -u -o pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
STATE_DIR="$APP_DIR/backups/.ops"
JSON_FILE="$STATE_DIR/bootstrap-audit-summary.json"
MD_FILE="$STATE_DIR/bootstrap-audit-summary.md"

mkdir -p "$STATE_DIR"
cd "$APP_DIR"

started_at_utc="$(date -u +%FT%TZ)"
started_epoch="$(date +%s)"

step1_name="cron-install-if-needed"
step2_name="cron-doctor"
step3_name="cron-freshness-strict"
step4_name="full-audit"

step1_status="skip"; step1_exit=0; step1_duration=0
step2_status="skip"; step2_exit=0; step2_duration=0
step3_status="skip"; step3_exit=0; step3_duration=0
step4_status="skip"; step4_exit=0; step4_duration=0

run_step() {
  local key="$1"
  local cmd="$2"
  local t0 t1 dur code
  t0="$(date +%s)"
  set +e
  bash -lc "$cmd"
  code=$?
  set -e
  t1="$(date +%s)"
  dur=$((t1 - t0))

  case "$key" in
    step1)
      step1_exit="$code"; step1_duration="$dur"
      ;;
    step2)
      step2_exit="$code"; step2_duration="$dur"
      ;;
    step3)
      step3_exit="$code"; step3_duration="$dur"
      ;;
    step4)
      step4_exit="$code"; step4_duration="$dur"
      ;;
  esac

  if [ "$code" -eq 0 ]; then
    case "$key" in
      step1) step1_status="pass" ;;
      step2) step2_status="pass" ;;
      step3) step3_status="pass" ;;
      step4) step4_status="pass" ;;
    esac
    return 0
  fi

  case "$key" in
    step1) step1_status="fail" ;;
    step2) step2_status="fail" ;;
    step3) step3_status="fail" ;;
    step4) step4_status="fail" ;;
  esac
  return "$code"
}

set -e
echo "[1/4] ${step1_name}"
if ! run_step step1 "bash scripts/cwp-cron-install.sh install-if-needed"; then
  overall_status="fail"
  overall_exit="$step1_exit"
  goto_end=1
else
  goto_end=0
fi

if [ "$goto_end" -eq 0 ]; then
  echo "[2/4] ${step2_name}"
  if ! run_step step2 "bash scripts/cwp-cron-doctor.sh"; then
    overall_status="fail"
    overall_exit="$step2_exit"
    goto_end=1
  fi
fi

if [ "$goto_end" -eq 0 ]; then
  echo "[3/4] ${step3_name}"
  if ! run_step step3 "CRON_FRESHNESS_STRICT=1 bash scripts/cwp-cron-freshness.sh"; then
    overall_status="fail"
    overall_exit="$step3_exit"
    goto_end=1
  fi
fi

if [ "$goto_end" -eq 0 ]; then
  echo "[4/4] ${step4_name}"
  if ! run_step step4 "bash scripts/prod-cwp-ops.sh audit"; then
    overall_status="fail"
    overall_exit="$step4_exit"
    goto_end=1
  fi
fi

if [ "${goto_end:-0}" -eq 0 ]; then
  overall_status="pass"
  overall_exit=0
fi

ended_at_utc="$(date -u +%FT%TZ)"
ended_epoch="$(date +%s)"
total_duration=$((ended_epoch - started_epoch))

cat > "$JSON_FILE" <<EOF
{
  "started_at": "$started_at_utc",
  "ended_at": "$ended_at_utc",
  "duration_sec": $total_duration,
  "status": "$overall_status",
  "exit_code": $overall_exit,
  "steps": [
    {
      "name": "$step1_name",
      "status": "$step1_status",
      "exit_code": $step1_exit,
      "duration_sec": $step1_duration
    },
    {
      "name": "$step2_name",
      "status": "$step2_status",
      "exit_code": $step2_exit,
      "duration_sec": $step2_duration
    },
    {
      "name": "$step3_name",
      "status": "$step3_status",
      "exit_code": $step3_exit,
      "duration_sec": $step3_duration
    },
    {
      "name": "$step4_name",
      "status": "$step4_status",
      "exit_code": $step4_exit,
      "duration_sec": $step4_duration
    }
  ]
}
EOF

{
  echo "# CWP Bootstrap Audit Summary"
  echo ""
  echo "- Started (UTC): $started_at_utc"
  echo "- Ended (UTC): $ended_at_utc"
  echo "- Duration (sec): $total_duration"
  echo "- Status: $overall_status"
  echo "- Exit Code: $overall_exit"
  echo ""
  echo "## Steps"
  echo "- ${step1_name}: ${step1_status} (exit=${step1_exit}, duration=${step1_duration}s)"
  echo "- ${step2_name}: ${step2_status} (exit=${step2_exit}, duration=${step2_duration}s)"
  echo "- ${step3_name}: ${step3_status} (exit=${step3_exit}, duration=${step3_duration}s)"
  echo "- ${step4_name}: ${step4_status} (exit=${step4_exit}, duration=${step4_duration}s)"
} > "$MD_FILE"

echo "Summary generated:"
echo "- $JSON_FILE"
echo "- $MD_FILE"

if [ "$overall_exit" -ne 0 ]; then
  exit "$overall_exit"
fi

