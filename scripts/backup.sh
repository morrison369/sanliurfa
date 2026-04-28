#!/bin/bash

# ============================================
# Database Backup Script
# PostgreSQL backup with rotation
# ============================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-postgresql://localhost:5432/sanliurfa}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🗄️ Starting database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Extract connection details from URL
# Format: postgresql://user:pass@host:port/db
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Export password for pg_dump
export PGPASSWORD="$DB_PASS"

# Run backup
echo "📦 Creating backup: $BACKUP_FILE"
if pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -f "$BACKUP_DIR/$BACKUP_FILE" \
  --verbose 2>&1; then
  
  echo -e "${GREEN}✅ Backup created successfully${NC}"
  
  # Compress backup
  echo "🗜️ Compressing backup..."
  gzip -f "$BACKUP_DIR/$BACKUP_FILE"
  echo -e "${GREEN}✅ Backup compressed: ${BACKUP_FILE}.gz${NC}"
  
  # Get backup size
  BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
  echo "📊 Backup size: $BACKUP_SIZE"
  
else
  echo -e "${RED}❌ Backup failed${NC}"
  rm -f "$BACKUP_DIR/$BACKUP_FILE"
  exit 1
fi

# Cleanup old backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "📁 Current backups:"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo -e "${GREEN}✅ Backup process completed${NC}"
