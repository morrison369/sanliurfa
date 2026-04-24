#!/usr/bin/env bash
# CWP domain kullanıcısı için cron kurulum scripti
# Kullanım:
#   bash scripts/cwp-cron-install.sh install
#   bash scripts/cwp-cron-install.sh remove
#   bash scripts/cwp-cron-install.sh show

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
CRON_TAG="# SANLIURFA_CWP_OPS"
OPS_DIR="$APP_DIR/backups/.ops"
INSTALLED_AT_FILE="$OPS_DIR/cron-installed-at"

usage() {
  cat <<'EOF'
Kullanım:
  bash scripts/cwp-cron-install.sh install
  bash scripts/cwp-cron-install.sh install-if-needed
  bash scripts/cwp-cron-install.sh apply-safe
  bash scripts/cwp-cron-install.sh remove
  bash scripts/cwp-cron-install.sh show
  bash scripts/cwp-cron-install.sh preview
  bash scripts/cwp-cron-install.sh diff
EOF
}

require_user_mode() {
  if [ "$(id -u)" -eq 0 ]; then
    echo "Hata: Bu script root ile çalıştırılamaz. CWP domain kullanıcısı ile çalıştırın."
    exit 1
  fi
}

managed_entries() {
  cat <<EOF
$CRON_TAG doctor-hourly
5 * * * * cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh doctor-hourly npm run -s ops:cwp:doctor >> "$APP_DIR/backups/.ops/cron-doctor.log" 2>&1
$CRON_TAG smoke-6hour
35 */6 * * * cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh smoke-6hour npm run -s ops:cwp:smoke >> "$APP_DIR/backups/.ops/cron-smoke.log" 2>&1
$CRON_TAG report-daily
45 3 * * * cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh report-daily npm run -s ops:cwp:report >> "$APP_DIR/backups/.ops/cron-report.log" 2>&1
$CRON_TAG rotate-events-daily
10 3 * * * cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh rotate-events-daily npm run -s ops:cwp:rotate-events >> "$APP_DIR/backups/.ops/cron-rotate.log" 2>&1
$CRON_TAG cleanup-weekly
20 3 * * 0 cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh cleanup-weekly npm run -s ops:cwp:cleanup >> "$APP_DIR/backups/.ops/cron-cleanup.log" 2>&1
$CRON_TAG incident-cleanup-weekly
30 3 * * 0 cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh incident-cleanup-weekly npm run -s ops:cwp:incident-cleanup >> "$APP_DIR/backups/.ops/cron-incident-cleanup.log" 2>&1
$CRON_TAG daily-ops
5 4 * * * cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh daily-ops npm run -s ops:cwp:daily >> "$APP_DIR/backups/.ops/cron-daily-ops.log" 2>&1
$CRON_TAG weekly-audit
15 4 * * 0 cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh weekly-audit npm run -s ops:cwp:weekly >> "$APP_DIR/backups/.ops/cron-weekly-audit.log" 2>&1
$CRON_TAG release-readiness
35 4 * * * cd "$APP_DIR" && bash scripts/cwp-cron-runner.sh release-readiness npm run -s ops:cwp:release-readiness >> "$APP_DIR/backups/.ops/cron-release-readiness.log" 2>&1
EOF
}

strip_managed_entries() {
  # Remove both marker lines and their following cron command lines.
  awk -v tag="$CRON_TAG" '
    BEGIN { skip=0 }
    skip==1 { skip=0; next }
    index($0, tag)==1 { skip=1; next }
    { print }
  '
}

install_cron() {
  require_user_mode
  mkdir -p "$OPS_DIR"

  local tmp
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT

  crontab -l 2>/dev/null | strip_managed_entries > "$tmp" || true

  {
    echo ""
    managed_entries
  } >> "$tmp"

  crontab "$tmp"
  date +%s > "$INSTALLED_AT_FILE"
  echo "Cron kuruldu."
}

remove_cron() {
  require_user_mode
  mkdir -p "$OPS_DIR"
  local tmp
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT

  crontab -l 2>/dev/null | strip_managed_entries > "$tmp" || true
  crontab "$tmp"
  echo "Cron kayıtları kaldırıldı."
}

show_cron() {
  crontab -l 2>/dev/null | sed -n '/SANLIURFA_CWP_OPS/,+1p' || true
}

preview_cron() {
  echo "Managed cron entries preview:"
  echo ""
  managed_entries
}

current_managed_entries() {
  crontab -l 2>/dev/null | sed -n '/SANLIURFA_CWP_OPS/,+1p' || true
}

diff_cron() {
  local current managed
  current="$(mktemp)"
  managed="$(mktemp)"
  trap 'rm -f "$current" "$managed"' EXIT

  current_managed_entries > "$current"
  managed_entries > "$managed"

  echo "Diff (current vs managed entries):"
  if command -v diff >/dev/null 2>&1; then
    diff -u "$current" "$managed" || true
  else
    echo "Uyarı: diff komutu yok, sadece managed entries gösteriliyor."
    cat "$managed"
  fi
}

install_if_needed_cron() {
  require_user_mode
  local current managed
  current="$(mktemp)"
  managed="$(mktemp)"
  trap 'rm -f "$current" "$managed"' EXIT

  current_managed_entries > "$current"
  managed_entries > "$managed"

  if diff -q "$current" "$managed" >/dev/null 2>&1; then
    echo "Cron zaten güncel. Değişiklik yok."
    return 0
  fi

  install_cron
}

apply_safe_cron() {
  require_user_mode
  preview_cron
  echo ""
  diff_cron
  echo ""
  install_if_needed_cron
}

cmd="${1:-}"
case "$cmd" in
  install)
    install_cron
    ;;
  install-if-needed)
    install_if_needed_cron
    ;;
  apply-safe)
    apply_safe_cron
    ;;
  remove)
    remove_cron
    ;;
  show)
    show_cron
    ;;
  preview)
    preview_cron
    ;;
  diff)
    diff_cron
    ;;
  *)
    usage
    exit 1
    ;;
esac
