# Production Deployment Guide

Complete step-by-step guide for deploying Şanlıurfa.com to CentOS Web Panel shared hosting.

## Pre-Deployment Checklist

### Code Quality
- [ ] `npm run lint` passes (TypeScript strict mode)
- [ ] `npm run test` passes (unit + E2E tests)
- [ ] All Git commits pushed to main branch
- [ ] Latest build artifacts generated
- [ ] No console errors or warnings
- [ ] Environment variables documented in .env.example

### Security
- [ ] Database credentials are strong (min 32 chars)
- [ ] JWT_SECRET is strong and unique
- [ ] Redis password is strong
- [ ] All sensitive data removed from git history
- [ ] CORS_ORIGINS configured for production domain
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Security headers configured in Nginx
- [ ] Rate limiting rules reviewed

### Infrastructure
- [ ] PostgreSQL database created and tested
- [ ] Redis instance accessible and tested
- [ ] Node.js installed on server (LTS version)
- [ ] Disk space available (min 5GB)
- [ ] Backup strategy in place
- [ ] Monitoring tools accessible
- [ ] PM2 or Systemd service templates prepared

### Documentation
- [ ] DEPLOYMENT.md reviewed
- [ ] All team members aware of deployment plan
- [ ] Rollback procedure documented
- [ ] Emergency contacts listed
- [ ] Monitoring dashboard URLs documented

---

## Step-by-Step Deployment

### Phase 1: Pre-Flight (30 minutes before deployment)

#### 1. Notify Team
```bash
# Send message to team
echo "Deployment starting in 30 minutes to production"
```

#### 2. Create Database Backup
```bash
# On server, backup current database
ssh user@server.com
cd ~/sanliurfa
pg_dump -U sanliurfa_user -d sanliurfa | gzip > ~/backups/db_pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### 3. Test Database Connection
```bash
psql -U sanliurfa_user -d sanliurfa -h localhost -c "SELECT version();"
# Should return PostgreSQL version
```

#### 4. Test Redis Connection
```bash
redis-cli -u "redis://:password@localhost:6379/0" ping
# Should return: PONG
```

#### 5. Save Current State
```bash
# Record current commit for rollback
git log -1 --oneline > ~/sanliurfa/CURRENT_DEPLOYMENT.txt
# Record PM2 status
pm2 save
```

---

### Phase 2: Code Deployment (15 minutes)

#### 1. Pull Latest Code
```bash
cd ~/sanliurfa
git fetch origin
git checkout main
git pull origin main

# Verify correct branch/commit
git log -1 --oneline
# Should show expected commit
```

#### 2. Install Dependencies
```bash
npm install --legacy-peer-deps

# Check for security vulnerabilities
npm audit

# If vulnerabilities found, assess risk before continuing
```

#### 3. Build Application
```bash
npm run build

# Verify build succeeded
ls -la .output/server/
# Should show index.mjs and chunks/

# Test build locally
npm run preview &
sleep 5
curl -I http://127.0.0.1:3000
# Should return HTTP 200
kill %1
```

#### 4. Verify Environment Variables
```bash
# Check all required vars are set
env | grep -E "DATABASE_URL|JWT_SECRET|REDIS_URL|NODE_ENV"

# Should see all critical variables
echo "Environment check complete"
```

---

### Phase 3: Service Deployment (10 minutes)

#### Option A: PM2 Deployment

##### Update ecosystem.config.js
```bash
# Ensure ecosystem.config.js points to correct directory
cat ecosystem.config.js | grep cwd
# Should show: /home/sanliurfa/sanliurfa
```

##### Graceful Reload
```bash
# Graceful reload (no downtime)
pm2 gracefulReload sanliurfa

# Wait for reload to complete
sleep 10

# Verify service is running
pm2 status sanliurfa
# Should show: online

# Check logs for errors
pm2 logs sanliurfa --lines 20
```

#### Option B: Systemd Deployment

##### Restart Service
```bash
# Restart service with new code
sudo systemctl restart sanliurfa

# Verify service is running
sudo systemctl status sanliurfa
# Should show: active (running)

# Check for startup errors
sudo journalctl -u sanliurfa -n 50 --no-pager
```

---

### Phase 4: Health Check (5 minutes)

#### 1. API Health Check
```bash
# Check basic health endpoint
curl -s https://sanliurfa.com/api/health | jq .

# Expected response:
# {
#   "success": true,
#   "data": {
#     "status": "healthy",
#     "timestamp": "2026-04-07T10:00:00Z"
#   }
# }
```

#### 2. Database Connectivity
```bash
# Check detailed health (admin endpoint)
curl -s -H "Cookie: auth-token=ADMIN_TOKEN" https://sanliurfa.com/api/health/detailed | jq .database

# Should show database connection status: ok
```

#### 3. Redis Connectivity
```bash
redis-cli -u "redis://:password@localhost:6379/0" ping
# Should return: PONG
```

#### 4. Frontend Load Test
```bash
# Load main page
curl -s -o /dev/null -w "%{http_code}\n" https://sanliurfa.com/
# Should return: 200

# Check for errors in response
curl -s https://sanliurfa.com/ | grep -i error
# Should return nothing
```

#### 5. API Endpoints Test
```bash
# Test key endpoints
curl -s https://sanliurfa.com/api/places | jq . | head -20
curl -s https://sanliurfa.com/api/auth/status | jq .

# All should return valid JSON responses
```

#### 6. SSL Certificate Check
```bash
# Verify certificate is valid
curl -I https://sanliurfa.com/
# Should show HTTP/1.1 200 and SSL cert info

# Check certificate expiration
openssl s_client -connect sanliurfa.com:443 -servername sanliurfa.com 2>/dev/null | openssl x509 -noout -dates
# notAfter should be far in future
```

#### 7. Nginx Status
```bash
# Check Nginx is responding
curl -I https://sanliurfa.com/
# Should show HTTP/1.1 200

# Check Nginx error log for issues
sudo tail -20 /var/log/nginx/error.log
# Should be minimal errors
```

---

### Phase 5: Monitoring Setup (10 minutes)

#### 1. Enable Application Monitoring
```bash
# Start real-time log monitoring
pm2 logs sanliurfa

# Monitor CPU/Memory usage
pm2 monit
```

#### 2. Check System Resources
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check active processes
ps aux | grep node

# Should see Node.js process(es) running
```

#### 3. Setup Log Rotation
```bash
# Verify logrotate is configured for PM2 logs
ls -la ~/sanliurfa/logs/

# Create logrotate config if needed
sudo nano /etc/logrotate.d/sanliurfa
```

#### 4. Enable Analytics Tracking
```bash
# Verify Google Analytics tag is loaded
curl -s https://sanliurfa.com/ | grep -i "google" | head -5

# Should see Google Analytics script
```

#### 5. Test Email Notifications
```bash
# Test email sending via API
curl -X POST https://sanliurfa.com/api/email/send-test \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=ADMIN_TOKEN" \
  -d '{"email":"admin@sanliurfa.com"}'

# Check email received within 2 minutes
```

---

### Phase 6: Post-Deployment (30 minutes)

#### 1. Smoke Test Suite
```bash
# Run E2E tests against production
npm run test:e2e -- --config=e2e/playwright.config.prod.ts

# All tests should pass (or 1 hour, max)
```

#### 2. User-Facing Feature Verification
- [ ] Signup/Login works
- [ ] Search functionality works
- [ ] Place details load correctly
- [ ] Reviews display and can be submitted
- [ ] Favorites can be added/removed
- [ ] Notifications work
- [ ] Admin panel accessible
- [ ] Mobile responsive (test on device)

#### 3. Performance Verification
```bash
# Check response times
curl -w "Time: %{time_total}s\n" https://sanliurfa.com/

# Should be under 2 seconds

# Check Core Web Vitals via API
curl -s https://sanliurfa.com/api/performance | jq . | head -50
```

#### 4. Error Logging Verification
```bash
# Check Sentry for new errors
# Visit: https://sentry.io/organizations/sanliurfa/

# Should see minimal or zero new errors

# Check application logs
pm2 logs sanliurfa --lines 50 | grep -i error
```

#### 5. Backup Verification
```bash
# Verify backup was created
ls -lh ~/backups/ | tail -5

# Test backup restore (optional, in test env)
# psql -U sanliurfa_user -d sanliurfa_test < backup_file.sql
```

#### 6. Monitor for 1 Hour
```bash
# Watch metrics during first hour
watch -n 5 'pm2 monit'

# Monitor error logs
tail -f ~/sanliurfa/logs/pm2-error.log

# Check system resources didn't spike
watch -n 5 'free -h && df -h'
```

#### 7. Notify Team - Deployment Complete
```bash
echo "✅ Production deployment complete"
echo "✅ All health checks passed"
echo "✅ No critical errors detected"
echo "✅ Monitoring enabled"
```

---

## Rollback Procedure

If deployment fails or critical issues detected, rollback immediately:

### 1. Stop New Version
```bash
pm2 stop sanliurfa
# OR
sudo systemctl stop sanliurfa
```

### 2. Restore Previous Code
```bash
cd ~/sanliurfa

# Get previous commit from CURRENT_DEPLOYMENT.txt
PREV_COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')

# Checkout previous version
git checkout $PREV_COMMIT

# Rebuild
npm install --legacy-peer-deps
npm run build
```

### 3. Restore Database (If Corrupted)
```bash
# Restore from backup
pg_restore -U sanliurfa_user -d sanliurfa ~/backups/db_pre_deploy_*.sql.gz

# Verify restore
psql -U sanliurfa_user -d sanliurfa -c "SELECT COUNT(*) FROM users;"
```

### 4. Restart Service
```bash
pm2 restart sanliurfa
# OR
sudo systemctl restart sanliurfa

# Verify running
pm2 status sanliurfa
```

### 5. Run Health Checks
```bash
curl https://sanliurfa.com/api/health
# Should show healthy
```

### 6. Notify Team - Rollback Complete
```bash
echo "⚠️ Rollback completed"
echo "⚠️ Investigating issues before retry"
```

---

## Monitoring During Deployment

### Key Metrics to Watch

| Metric | Normal | Alert |
|--------|--------|-------|
| Response Time | < 500ms | > 2000ms |
| Error Rate | < 0.1% | > 1% |
| CPU Usage | 20-40% | > 80% |
| Memory Usage | 30-50% | > 80% |
| Active Connections | 10-50 | > 500 |
| Database Queries/sec | 10-100 | > 500 |

### Monitoring Commands

```bash
# Real-time application metrics
pm2 monit

# System resource usage
top -b -n 1 | head -20

# Network connections
netstat -an | grep ESTABLISHED | wc -l

# Disk I/O
iostat -x 1 5

# Database connections
psql -U sanliurfa_user -d sanliurfa -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Redis memory usage
redis-cli info memory | grep used_memory_human
```

---

## Deployment Troubleshooting

### Application Won't Start

**Symptom**: pm2 status shows "stopped" or "errored"

**Solution**:
```bash
# Check logs
pm2 logs sanliurfa --lines 100

# Common issues:
# 1. Missing .env file
# 2. Database connection failed
# 3. Redis connection failed
# 4. Port 6000 in use

# Check if port is in use
lsof -i :6000

# Try manual start to see error
cd ~/sanliurfa && npm run build && npm run preview
```

### High Response Times

**Symptom**: API responses slow after deployment

**Solution**:
```bash
# Check slow queries
curl -H "Cookie: auth-token=TOKEN" https://sanliurfa.com/api/performance | jq .slowQueries

# Check database connections
psql -U sanliurfa_user -d sanliurfa -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Restart service to clear state
pm2 restart sanliurfa
```

### Memory Leak

**Symptom**: Memory usage continuously increases

**Solution**:
```bash
# Check for memory-intensive queries
pm2 logs sanliurfa | grep -i "memory\|slow"

# Restart service
pm2 restart sanliurfa

# Monitor memory trend
watch -n 5 'free -h'

# If persists, investigate code for leak
```

### Database Connection Errors

**Symptom**: "ECONNREFUSED" or "too many connections"

**Solution**:
```bash
# Verify database is running
pg_isready -h localhost -U sanliurfa_user

# Check active connections
psql -U sanliurfa_user -d sanliurfa -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check pool configuration
grep -i "pool\|max_connections" ~/.env

# Increase pool if needed (restart required)
```

### Redis Connection Errors

**Symptom**: Redis connection timeout or refused

**Solution**:
```bash
# Verify Redis is running
redis-cli ping

# Check Redis info
redis-cli info server

# Verify credentials
redis-cli -u "redis://:PASSWORD@localhost:6379/0" ping

# Restart Redis if needed
sudo systemctl restart redis
```

---

## Post-Deployment Verification (24-48 hours)

### Daily Checks

- [ ] No spike in error rates (Sentry dashboard)
- [ ] Response times stable
- [ ] Database size not growing unexpectedly
- [ ] No warning emails from monitoring
- [ ] All user-facing features working
- [ ] Search indexing complete
- [ ] Email delivery working
- [ ] Payments processing correctly (if applicable)

### Weekly Report

Create report with:
- Uptime percentage
- Error rate
- Average response time
- Performance compared to baseline
- Resource utilization
- Any issues encountered and resolved

---

## Deployment Timing

**Optimal Deployment Window**:
- **Day**: Tuesday-Thursday
- **Time**: 02:00-06:00 UTC (off-peak hours)
- **Duration**: 30-45 minutes total
- **Team**: Min 2 people (deployer + monitor)

**Avoid**:
- Weekends
- Evenings (business hours in target regions)
- During peak traffic times
- Before holidays

---

## Emergency Procedures

### Critical Error Detected

1. **Immediately rollback** (see Rollback Procedure)
2. **Notify team** - All hands alert
3. **Investigate** - Why did QA miss this?
4. **Patch** - Fix issue in staging
5. **Re-test** - Comprehensive test before re-deploy
6. **Re-deploy** - After sign-off from all leads

### Service Completely Down

1. **Alert all users** - Status page update
2. **Start PM2 recovery**:
   ```bash
   pm2 restart sanliurfa
   pm2 status sanliurfa
   ```
3. **If PM2 recovery fails**:
   - Restart server: `sudo reboot`
   - Wait for auto-start
   - Verify service online
4. **Post-mortem** - Within 24 hours

---

## Sign-Off Checklist

Before marking deployment as complete:

- [ ] All health checks passed
- [ ] No critical errors in logs
- [ ] Performance metrics acceptable
- [ ] User-facing features verified
- [ ] Monitoring enabled and alerting
- [ ] Team notified of completion
- [ ] Deployment documented
- [ ] Rollback procedure verified
- [ ] Post-deployment report generated

---

## Contact & Escalation

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call | on-call@sanliurfa.com | 24/7 |
| Lead Developer | dev-lead@sanliurfa.com | Business hours |
| Ops Lead | ops@sanliurfa.com | Business hours |
| VP Eng | vp-eng@sanliurfa.com | Emergencies |

---

**Last Updated**: 2026-04-07
**Next Review**: 2026-05-07
**Version**: 1.0
