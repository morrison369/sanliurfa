#!/usr/bin/env bash
# CWP bootstrap + strict audit (fail-fast)
# Usage: bash scripts/cwp-bootstrap-audit.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"

cd "$APP_DIR"

echo "[1/4] Cron install-if-needed"
bash scripts/cwp-cron-install.sh install-if-needed

echo "[2/4] Cron doctor"
bash scripts/cwp-cron-doctor.sh

echo "[3/4] Cron freshness strict"
CRON_FRESHNESS_STRICT=1 bash scripts/cwp-cron-freshness.sh

echo "[4/4] Full audit"
bash scripts/prod-cwp-ops.sh audit

echo "Bootstrap + audit tamamlandı."
