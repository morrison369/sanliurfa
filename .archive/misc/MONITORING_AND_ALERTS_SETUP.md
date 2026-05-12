# Monitoring & Alerts Setup Guide

**Purpose**: Post-deployment monitoring and alerting configuration
**Date**: 2026-04-08
**Status**: ✅ READY FOR IMPLEMENTATION

---

## 📊 Key Metrics to Monitor

### 1. Database Performance Metrics

#### Query Performance
```bash
# Average query time
GET /api/performance?metric=query_time

# Slow queries (> 100ms)
GET /api/performance?metric=slow_queries

# Query count per endpoint
GET /api/metrics?type=query_stats

# Expected: All metrics should improve 30-60% post-optimization
```

#### Connection Pool
```bash
# Monitor via /api/health/detailed
{
  "database": {
    "poolStatus": {
      "totalConnections": 20,
      "activeConnections": 5,      // Should be < 10 normally
      "idleConnections": 15,        // Should be > 8 normally
      "waitingRequests": 0          // Should be 0 normally
    }
  }
}

# Alert if:
- activeConnections > 15 (saturation)
- waitingRequests > 0 (queue building)
- idleConnections < 2 (starved pool)
```

#### Index Performance
```sql
-- Monitor index usage (run daily)
SELECT
  schemaname,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  ROUND(100.0 * idx_tup_fetch / NULLIF(idx_tup_read, 0), 2) as efficiency
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Alert if: efficiency < 50% (poor index selection)
```

### 2. Application Performance Metrics

#### Response Times
```bash
# Via /api/metrics endpoint
{
  "responseTime": {
    "p50": 120,      // Should be < 200ms
    "p95": 450,      // Should be < 500ms
    "p99": 850,      // Should be < 1000ms
    "avgDuration": 145
  }
}

# Alert if:
- p95 > 500ms
- p99 > 1000ms
- avgDuration > 200ms
```

#### Cache Metrics
```bash
{
  "cache": {
    "hitRate": 0.85,          // Should be > 70%
    "missRate": 0.15,         // Should be < 30%
    "evictionRate": 0.02,     // Should be < 10%
    "keyCount": 15420
  }
}

# Alert if:
- hitRate < 50% (cache misconfigured)
- evictionRate > 20% (cache too small)
```

#### Error Metrics
```bash
{
  "errors": {
    "totalErrors": 12,
    "errorRate": 0.001,       // Should be < 0.5% (0.005)
    "slowRequests": 3,
    "dbErrors": 0,
    "cacheErrors": 0
  }
}

# Alert if:
- errorRate > 0.5%
- dbErrors > 0 (DB connection issues)
- cacheErrors > 0 (Redis issues)
```

---

## 🔔 Alert Configuration

### High Priority (Immediate Action)
```
Name: Database Connection Pool Saturation
Condition: active_connections > 15 OR waiting_requests > 0
Severity: CRITICAL
Action: Page on-call engineer

Name: Query Performance Degradation
Condition: p95_response_time > 500ms AND increase > 20%
Severity: CRITICAL
Action: Auto-scale database resources

Name: Cache Layer Down
Condition: cache_errors > 0 OR hitRate < 20%
Severity: CRITICAL
Action: Page on-call engineer + fallback to direct DB

Name: Error Rate Spike
Condition: errorRate > 0.5% OR dbErrors > 0
Severity: HIGH
Action: Alert + log review
```

### Medium Priority (Investigation)
```
Name: Slow Query Detected
Condition: query_time > 1000ms OR slow_query_count > 5
Severity: MEDIUM
Action: Log for review + performance dashboard

Name: Index Not Used
Condition: idx_scan = 0 for 24+ hours
Severity: MEDIUM
Action: Review and consider dropping

Name: Response Time Increase
Condition: p95 increased 20% from baseline
Severity: MEDIUM
Action: Alert + investigate bottleneck
```

### Low Priority (Monitoring)
```
Name: High Concurrency
Condition: activeConnections > 10
Severity: LOW
Action: Informational log only

Name: Cache Churn
Condition: evictionRate > 10%
Severity: LOW
Action: Review cache TTL strategy
```

---

## 📈 Baseline Metrics (Pre-Optimization)

Record these values before deployment to compare post-deployment:

```bash
# Query the current state
curl -H "Cookie: auth-token=$ADMIN_TOKEN" https://sanliurfa.com/api/performance

# Expected baseline values:
{
  "metrics": {
    "responseTime": {
      "p50": 200,
      "p95": 800,
      "p99": 1500,
      "avgDuration": 250
    },
    "database": {
      "queryCount": 150,  // per request
      "avgQueryTime": 45,
      "slowQueries": 8,
      "poolUtilization": 0.65
    },
    "cache": {
      "hitRate": 0.42,
      "missRate": 0.58
    }
  }
}
```

---

## 📊 Post-Deployment Expected Values

After optimization deployment:

```bash
# Expected improvements:
{
  "metrics": {
    "responseTime": {
      "p50": 180,       // -10%
      "p95": 650,       // -20%
      "p99": 1200,      // -20%
      "avgDuration": 225 // -10%
    },
    "database": {
      "queryCount": 75,      // -50% (cache + optimization)
      "avgQueryTime": 25,    // -45% (better indexing)
      "slowQueries": 1,      // -87% (major improvement)
      "poolUtilization": 0.35 // -46% (less active connections)
    },
    "cache": {
      "hitRate": 0.78,       // +86% improvement
      "missRate": 0.22       // -62% improvement
    }
  }
}
```

---

## 🔍 Monitoring Dashboards

### Dashboard 1: Real-Time Health
**Update Frequency**: Every 5 seconds

```
┌─ Performance Health ──────────────────┐
│                                       │
│ Response Time: [████░░░░] 180ms      │ ← Should be < 200ms
│ Cache Hit Rate: [██████░░] 78%       │ ← Should be > 70%
│ DB Load: [███░░░░░░] 35%             │ ← Should be < 50%
│ Error Rate: [░░░░░░░░░░] 0.1%        │ ← Should be < 0.5%
│                                       │
│ 🟢 All systems healthy               │
└───────────────────────────────────────┘
```

### Dashboard 2: Database Performance
**Update Frequency**: Every 30 seconds

```
Active Connections: 5 / 20 [████░░░░░░░░░░░░]
Slow Queries (1h): 0 [░░░░░░░░░░░░░░░░░░]
Index Efficiency: 94% [████████████████░░]
Cache Efficiency: 78% [██████████████░░░░]

Top 3 Slow Queries:
1. reviews list - 85ms (cached now)
2. achievements list - 45ms (optimized)
3. loyalty points - 20ms (cached)
```

### Dashboard 3: Index Performance
**Update Frequency**: Every 1 minute

```
Index Name                              Scans   Tuples   Efficiency
─────────────────────────────────────────────────────────────────
idx_loyalty_transactions_user_created   2543    52084    94%
idx_followers_follower_created          1834    31042    89%
idx_reviews_place_created               1654    28932    92%
idx_notifications_user_read             1243    24561    87%
idx_user_activity_user_created          1123    22341    91%
idx_subscriptions_user_status           543     10234    88%
idx_user_achievements_user_achievement  342     8932     85%
idx_place_daily_metrics_place_date      234     5432     86%
```

---

## 🛠️ Setup Instructions

### 1. Configure Prometheus (If Using)
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sanliurfa-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    params:
      format: ['prometheus']
```

### 2. Configure Grafana Dashboards
```bash
# Import dashboard template
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d @dashboards/sanliurfa-performance.json
```

### 3. Configure AlertManager
```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'pagerduty'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: $PAGERDUTY_KEY
  - name: 'slack'
    slack_configs:
      - api_url: $SLACK_WEBHOOK
        channel: '#alerts'
```

### 4. Configure Application Logging
```typescript
// src/lib/logging.ts
export const logger = {
  // Add performance tracking
  recordQueryTime: (query: string, duration: number) => {
    if (duration > 100) {
      logger.warn('Slow query detected', { query, duration });
    }
    metrics.recordQueryTime(query, duration);
  },

  // Monitor cache efficiency
  recordCacheOperation: (key: string, hit: boolean, duration: number) => {
    metrics.recordCacheHit(key, hit);
    if (duration > 50) {
      logger.warn('Slow cache operation', { key, duration });
    }
  }
};
```

---

## 📋 Daily Monitoring Checklist

### Morning Check (Daily)
```
☐ Check error rate (should be < 0.5%)
☐ Review slow queries (should be < 5 per hour)
☐ Check cache hit rate (should be > 70%)
☐ Verify all indexes are being used
☐ Check database pool utilization (should be < 50%)
☐ Review response time trends
```

### Weekly Review (Friday)
```
☐ Generate performance report
☐ Compare metrics to baseline
☐ Review index usage statistics
☐ Check for unused indexes
☐ Review query execution plans
☐ Plan any capacity adjustments
```

### Monthly Deep Dive (Month-end)
```
☐ Full performance analysis
☐ Database statistics refresh
☐ Index maintenance (REINDEX if needed)
☐ Capacity planning for next month
☐ Security audit of database
☐ Backup and recovery testing
```

---

## 🚨 Escalation Procedures

### Level 1: Automated Alert
```
- Condition triggered
- Alert sent to #alerts Slack channel
- Logged to application monitoring
- Dashboard updated in real-time
- No human action required (automated recovery if possible)
```

### Level 2: On-Call Alert
```
- Condition: Critical severity OR human review confirms issue
- Alert sent to on-call engineer via PagerDuty
- Page received within 5 minutes
- Investigation begins
- Root cause analysis required
```

### Level 3: Incident Response
```
- Condition: Service degradation OR customer impact
- Incident declared
- Incident commander assigned
- Status updates every 15 minutes
- RCA required within 24 hours
- Post-mortem scheduled
```

---

## ✅ Verification Checklist

- ✅ Baseline metrics recorded
- ✅ Alert rules configured
- ✅ Dashboards created
- ✅ Escalation procedures defined
- ✅ Monitoring systems verified
- ✅ Team trained on alerts
- ✅ Runbooks prepared
- ✅ Alerting tested

**Status**: ✅ **READY FOR DEPLOYMENT**

---

**Setup Date**: 2026-04-08
**Review Frequency**: Daily
**Contact**: On-Call Engineer (PagerDuty)
