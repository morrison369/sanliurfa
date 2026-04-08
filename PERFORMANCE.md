# Performance Optimization Guide

Şanlıurfa.com platformunun performans optimizasyonu, izlenmesi ve iyileştirilmesi için kapsamlı kılavuz.

## Core Web Vitals Hedefleri

- **LCP (Largest Contentful Paint)**: < 2.5 saniye
- **FID (First Input Delay)**: < 100 milisaniye
- **CLS (Cumulative Layout Shift)**: < 0.1

## Mevcut Optimizasyonlar

### 1. Redis Caching Strategy
- **Namespace Isolation**: `sanliurfa:*` prefix ile namespace izolasyonu
- **TTL Configuration**:
  - Places list: 5 minutes
  - Place detail: 10 minutes
  - User favorites: 5 minutes
  - Review cache: 10 minutes
  - Unread messages: 30 seconds
- **Invalidation Pattern**: Mutations otomatik olarak ilgili cache keys'i temizler

### 2. Database Connection Pooling
- **Pool Configuration**:
  - Minimum: 2 connections
  - Maximum: 20 connections
  - Idle timeout: 30 seconds
- **Monitoring**: `/api/performance` endpoint'inde pool utilization görülür
- **Alert Threshold**: Pool > 80% utilized ise optimization gerekir

### 3. Query Optimization
- **Parameterized Queries**: SQL injection prevention ve query plan caching
- **Slow Query Monitoring**:
  - Threshold: 100ms (debug), 1000ms (warning)
  - Tracked in `/api/performance` dashboard
- **Index Strategy**:
  - Composite indexes on frequently queried columns
  - Separate indexes for sorting operations

### 4. Asset Optimization
- **Lazy Loading**: Images ve components için client-side lazy loading
- **Code Splitting**: Route-based code splitting (Astro default)
- **Service Worker Caching**:
  - Static assets: Cache first strategy
  - API requests: Network first with cache fallback
  - HTML pages: Auto-cached on successful fetch

### 5. Frontend Performance
- **Component Hydration**: `client:load`, `client:idle`, `client:visible` kullanımı
- **CSS Optimization**:
  - Tailwind CSS purging
  - CSS compression via Build pipeline
- **JavaScript**:
  - Minification and compression
  - Tree-shaking for unused code removal

## Monitoring & Analysis

### Real-time Dashboards

1. **Health Check** (`/api/health`)
   - Database status
   - Redis status
   - Response times

2. **Performance Dashboard** (`/api/performance`)
   - Slow queries (top 10)
   - Slow operations
   - Database pool utilization
   - Connection status

3. **Metrics Dashboard** (`/api/metrics`)
   - Request aggregation
   - Cache hit rate
   - Error rates
   - Slowest endpoints

4. **Client Performance** (`/api/metrics/performance`)
   - Core Web Vitals per page
   - Resource timing
   - Connection type analysis

### Performance Monitoring Library

Client-side performance collection:
```typescript
import { collectPerformanceMetrics, sendPerformanceMetrics } from './lib/performance-monitor';

const metrics = collectPerformanceMetrics();
await sendPerformanceMetrics(metrics);
```

Metrics automatically sent on page load to `/api/metrics/performance`.

## Optimization Recommendations by Issue

### High LCP (> 2.5s)
- **Images**: Implement lazy loading for below-fold images
- **Fonts**: Use `font-display: swap` for web fonts
- **Server Response**: Increase server resources or optimize queries
- **Third-party Scripts**: Defer or lazy-load non-critical scripts

### High FID (> 100ms)
- **JavaScript**: Reduce bundle size, split long tasks
- **Event Handlers**: Use debouncing/throttling for frequent events
- **Main Thread Blocking**: Profile with DevTools to identify bottlenecks

### High CLS (> 0.1)
- **Media**: Specify explicit width/height or aspect-ratio
- **Dynamic Content**: Reserve space for ads, embeds, forms
- **Fonts**: Use `size-adjust` to minimize layout shifts on font swap

### Slow Resources (> 1000ms)
- Identified in `/api/performance` dashboard
- Check network tab for large transfers
- Consider CDN for large assets
- Compress images with appropriate formats (WebP, etc.)

## Database Tuning

### Connection Management
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check active queries
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE state != 'idle';

-- Cancel slow query
SELECT pg_cancel_backend(pid);
```

### Index Optimization
```sql
-- Check unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index size
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Query Analysis
```sql
-- EXPLAIN ANALYZE for slow queries
EXPLAIN ANALYZE SELECT * FROM places WHERE ...;

-- Check table statistics
SELECT schemaname, tablename, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

## Caching Best Practices

1. **Cache-Busting**: Use versioning or content-based hashing
2. **Stale Content**: Balance TTL with freshness requirements
3. **Cache Coordination**: Invalidate dependent caches together
4. **Monitoring**: Track cache hit/miss rates in `/api/metrics`

## Performance Testing

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 100 https://sanliurfa.com/

# Using autocannon
npx autocannon -c 100 -d 60 https://sanliurfa.com/
```

### Lighthouse CI
```bash
npm run build
npm run preview
npx lighthouse-ci run
```

## Deployment Performance Checklist

- [ ] Database indexes created for high-cardinality columns
- [ ] Redis namespaces configured with appropriate TTLs
- [ ] Service worker caching strategy validated
- [ ] Images optimized and lazy-loaded
- [ ] CSS/JS minified and compressed
- [ ] Core Web Vitals benchmark established
- [ ] Monitoring dashboards configured
- [ ] Error logging and alerting active
- [ ] Database backups scheduled
- [ ] SSL/TLS certificate valid and modern

## Key Metrics to Monitor

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| LCP | < 1.5s | 1.5-2.5s | > 2.5s |
| FID | < 50ms | 50-100ms | > 100ms |
| CLS | < 0.05 | 0.05-0.1 | > 0.1 |
| TTFB | < 500ms | 500-1000ms | > 1000ms |
| Cache Hit Rate | > 80% | 50-80% | < 50% |
| Pool Utilization | < 60% | 60-80% | > 80% |
| Error Rate | < 0.1% | 0.1-1% | > 1% |

## Continuous Optimization

1. **Weekly**: Review `/api/metrics` and `/api/performance`
2. **Monthly**: Run Lighthouse CI and analyze slow queries
3. **Quarterly**: Review Redis cache hit rates and TTLs
4. **Bi-annually**: Audit database indexes and connection patterns

## Resources

- [Web.dev Performance Guide](https://web.dev/performance/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Optimization](https://redis.io/topics/optimization)
- [Astro Performance](https://docs.astro.build/en/guides/performance/)
