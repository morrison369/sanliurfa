# Emergency Runbook

Quick solutions for common production issues. Use when things break.

---

## 🚨 SERVICE DOWN (Complete Outage)

**Symptoms**: Users can't access site, 502/503 errors

**Time to Fix**: 5-10 minutes

### Step 1: Check Service Status (1 min)
```bash
pm2 status sanliurfa
# OR
sudo systemctl status sanliurfa

# Expected: online / active (running)
# Issue: stopped / dead / inactive
```

### Step 2: Check Error Message (2 min)
```bash
pm2 logs sanliurfa --lines 100
# OR
sudo journalctl -u sanliurfa -n 100

# Look for: Error messages, stack traces, connection refused
```

### Step 3: Start Service (2 min)

**If service crashed:**
```bash
pm2 restart sanliurfa
# OR
sudo systemctl start sanliurfa

# Wait 15 seconds
sleep 15

# Verify
pm2 status sanliurfa  # Should show: online
```

**If PM2 is broken:**
```bash
# Restart PM2 daemon
pm2 kill
pm2 start ecosystem.config.js
```

### Step 4: Verify Recovery (1 min)
```bash
curl https://sanliurfa.com/api/health
# Should return: {"success":true,"data":{"status":"healthy"}}

curl -I https://sanliurfa.com/
# Should return: HTTP 200
```

### Step 5: Alert Team (1 min)
```
✅ Service recovered
📊 Check for data loss or corruption
🔍 Investigate root cause
```

---

## 💥 High Error Rate (> 5%)

**Symptoms**: Many 5xx errors, user complaints

**Time to Fix**: 5-15 minutes

### Quick Diagnosis (2 min)
```bash
# Check error logs
pm2 logs sanliurfa | grep -i "error\|fail" | head -20

# Check system resources
free -h       # Memory
df -h         # Disk
top -b -n 1   # CPU

# Check database
psql -U sanliurfa_user -d sanliurfa -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check Redis
redis-cli info stats | grep total_commands
```

### Solutions by Root Cause

**Database Connection Error:**
```bash
# Test connection
psql -U sanliurfa_user -d sanliurfa -c "SELECT 1;"

# Restart database if needed
sudo systemctl restart postgresql

# Check pool exhaustion
psql -c "SELECT sum(numbackends) FROM pg_stat_database;"
```

**Out of Memory:**
```bash
# Check what's using memory
ps aux --sort=-%mem | head -10

# Restart service
pm2 restart sanliurfa

# If persists, reboot server
sudo reboot
```

**Slow Queries:**
```bash
# Check slow queries
curl -H "Cookie: auth-token=TOKEN" https://sanliurfa.com/api/performance | jq .slowQueries | head -20

# Restart to clear state
pm2 restart sanliurfa

# Check if specific endpoint is slow
curl -w "Time: %{time_total}s\n" https://sanliurfa.com/api/places
```

**Redis Timeout:**
```bash
# Test Redis
redis-cli ping

# Check memory
redis-cli info memory | grep used_memory_human

# Restart Redis if needed
sudo systemctl restart redis
```

---

## 🐌 Slow Response Times (> 2 sec)

**Symptoms**: Pages loading slowly, timeouts

**Time to Fix**: 5-10 minutes

### Quick Fix (2 min)
```bash
# Clear caches
redis-cli FLUSHDB
# ⚠️ WARNING: This clears ALL redis data!
# Better approach:
redis-cli KEYS "sanliurfa:*" | xargs redis-cli DEL

# Restart service to reset connections
pm2 restart sanliurfa
```

### Investigation (5 min)
```bash
# Identify slow endpoint
for endpoint in /api/places /api/reviews /api/health; do
  curl -w "$endpoint: %{time_total}s\n" https://sanliurfa.com$endpoint
done

# Check slow queries
curl -H "Cookie: auth-token=TOKEN" https://sanliurfa.com/api/performance | jq .slowQueries
```

### Solutions
- If specific endpoint slow: Check database for slow queries
- If all slow: Likely resource issue (CPU/memory/disk)
- If intermittent: Likely lock contention or network

---

## 🔓 Security Incident

**Symptoms**: Unauthorized access, data breach, DDoS

**Time to Fix**: 15-30 minutes (escalate immediately)

### Immediate Actions (1 min)

**ALERT: Escalate to security team NOW**

```bash
# Notify:
# - CTO/Security Lead
# - VP Engineering
# - DevOps Lead
```

### Containment (5 min)

**Enable maintenance mode:**
```bash
# Temporarily take down public access
curl -X POST https://sanliurfa.com/api/admin/deployment/maintenance \
  -H "Cookie: auth-token=ADMIN_TOKEN" \
  -d '{"enabled": true}'
```

**Stop public traffic:**
```bash
# Via Nginx - block all traffic
sudo nano /etc/nginx/conf.d/sanliurfa.conf
# Add: return 503;
sudo systemctl reload nginx

# Via iptables - block port 443
sudo iptables -I INPUT -p tcp --dport 443 -j DROP
```

### Investigation (10 min)

```bash
# Check access logs
sudo tail -1000 /var/log/nginx/access.log | grep -v GET

# Check database for unauthorized changes
psql -U sanliurfa_user -d sanliurfa -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;"

# Check for backdoors
ps aux | grep -v grep | grep -E "nc|ncat|telnet|bash"

# Check cron jobs
crontab -l
sudo crontab -l
```

### Recovery (10 min)

**If data compromised:**
1. Take database snapshot
2. Restore from clean backup
3. Audit all changes
4. Reset all user passwords
5. Enable 2FA enforcement

**If credentials exposed:**
1. Rotate all secrets immediately
2. Change database passwords
3. Generate new JWT_SECRET
4. Update Redis password
5. Audit API key usage

---

## 🔐 Database Locked/Slow

**Symptoms**: Database queries hang, INSERT/UPDATE locks

**Time to Fix**: 10-15 minutes

### Diagnosis (2 min)
```bash
# List active queries
psql -U sanliurfa_user -d sanliurfa -c "SELECT pid, query, query_start FROM pg_stat_activity WHERE query != '<idle>';"

# Find long-running transaction
psql -U sanliurfa_user -d sanliurfa -c "SELECT pid, usename, query_start, state FROM pg_stat_activity WHERE state != 'idle';"
```

### Solutions

**Kill blocking query:**
```bash
# Find blocking PID
PID=12345  # From query above

# Terminate gracefully
psql -c "SELECT pg_terminate_backend($PID);"

# Or force kill (less safe)
psql -c "SELECT pg_cancel_backend($PID);"
```

**Clear locks:**
```bash
# Restart PostgreSQL (full restart, last resort)
sudo systemctl restart postgresql

# Wait for startup
sleep 10

# Verify running
pg_isready -h localhost
```

**Check for deadlocks:**
```bash
# Enable deadlock logging
psql -c "ALTER SYSTEM SET log_lock_waits = on;"
psql -c "SELECT pg_reload_conf();"

# View deadlock logs
tail -100 /var/log/postgresql/postgresql.log | grep deadlock
```

---

## 💾 Disk Space Critical

**Symptoms**: Application crashes, database errors, "no space left"

**Time to Fix**: 10-20 minutes

### Check Space (1 min)
```bash
df -h
# Look for: /dev/sda* at 90%+ or 100%

du -sh /*
# Find largest directories
```

### Free Up Space (10 min)

**Clear logs:**
```bash
# Logs usually biggest culprit
rm -f ~/sanliurfa/logs/*
rm -f /var/log/nginx/*.log*
rm -f /var/log/postgresql/*.log*

# Verify space freed
df -h
```

**Clean npm cache:**
```bash
npm cache clean --force
du -sh ~/.npm
```

**Remove old backups:**
```bash
# Keep last 7 days only
find ~/backups -type f -mtime +7 -delete

du -sh ~/backups
```

**Check database:**
```bash
# List table sizes
psql -U sanliurfa_user -d sanliurfa -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size DESC;"

# Vacuum to reclaim space
psql -U sanliurfa_user -d sanliurfa -c "VACUUM FULL ANALYZE;"
```

### Verify Recovery (1 min)
```bash
df -h  # Should be < 80% now
pm2 status sanliurfa  # Should still be online
```

---

## 📊 High CPU Usage (> 80%)

**Symptoms**: Server slow, tasks delayed, processes max out

**Time to Fix**: 5-10 minutes

### Identify Culprit (2 min)
```bash
# See what's using CPU
top -b -n 1 | head -15

# See per-process
ps aux --sort=-%cpu | head -10
```

### Solutions

**If Node.js using CPU:**
```bash
# Restart service
pm2 restart sanliurfa

# Check for infinite loop in code
pm2 logs sanliurfa | grep -i loop
```

**If PostgreSQL using CPU:**
```bash
# Kill slow query
psql -c "SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE duration > '1 minute';"

# Analyze slow queries
curl -H "Cookie: auth-token=TOKEN" https://sanliurfa.com/api/performance | jq .slowQueries
```

**If system services:**
```bash
# Check what service
systemctl status

# Restart service
sudo systemctl restart <service_name>
```

---

## 🔌 Redis Connection Failed

**Symptoms**: Cache errors, session timeout, rate limit bypass

**Time to Fix**: 3-5 minutes

### Test Connection (1 min)
```bash
redis-cli ping
# Should return: PONG

# Or with password:
redis-cli -u "redis://:password@localhost:6379/0" ping
```

### Solutions

**If redis-cli works but app fails:**
```bash
# Check credentials in .env
echo $REDIS_URL

# Test with exact URL
redis-cli -u "$REDIS_URL" ping

# Restart service to reconnect
pm2 restart sanliurfa
```

**If redis-cli fails:**
```bash
# Check Redis running
sudo systemctl status redis

# Restart Redis
sudo systemctl restart redis

# Check logs
sudo tail -50 /var/log/redis/redis-server.log
```

**If Redis won't start:**
```bash
# Check memory
redis-cli info memory

# Clear some data
redis-cli DBSIZE
redis-cli FLUSHDB  # ⚠️ WARNING: Clears all data

# Restart
sudo systemctl restart redis
```

---

## 🌐 High Network Traffic (DDoS?)

**Symptoms**: Bandwidth maxed, many concurrent connections, 502 errors

**Time to Fix**: 5-15 minutes

### Verify Legitimate Traffic (2 min)
```bash
# Check current connections
netstat -an | grep ESTABLISHED | wc -l

# See top IPs
tail -1000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

### Mitigations

**Block suspicious IPs:**
```bash
# In Nginx
sudo nano /etc/nginx/conf.d/sanliurfa.conf
# Add:
deny 1.2.3.4;  # Suspicious IP

sudo systemctl reload nginx
```

**Rate limiting already enabled:**
- Check `/api/auth/register` has strict limits
- Check general endpoint limits

**CloudFlare (if using):**
1. Enable attack mode
2. Increase rate limiting
3. Challenge suspicious traffic
4. Block countries if necessary

---

## 📧 Email Not Sending

**Symptoms**: Users don't get emails, email API errors

**Time to Fix**: 5-10 minutes

### Test Email (1 min)
```bash
# Send test email
curl -X POST https://sanliurfa.com/api/email/send-test \
  -H "Cookie: auth-token=ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sanliurfa.com"}'

# Check email inbox within 5 seconds
```

### Troubleshooting

**If test email succeeds but users don't get emails:**
- Check spam folder
- Verify email addresses in database
- Check email provider logs
- Look for errors in application logs

**If test email fails:**
```bash
# Check Resend API key
echo $RESEND_API_KEY

# Verify in .env
grep RESEND .env

# Check rate limits
# Resend limits: 100 emails/min, 10,000/day

# Restart service to reload .env
pm2 restart sanliurfa
```

---

## 🔍 Investigation & Resolution

**After any incident:**

1. **Document what happened** - Timeline, symptoms, impact
2. **Investigate root cause** - Logs, metrics, code changes
3. **Implement fix** - Code patch or configuration change
4. **Test thoroughly** - In staging first
5. **Deploy carefully** - Monitor closely
6. **Post-mortem** - Team discussion within 24 hours
7. **Prevent recurrence** - Add tests, monitoring, alerts

---

## When to Escalate

**Call the on-call engineer if:**
- ❌ Service still down after 10 minutes
- ❌ Can't identify root cause after 15 minutes
- ❌ Security incident suspected
- ❌ Data loss suspected
- ❌ Multiple services affected
- ❌ Customer data at risk

**On-call contact**: on-call@sanliurfa.com

---

**Keep this document handy. Speed is critical in emergencies.**
