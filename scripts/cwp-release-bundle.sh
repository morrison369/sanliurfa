#!/usr/bin/env bash
set -euo pipefail

echo "[cwp-release-bundle] preflight"
bash scripts/prod-cwp-ops.sh preflight

echo "[cwp-release-bundle] smoke"
bash scripts/prod-cwp-ops.sh smoke

echo "[cwp-release-bundle] release-readiness"
bash scripts/prod-cwp-ops.sh release-readiness

echo "[cwp-release-bundle] report"
bash scripts/prod-cwp-ops.sh report

echo "[cwp-release-bundle] done"

