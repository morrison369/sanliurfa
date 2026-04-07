#!/bin/bash

# Production Deployment Validation Script
# Run after deployment to verify everything is working

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
DOMAIN="${DOMAIN:-https://sanliurfa.com}"
TIMEOUT=10

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_command_exists() {
    if command -v "$1" &> /dev/null; then
        pass "$1 is installed"
        return 0
    else
        fail "$1 is not installed"
        return 1
    fi
}

check_http_status() {
    local url=$1
    local expected_status=${2:-200}

    response=$(curl -s -w "%{http_code}" -o /tmp/response.txt --max-time $TIMEOUT "$url")

    if [ "$response" -eq "$expected_status" ]; then
        pass "$url returned $response"
        return 0
    else
        fail "$url returned $response (expected $expected_status)"
        return 1
    fi
}

check_json_response() {
    local url=$1

    if curl -s --max-time $TIMEOUT "$url" 2>/dev/null | jq empty 2>/dev/null; then
        pass "$url returned valid JSON"
        return 0
    else
        fail "$url did not return valid JSON"
        return 1
    fi
}

# Start validation
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deployment Validation Script       ║${NC}"
echo -e "${BLUE}║       Testing: $DOMAIN              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"

# System Checks
print_header "System Requirements"

check_command_exists "curl"
check_command_exists "jq"
check_command_exists "pm2" || true

# Check server connectivity
if timeout $TIMEOUT ping -c 1 sanliurfa.com &> /dev/null; then
    pass "Server is reachable"
else
    fail "Server is not reachable"
fi

# SSL/HTTPS Checks
print_header "SSL/TLS Verification"

if timeout $TIMEOUT openssl s_client -connect sanliurfa.com:443 -servername sanliurfa.com < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    pass "SSL certificate is valid"
else
    warn "Could not verify SSL certificate"
fi

# Check certificate expiration
expiry=$(openssl s_client -connect sanliurfa.com:443 -servername sanliurfa.com < /dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ ! -z "$expiry" ]; then
    pass "Certificate expires: $expiry"
else
    warn "Could not determine certificate expiration"
fi

# HTTP/HTTPS Checks
print_header "HTTP/HTTPS Endpoints"

check_http_status "$DOMAIN/" 200
check_http_status "$DOMAIN/index.html" 200 || true

# API Health Checks
print_header "API Health Endpoints"

check_http_status "$DOMAIN/api/health" 200
check_json_response "$DOMAIN/api/health"

# Core API Endpoints
print_header "Core API Endpoints"

check_http_status "$DOMAIN/api/places" 200
check_json_response "$DOMAIN/api/places" || true

check_http_status "$DOMAIN/api/version" 200
check_json_response "$DOMAIN/api/version" || true

# Documentation Endpoints
print_header "Documentation Endpoints"

check_http_status "$DOMAIN/api/openapi.json" 200
check_json_response "$DOMAIN/api/openapi.json" || true

check_http_status "$DOMAIN/api/docs" 200

# Performance Metrics
print_header "Performance Metrics"

# Test response times
for endpoint in "" "/api/health" "/api/places"; do
    url="$DOMAIN$endpoint"
    response_time=$(curl -s -w "%{time_total}" -o /dev/null --max-time $TIMEOUT "$url")

    # Convert to milliseconds
    response_ms=$(echo "$response_time * 1000" | bc)

    if (( $(echo "$response_time < 2" | bc -l) )); then
        pass "$url: ${response_ms}ms"
    elif (( $(echo "$response_time < 5" | bc -l) )); then
        warn "$url: ${response_ms}ms (slow)"
    else
        fail "$url: ${response_ms}ms (very slow)"
    fi
done

# Security Headers
print_header "Security Headers"

headers=$(curl -s -I "$DOMAIN" | tr '\r' '\n')

check_security_header() {
    local header=$1
    if echo "$headers" | grep -qi "^$header"; then
        pass "Header present: $header"
    else
        warn "Header missing: $header"
    fi
}

check_security_header "Strict-Transport-Security"
check_security_header "X-Content-Type-Options"
check_security_header "X-Frame-Options"
check_security_header "Content-Security-Policy"

# Gzip Compression
if echo "$headers" | grep -qi "Content-Encoding.*gzip"; then
    pass "Gzip compression enabled"
else
    warn "Gzip compression may not be enabled"
fi

# Local Services Check (if running locally)
print_header "Local Services"

if [ "$DOMAIN" = "http://localhost:3000" ] || [ "$DOMAIN" = "http://127.0.0.1:3000" ]; then
    if pm2 status sanliurfa &>/dev/null; then
        status=$(pm2 status sanliurfa | grep -E "online|stopped")
        if echo "$status" | grep -q "online"; then
            pass "PM2 service is online"
        else
            fail "PM2 service is not running"
        fi
    fi

    # Check Redis
    if redis-cli ping &>/dev/null; then
        pass "Redis is accessible"
    else
        warn "Redis is not accessible"
    fi

    # Check Database
    if psql -U sanliurfa_user -d sanliurfa -c "SELECT 1;" &>/dev/null; then
        pass "PostgreSQL is accessible"
    else
        warn "PostgreSQL is not accessible"
    fi
fi

# Content Checks
print_header "Content Verification"

# Check for common content
if curl -s "$DOMAIN" | grep -iq "şanlıurfa\|sanliurfa"; then
    pass "Page contains expected content"
else
    warn "Page may not contain expected content"
fi

# Check for critical errors
if curl -s "$DOMAIN" | grep -iq "error\|fatal\|exception"; then
    warn "Page may contain error messages"
else
    pass "No obvious errors on page"
fi

# Functionality Checks
print_header "Functionality Tests"

# Test search API
if curl -s "$DOMAIN/api/search?q=test" | jq . &>/dev/null; then
    pass "Search API responds"
else
    fail "Search API does not respond"
fi

# Test auth status (should return 401 without token)
auth_status=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/auth/status")
if [ "$auth_status" -eq "401" ] || [ "$auth_status" -eq "200" ]; then
    pass "Auth endpoint is accessible"
else
    warn "Auth endpoint returned unexpected status: $auth_status"
fi

# Summary
print_header "Validation Summary"

total=$((PASSED + FAILED + WARNINGS))
echo "Total checks: $total"
echo -e "${GREEN}Passed: $PASSED${NC}"
[ $WARNINGS -gt 0 ] && echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
[ $FAILED -gt 0 ] && echo -e "${RED}Failed: $FAILED${NC}"

# Final result
echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment validation PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ Deployment validation FAILED${NC}"
    echo "Review failures above and take corrective action"
    exit 1
fi
