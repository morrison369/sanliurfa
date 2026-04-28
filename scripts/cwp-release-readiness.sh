#!/usr/bin/env bash
# CWP release readiness orchestrator
# Runs fail-fast checks and produces a summary.
#
# Steps:
# 1) preflight
# 2) env-check
# 3) doctor
# 4) smoke
# 5) cron-doctor
# 6) cron-freshness (strict)
# 7) audit
# 8) report
#
# Produces:
# - backups/.ops/release-readiness-summary.json
# - backups/.ops/release-readiness-summary.md
#
# Usage: bash scripts/cwp-release-readiness.sh

set -u -o pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
STATE_DIR="$APP_DIR/backups/.ops"
JSON_FILE="$STATE_DIR/release-readiness-summary.json"
MD_FILE="$STATE_DIR/release-readiness-summary.md"

mkdir -p "$STATE_DIR"
cd "$APP_DIR"

started_at="$(date -u +%FT%TZ)"
started_epoch="$(date +%s)"

step1_name="preflight"; step1_status="skip"; step1_exit=0; step1_duration=0
step2_name="env-check"; step2_status="skip"; step2_exit=0; step2_duration=0
step3_name="doctor"; step3_status="skip"; step3_exit=0; step3_duration=0
step4_name="smoke"; step4_status="skip"; step4_exit=0; step4_duration=0
step5_name="cron-doctor"; step5_status="skip"; step5_exit=0; step5_duration=0
step6_name="cron-freshness-strict"; step6_status="skip"; step6_exit=0; step6_duration=0
step7_name="audit"; step7_status="skip"; step7_exit=0; step7_duration=0
step8_name="report"; step8_status="skip"; step8_exit=0; step8_duration=0

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
    step1) step1_exit="$code"; step1_duration="$dur" ;;
    step2) step2_exit="$code"; step2_duration="$dur" ;;
    step3) step3_exit="$code"; step3_duration="$dur" ;;
    step4) step4_exit="$code"; step4_duration="$dur" ;;
    step5) step5_exit="$code"; step5_duration="$dur" ;;
    step6) step6_exit="$code"; step6_duration="$dur" ;;
    step7) step7_exit="$code"; step7_duration="$dur" ;;
    step8) step8_exit="$code"; step8_duration="$dur" ;;
  esac

  if [ "$code" -eq 0 ]; then
    case "$key" in
      step1) step1_status="pass" ;;
      step2) step2_status="pass" ;;
      step3) step3_status="pass" ;;
      step4) step4_status="pass" ;;
      step5) step5_status="pass" ;;
      step6) step6_status="pass" ;;
      step7) step7_status="pass" ;;
      step8) step8_status="pass" ;;
    esac
    return 0
  fi

  case "$key" in
    step1) step1_status="fail" ;;
    step2) step2_status="fail" ;;
    step3) step3_status="fail" ;;
    step4) step4_status="fail" ;;
    step5) step5_status="fail" ;;
    step6) step6_status="fail" ;;
    step7) step7_status="fail" ;;
    step8) step8_status="fail" ;;
  esac
  return "$code"
}

set -e
if ! run_step step1 "bash scripts/prod-cwp-ops.sh preflight"; then overall_exit="$step1_exit"; goto_end=1; else goto_end=0; fi
if [ "$goto_end" -eq 0 ] && ! run_step step2 "bash scripts/prod-cwp-ops.sh env-check"; then overall_exit="$step2_exit"; goto_end=1; fi
if [ "$goto_end" -eq 0 ] && ! run_step step3 "bash scripts/prod-cwp-ops.sh doctor"; then overall_exit="$step3_exit"; goto_end=1; fi
if [ "$goto_end" -eq 0 ] && ! run_step step4 "bash scripts/prod-cwp-ops.sh smoke"; then overall_exit="$step4_exit"; goto_end=1; fi
if [ "$goto_end" -eq 0 ] && ! run_step step5 "bash scripts/prod-cwp-ops.sh cron-doctor"; then overall_exit="$step5_exit"; goto_end=1; fi
if [ "$goto_end" -eq 0 ] && ! run_step step6 "bash -lc 'CRON_FRESHNESS_STRICT=1 bash scripts/prod-cwp-ops.sh cron-freshness'"; then overall_exit="$step6_exit"; goto_end=1; fi
if [ "$goto_end" -eq 0 ] && ! run_step step7 "bash scripts/prod-cwp-ops.sh audit"; then overall_exit="$step7_exit"; goto_end=1; fi

# Report always attempts to refresh to leave artifacts behind.
if ! run_step step8 "bash scripts/prod-cwp-ops.sh report"; then
  if [ "${overall_exit:-0}" -eq 0 ]; then
    overall_exit="$step8_exit"
  fi
fi

if [ "${overall_exit:-0}" -eq 0 ]; then
  overall_status="pass"
  overall_exit=0
else
  overall_status="fail"
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
  "steps": [
    {"name":"$step1_name","status":"$step1_status","exit_code":$step1_exit,"duration_sec":$step1_duration},
    {"name":"$step2_name","status":"$step2_status","exit_code":$step2_exit,"duration_sec":$step2_duration},
    {"name":"$step3_name","status":"$step3_status","exit_code":$step3_exit,"duration_sec":$step3_duration},
    {"name":"$step4_name","status":"$step4_status","exit_code":$step4_exit,"duration_sec":$step4_duration},
    {"name":"$step5_name","status":"$step5_status","exit_code":$step5_exit,"duration_sec":$step5_duration},
    {"name":"$step6_name","status":"$step6_status","exit_code":$step6_exit,"duration_sec":$step6_duration},
    {"name":"$step7_name","status":"$step7_status","exit_code":$step7_exit,"duration_sec":$step7_duration},
    {"name":"$step8_name","status":"$step8_status","exit_code":$step8_exit,"duration_sec":$step8_duration}
  ]
}
EOF

{
  echo "# CWP Release Readiness Summary"
  echo ""
  echo "- Started (UTC): $started_at"
  echo "- Ended (UTC): $ended_at"
  echo "- Duration (sec): $duration_sec"
  echo "- Status: $overall_status"
  echo "- Exit Code: $overall_exit"
  echo ""
  echo "## Steps"
  echo "- $step1_name: $step1_status (exit=$step1_exit, duration=${step1_duration}s)"
  echo "- $step2_name: $step2_status (exit=$step2_exit, duration=${step2_duration}s)"
  echo "- $step3_name: $step3_status (exit=$step3_exit, duration=${step3_duration}s)"
  echo "- $step4_name: $step4_status (exit=$step4_exit, duration=${step4_duration}s)"
  echo "- $step5_name: $step5_status (exit=$step5_exit, duration=${step5_duration}s)"
  echo "- $step6_name: $step6_status (exit=$step6_exit, duration=${step6_duration}s)"
  echo "- $step7_name: $step7_status (exit=$step7_exit, duration=${step7_duration}s)"
  echo "- $step8_name: $step8_status (exit=$step8_exit, duration=${step8_duration}s)"
} > "$MD_FILE"

echo "Release readiness summary generated:"
echo "- $JSON_FILE"
echo "- $MD_FILE"

if [ "$overall_exit" -ne 0 ]; then
  exit "$overall_exit"
fi

