#!/usr/bin/env bash
# Şanlıurfa.com - CWP domain kullanıcısı operasyon scripti
# Komutlar:
#   bash scripts/prod-cwp-ops.sh health
#   bash scripts/prod-cwp-ops.sh deploy
#   bash scripts/prod-cwp-ops.sh rollback [release_id]
#   bash scripts/prod-cwp-ops.sh status
#   bash scripts/prod-cwp-ops.sh releases
#   bash scripts/prod-cwp-ops.sh cleanup
#   bash scripts/prod-cwp-ops.sh doctor
#   bash scripts/prod-cwp-ops.sh rotate-events
#   bash scripts/prod-cwp-ops.sh smoke
#   bash scripts/prod-cwp-ops.sh safe-deploy
#   bash scripts/prod-cwp-ops.sh env-check
#   bash scripts/prod-cwp-ops.sh report
#   bash scripts/prod-cwp-ops.sh preflight
#   bash scripts/prod-cwp-ops.sh cron-doctor
#   bash scripts/prod-cwp-ops.sh unlock
#   bash scripts/prod-cwp-ops.sh pipeline
#   bash scripts/prod-cwp-ops.sh pipeline-strict
#   bash scripts/prod-cwp-ops.sh audit
#   bash scripts/prod-cwp-ops.sh incident-bundle
#   bash scripts/prod-cwp-ops.sh triage
#   bash scripts/prod-cwp-ops.sh incident-cleanup
#   bash scripts/prod-cwp-ops.sh cron-freshness
#   bash scripts/prod-cwp-ops.sh bootstrap
#   bash scripts/prod-cwp-ops.sh cron-preview
#   bash scripts/prod-cwp-ops.sh cron-diff
#   bash scripts/prod-cwp-ops.sh cron-install-if-needed
#   bash scripts/prod-cwp-ops.sh cron-apply-safe
#   bash scripts/prod-cwp-ops.sh bootstrap-audit-summary
#   bash scripts/prod-cwp-ops.sh daily-ops
#   bash scripts/prod-cwp-ops.sh weekly-audit
#   bash scripts/prod-cwp-ops.sh release-readiness

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
PORT="${PORT:-4321}"
PM2_NAME="${PM2_NAME:-sanliurfa-app}"
RETAIN_RELEASES="${RETAIN_RELEASES:-20}"

RELEASE_DIR="$APP_DIR/backups/releases"
STATE_DIR="$APP_DIR/backups/.ops"
LOCK_FILE="$STATE_DIR/prod-cwp-ops.lock"
CURRENT_FILE="$STATE_DIR/current_release"
LAST_PREDEPLOY_FILE="$STATE_DIR/last_predeploy_release"
EVENT_LOG="$STATE_DIR/events.log"
EVENT_LOG_MAX_LINES="${EVENT_LOG_MAX_LINES:-5000}"
MIN_FREE_KB="${MIN_FREE_KB:-524288}"
LOCK_STALE_SECONDS="${LOCK_STALE_SECONDS:-7200}"
MAX_RELEASE_AGE_HOURS="${MAX_RELEASE_AGE_HOURS:-168}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { printf "%b%s%b\n" "$GREEN" "$1" "$NC"; }
warn() { printf "%b%s%b\n" "$YELLOW" "$1" "$NC"; }
err() { printf "%b%s%b\n" "$RED" "$1" "$NC"; }

event() {
  local level="$1"
  local action="$2"
  local message="$3"
  mkdir -p "$STATE_DIR"
  printf '{"ts":"%s","level":"%s","action":"%s","message":"%s"}\n' \
    "$(date -u +%FT%TZ)" "$level" "$action" "$message" >> "$EVENT_LOG"
}

require_user_mode() {
  if [ "$(id -u)" -eq 0 ]; then
    err "Bu script root ile çalıştırılamaz. CWP domain kullanıcısı ile çalıştırın."
    exit 1
  fi
}

ensure_dirs() {
  mkdir -p "$RELEASE_DIR" "$STATE_DIR"
}

preflight() {
  if [ ! -d "$APP_DIR" ]; then
    err "APP_DIR bulunamadı: $APP_DIR"
    exit 1
  fi
  if [ ! -f "$APP_DIR/package.json" ]; then
    err "package.json bulunamadı: $APP_DIR"
    exit 1
  fi
  local required_files=(
    "$APP_DIR/scripts/deploy-cwp.sh"
    "$APP_DIR/scripts/cwp-smoke.sh"
    "$APP_DIR/scripts/cwp-env-check.sh"
    "$APP_DIR/scripts/cwp-ops-report.sh"
    "$APP_DIR/scripts/cwp-cron-doctor.sh"
    "$APP_DIR/scripts/cwp-bootstrap-audit-summary.sh"
    "$APP_DIR/scripts/cwp-daily-ops.sh"
    "$APP_DIR/scripts/cwp-weekly-audit.sh"
    "$APP_DIR/scripts/cwp-release-readiness.sh"
  )
  for f in "${required_files[@]}"; do
    if [ ! -f "$f" ]; then
      err "Zorunlu script bulunamadı: $f"
      exit 1
    fi
  done

  for cmd in bash curl node npm pm2; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      err "Gerekli komut yok: $cmd"
      exit 1
    fi
  done

  local node_major npm_major
  node_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  npm_major="$(npm -v | sed -E 's/^([0-9]+).*/\1/')"
  if [ -z "$node_major" ] || [ "$node_major" -lt 20 ]; then
    err "Node.js sürümü yetersiz. Gereken: >=20, mevcut: $(node -v 2>/dev/null || echo unknown)"
    exit 1
  fi
  if [ -z "$npm_major" ] || [ "$npm_major" -lt 10 ]; then
    err "npm sürümü yetersiz. Gereken: >=10, mevcut: $(npm -v 2>/dev/null || echo unknown)"
    exit 1
  fi
}

smoke_flow() {
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-smoke.sh"
}

env_check_flow() {
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-env-check.sh"
}

report_flow() {
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-ops-report.sh"
}

incident_bundle_flow() {
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-incident-bundle.sh"
}

incident_cleanup_flow() {
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-incident-cleanup.sh"
}

cron_doctor_flow() {
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-cron-doctor.sh"
}

cron_freshness_flow() {
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-cron-freshness.sh"
}

cron_freshness_strict_flow() {
  preflight
  cd "$APP_DIR"
  CRON_FRESHNESS_STRICT=1 bash "$APP_DIR/scripts/cwp-cron-freshness.sh"
}

bootstrap_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-cron-install.sh" install-if-needed
  cron_doctor_flow
  report_flow
  status_flow
  log "Bootstrap tamamlandı."
}

cron_preview_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-cron-install.sh" preview
}

cron_diff_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-cron-install.sh" diff
}

cron_install_if_needed_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-cron-install.sh" install-if-needed
}

cron_apply_safe_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-cron-install.sh" apply-safe
  cron_doctor_flow
}

bootstrap_audit_summary_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-bootstrap-audit-summary.sh"
}

daily_ops_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-daily-ops.sh"
}

weekly_audit_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-weekly-audit.sh"
}

release_readiness_flow() {
  require_user_mode
  ensure_dirs
  preflight
  cd "$APP_DIR"
  bash "$APP_DIR/scripts/cwp-release-readiness.sh"
}

predeploy_checks() {
  log "Predeploy checks: env-check"
  env_check_flow
  log "Predeploy checks: doctor"
  doctor_flow
  log "Predeploy checks: smoke"
  smoke_flow
  log "Predeploy checks: report"
  report_flow
}

acquire_lock() {
  if [ -f "$LOCK_FILE" ]; then
    local lock_pid="" lock_mtime="" now_ts="" age=""
    lock_pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"

    if [ -n "$lock_pid" ] && kill -0 "$lock_pid" >/dev/null 2>&1; then
      err "Kilitli: $LOCK_FILE (pid=$lock_pid aktif)"
      err "Önce mevcut işlemin bitmesini bekleyin."
      exit 1
    fi

    lock_mtime="$(stat -c %Y "$LOCK_FILE" 2>/dev/null || stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0)"
    now_ts="$(date +%s)"
    age=$((now_ts - lock_mtime))
    if [ "$age" -lt "$LOCK_STALE_SECONDS" ]; then
      err "Kilit dosyası bulundu ve yeni görünüyor (age=${age}s): $LOCK_FILE"
      err "Gerekirse manuel açma için: bash scripts/prod-cwp-ops.sh unlock"
      exit 1
    fi

    warn "Stale lock temizleniyor: $LOCK_FILE (age=${age}s)"
    rm -f "$LOCK_FILE"
    event "warn" "lock" "stale lock removed age=${age}s"
  fi
  printf "%s\n" "$$" > "$LOCK_FILE"
  event "info" "lock" "lock acquired pid=$$"
}

release_lock() {
  rm -f "$LOCK_FILE"
  event "info" "lock" "lock released pid=$$"
}

unlock_flow() {
  ensure_dirs
  if [ -f "$LOCK_FILE" ]; then
    rm -f "$LOCK_FILE"
    event "warn" "lock" "manual unlock"
    log "Lock kaldırıldı: $LOCK_FILE"
  else
    log "Lock yok: $LOCK_FILE"
  fi
}

health_check() {
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/health" || true)"
  if [ "$code" = "200" ]; then
    log "Health OK (HTTP 200)"
    return 0
  fi
  err "Health FAIL (HTTP ${code:-000})"
  return 1
}

snapshot_dist() {
  local release_id="$1"
  local target="$RELEASE_DIR/$release_id"
  mkdir -p "$target"

  if [ -d "$APP_DIR/dist" ]; then
    cp -R "$APP_DIR/dist" "$target/dist"
  fi
  if [ -f "$APP_DIR/ecosystem.config.cjs" ]; then
    cp "$APP_DIR/ecosystem.config.cjs" "$target/ecosystem.config.cjs"
  fi
  printf '{"release":"%s","created_at":"%s","port":"%s","pm2":"%s"}\n' \
    "$release_id" "$(date -u +%FT%TZ)" "$PORT" "$PM2_NAME" > "$target/release.json"
  printf "%s\n" "$release_id" > "$CURRENT_FILE"
}

list_releases() {
  if [ ! -d "$RELEASE_DIR" ]; then
    return 0
  fi
  ls -1t "$RELEASE_DIR" 2>/dev/null || true
}

check_release_freshness() {
  local latest_release latest_path latest_mtime now_ts age_hours
  latest_release="$(list_releases | head -n1 || true)"
  if [ -z "$latest_release" ]; then
    err "Hiç release bulunamadı."
    return 1
  fi
  latest_path="$RELEASE_DIR/$latest_release"
  latest_mtime="$(stat -c %Y "$latest_path" 2>/dev/null || stat -f %m "$latest_path" 2>/dev/null || echo 0)"
  now_ts="$(date +%s)"
  age_hours=$(((now_ts - latest_mtime) / 3600))
  if [ "$age_hours" -gt "$MAX_RELEASE_AGE_HOURS" ]; then
    err "Release çok eski: $latest_release (age=${age_hours}h, max=${MAX_RELEASE_AGE_HOURS}h)"
    return 1
  fi
  log "Release tazeliği OK: $latest_release (age=${age_hours}h)"
}

restore_release() {
  local target_release="$1"
  local target="$RELEASE_DIR/$target_release"

  if [ ! -d "$target/dist" ]; then
    err "Release dist yok: $target_release"
    return 1
  fi

  rm -rf "$APP_DIR/dist"
  cp -R "$target/dist" "$APP_DIR/dist"

  if [ -f "$target/ecosystem.config.cjs" ]; then
    cp "$target/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs"
  fi

  pm2 restart "$PM2_NAME" 2>/dev/null || pm2 start "$APP_DIR/ecosystem.config.cjs" --name "$PM2_NAME"
  pm2 save >/dev/null 2>&1 || true

  if ! health_check; then
    err "Rollback sonrası health de başarısız."
    return 1
  fi

  printf "%s\n" "$target_release" > "$CURRENT_FILE"
  event "warn" "rollback" "rollback applied: $target_release"
  log "Rollback tamamlandı: $target_release"
}

deploy_flow() {
  require_user_mode
  ensure_dirs
  preflight
  acquire_lock
  trap release_lock EXIT

  cd "$APP_DIR"

  local pre_id
  pre_id="predeploy_$(date +%Y%m%d_%H%M%S)"
  if [ -d "$APP_DIR/dist" ]; then
    log "Predeploy snapshot alınıyor: $pre_id"
    snapshot_dist "$pre_id"
    printf "%s\n" "$pre_id" > "$LAST_PREDEPLOY_FILE"
  else
    warn "dist yok, predeploy snapshot atlandı."
  fi

  event "info" "deploy" "deploy start"
  log "Deploy başlatılıyor"
  if ! bash "$APP_DIR/scripts/deploy-cwp.sh"; then
    err "Deploy script başarısız."
    event "error" "deploy" "deploy script failed"
    if [ -f "$LAST_PREDEPLOY_FILE" ]; then
      local fallback
      fallback="$(cat "$LAST_PREDEPLOY_FILE")"
      warn "Otomatik rollback deneniyor: $fallback"
      restore_release "$fallback" || true
    fi
    exit 1
  fi

  log "Deploy sonrası health kontrol"
  if ! health_check; then
    err "Deploy sonrası health başarısız."
    event "error" "deploy" "post-deploy health failed"
    if [ -f "$LAST_PREDEPLOY_FILE" ]; then
      local fallback
      fallback="$(cat "$LAST_PREDEPLOY_FILE")"
      warn "Otomatik rollback deneniyor: $fallback"
      restore_release "$fallback" || true
    fi
    exit 1
  fi

  log "Deploy sonrası smoke kontrol"
  if ! smoke_flow; then
    err "Deploy sonrası smoke başarısız."
    event "error" "deploy" "post-deploy smoke failed"
    if [ -f "$LAST_PREDEPLOY_FILE" ]; then
      local fallback
      fallback="$(cat "$LAST_PREDEPLOY_FILE")"
      warn "Otomatik rollback deneniyor: $fallback"
      restore_release "$fallback" || true
    fi
    exit 1
  fi

  local rel_id
  rel_id="release_$(date +%Y%m%d_%H%M%S)"
  log "Başarılı release snapshot alınıyor: $rel_id"
  snapshot_dist "$rel_id"
  event "info" "deploy" "deploy success: $rel_id"

  cleanup_flow "quiet"
  log "Deploy tamamlandı"
}

safe_deploy_flow() {
  require_user_mode
  ensure_dirs
  preflight
  predeploy_checks
  deploy_flow
}

pipeline_flow() {
  require_user_mode
  ensure_dirs
  preflight
  safe_deploy_flow
  cron_doctor_flow || true
  report_flow || true
  status_flow || true
}

pipeline_strict_flow() {
  require_user_mode
  ensure_dirs
  preflight
  safe_deploy_flow
  cron_doctor_flow
  cron_freshness_strict_flow
  report_flow
  status_flow
}

audit_flow() {
  require_user_mode
  ensure_dirs
  preflight
  env_check_flow
  health_check
  cron_doctor_flow
  cron_freshness_strict_flow
  check_release_freshness
  report_flow
  status_flow
  log "Audit başarılı."
}

triage_flow() {
  require_user_mode
  ensure_dirs
  preflight
  if audit_flow; then
    log "Triage sonucu: audit başarılı, incident bundle gerekmiyor."
    return 0
  fi

  warn "Triage: audit başarısız, incident bundle oluşturuluyor."
  incident_bundle_flow || true
  err "Triage sonucu: FAIL"
  return 1
}

rollback_flow() {
  require_user_mode
  ensure_dirs
  preflight
  acquire_lock
  trap release_lock EXIT

  cd "$APP_DIR"

  local target_release="${1:-}"
  if [ -z "$target_release" ]; then
    if [ -f "$LAST_PREDEPLOY_FILE" ]; then
      target_release="$(cat "$LAST_PREDEPLOY_FILE")"
    else
      target_release="$(list_releases | head -n1)"
    fi
  fi

  if [ -z "$target_release" ] || [ ! -d "$RELEASE_DIR/$target_release/dist" ]; then
    err "Rollback release bulunamadı: ${target_release:-<none>}"
    exit 1
  fi

  warn "Rollback uygulanıyor: $target_release"
  restore_release "$target_release"
}

releases_flow() {
  ensure_dirs
  local current="" pre=""
  [ -f "$CURRENT_FILE" ] && current="$(cat "$CURRENT_FILE")"
  [ -f "$LAST_PREDEPLOY_FILE" ] && pre="$(cat "$LAST_PREDEPLOY_FILE")"

  echo "Release listesi (yeniden eskiye):"
  list_releases | while read -r rel; do
    [ -z "$rel" ] && continue
    local marks=""
    [ "$rel" = "$current" ] && marks="$marks [current]"
    [ "$rel" = "$pre" ] && marks="$marks [predeploy]"
    echo "- $rel$marks"
  done
}

cleanup_flow() {
  ensure_dirs
  local mode="${1:-normal}"
  local current="" pre=""
  [ -f "$CURRENT_FILE" ] && current="$(cat "$CURRENT_FILE")"
  [ -f "$LAST_PREDEPLOY_FILE" ] && pre="$(cat "$LAST_PREDEPLOY_FILE")"

  local idx=0
  local deleted=0
  while read -r rel; do
    [ -z "$rel" ] && continue
    idx=$((idx + 1))
    if [ "$idx" -le "$RETAIN_RELEASES" ]; then
      continue
    fi
    if [ "$rel" = "$current" ] || [ "$rel" = "$pre" ]; then
      continue
    fi
    rm -rf "$RELEASE_DIR/$rel"
    deleted=$((deleted + 1))
    if [ "$mode" != "quiet" ]; then
      echo "Silindi: $rel"
    fi
  done < <(list_releases)

  event "info" "cleanup" "cleanup deleted=$deleted retain=$RETAIN_RELEASES"
  if [ "$mode" != "quiet" ]; then
    log "Cleanup tamamlandı. Silinen release: $deleted"
  fi
}

status_flow() {
  ensure_dirs
  preflight
  cd "$APP_DIR"
  echo "App dir: $APP_DIR"
  echo "Port: $PORT"
  echo "PM2 process: $PM2_NAME"
  echo "Node: $(node -v 2>/dev/null || echo unknown)"
  echo "npm: $(npm -v 2>/dev/null || echo unknown)"
  echo "Retain releases: $RETAIN_RELEASES"
  if [ -f "$CURRENT_FILE" ]; then
    echo "Current release: $(cat "$CURRENT_FILE")"
  else
    echo "Current release: yok"
  fi
  if [ -f "$LAST_PREDEPLOY_FILE" ]; then
    echo "Last predeploy: $(cat "$LAST_PREDEPLOY_FILE")"
  else
    echo "Last predeploy: yok"
  fi
  echo "Recent releases:"
  list_releases | head -n 10 | sed 's/^/- /'
  echo ""
  pm2 status "$PM2_NAME" || true
  echo ""
  health_check || true
}

usage() {
  cat <<'EOF'
Kullanım:
  bash scripts/prod-cwp-ops.sh health
  bash scripts/prod-cwp-ops.sh deploy
  bash scripts/prod-cwp-ops.sh rollback [release_id]
  bash scripts/prod-cwp-ops.sh status
  bash scripts/prod-cwp-ops.sh releases
  bash scripts/prod-cwp-ops.sh cleanup
  bash scripts/prod-cwp-ops.sh doctor
  bash scripts/prod-cwp-ops.sh rotate-events
  bash scripts/prod-cwp-ops.sh smoke
  bash scripts/prod-cwp-ops.sh safe-deploy
  bash scripts/prod-cwp-ops.sh env-check
  bash scripts/prod-cwp-ops.sh report
  bash scripts/prod-cwp-ops.sh preflight
  bash scripts/prod-cwp-ops.sh cron-doctor
  bash scripts/prod-cwp-ops.sh unlock
  bash scripts/prod-cwp-ops.sh pipeline
  bash scripts/prod-cwp-ops.sh pipeline-strict
  bash scripts/prod-cwp-ops.sh audit
  bash scripts/prod-cwp-ops.sh incident-bundle
  bash scripts/prod-cwp-ops.sh triage
  bash scripts/prod-cwp-ops.sh incident-cleanup
  bash scripts/prod-cwp-ops.sh cron-freshness
  bash scripts/prod-cwp-ops.sh bootstrap
  bash scripts/prod-cwp-ops.sh cron-preview
  bash scripts/prod-cwp-ops.sh cron-diff
  bash scripts/prod-cwp-ops.sh cron-install-if-needed
  bash scripts/prod-cwp-ops.sh cron-apply-safe
  bash scripts/prod-cwp-ops.sh bootstrap-audit-summary
  bash scripts/prod-cwp-ops.sh daily-ops
  bash scripts/prod-cwp-ops.sh weekly-audit
  bash scripts/prod-cwp-ops.sh release-readiness
EOF
}

rotate_events_flow() {
  ensure_dirs
  if [ ! -f "$EVENT_LOG" ]; then
    log "Event log yok, rotate atlandı."
    return 0
  fi

  local lines
  lines="$(wc -l < "$EVENT_LOG" | tr -d ' ')"
  if [ "$lines" -le "$EVENT_LOG_MAX_LINES" ]; then
    log "Event log rotate gerekmedi (lines=$lines)."
    return 0
  fi

  tail -n "$EVENT_LOG_MAX_LINES" "$EVENT_LOG" > "$EVENT_LOG.tmp"
  mv "$EVENT_LOG.tmp" "$EVENT_LOG"
  log "Event log rotate tamamlandı (lines=$lines -> $EVENT_LOG_MAX_LINES)."
}

doctor_flow() {
  ensure_dirs
  preflight
  cd "$APP_DIR"

  local fail=0
  echo "=== CWP Ops Doctor ==="
  echo "APP_DIR=$APP_DIR"
  echo "PORT=$PORT"
  echo "PM2_NAME=$PM2_NAME"

  if [ -f "$APP_DIR/.env" ]; then
    echo "[OK] .env bulundu"
  else
    echo "[FAIL] .env bulunamadı"
    fail=1
  fi

  if env_check_flow; then
    echo "[OK] env check geçti"
  else
    echo "[FAIL] env check başarısız"
    fail=1
  fi

  if [ -w "$STATE_DIR" ] && [ -w "$RELEASE_DIR" ]; then
    echo "[OK] backup/state dizinleri yazılabilir"
  else
    echo "[FAIL] backup/state dizinlerine yazma izni yok"
    fail=1
  fi

  local free_kb
  free_kb="$(df -Pk "$APP_DIR" | awk 'NR==2 {print $4}')"
  if [ -n "$free_kb" ] && [ "$free_kb" -ge "$MIN_FREE_KB" ]; then
    echo "[OK] boş disk yeterli (${free_kb}KB)"
  else
    echo "[FAIL] boş disk düşük (${free_kb:-0}KB), minimum ${MIN_FREE_KB}KB"
    fail=1
  fi

  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    echo "[OK] PM2 process mevcut: $PM2_NAME"
  else
    echo "[FAIL] PM2 process yok: $PM2_NAME"
    fail=1
  fi

  if health_check; then
    echo "[OK] health endpoint canlı"
  else
    echo "[FAIL] health endpoint başarısız"
    fail=1
  fi

  if [ -f "$CURRENT_FILE" ]; then
    local cur
    cur="$(cat "$CURRENT_FILE")"
    if [ -d "$RELEASE_DIR/$cur/dist" ]; then
      echo "[OK] current release snapshot mevcut: $cur"
    else
      echo "[WARN] current release snapshot eksik: $cur"
    fi
  else
    echo "[WARN] current release kayıt dosyası yok"
  fi

  rotate_events_flow || true

  if [ "$fail" -eq 1 ]; then
    event "error" "doctor" "doctor failed"
    err "Doctor sonucu: FAIL"
    exit 1
  fi
  event "info" "doctor" "doctor passed"
  log "Doctor sonucu: OK"
}

cmd="${1:-}"
case "$cmd" in
  health)
    preflight
    health_check
    ;;
  deploy)
    deploy_flow
    ;;
  rollback)
    rollback_flow "${2:-}"
    ;;
  status)
    status_flow
    ;;
  releases)
    releases_flow
    ;;
  cleanup)
    cleanup_flow
    ;;
  doctor)
    doctor_flow
    ;;
  rotate-events)
    rotate_events_flow
    ;;
  smoke)
    smoke_flow
    ;;
  env-check)
    env_check_flow
    ;;
  report)
    report_flow
    ;;
  preflight)
    predeploy_checks
    ;;
  cron-doctor)
    cron_doctor_flow
    ;;
  unlock)
    unlock_flow
    ;;
  pipeline)
    pipeline_flow
    ;;
  pipeline-strict)
    pipeline_strict_flow
    ;;
  audit)
    audit_flow
    ;;
  incident-bundle)
    incident_bundle_flow
    ;;
  triage)
    triage_flow
    ;;
  incident-cleanup)
    incident_cleanup_flow
    ;;
  cron-freshness)
    cron_freshness_flow
    ;;
  bootstrap)
    bootstrap_flow
    ;;
  cron-preview)
    cron_preview_flow
    ;;
  cron-diff)
    cron_diff_flow
    ;;
  cron-install-if-needed)
    cron_install_if_needed_flow
    ;;
  cron-apply-safe)
    cron_apply_safe_flow
    ;;
  bootstrap-audit-summary)
    bootstrap_audit_summary_flow
    ;;
  daily-ops)
    daily_ops_flow
    ;;
  weekly-audit)
    weekly_audit_flow
    ;;
  release-readiness)
    release_readiness_flow
    ;;
  safe-deploy)
    safe_deploy_flow
    ;;
  *)
    usage
    exit 1
    ;;
esac
