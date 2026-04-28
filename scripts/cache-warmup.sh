#!/bin/bash

# Cache Warm-up Script
# Pre-populates CDN cache with critical pages after deployment

set -e

BASE_URL=${1:-"https://sanliurfa.com"}
CONCURRENT_REQUESTS=${2:-5}
LOG_FILE="/var/log/cache-warmup-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Critical pages to warm up
CRITICAL_PAGES=(
    "/"
    "/hakkinda"
    "/iletisim"
    "/gizlilik-politikasi"
    "/kullanim-kosullari"
)

# Static assets
STATIC_ASSETS=(
    "/favicon.svg"
    "/manifest.json"
)

# Function to warm up a URL
warmup_url() {
    local url=$1
    local type=$2
    local start_time=$(date +%s%N)
    
    response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}|%{size_download}|%{content_type}" \
        -H "User-Agent: CacheWarmer/1.0" \
        -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
        -H "Accept-Encoding: gzip, deflate, br" \
        "$url")
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    IFS='|' read -r status time size content_type <<< "$response"
    
    if [[ "$status" == "200" ]]; then
        log "✓ $type: $url (${duration}ms, ${size} bytes)"
        return 0
    else
        error "✗ $type: $url (HTTP $status)"
        return 1
    fi
}

# Warm up pages in parallel
warmup_pages() {
    log "Warming up critical pages..."
    
    local pids=()
    local failed=0
    
    for page in "${CRITICAL_PAGES[@]}"; do
        warmup_url "${BASE_URL}${page}" "PAGE" &
        pids+=($!)
        
        # Limit concurrent requests
        if [[ ${#pids[@]} -ge $CONCURRENT_REQUESTS ]]; then
            for pid in "${pids[@]}"; do
                if ! wait $pid; then
                    ((failed++))
                fi
            done
            pids=()
        fi
    done
    
    # Wait for remaining
    for pid in "${pids[@]}"; do
        if ! wait $pid; then
            ((failed++))
        fi
    done
    
    log "Critical pages warmed up (failed: $failed)"
}

# Warm up static assets
warmup_static() {
    log "Warming up static assets..."
    
    for asset in "${STATIC_ASSETS[@]}"; do
        warmup_url "${BASE_URL}${asset}" "ASSET"
    done
}

# Warm up API endpoints
warmup_api() {
    log "Warming up API endpoints..."
    
    # Health check
    warmup_url "${BASE_URL}/api/health" "API"
    
    # These should not be cached, but we check if they're responding
    # warmup_url "${BASE_URL}/api/places" "API"
}

# Warm up from sitemap
warmup_sitemap() {
    log "Fetching URLs from sitemap..."
    
    sitemap_urls=$(curl -s "${BASE_URL}/sitemap.xml" | grep -oP '(?<=<loc>)http[^<]+' | head -50)
    
    if [[ -z "$sitemap_urls" ]]; then
        warn "No URLs found in sitemap"
        return
    fi
    
    log "Warming up $(echo "$sitemap_urls" | wc -l) URLs from sitemap..."
    
    local pids=()
    
    while IFS= read -r url; do
        warmup_url "$url" "SITEMAP" &
        pids+=($!)
        
        if [[ ${#pids[@]} -ge $CONCURRENT_REQUESTS ]]; then
            for pid in "${pids[@]}"; do
                wait $pid || true
            done
            pids=()
        fi
    done <<< "$sitemap_urls"
    
    for pid in "${pids[@]}"; do
        wait $pid || true
    done
}

# Check CDN cache status
check_cdn_cache() {
    log "Checking CDN cache status..."
    
    local cache_status=$(curl -s -I "${BASE_URL}/" | grep -i "cf-cache-status" || echo "No CF-Cache-Status header")
    log "CDN Status: $cache_status"
    
    # Also check Age header if present
    local age=$(curl -s -I "${BASE_URL}/" | grep -i "age" || echo "No Age header")
    log "Cache Age: $age"
}

# Generate report
generate_report() {
    local total_time=$1
    
    log "======================================"
    log "Cache Warm-up Report"
    log "======================================"
    log "Base URL: $BASE_URL"
    log "Total Time: ${total_time}s"
    log "Log File: $LOG_FILE"
    log "======================================"
}

# Main execution
main() {
    log "Starting cache warm-up for $BASE_URL"
    
    local start_time=$(date +%s)
    
    # Check if URL is reachable
    if ! curl -sf "${BASE_URL}/api/health" > /dev/null; then
        error "Cannot reach $BASE_URL. Aborting."
        exit 1
    fi
    
    # Run warm-up tasks
    warmup_pages
    warmup_static
    warmup_api
    warmup_sitemap
    check_cdn_cache
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    generate_report "$duration"
    
    log "Cache warm-up completed in ${duration}s!"
}

# Handle arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url|-u)
            BASE_URL="$2"
            shift 2
            ;;
        --concurrent|-c)
            CONCURRENT_REQUESTS="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -u, --url URL          Base URL to warm up (default: https://sanliurfa.com)"
            echo "  -c, --concurrent N     Number of concurrent requests (default: 5)"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

main "$@"
