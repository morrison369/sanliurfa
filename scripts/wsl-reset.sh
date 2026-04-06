#!/bin/bash
# Reset WSL Development Environment (WARNING: Deletes all data!)

cd "$(dirname "$0")/.."

echo "⚠️  WARNING: This will delete all local data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo "🗑️  Resetting environment..."

# Stop and remove containers
docker-compose -f docker-compose.dev.yml down -v

# Remove volumes
docker volume rm sanliurfa_postgres_data sanliurfa_redis_data sanliurfa_minio_data 2>/dev/null || true

# Rebuild and start
docker-compose -f docker-compose.dev.yml up -d --build

echo "✅ Environment reset complete!"
echo "🔄 Run './scripts/wsl-start.sh' to start fresh"
