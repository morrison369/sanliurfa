# Deployment Checklist - Quick Reference

Print this page and check off items as you deploy.

---

## PRE-DEPLOYMENT (30 min before)

### Code Quality
- [ ] `npm run lint` passed
- [ ] `npm run test` passed
- [ ] Code pushed to main
- [ ] Latest commit noted: _______________

### Infrastructure
- [ ] Database backup created
- [ ] Database connection tested
- [ ] Redis connection tested
- [ ] Disk space available (> 5GB)
- [ ] Port 6000 available

### Configuration
- [ ] .env file reviewed
- [ ] SSL certificate valid
- [ ] CORS_ORIGINS correct
- [ ] Database credentials set

### Team
- [ ] Team notified of deployment
- [ ] On-call engineer available
- [ ] Rollback plan reviewed
- [ ] Contacts listed below

**Key Contacts:**
- Lead: _______________________ Phone: _____________
- Ops: ________________________ Phone: _____________

---

## DEPLOYMENT (15 min)

### 1. Code Update
```bash
git fetch origin && git checkout main && git pull origin main
git log -1 --oneline  # Note: _______________
```
- [ ] Correct commit checked out

### 2. Dependencies
```bash
npm install --legacy-peer-deps
npm audit  # Check results
```
- [ ] Dependencies installed
- [ ] Security audit acceptable

### 3. Build
```bash
npm run build
ls -la .output/server/
```
- [ ] Build completed successfully
- [ ] .output/server/ contains files

### 4. Service Restart
```bash
pm2 gracefulReload sanliurfa  # or systemctl restart
```
- [ ] Service reloading/restarting
- [ ] Wait 30 seconds...

---

## POST-DEPLOYMENT (10 min)

### 1. Basic Health
```bash
curl https://sanliurfa.com/api/health | jq .
```
- [ ] HTTP 200 response
- [ ] Status: "healthy"

### 2. Database
```bash
redis-cli ping  # Should: PONG
psql -c "SELECT 1;" # Should: 1
```
- [ ] Redis responding: PONG
- [ ] Database responding: 1

### 3. Frontend
```bash
curl -I https://sanliurfa.com/  # Should: HTTP 200
```
- [ ] Main page loads
- [ ] SSL working
- [ ] No redirect loops

### 4. API Endpoints
```bash
curl https://sanliurfa.com/api/places | jq . | head
```
- [ ] /api/places responds
- [ ] Valid JSON response
- [ ] Data present

### 5. Logs Check
```bash
pm2 logs sanliurfa --lines 50 | grep -i error
```
- [ ] No critical errors
- [ ] No stack traces
- [ ] Normal operation messages

---

## MONITORING (30 min)

### Watch Metrics
```bash
watch -n 10 'pm2 monit'  # Press q to exit
```

| Time | CPU | Memory | Status |
|------|-----|--------|--------|
| 0 min | ___% | ___% | ✓ |
| 5 min | ___% | ___% | ✓ |
| 10 min | ___% | ___% | ✓ |
| 15 min | ___% | ___% | ✓ |
| 20 min | ___% | ___% | ✓ |
| 25 min | ___% | ___% | ✓ |
| 30 min | ___% | ___% | ✓ |

- [ ] CPU stable (< 60%)
- [ ] Memory stable (< 500MB)
- [ ] No crashes/restarts
- [ ] Response time OK (< 2s)

### Error Rate Check
```bash
curl -H "Cookie: auth-token=TOKEN" https://sanliurfa.com/api/health/detailed | jq .errors
```

- [ ] Error rate < 1%
- [ ] No pattern of failures
- [ ] Sentry shows minimal new errors

---

## FEATURE VERIFICATION

Test each feature works:

### Authentication
- [ ] Signup works
- [ ] Login works
- [ ] Logout works
- [ ] Session persists

### Search
- [ ] Search bar responds
- [ ] Results load
- [ ] Filters work
- [ ] Pagination works

### Places
- [ ] Place list loads
- [ ] Details page loads
- [ ] Images display
- [ ] Reviews load

### User
- [ ] Profile loads
- [ ] Settings accessible
- [ ] Notifications work
- [ ] Favorites work

### Mobile (Test on phone)
- [ ] Mobile menu works
- [ ] Touch interactions work
- [ ] Mobile responsive
- [ ] No layout shifts

---

## ROLLBACK DECISION

**Rollback if ANY of these occur:**

- [ ] Continuous crashes (> 3 restarts in 5 min)
- [ ] Error rate > 5%
- [ ] Response time > 5 seconds
- [ ] Database connection failed
- [ ] Critical feature broken
- [ ] Data corruption detected
- [ ] Security vulnerability found

**Rollback command:**
```bash
PREV_COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')
git checkout $PREV_COMMIT
npm run build
pm2 restart sanliurfa
```

---

## SIGN-OFF

**Deployment Status**:
- [ ] ✅ SUCCESS
- [ ] ⚠️ PARTIAL (describe): _________________
- [ ] ❌ ROLLED BACK (reason): _________________

**Deployed by**: ___________________
**Time started**: ___________________ UTC
**Time completed**: ___________________ UTC
**Total duration**: ___________________ minutes

**Issues encountered**:
_____________________________________________________________

_____________________________________________________________

**Resolution**:
_____________________________________________________________

_____________________________________________________________

**Sign-off**: ______________________ Date: ___________

---

## NEXT DAY CHECK

Next morning, verify:
- [ ] Service still running (`pm2 status`)
- [ ] No overnight errors (`pm2 logs --lines 100`)
- [ ] Performance metrics normal
- [ ] All alerts green
- [ ] User reports no issues

**Date checked**: ___________________
**Checked by**: _____________________

---

## NOTES

_____________________________________________________________

_____________________________________________________________

_____________________________________________________________

_____________________________________________________________
