# Database Optimization Guide

## Performance Optimization for PostgreSQL

### Table of Contents
- [Index Recommendations](#index-recommendations)
- [Query Optimization](#query-optimization)
- [Configuration Tuning](#configuration-tuning)
- [Maintenance](#maintenance)
- [Monitoring](#monitoring)

---

## Index Recommendations

### Critical Indexes

#### Users Table
```sql
-- Primary lookups
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_username ON users(username) WHERE username IS NOT NULL;

-- For authentication queries
CREATE INDEX CONCURRENTLY idx_users_status ON users(status) WHERE status = 'active';

-- For admin queries
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at DESC);
```

#### Places Table
```sql
-- Geographic queries
CREATE INDEX CONCURRENTLY idx_places_location ON places USING GIST (
    ll_to_earth(latitude, longitude)
);

-- Search queries
CREATE INDEX CONCURRENTLY idx_places_name_trgm ON places USING gin (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_places_slug ON places(slug);

-- Category filtering
CREATE INDEX CONCURRENTLY idx_places_category_status ON places(category_id, status) 
    WHERE status = 'active';

-- Sorting by rating/popularity
CREATE INDEX CONCURRENTLY idx_places_rating ON places(rating DESC NULLS LAST);
CREATE INDEX CONCURRENTLY idx_places_popularity ON places(view_count DESC);
```

#### Reviews Table
```sql
-- Foreign key lookups
CREATE INDEX CONCURRENTLY idx_reviews_place_id ON reviews(place_id);
CREATE INDEX CONCURRENTLY idx_reviews_user_id ON reviews(user_id);

-- Composite for place reviews with sorting
CREATE INDEX CONCURRENTLY idx_reviews_place_created ON reviews(place_id, created_at DESC);

-- Status filtering
CREATE INDEX CONCURRENTLY idx_reviews_status ON reviews(status) WHERE status = 'approved';
```

#### Blog Posts Table
```sql
-- Slug lookups
CREATE INDEX CONCURRENTLY idx_blog_posts_slug ON blog_posts(slug) WHERE is_published = true;

-- Date-based queries
CREATE INDEX CONCURRENTLY idx_blog_posts_published ON blog_posts(published_at DESC) 
    WHERE is_published = true;

-- Category filtering
CREATE INDEX CONCURRENTLY idx_blog_posts_category ON blog_posts(category_id, published_at DESC) 
    WHERE is_published = true;

-- Full-text search (if using PostgreSQL FTS)
CREATE INDEX CONCURRENTLY idx_blog_posts_fts ON blog_posts 
    USING gin(to_tsvector('turkish', coalesce(title, '') || ' ' || coalesce(content, '')));
```

### Partial Indexes

For better performance on filtered queries:

```sql
-- Only index active items
CREATE INDEX CONCURRENTLY idx_places_active ON places(created_at DESC) 
    WHERE status = 'active' AND deleted_at IS NULL;

-- Index featured items separately
CREATE INDEX CONCURRENTLY idx_places_featured ON places(category_id) 
    WHERE is_featured = true AND status = 'active';
```

---

## Query Optimization

### N+1 Query Prevention

**Before (N+1 Problem):**
```typescript
// Bad: Queries database for each place
const places = await getPlaces();
for (const place of places) {
    place.reviews = await getReviews(place.id); // N queries!
}
```

**After (Single Query with JOIN):**
```typescript
// Good: Single query with JOIN
const query = `
    SELECT p.*, json_agg(r.*) as reviews
    FROM places p
    LEFT JOIN reviews r ON r.place_id = p.id
    WHERE p.status = 'active'
    GROUP BY p.id
`;
```

### Pagination Optimization

**Offset-based (slow on large tables):**
```sql
-- Slow for large offsets
SELECT * FROM places ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
```

**Cursor-based (fast):**
```sql
-- Fast keyset pagination
SELECT * FROM places 
WHERE created_at < $cursor_date 
ORDER BY created_at DESC 
LIMIT 20;
```

### Query Plan Analysis

```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM places 
WHERE category_id = 1 
ORDER BY rating DESC 
LIMIT 20;
```

---

## Configuration Tuning

### PostgreSQL Configuration (postgresql.conf)

For a server with 4GB RAM:

```ini
# Memory Settings
shared_buffers = 1GB                    # 25% of RAM
effective_cache_size = 3GB              # 75% of RAM
work_mem = 16MB                         # Per connection
maintenance_work_mem = 256MB            # For maintenance operations

# Connection Settings (for CWP shared hosting, keep low)
max_connections = 20                    # Reduced for shared hosting
shared_preload_libraries = 'pg_stat_statements'

# Query Planner
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD

# Write Performance
wal_buffers = 16MB
max_wal_size = 2GB
min_wal_size = 512MB

# Autovacuum
autovacuum_max_workers = 3
autovacuum_naptime = 10s
autovacuum_vacuum_scale_factor = 0.05   # More frequent vacuums
```

### Connection Pooling (PgBouncer)

```ini
[databases]
sanliurfa = host=localhost port=5432 dbname=sanliurfa

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

# Timeouts
server_idle_timeout = 600
server_lifetime = 3600
client_idle_timeout = 0
client_login_timeout = 60
```

---

## Maintenance

### Automated Maintenance Script

```bash
#!/bin/bash
# Run daily via cron

# Vacuum and analyze
psql -U postgres -d sanliurfa -c "VACUUM ANALYZE;"

# Reindex if needed
psql -U postgres -d sanliurfa -c "REINDEX INDEX CONCURRENTLY idx_places_name_trgm;"

# Update statistics
psql -U postgres -d sanliurfa -c "ANALYZE;"

# Log table sizes
psql -U postgres -d sanliurfa -c "
    SELECT schemaname, tablename, 
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;
" >> /var/log/db-maintenance.log
```

### Partitioning for Large Tables

For tables with millions of rows (e.g., audit_logs, events):

```sql
-- Range partition by date
CREATE TABLE audit_logs (
    id BIGSERIAL,
    user_id INTEGER,
    action VARCHAR(50),
    created_at TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Auto-create partitions with trigger
CREATE OR REPLACE FUNCTION create_audit_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date TEXT;
    partition_name TEXT;
BEGIN
    partition_date := to_char(NEW.created_at, 'YYYY_MM');
    partition_name := 'audit_logs_' || partition_date;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = partition_name) THEN
        EXECUTE format('CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            date_trunc('month', NEW.created_at),
            date_trunc('month', NEW.created_at + interval '1 month')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Monitoring

### Key Metrics to Monitor

```sql
-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 minute';

-- Table bloat
SELECT schemaname, tablename, 
       ROUND((n_dead_tup::numeric / NULLIF(n_live_tup, 0)) * 100, 2) AS dead_tuple_ratio
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY dead_tuple_ratio DESC
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexrelname, 
       idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;

-- Cache hit ratio
SELECT 
    ROUND(sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) * 100, 2) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = 'sanliurfa';

-- Lock waits
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Slow Query Log

```ini
# In postgresql.conf
log_min_duration_statement = 1000    # Log queries > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
```

---

## Migration Checklist

Before running migrations in production:

- [ ] Test migration on staging first
- [ ] Create database backup
- [ ] Run migrations during low-traffic period
- [ ] Use `CONCURRENTLY` for index creation
- [ ] Monitor query performance after migration
- [ ] Have rollback plan ready

### Safe Migration Template

```sql
-- Start transaction
BEGIN;

-- Set statement timeout (prevent runaway queries)
SET LOCAL statement_timeout = '5min';

-- Create index concurrently (outside transaction if possible)
-- Note: CREATE INDEX CONCURRENTLY cannot run in a transaction
COMMIT;

-- Create index separately
CREATE INDEX CONCURRENTLY idx_name ON table(column);

-- Verify index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'table_name';
```

---

## Query Examples

### Efficient Search

```sql
-- Using trigram similarity for fuzzy search
SELECT *, similarity(name, 'Balıklıgöl') as sml
FROM places
WHERE name % 'Balıklıgöl'
ORDER BY sml DESC, rating DESC
LIMIT 20;
```

### Geospatial Query

```sql
-- Find places within 5km
SELECT *, earth_distance(
    ll_to_earth(latitude, longitude),
    ll_to_earth(37.1591, 38.7969)
) as distance
FROM places
WHERE earth_box(ll_to_earth(37.1591, 38.7969), 5000) @> ll_to_earth(latitude, longitude)
AND earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(37.1591, 38.7969)) < 5000
ORDER BY distance
LIMIT 20;
```

### Materialized View for Reports

```sql
-- Create materialized view for dashboard
CREATE MATERIALIZED VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users,
    COUNT(DISTINCT user_id) as active_users
FROM users
GROUP BY DATE(created_at);

-- Create index on materialized view
CREATE INDEX idx_daily_stats_date ON daily_stats(date);

-- Refresh schedule (run daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
```

---

## Tools

- **pgAdmin**: GUI for database management
- **pg_stat_statements**: Query performance statistics
- **pgBadger**: Log analyzer
- **pgHero**: Performance dashboard
- **EXPLAIN ANALYZE**: Query plan analysis
