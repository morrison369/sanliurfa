#!/bin/bash
# Şanlıurfa.com — k6-less smoke test (curl-only)
# Production health check without requiring k6 binary.
#
# Usage:
#   bash scripts/prod-smoke-curl.sh                    # default https://sanliurfa.com
#   TARGET=https://staging.sanliurfa.com bash scripts/prod-smoke-curl.sh

set -euo pipefail

TARGET="${TARGET:-https://sanliurfa.com}"
PASS=0
FAIL=0
TOTAL_MS=0
SLOW=()

# Endpoints to probe: path | expected_status | match_pattern (optional)
ENDPOINTS=(
  "/api/health|200|status"
  "/|200|Şanlıurfa"
  "/sitemap.xml|200|<urlset"
  "/robots.txt|200|User-agent"
  "/llms.txt|200|"
  "/api/places?limit=5|200|"
  "/blog|200|"
  "/etkinlikler|200|"
  "/hakkinda|200|"
  "/iletisim|200|"
)

echo "═══════════════════════════════════════════════════════════"
echo "  PROD SMOKE — $TARGET"
echo "  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "═══════════════════════════════════════════════════════════"

for entry in "${ENDPOINTS[@]}"; do
  IFS='|' read -r path expected_status match <<< "$entry"
  url="${TARGET}${path}"

  # Single curl: get status + timings + body (truncated)
  result=$(curl -sS -o /tmp/smoke-body.txt \
    -w "%{http_code}|%{time_starttransfer}|%{time_total}|%{size_download}" \
    -A "sanliurfa-prod-smoke/1.0" \
    --max-time 15 \
    "$url" 2>&1 || echo "0|0|0|0")

  IFS='|' read -r status ttfb total size <<< "$result"
  ttfb_ms=$(awk "BEGIN { printf \"%.0f\", $ttfb * 1000 }")
  total_ms=$(awk "BEGIN { printf \"%.0f\", $total * 1000 }")
  TOTAL_MS=$((TOTAL_MS + total_ms))

  status_ok="✗"
  if [ "$status" = "$expected_status" ]; then
    status_ok="✓"
  fi

  body_ok="-"
  if [ -n "$match" ] && [ -f /tmp/smoke-body.txt ]; then
    if grep -q "$match" /tmp/smoke-body.txt 2>/dev/null; then
      body_ok="✓"
    else
      body_ok="✗"
    fi
  fi

  # Slow if > 1500ms TTFB
  slow_flag=""
  if [ "$ttfb_ms" -gt 1500 ] 2>/dev/null; then
    slow_flag=" ⚠ SLOW"
    SLOW+=("$path:${ttfb_ms}ms")
  fi

  printf "  %s %-30s HTTP %s | TTFB %4sms | %s body%s\n" \
    "$status_ok" "$path" "$status" "$ttfb_ms" "$body_ok" "$slow_flag"

  if [ "$status_ok" = "✓" ] && [ "$body_ok" != "✗" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
done

echo "═══════════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
AVG_MS=$((TOTAL_MS / TOTAL))
VERDICT="PASS"
if [ "$FAIL" -gt 0 ]; then
  VERDICT="FAIL"
fi
echo "  Verdict:    $VERDICT"
echo "  Passed:     $PASS / $TOTAL"
echo "  Failed:     $FAIL"
echo "  Avg total:  ${AVG_MS}ms"
if [ ${#SLOW[@]} -gt 0 ]; then
  echo "  Slow paths: ${SLOW[*]}"
fi
echo "═══════════════════════════════════════════════════════════"

rm -f /tmp/smoke-body.txt
[ "$FAIL" -eq 0 ]
