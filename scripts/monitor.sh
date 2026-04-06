#!/bin/bash
# Monitoring Script

SITE_URL="https://sanliurfa.com"
WEBHOOK_URL="" # Slack/Discord webhook for alerts

# Check site health
check_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/api/health")
    
    if [ "$response" != "200" ]; then
        echo "⚠️  Health check failed! Status: $response"
        send_alert "Health check failed" "Site returned status $response"
        return 1
    fi
    
    echo "✅ Health check passed"
    return 0
}

# Check SSL certificate
 check_ssl() {
    expiry=$(echo | openssl s_client -servername sanliurfa.com -connect sanliurfa.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ $days_until_expiry -lt 7 ]; then
        echo "⚠️  SSL expires in $days_until_expiry days!"
        send_alert "SSL Expiring Soon" "Certificate expires in $days_until_expiry days"
    else
        echo "✅ SSL valid for $days_until_expiry days"
    fi
}

# Check disk space
check_disk() {
    usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $usage -gt 80 ]; then
        echo "⚠️  Disk usage at $usage%!"
        send_alert "High Disk Usage" "Disk usage is at $usage%"
    else
        echo "✅ Disk usage at $usage%"
    fi
}

# Check memory
check_memory() {
    usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    
    if [ $usage -gt 90 ]; then
        echo "⚠️  Memory usage at $usage%!"
        send_alert "High Memory Usage" "Memory usage is at $usage%"
    else
        echo "✅ Memory usage at $usage%"
    fi
}

# Send alert
send_alert() {
    title=$1
    message=$2
    
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 $title: $message\"}" \
            $WEBHOOK_URL
    fi
    
    # Log to file
    echo "[$(date)] ALERT: $title - $message" >> /var/log/sanliurfa-alerts.log
}

# Run checks
echo "🔍 Running monitoring checks..."
echo "=============================="
check_health
check_ssl
check_disk
check_memory
echo "=============================="
echo "✅ Monitoring complete"
