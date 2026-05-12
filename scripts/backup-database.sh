#!/bin/bash
# Database Backup Script for CWP — cron tarafından günlük çalıştırılır.
# Cron tag: db-backup-daily (cwp-cron-install.sh'da 02:30 UTC)
#
# Env override:
#   PROD_DB_NAME (default: sanliur_sanliurfa veya .env DATABASE_URL'den parse)
#   PROD_DB_USER (default: sanliur)
#   BACKUP_DIR   (default: $HOME/backups)
#   BACKUP_RETENTION_DAYS (default: 7)

set -euo pipefail

# .env dosyasını yükle (varsa)
if [ -f "$(dirname "$0")/../.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$(dirname "$0")/../.env"
    set +a
fi

# DATABASE_URL parse: postgresql://user:pass@host:port/db
if [ -n "${DATABASE_URL:-}" ] && [ -z "${PROD_DB_NAME:-}" ]; then
    PROD_DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
    PROD_DB_USER=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
fi

DB_NAME="${PROD_DB_NAME:-sanliur_sanliurfa}"
DB_USER="${PROD_DB_USER:-$(whoami)}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup hedef dosyası (gzip ile sıkıştırılmış SQL dump)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$DATE.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting database backup: db=$DB_NAME user=$DB_USER → $BACKUP_FILE"

# pg_dump → gzip. Hata durumunda log + non-zero exit.
if pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl --clean --if-exists | gzip -9 > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup OK ($FILE_SIZE)"
else
    log "ERROR: pg_dump failed (db=$DB_NAME)"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Eski yedekleri temizle (retention günü öncesi)
log "Cleaning backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime "+$RETENTION_DAYS" -print -delete | wc -l)
REMAINING=$(find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" | wc -l)
log "Removed $DELETED old backup(s). $REMAINING remaining."

# Disk usage check — backup dir > 1GB ise warning
DIR_SIZE=$(du -sm "$BACKUP_DIR" | cut -f1)
if [ "$DIR_SIZE" -gt 1024 ]; then
    log "WARN: backup dir > 1GB ($DIR_SIZE MB) — retention'ı kısaltmayı düşün"
fi

log "Backup process completed successfully."
