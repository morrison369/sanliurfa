#!/usr/bin/env bash
# CWP prod smoke checks (domain user)
# Usage: bash scripts/cwp-smoke.sh

set -euo pipefail

PORT="${PORT:-4321}"
BASE_URL="${BASE_URL:-http://127.0.0.1:$PORT}"

check_http() {
  local path="$1"
  local expected="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path" || true)"
  if [ "$code" != "$expected" ]; then
    echo "[FAIL] $path expected=$expected got=${code:-000}"
    return 1
  fi
  echo "[OK] $path ($code)"
}

main() {
  echo "CWP smoke checks: $BASE_URL"
  check_http "/api/health" "200"
  check_http "/robots.txt" "200"
  check_http "/sitemap.xml" "200"
  check_http "/llms.txt" "200"
  echo "Smoke checks passed."
}

main "$@"
