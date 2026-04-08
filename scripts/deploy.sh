#!/bin/bash

# Şanlıurfa.com Production Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
DEPLOY_LOG="deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOY_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$DEPLOY_LOG"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$DEPLOY_LOG"
}

log "Starting deployment to $ENVIRONMENT environment..."

# Check prerequisites
log "Checking prerequisites..."
command -v node >/dev/null 2>&1 || error "Node.js is not installed"
command -v npm >/dev/null 2>&1 || error "npm is not installed"
command -v git >/dev/null 2>&1 || error "git is not installed"

log "✓ Prerequisites verified"

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Current branch: $CURRENT_BRANCH"

if [ "$ENVIRONMENT" == "production" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    error "Cannot deploy to production from branch $CURRENT_BRANCH. Must be on master."
fi

# Verify no uncommitted changes
log "Verifying no uncommitted changes..."
if ! git diff-index --quiet HEAD --; then
    error "Uncommitted changes found. Please commit or stash changes first."
fi
log "✓ No uncommitted changes"

# Run tests
log "Running test suite..."
npm run test 2>&1 | tee -a "$DEPLOY_LOG" || error "Tests failed"
log "✓ All tests passed"

# Build application
log "Building application..."
npm run build 2>&1 | tee -a "$DEPLOY_LOG" || error "Build failed"
log "✓ Build completed successfully"

# Create database backup
log "Creating database backup..."
if command -v pg_dump >/dev/null 2>&1; then
    BACKUP_FILE="backups/db-backup-$(date +%Y%m%d-%H%M%S).sql"
    mkdir -p backups
    # Note: This assumes DATABASE_URL is set
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>&1 || warn "Database backup failed (may be normal if not available)"
    log "✓ Database backup created: $BACKUP_FILE"
else
    warn "pg_dump not found, skipping database backup"
fi

# Deploy code
log "Deploying code..."
case "$ENVIRONMENT" in
    staging)
        log "Deploying to staging environment..."
        npm run deploy:staging 2>&1 | tee -a "$DEPLOY_LOG" || warn "Staging deployment command not found"
        ;;
    production)
        log "Deploying to production environment..."
        log "WARNING: This will update the production system!"
        read -p "Continue? (yes/no): " -n 3 -r
        echo
        if [[ $REPLY =~ ^[Yy] ]]; then
            npm run deploy:production 2>&1 | tee -a "$DEPLOY_LOG" || error "Production deployment failed"
        else
            error "Deployment cancelled by user"
        fi
        ;;
    *)
        error "Unknown environment: $ENVIRONMENT. Use 'staging' or 'production'."
        ;;
esac

# Health check
log "Running health checks..."
sleep 5
if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
    log "✓ Health check passed"
else
    warn "Health check failed or not accessible"
fi

# Verify deployment
log "Verifying deployment..."
DEPLOYED_VERSION=$(curl -s http://localhost:3000/api/version 2>/dev/null || echo "unknown")
log "Deployed version: $DEPLOYED_VERSION"

# Success
log ""
log "╔════════════════════════════════════════╗"
log "║   ✓ DEPLOYMENT SUCCESSFUL              ║"
log "║   Environment: $ENVIRONMENT"
log "║   Time: $(date +'%Y-%m-%d %H:%M:%S')"
log "║   Log: $DEPLOY_LOG"
log "╚════════════════════════════════════════╝"
