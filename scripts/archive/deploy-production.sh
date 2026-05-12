#!/bin/bash
set -e

# Production Deployment Script
# Usage: ./scripts/deploy-production.sh [version]

VERSION=${1:-latest}
APP_NAME="sanliurfa"
DEPLOY_DIR="/opt/sanliurfa"
BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/sanliurfa-deploy-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is required but not installed"
    
    # Check if .env file exists
    if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
        error ".env file not found at $DEPLOY_DIR/.env"
    fi
    
    log "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    docker exec sanliurfa_postgres_prod pg_dump -U postgres sanliurfa | \
        gzip > "$BACKUP_DIR/db_backup_${TIMESTAMP}.sql.gz"
    
    # Backup environment file
    cp "$DEPLOY_DIR/.env" "$BACKUP_DIR/env_backup_${TIMESTAMP}"
    
    log "Backup created at $BACKUP_DIR"
}

# Health check
health_check() {
    local url=$1
    local retries=${2:-30}
    local delay=${3:-5}
    
    log "Waiting for application to be healthy..."
    
    for i in $(seq 1 $retries); do
        if curl -sf "$url/api/health" >/dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi
        
        if [[ $i -eq $retries ]]; then
            error "Health check failed after $retries attempts"
        fi
        
        sleep $delay
    done
}

# Blue-Green Deployment
deploy_blue_green() {
    log "Starting blue-green deployment..."
    
    cd "$DEPLOY_DIR"
    
    # Determine current color
    CURRENT_COLOR=$(docker-compose -f docker-compose.prod.yml ps -q app-blue | grep -q . && echo "blue" || echo "green")
    
    if [[ "$CURRENT_COLOR" == "blue" ]]; then
        NEW_COLOR="green"
        NEW_PORT="4322"
    else
        NEW_COLOR="blue"
        NEW_PORT="4321"
    fi
    
    log "Current color: $CURRENT_COLOR, deploying to: $NEW_COLOR"
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f docker-compose.prod.yml pull app
    
    # Start new color
    log "Starting $NEW_COLOR containers..."
    docker-compose -f docker-compose.prod.yml up -d app-$NEW_COLOR
    
    # Wait for new containers to be healthy
    sleep 10
    health_check "http://localhost:$NEW_PORT"
    
    # Switch nginx to new color
    log "Switching traffic to $NEW_COLOR..."
    # Update nginx upstream configuration
    sed -i "s/proxy_pass http:\/\/app-$CURRENT_COLOR:4321;/proxy_pass http:\/\/app-$NEW_COLOR:4321;/" nginx/nginx.prod.conf
    docker-compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
    
    # Stop old containers
    log "Stopping $CURRENT_COLOR containers..."
    docker-compose -f docker-compose.prod.yml stop app-$CURRENT_COLOR
    
    log "Blue-green deployment completed"
}

# Rolling Deployment
deploy_rolling() {
    log "Starting rolling deployment..."
    
    cd "$DEPLOY_DIR"
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f docker-compose.prod.yml pull app
    
    # Rolling update
    log "Performing rolling update..."
    docker-compose -f docker-compose.prod.yml up -d --no-deps --scale app=2 app
    
    sleep 15
    
    # Health check
    health_check "https://sanliurfa.com"
    
    # Scale down old containers
    docker-compose -f docker-compose.prod.yml up -d --no-deps --scale app=1 app
    
    log "Rolling deployment completed"
}

# Database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$DEPLOY_DIR"
    
    # Run migrations in a temporary container
    docker-compose -f docker-compose.prod.yml run --rm app npm run migrate
    
    log "Migrations completed"
}

# Cleanup old backups and images
cleanup() {
    log "Cleaning up old backups and images..."
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete
    find "$BACKUP_DIR" -name "env_backup_*" -mtime +7 -delete
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old containers
    docker container prune -f
    
    log "Cleanup completed"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    cd "$DEPLOY_DIR"
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | head -1)
    
    if [[ -z "$LATEST_BACKUP" ]]; then
        error "No backup found for rollback"
    fi
    
    log "Restoring from backup: $LATEST_BACKUP"
    
    # Stop app
    docker-compose -f docker-compose.prod.yml stop app
    
    # Restore database
    gunzip < "$LATEST_BACKUP" | docker exec -i sanliurfa_postgres_prod psql -U postgres sanliurfa
    
    # Start previous version (you need to tag images with version)
    docker-compose -f docker-compose.prod.yml up -d app
    
    log "Rollback completed"
}

# Main deployment flow
main() {
    log "Starting deployment of $APP_NAME version $VERSION"
    
    check_prerequisites
    create_backup
    
    # Run migrations before deployment
    run_migrations
    
    # Deploy using blue-green strategy
    deploy_blue_green
    
    # Verify deployment
    health_check "https://sanliurfa.com"
    
    # Cleanup
    cleanup
    
    log "Deployment completed successfully!"
    log "Version $VERSION is now live at https://sanliurfa.com"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
