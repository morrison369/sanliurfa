#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOC="$ROOT/docs/ACTIVE_DEPLOYMENT_CWP_4321.md"

echo "$SCRIPT_NAME devre disi: legacy remote operasyon scripti."
echo "Aktif runtime: Astro SSR + PM2 + PORT=4321 + ecosystem.config.cjs"
echo "Kaynak dokuman: $DOC"
exit 1
