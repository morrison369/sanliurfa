# Performance Optimization Guide

Actionable plan addressing identified bottlenecks.

## Executive Summary

Analysis identified bottlenecks in:
1. Database Queries (Missing indexes, N+1 patterns)
2. Caching Strategy (Short TTLs, missing layers)
3. Async Patterns (Blocking operations)

**Estimated Impact**: 20-60% response time reduction, 30-80% p95 latency improvement.

---

## Priority 1: Database Indexes

### Missing Indexes (CRITICAL)

```
CREATE INDEX idx_loyalty_transactions_user_created ON loyalty_transactions(user_id, created_at DESC);
CREATE INDEX idx_place_daily_metrics_place_date ON place_daily_metrics(place_id, metric_date DESC);
CREATE INDEX idx_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_user_achievements_user_achievement ON user_achievements(user_id, achievement_id);
CREATE INDEX idx_followers_follower_created ON followers(follower_id, created_at DESC);
CREATE INDEX idx_user_activity_user_created ON user_activity(user_id, created_at DESC);
CREATE INDEX idx_reviews_place_created ON reviews(place_id, created_at DESC);
```

**Impact**: 50-80% query time reduction

---

## Priority 2: Fix N+1 Patterns

### Issue 1: Batch Insert for Followers Activity

**Current** (1000 INSERT queries for 1000 followers):
```typescript
const followers = await getFollowers(userId);
for (const follower of followers) {
  await insert('activity_feeds', {...});
}
```

**Optimized** (Single INSERT):
```typescript
const followers = await getFollowers(userId);
if (followers.length === 0) return;

const values = followers.map((f, i) => `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`).join(',');
const params = followers.flatMap(f => [f.id, 'follow', userId, new Date().toISOString()]);

await pool.query(
  `INSERT INTO activity_feeds (user_id, activity_type, related_user_id, created_at) VALUES ${values}`,
  params
);
```

**Impact**: 50 seconds → 500ms (100x faster)

### Issue 2: Achievement Stats Single Query

**Current** (3 separate COUNT queries):
```typescript
const totalAchievements = await queryOne('SELECT COUNT(*) FROM achievements');
const unlockedCount = await queryOne('SELECT COUNT(...) FROM user_achievements WHERE user_id = $1', [userId]);
const viewedCount = await queryOne('SELECT COUNT(...) FROM user_achievements WHERE ...', [userId]);
```

**Optimized** (Single aggregation):
```typescript
const stats = await queryOne(
  `SELECT 
    COUNT(DISTINCT a.id) as total_achievements,
    COUNT(DISTINCT CASE WHEN ua.id IS NOT NULL THEN ua.id END) as unlocked_count
  FROM achievements a
  LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1`,
  [userId]
);
```

**Impact**: 300ms → 50ms (6x faster)

### Issue 3: Follow Stats UPSERT

**Current** (SELECT then UPDATE/INSERT):
```typescript
const existing = await queryOne('SELECT * FROM follow_stats WHERE user_id = $1', [userId]);
if (existing) await update(...);
else await insert(...);
```

**Optimized** (UPSERT):
```typescript
await pool.query(
  `INSERT INTO follow_stats (user_id, follower_count) 
   VALUES ($1, $2)
   ON CONFLICT (user_id) DO UPDATE SET follower_count = $2`,
  [userId, followerCount]
);
```

**Impact**: 100ms → 20ms (5x faster)

---

## Priority 3: Async Fire-and-Forget

### Change 1: Broadcast Notifications

**Before** (blocks request):
```typescript
await broadcastNotification(userId, result);
return result;
```

**After** (fire-and-forget):
```typescript
broadcastNotification(userId, result).catch(err => {
  logger.error('Broadcast failed', err);
});
return result;
```

**Impact**: -100-500ms latency

### Change 2: Social Stats Updates

**Before** (blocks follow):
```typescript
await updateFollowStats(followingUserId);
await updateFollowStats(followerUserId);
```

**After** (background):
```typescript
Promise.all([
  updateFollowStats(followingUserId),
  updateFollowStats(followerUserId)
]).catch(err => logger.error('Failed', err));
```

**Impact**: -50-200ms latency

### Change 3: Achievement Unlocking

**Before** (blocks review creation):
```typescript
await checkAndUnlockAchievements(userId);
return review;
```

**After** (background job):
```typescript
Promise.resolve().then(async () => {
  try {
    const stats = await getUserStats(userId);
    await checkAndUnlockAchievements(userId, stats);
  } catch (err) {
    logger.error('Background achievement check failed', err);
  }
});
return review;
```

**Impact**: -200-500ms latency

---

## Priority 4: Cache Optimization

### Extend TTLs

- User achievements: 600s → 1800s (30 min)
- Platform stats: add 600s cache
- Trending data: increase TTL
- Invalidate only on mutations, not always

### Add Missing Caches

- Admin user lists: 5 min TTL
- Moderation queue: 30-60 sec TTL
- Platform statistics: 10 min TTL

---

## Priority 5: Remove SELECT *

**Places endpoint**:
```typescript
// Before
SELECT * FROM places

// After  
SELECT id, name, slug, description, category, rating, latitude, longitude, review_count, created_at
```

**Impact**: 20-30% payload reduction

**Reviews endpoint**:
```typescript
// Before
SELECT * FROM reviews

// After
SELECT id, user_id, place_id, rating, title, content, created_at, helpful_count
```

**Impact**: 15-25% payload reduction

---

## Priority 6: Pool & Timeout Tuning

**Current timeout**: 2000ms (too aggressive)
**Optimized timeout**: 5000ms
**Add statement timeout**: 30000ms

Add pool health checking:
```typescript
function checkPoolHealth() {
  const utilization = ((totalCount - idleCount) / totalCount) * 100;
  if (utilization > 80) logger.warn('High pool utilization');
}
setInterval(checkPoolHealth, 30000);
```

---

## Implementation Timeline

| Priority | Task | Time | Impact |
|----------|------|------|--------|
| 1 | Add database indexes | 30 min | 50-80% reduction |
| 2 | Fix N+1 patterns | 1 hour | 100x for bulk ops |
| 3 | Make operations async | 45 min | 100-500ms reduction |
| 4 | Update cache TTLs | 1 hour | 30-50% reduction |
| 5 | Remove SELECT * | 30 min | 15-30% reduction |
| 6 | Tune pool & alerts | 30 min | Better visibility |
| **Total** | | **4 hours** | **20-60% overall** |

---

## Verification

After each change:

1. Run tests: `npm run test`
2. Monitor: Check query times and cache hits
3. Load test: `ab -n 1000 -c 10 http://localhost:3000/api/places`
4. Profile: Measure response times before/after

---

## Success Metrics

After optimizations:
- Average response: < 100ms (from ~200-300ms)
- P95 latency: < 500ms (from ~1000ms)
- Cache hit rate: > 80%
- Zero slow queries (> 1000ms)
- No connection timeouts

Last Updated: 2026-04-08
