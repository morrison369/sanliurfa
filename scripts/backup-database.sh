#!/bin/bash
# Database Backup Script for CWP
# Run daily via cron

# Configuration
DB_NAME="sanliurfa"
DB_USER="postgres"
BACKUP_DIR="/home/$(whoami)/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$DATE.sql.gz"

# Log file
LOG_FILE="$BACKUP_DIR/backup.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting database backup..."

# Create backup
if pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    log_message "Backup created successfully: $BACKUP_FILE"
    
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_message "Backup size: $FILE_SIZE"
else
    log_message "ERROR: Backup failed!"
    exit 1
fi

# Clean up old backups (keep last 7 days)
log_message "Cleaning up old backups..."
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" | wc -l)
log_message "Cleanup completed. $BACKUP_COUNT backups remaining."

log_message "Backup process completed."

# Optional: Send notification (if configured)
# curl -X POST "$SLACK_WEBHOOK_URL" -d "{\"text\":\"Database backup completed: $BACKUP_FILE\"}"
