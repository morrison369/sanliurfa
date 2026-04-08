#!/bin/bash

# Şanlıurfa.com Performance Monitoring Script
# Tracks performance metrics and alerts on anomalies

MONITOR_LOG="monitoring-$(date +%Y%m%d).log"
API_BASE="http://localhost:3000/api"
ALERT_THRESHOLD_SLOW_REQUESTS=1.0  # >1% slow requests
ALERT_THRESHOLD_ERROR_RATE=0.5     # >0.5% error rate
ALERT_THRESHOLD_CACHE_HIT=70       # <70% cache hit rate

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$MONITOR_LOG"
}

alert() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  ALERT: $1" | tee -a "$MONITOR_LOG"
}

check_health() {
    log "Checking API health..."
    
    HEALTH=$(curl -s "$API_BASE/health" 2>/dev/null)
    if [ -z "$HEALTH" ]; then
        alert "API health check failed - API not responding"
        return 1
    fi
    
    log "✓ API is healthy"
    return 0
}

check_performance() {
    log "Fetching performance metrics..."
    
    METRICS=$(curl -s "$API_BASE/performance" 2>/dev/null)
    if [ -z "$METRICS" ]; then
        alert "Could not fetch performance metrics"
        return 1
    fi
    
    # Extract metrics (simplified)
    SLOW_REQUESTS=$(echo "$METRICS" | grep -o '"slowRequestRate":[^,}]*' | cut -d: -f2)
    ERROR_RATE=$(echo "$METRICS" | grep -o '"errorRate":[^,}]*' | cut -d: -f2)
    CACHE_HIT=$(echo "$METRICS" | grep -o '"cacheHitRate":[^,}]*' | cut -d: -f2)
    
    log "Slow Requests: ${SLOW_REQUESTS}%"
    log "Error Rate: ${ERROR_RATE}%"
    log "Cache Hit Rate: ${CACHE_HIT}%"
    
    # Check thresholds
    if (( $(echo "$SLOW_REQUESTS > $ALERT_THRESHOLD_SLOW_REQUESTS" | bc -l) )); then
        alert "High slow request rate: ${SLOW_REQUESTS}% (threshold: ${ALERT_THRESHOLD_SLOW_REQUESTS}%)"
    fi
    
    if (( $(echo "$ERROR_RATE > $ALERT_THRESHOLD_ERROR_RATE" | bc -l) )); then
        alert "High error rate: ${ERROR_RATE}% (threshold: ${ALERT_THRESHOLD_ERROR_RATE}%)"
    fi
    
    if (( $(echo "$CACHE_HIT < $ALERT_THRESHOLD_CACHE_HIT" | bc -l) )); then
        alert "Low cache hit rate: ${CACHE_HIT}% (threshold: ${ALERT_THRESHOLD_CACHE_HIT}%)"
    fi
}

check_database() {
    log "Checking database connection..."
    
    HEALTH=$(curl -s "$API_BASE/health/detailed" 2>/dev/null)
    if [ -z "$HEALTH" ]; then
        alert "Could not fetch detailed health info"
        return 1
    fi
    
    # Check database status
    if echo "$HEALTH" | grep -q '"database".*"disconnected"'; then
        alert "Database connection lost!"
        return 1
    fi
    
    log "✓ Database is connected"
}

generate_report() {
    log ""
    log "════════════════════════════════════════"
    log "📊 PERFORMANCE REPORT"
    log "════════════════════════════════════════"
    log "Time: $(date +'%Y-%m-%d %H:%M:%S')"
    log "API Base: $API_BASE"
    log "Log: $MONITOR_LOG"
    log "════════════════════════════════════════"
}

# Main execution
log "Starting performance monitoring..."
generate_report

# Run checks
check_health || exit 1
check_database || exit 1
check_performance

log "✓ Monitoring cycle complete"
