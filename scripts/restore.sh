#!/bin/bash

# ============================================
# Database Restore Script
# PostgreSQL restore from backup
# ============================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-postgresql://localhost:5432/sanliurfa}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Show available backups
echo "📁 Available backups:"
echo "===================="
ls -1t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -10 | nl || echo "No backups found"
echo "===================="

# Check if backup file provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: $0 <backup_file>${NC}"
  echo "Example: $0 backup_20240101_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Backup file not found: $BACKUP_DIR/$BACKUP_FILE${NC}"
  exit 1
fi

# Extract connection details
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Warning
echo -e "${RED}⚠️ WARNING: This will OVERWRITE the current database!${NC}"
echo "Database: $DB_NAME"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "Are you sure? Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Decompress backup
echo "📦 Decompressing backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_DIR/$BACKUP_FILE" > "$TEMP_DIR/restore.sql"
else
  cp "$BACKUP_DIR/$BACKUP_FILE" "$TEMP_DIR/restore.sql"
fi

# Export password
export PGPASSWORD="$DB_PASS"

# Drop and recreate database
echo "🗑️ Dropping existing database..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists

echo "🆕 Creating new database..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Restore backup
echo "🔄 Restoring backup..."
if pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -v \
  "$BACKUP_DIR/$BACKUP_FILE" 2>&1; then
  
  echo -e "${GREEN}✅ Restore completed successfully${NC}"
else
  echo -e "${RED}❌ Restore failed${NC}"
  exit 1
fi

# Verify restore
echo "🔍 Verifying restore..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "📊 Restored tables: $TABLE_COUNT"

echo -e "${GREEN}✅ Restore process completed${NC}"
