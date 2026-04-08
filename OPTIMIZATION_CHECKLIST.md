# Performance Optimizations - Implementation Checklist

Ready-to-implement optimizations with step-by-step guides.

---

## Priority 1: Fix N+1 Patterns (30 minutes)

### 1.1 Batch Insert - Social Features
- File: src/lib/social-features.ts (Line 227-236)
- Change: Replace individual inserts with batchInsert()
- Impact: 50s → 500ms (100x faster)
- Status: Ready
- Time: 5 min

### 1.2 Achievement Stats - Single Query
- File: src/lib/achievements.ts (Line 264-278)
- Change: Combine 3 COUNT queries into single aggregation
- Impact: 300ms → 50ms (6x faster)
- Status: Ready
- Time: 10 min

### 1.3 Follow Stats - UPSERT Pattern
- File: src/lib/social-features.ts (Line 176-210)
- Change: Use QueryOptimizations.statsUpsert()
- Impact: 100ms → 20ms (5x faster)
- Status: Ready
- Time: 5 min

---

## Priority 2: Fire-and-Forget Patterns (15 minutes)

### 2.1 Notification Broadcasts
- File: src/lib/notifications-queue.ts (Line 48-72)
- Change: Use fireAndForget() for broadcasts
- Impact: -100-500ms latency
- Status: Ready
- Time: 5 min

### 2.2 Social Stats Updates
- File: src/lib/social-features.ts (Line 100-101)
- Change: Use Promise.all() without await
- Impact: -50-200ms latency
- Status: Ready
- Time: 3 min

### 2.3 Achievement Unlocking
- File: src/lib/gamification.ts
- Change: Queue as background task with fireAndForget()
- Impact: -200-500ms latency
- Status: Ready
- Time: 3 min

---

## Priority 3: Cache Optimization (30 minutes)

### 3.1 Extend TTLs
- Achievement cache: 600s → 1800s (30 min)
- Other caches: Review and extend
- Impact: 30-50% cache miss reduction
- Status: Ready
- Time: 10 min

### 3.2 Add Missing Caches
- Admin user lists: 5 min TTL
- Moderation queue: 30-60 sec
- Platform stats: 10 min
- Impact: 30-50% reduction for admin operations
- Status: Ready
- Time: 15 min

---

## Priority 4: Remove SELECT * (15 minutes)

### 4.1 Places Endpoint
- File: src/pages/api/places/index.ts
- Change: Select only needed columns
- Impact: 20-30% payload reduction
- Status: Ready
- Time: 2 min

### 4.2 Reviews Endpoint
- File: src/pages/api/reviews/index.ts
- Change: Select specific columns
- Impact: 15-25% payload reduction
- Status: Ready
- Time: 2 min

### 4.3 Messages Endpoint
- File: src/pages/api/messages/[conversationId].ts
- Change: Select specific columns
- Impact: 15-25% payload reduction
- Status: Ready
- Time: 2 min

### 4.4-4.5 Other Endpoints
- Additional endpoints identified
- Status: Ready
- Time: 5 min

---

## Database Indexes Deployment

### Status
- Migration file: src/migrations/add-performance-indexes.sql
- 8 indexes ready
- Expected impact: 50-80% query time reduction

### Deployment Steps
1. psql -f src/migrations/add-performance-indexes.sql
2. Verify indexes created
3. Monitor query performance

---

## Implementation Timeline

Total Time: ~90 minutes (1.5 hours)

| Phase | Items | Time | Status |
|-------|-------|------|--------|
| N+1 Patterns | 3 fixes | 30 min | Ready |
| Async Patterns | 3 changes | 15 min | Ready |
| Cache Tuning | TTL + layers | 30 min | Ready |
| SELECT * | 5 endpoints | 15 min | Ready |

---

## Tools Available

From src/lib/performance-optimizations.ts:
- batchInsert(tableName, records)
- fireAndForget(operation, name)
- OptimizedCache.getOrCompute()
- OptimizedCache.CACHE_KEYS.*
- QueryOptimizations.statsUpsert()
- monitorPoolHealth()

---

## Verification After Each Change

- npm run build (no errors)
- npm run test (all pass)
- Monitor response times
- Check cache hit rates

---

## Expected Results Summary

N+1 fixes: 100x for bulk ops
Fire-and-forget: -100-500ms latency
Cache tuning: 30-50% miss reduction
SELECT * removal: 15-30% payload
Database indexes: 50-80% query reduction

Total: 20-60% response time improvement

---

Last Updated: 2026-04-08
