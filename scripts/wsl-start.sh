#!/bin/bash
# Start WSL Development Environment

cd "$(dirname "$0")/.."

echo "🚀 Starting WSL Development Environment"
echo "========================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "🐳 Starting Docker..."
    sudo service docker start || sudo systemctl start docker
fi

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
sleep 5

# Check if database is ready
until docker exec sanliurfa-postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "⏳ Waiting for database..."
    sleep 2
done

echo "✅ Database is ready!"

# Load environment variables
export $(cat .env.wsl | grep -v '#' | xargs)

# Start development server
echo "🌐 Starting development server..."
echo "📍 Site will be available at: http://localhost:1111"
echo "📧 MailHog available at: http://localhost:8025"
echo "💾 MinIO Console: http://localhost:9001"
echo ""

npm run dev -- --port 1111 --host
