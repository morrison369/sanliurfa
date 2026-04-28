#!/usr/bin/env bash
# CWP cron doctor
# Usage:
#   bash scripts/cwp-cron-doctor.sh
#   bash scripts/cwp-cron-doctor.sh --json
#   bash scripts/cwp-cron-doctor.sh --json-file /path/to/file.json

set -euo pipefail

CRON_TAG="SANLIURFA_CWP_OPS"
JSON_MODE=0
JSON_FILE=""
required_jobs=(
  "doctor-hourly"
  "smoke-6hour"
  "report-daily"
  "rotate-events-daily"
  "cleanup-weekly"
  "incident-cleanup-weekly"
  "daily-ops"
  "weekly-audit"
  "release-readiness"
)

expected_schedule() {
  case "$1" in
    doctor-hourly) echo "5 * * * *" ;;
    smoke-6hour) echo "35 */6 * * *" ;;
    report-daily) echo "45 3 * * *" ;;
    rotate-events-daily) echo "10 3 * * *" ;;
    cleanup-weekly) echo "20 3 * * 0" ;;
    incident-cleanup-weekly) echo "30 3 * * 0" ;;
    daily-ops) echo "5 4 * * *" ;;
    weekly-audit) echo "15 4 * * 0" ;;
    release-readiness) echo "35 4 * * *" ;;
    *) echo "" ;;
  esac
}

expected_npm_target() {
  case "$1" in
    doctor-hourly) echo "ops:cwp:doctor" ;;
    smoke-6hour) echo "ops:cwp:smoke" ;;
    report-daily) echo "ops:cwp:report" ;;
    rotate-events-daily) echo "ops:cwp:rotate-events" ;;
    cleanup-weekly) echo "ops:cwp:cleanup" ;;
    incident-cleanup-weekly) echo "ops:cwp:incident-cleanup" ;;
    daily-ops) echo "ops:cwp:daily" ;;
    weekly-audit) echo "ops:cwp:weekly" ;;
    release-readiness) echo "ops:cwp:release-readiness" ;;
    *) echo "" ;;
  esac
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --json)
      JSON_MODE=1
      shift
      ;;
    --json-file)
      JSON_MODE=1
      JSON_FILE="${2:-}"
      if [ -z "$JSON_FILE" ]; then
        echo "Missing value for --json-file" >&2
        exit 2
      fi
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

current_cron="$(crontab -l 2>/dev/null || true)"
if [ -z "$current_cron" ]; then
  if [ "$JSON_MODE" -eq 1 ]; then
    json='{"status":"fail","error":"crontab boş","jobs":[]}'
    if [ -n "$JSON_FILE" ]; then
      printf '%s\n' "$json" > "$JSON_FILE"
    else
      printf '%s\n' "$json"
    fi
  else
    echo "[FAIL] crontab boş."
  fi
  exit 1
fi

fail=0
jobs_json=""
for job in "${required_jobs[@]}"; do
  status="ok"
  reason=""
  line=""
  actual_schedule=""
  want_schedule="$(expected_schedule "$job")"
  want_npm="$(expected_npm_target "$job")"

  if printf '%s\n' "$current_cron" | grep -q "${CRON_TAG} ${job}"; then
    line="$(printf '%s\n' "$current_cron" | awk -v tag="${CRON_TAG} ${job}" '$0==tag {getline; print; exit}')"
    if [ -z "$line" ]; then
      reason="cron line missing after tag"
      status="fail"
      fail=1
    else
      actual_schedule="$(printf '%s\n' "$line" | awk '{print $1" "$2" "$3" "$4" "$5}')"
      if [ "$actual_schedule" != "$want_schedule" ]; then
        reason="schedule drift"
        status="fail"
        fail=1
      elif ! printf '%s\n' "$line" | grep -q "cwp-cron-runner.sh ${job}"; then
        reason="runner missing"
        status="fail"
        fail=1
      elif ! printf '%s\n' "$line" | grep -q "npm run -s ${want_npm}"; then
        reason="npm target mismatch"
        status="fail"
        fail=1
      fi
    fi
  else
    reason="tag not found"
    status="fail"
    fail=1
  fi

  if [ "$JSON_MODE" -eq 0 ]; then
    if [ "$status" = "ok" ]; then
      echo "[OK] ${job} (schedule+runner+npm)"
    else
      case "$reason" in
        "tag not found")
          echo "[FAIL] ${job} bulunamadı"
          ;;
        "cron line missing after tag")
          echo "[FAIL] ${job} bulundu ama takip eden cron satırı yok"
          ;;
        "schedule drift")
          echo "[FAIL] ${job} schedule drift: actual='${actual_schedule}' expected='${want_schedule}'"
          ;;
        "runner missing")
          echo "[FAIL] ${job} runner satırı eksik"
          ;;
        "npm target mismatch")
          echo "[FAIL] ${job} npm hedefi yanlış (expected: ${want_npm})"
          ;;
        *)
          echo "[FAIL] ${job} doğrulaması başarısız"
          ;;
      esac
    fi
  fi

  job_json="$(printf '{"job":"%s","status":"%s","expected_schedule":"%s","actual_schedule":"%s","expected_npm":"%s","reason":"%s"}' \
    "$(json_escape "$job")" \
    "$(json_escape "$status")" \
    "$(json_escape "$want_schedule")" \
    "$(json_escape "$actual_schedule")" \
    "$(json_escape "$want_npm")" \
    "$(json_escape "$reason")")"
  if [ -z "$jobs_json" ]; then
    jobs_json="$job_json"
  else
    jobs_json="$jobs_json,$job_json"
  fi
done

overall_status="pass"
if [ "$fail" -eq 1 ]; then
  overall_status="fail"
fi

if [ "$JSON_MODE" -eq 1 ]; then
  output="$(printf '{"status":"%s","jobs":[%s]}' "$overall_status" "$jobs_json")"
  if [ -n "$JSON_FILE" ]; then
    printf '%s\n' "$output" > "$JSON_FILE"
  else
    printf '%s\n' "$output"
  fi
fi

if [ "$fail" -eq 1 ]; then
  if [ "$JSON_MODE" -eq 0 ]; then
    echo "Cron doctor FAILED"
  fi
  exit 1
fi

if [ "$JSON_MODE" -eq 0 ]; then
  echo "Cron doctor PASSED"
fi
