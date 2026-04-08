# 📊 Monitoring Setup - Health Checks & Alerts

Şanlıurfa.com için production monitoring ve alerting sistemi.

---

## 1️⃣ **Health Check Endpoint**

API sunuyor: `/api/health`

```bash
# Test
curl https://sanliurfa.com/api/health

# Response
{
  "status": "ok",
  "timestamp": "2026-04-07T10:00:00Z",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

## 2️⃣ **Uptime Monitoring Script**

Cron job ile her 5 dakikada health check:

```bash
# Monitoring script oluştur
cat > /home/sanliurfa/monitor.sh << 'EOF'
#!/bin/bash

# Konfigürasyon
APP_URL="https://sanliurfa.com/api/health"
LOG_FILE="/var/log/sanliurfa-monitor.log"
ALERT_EMAIL="admin@sanliurfa.com"
MAX_FAILURES=3
FAILURE_COUNT_FILE="/tmp/sanliurfa-failures"

# Health check
check_health() {
    response=$(curl -s -w "\n%{http_code}" -m 10 "$APP_URL")
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    # Log
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] HTTP $status_code" >> "$LOG_FILE"

    # 200 OK kontrolü
    if [ "$status_code" = "200" ]; then
        # Başarı - failure count'u sıfırla
        rm -f "$FAILURE_COUNT_FILE"
        return 0
    else
        # Hata - count'u artır
        FAILURES=$(cat "$FAILURE_COUNT_FILE" 2>/dev/null || echo 0)
        FAILURES=$((FAILURES + 1))
        echo "$FAILURES" > "$FAILURE_COUNT_FILE"

        # Alert gönder
        if [ "$FAILURES" -ge "$MAX_FAILURES" ]; then
            send_alert "⚠️ ALERT: Şanlıurfa.com DOWN! HTTP $status_code"
        fi

        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: HTTP $status_code (Attempt $FAILURES)" >> "$LOG_FILE"
        return 1
    fi
}

# Alert gönder (email)
send_alert() {
    message=$1
    echo "$message" | mail -s "Şanlıurfa.com Monitoring Alert" "$ALERT_EMAIL"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ALERT SENT: $message" >> "$LOG_FILE"
}

# Main
check_health
EOF

chmod +x /home/sanliurfa/monitor.sh

# Crontab'a ekle (her 5 dakikada)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/sanliurfa/monitor.sh") | crontab -

# Verify crontab
crontab -l | grep monitor.sh
```

---

## 3️⃣ **Apache Access Log Monitoring**

Error rate'i monitor et:

```bash
# Real-time log monitoring
tail -f /var/log/apache2/domains/sanliurfa.com.log | grep -i error

# Error count (last hour)
awk '{print $4}' /var/log/apache2/domains/sanliurfa.com.log | grep "$(date +%d/%b/%Y:%H:)" | sort | uniq -c

# 5xx errors
tail -f /var/log/apache2/domains/sanliurfa.com.log | grep " 5[0-9][0-9] "

# Response time (slow requests)
awk '$NF > 1000 {print $0}' /var/log/apache2/domains/sanliurfa.com.log
```

### Log Rotation (zaten yapılıyor ama)
```bash
# /etc/logrotate.d/apache2 kontrol et
cat /etc/logrotate.d/apache2

# Manual rotation
logrotate -v /etc/logrotate.d/apache2
```

---

## 4️⃣ **Database Monitoring**

PostgreSQL sağlığını kontrol et:

```bash
# Database bağlantı sayısı
psql -U postgres -d sanliurfa -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries
psql -U postgres -d sanliurfa -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  WHERE mean_time > 100
  ORDER BY mean_time DESC
  LIMIT 10;
"

# Database size
psql -U postgres -d sanliurfa -c "SELECT pg_size_pretty(pg_database_size('sanliurfa'));"

# Vacuum status
psql -U postgres -d sanliurfa -c "SELECT schemaname, tablename, last_vacuum, last_autovacuum FROM pg_stat_user_tables ORDER BY last_vacuum DESC LIMIT 5;"
```

### Automated Maintenance
```bash
# Crontab'a daily vacuum ekle
(crontab -l 2>/dev/null; echo "0 3 * * * psql -U postgres -d sanliurfa -c 'VACUUM ANALYZE;'") | crontab -
```

---

## 5️⃣ **Redis Monitoring**

Redis cache sağlığını kontrol et:

```bash
# Redis memory usage
redis-cli INFO memory

# Connected clients
redis-cli INFO clients

# Command stats
redis-cli INFO commandstats

# Keys by pattern
redis-cli KEYS "sanliurfa:*" | wc -l

# Memory by key pattern
redis-cli --bigkeys
```

### Redis Backup
```bash
# Manual backup
redis-cli BGSAVE

# Status kontrol et
redis-cli LASTSAVE

# Backup file location
ls -lh /var/lib/redis/dump.rdb
```

---

## 6️⃣ **Performance Monitoring Dashboard**

Admin API'den metrics al:

```bash
# Authenticated request
TOKEN="<auth-token>"
curl -H "Cookie: auth-token=$TOKEN" https://sanliurfa.com/api/performance | jq .

# Expected output:
{
  "slowRequests": [...],
  "slowQueries": [...],
  "poolStatus": {
    "activeConnections": 5,
    "idleConnections": 15,
    "totalConnections": 20
  },
  "cacheStats": {
    "hits": 1000,
    "misses": 100,
    "hitRate": "91%"
  }
}
```

---

## 7️⃣ **System Monitoring**

Server kaynaklarını monitor et:

```bash
# CPU & Memory
top -b -n 1 | head -20

# Disk usage
df -h

# Network
netstat -i
ss -i

# Process memory
ps aux --sort=-%mem | head

# Open files
lsof -p $(pgrep -f "node.*entry.mjs")
```

### Automated Alerts
```bash
# High memory alert
free_mem=$(free | awk 'NR==2 {print $7}')
if [ "$free_mem" -lt 500000 ]; then
    echo "⚠️ Low memory alert" | mail -s "Server Alert" admin@sanliurfa.com
fi
```

---

## 8️⃣ **Monitoring Checklist**

### Günlük Kontroller
```bash
#!/bin/bash

log_file="/var/log/sanliurfa-daily-check.log"
echo "[$(date)] Daily Monitoring Check" >> "$log_file"

# 1. Service status
if ! systemctl is-active --quiet sanliurfa; then
    echo "❌ Service DOWN" >> "$log_file"
    systemctl start sanliurfa
else
    echo "✓ Service UP" >> "$log_file"
fi

# 2. Health check
if curl -s https://sanliurfa.com/api/health | grep -q "ok"; then
    echo "✓ API Health OK" >> "$log_file"
else
    echo "❌ API Health FAILED" >> "$log_file"
fi

# 3. Database
if psql -U postgres -d sanliurfa -c "SELECT 1" 2>/dev/null; then
    echo "✓ Database OK" >> "$log_file"
else
    echo "❌ Database FAILED" >> "$log_file"
fi

# 4. Redis
if redis-cli ping | grep -q "PONG"; then
    echo "✓ Redis OK" >> "$log_file"
else
    echo "❌ Redis FAILED" >> "$log_file"
fi

# 5. Disk space
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 80 ]; then
    echo "⚠️ Disk usage: ${disk_usage}%" >> "$log_file"
else
    echo "✓ Disk OK: ${disk_usage}%" >> "$log_file"
fi

# 6. Error rate (last hour)
errors=$(tail -100 /var/log/apache2/domains/sanliurfa.com.log | grep -c " 5[0-9][0-9] ")
echo "Error count (last hour): $errors" >> "$log_file"
```

### Crontab'a ekle
```bash
# Her gün 08:00'de çalışsın
(crontab -l 2>/dev/null; echo "0 8 * * * /home/sanliurfa/daily-check.sh") | crontab -
```

---

## 9️⃣ **Third-Party Monitoring** (Opsiyonel)

### UptimeRobot (Free)
```
https://uptimerobot.com
- Monitor: https://sanliurfa.com/api/health
- Interval: 5 dakika
- Alert: Email
```

### Sentry (Error Tracking)
```
env.example'a ekle:
SENTRY_DSN=https://xxx@sentry.io/xxx

src/lib/logging.ts'de:
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## 🚨 Alert Kuralları

| Condition | Action | Severity |
|-----------|--------|----------|
| API Health FAIL | Page on-call | CRITICAL |
| Database DOWN | Slack notification | CRITICAL |
| 5xx error rate > 5% | Email alert | HIGH |
| Memory usage > 90% | Restart service | MEDIUM |
| Disk usage > 80% | Email alert | MEDIUM |
| Slow queries > 10 | Log & monitor | LOW |

---

## 📋 Monitoring Dönem

### Haftalık
- [ ] Health check logs kontrol et
- [ ] Error rate kontrol et
- [ ] Performance metrics kontrol et
- [ ] Database size kontrol et

### Aylık
- [ ] Database VACUUM ANALYZE
- [ ] Redis memory cleanup
- [ ] Slow queries optimize et
- [ ] SSL certificate expiry kontrol et

### Üç Aylık
- [ ] Full system audit
- [ ] Performance improvement plan
- [ ] Security audit
- [ ] Capacity planning

---

## 🔗 İşlemli Komutlar

```bash
# Tüm log'ları temizle (eski)
find /var/log/apache2/domains -name "*.log.*" -mtime +30 -delete

# Database optimize
psql -U postgres -d sanliurfa -c "VACUUM FULL ANALYZE;"

# Redis memory optimize
redis-cli BGSAVE

# Cron job'ları listele
crontab -l
```

---

**Monitoring kuruldu! Sistem 24/7 monitore ediliyor.** ✅
