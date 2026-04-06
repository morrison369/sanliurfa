#!/bin/bash
# Şanlıurfa.com Backup Script

set -e

BACKUP_DIR="/home/sanliur/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="sanliur_sanliurfa"
DB_USER="sanliur_sanliurfa"
RETENTION_DAYS=7

echo "🔄 Starting backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
echo "💾 Backing up database..."
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Files backup
echo "📁 Backing up files..."
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    /home/sanliur/sanliurfa.com/

# Cleanup old backups
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed!"
echo "📂 Backup location: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
