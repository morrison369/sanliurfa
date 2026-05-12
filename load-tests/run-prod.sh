#!/bin/bash
# k6 Production Load Test Runner
# Şanlıurfa.com — safe wrapper for prod-targeted load tests
#
# Usage:
#   bash load-tests/run-prod.sh smoke      # 1 VU, ~10 req, ~5sec
#   bash load-tests/run-prod.sh baseline   # 50 VU, 5min, ~5000 req
#
# DEFAULTS:
#   - Targets https://sanliurfa.com (override with TARGET env)
#   - Refuses to run baseline against localhost (use --force)
#   - Stores results in load-tests/results/

set -euo pipefail

MODE="${1:-smoke}"
TARGET="${TARGET:-https://sanliurfa.com}"
RESULTS_DIR="load-tests/results"

mkdir -p "$RESULTS_DIR"

# Verify k6 installed
if ! command -v k6 &> /dev/null; then
  echo "❌ k6 not found. Install: https://k6.io/docs/get-started/installation/"
  echo "   Windows: winget install k6"
  echo "   macOS:   brew install k6"
  echo "   Linux:   sudo apt install k6  (or download binary)"
  exit 1
fi

# Safety: require explicit --force for baseline against non-prod
if [ "$MODE" = "baseline" ] && [[ "$TARGET" == *localhost* ]] && [ "${2:-}" != "--force" ]; then
  echo "⚠️  BASELINE against localhost rejected — use TARGET=https://sanliurfa.com"
  echo "   To force: bash load-tests/run-prod.sh baseline --force"
  exit 2
fi

# Confirm prod hit
if [[ "$TARGET" == *sanliurfa.com* ]] && [ "$MODE" = "baseline" ]; then
  echo "🚨 You are about to run BASELINE LOAD TEST against PRODUCTION:"
  echo "   $TARGET — 50 VUs × 5 minutes"
  read -p "   Continue? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

case "$MODE" in
  smoke)
    echo "🔍 Running SMOKE test against $TARGET (1 VU, ~10 req)"
    k6 run --env BASE_URL="$TARGET" \
           --summary-export "$RESULTS_DIR/smoke-$(date +%Y%m%d_%H%M%S).json" \
           load-tests/prod-smoke.js
    ;;
  baseline)
    echo "📊 Running BASELINE load test against $TARGET (50 VUs × 5 min)"
    k6 run --env BASE_URL="$TARGET" \
           --summary-export "$RESULTS_DIR/baseline-$(date +%Y%m%d_%H%M%S).json" \
           load-tests/prod-baseline.js
    ;;
  *)
    echo "Usage: bash load-tests/run-prod.sh [smoke|baseline]"
    exit 1
    ;;
esac

echo ""
echo "✅ Test completed. Results: $RESULTS_DIR/"
ls -lt "$RESULTS_DIR" | head -3
