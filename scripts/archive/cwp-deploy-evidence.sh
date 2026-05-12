#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
OUT_DIR="$ROOT_DIR/docs/evidence"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BUNDLE="$OUT_DIR/cwp-deploy-evidence-$STAMP.tar.gz"

mkdir -p "$OUT_DIR"

TMP_LIST="$OUT_DIR/.evidence-files-$STAMP.txt"
{
  [ -f "$ROOT_DIR/docs/release-readiness.json" ] && echo "docs/release-readiness.json"
  [ -f "$ROOT_DIR/docs/release-readiness.md" ] && echo "docs/release-readiness.md"
  [ -f "$ROOT_DIR/docs/openapi-p0-closure-report.json" ] && echo "docs/openapi-p0-closure-report.json"
  [ -f "$ROOT_DIR/docs/openapi-p0-closure-report.md" ] && echo "docs/openapi-p0-closure-report.md"
  [ -f "$ROOT_DIR/docs/problem-json-report.json" ] && echo "docs/problem-json-report.json"
  [ -f "$ROOT_DIR/docs/runtime-health-report.json" ] && echo "docs/runtime-health-report.json"
  [ -f "$ROOT_DIR/docs/runtime-health-report.md" ] && echo "docs/runtime-health-report.md"
} > "$TMP_LIST"

if [ ! -s "$TMP_LIST" ]; then
  echo "evidence oluşturulamadı: dahil edilecek rapor bulunamadı" >&2
  exit 1
fi

tar -czf "$BUNDLE" -C "$ROOT_DIR" -T "$TMP_LIST"
rm -f "$TMP_LIST"

echo "evidence bundle: $BUNDLE"

