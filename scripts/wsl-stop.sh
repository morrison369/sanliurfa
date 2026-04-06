#!/bin/bash
# Stop WSL Development Environment

cd "$(dirname "$0")/.."

echo "🛑 Stopping WSL Development Environment"
echo "========================================"

# Stop Docker containers
docker-compose -f docker-compose.dev.yml down

echo "✅ All services stopped!"
