-- Performance Optimization Indexes
-- Phase 1.2: Database Index Optimization

-- Drop existing indexes if they exist (for idempotency)
DO $$
BEGIN
    -- Analytics indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analytics_events_user_time') THEN
        DROP INDEX idx_analytics_events_user_time;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analytics_events_type_time') THEN
        DROP INDEX idx_analytics_events_type_time;
    END IF;
    
    -- Places indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_places_location') THEN
        DROP INDEX idx_places_location;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_places_category_rating') THEN
        DROP INDEX idx_places_category_rating;
    END IF;
    
    -- Reviews indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_place_user') THEN
        DROP INDEX idx_reviews_place_user;
    END IF;
END $$;

-- ============================================
-- ANALYTICS PERFORMANCE INDEXES
-- ============================================

-- Composite index for user analytics queries
CREATE INDEX CONCURRENTLY idx_analytics_events_user_time 
ON analytics_events (user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Index for event type aggregations
CREATE INDEX CONCURRENTLY idx_analytics_events_type_time 
ON analytics_events (event_type, created_at DESC);

-- Partial index for recent events only (hot data)
CREATE INDEX CONCURRENTLY idx_analytics_events_recent 
ON analytics_events (created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================
-- PLACES PERFORMANCE INDEXES
-- ============================================

-- GiST index for geospatial queries (if PostGIS available, otherwise B-tree)
CREATE INDEX CONCURRENTLY idx_places_location 
ON places (latitude, longitude);

-- Composite index for category + rating filtering
CREATE INDEX CONCURRENTLY idx_places_category_rating 
ON places (category, rating DESC) 
WHERE status = 'active';

-- Full-text search index
CREATE INDEX CONCURRENTLY idx_places_search 
ON places USING gin(to_tsvector('turkish', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- Partial index for featured/active places
CREATE INDEX CONCURRENTLY idx_places_featured 
ON places (rating DESC, review_count DESC) 
WHERE status = 'active' AND is_featured = true;

-- ============================================
-- REVIEWS PERFORMANCE INDEXES
-- ============================================

-- Composite index for place reviews with user info
CREATE INDEX CONCURRENTLY idx_reviews_place_user 
ON reviews (place_id, created_at DESC) 
INCLUDE (user_id, rating, content);

-- Index for user's review history
CREATE INDEX CONCURRENTLY idx_reviews_user_time 
ON reviews (user_id, created_at DESC);

-- Partial index for recent reviews (for moderation)
CREATE INDEX CONCURRENTLY idx_reviews_recent 
ON reviews (created_at DESC) 
WHERE status = 'pending';

-- ============================================
-- USERS PERFORMANCE INDEXES
-- ============================================

-- Index for email lookups (login)
CREATE INDEX CONCURRENTLY idx_users_email_verified 
ON users (email) 
WHERE email_verified = true;

-- Index for phone lookups
CREATE INDEX CONCURRENTLY idx_users_phone_verified 
ON users (phone) 
WHERE phone_verified = true;

-- ============================================
-- CAMPAIGNS PERFORMANCE INDEXES
-- ============================================

-- Composite index for scheduled campaigns
CREATE INDEX CONCURRENTLY idx_email_campaigns_scheduled 
ON email_campaigns (scheduled_at) 
WHERE status = 'scheduled';

-- Index for campaign analytics
CREATE INDEX CONCURRENTLY idx_campaign_recipients_status 
ON email_campaign_recipients (campaign_id, status) 
WHERE status IN ('sent', 'opened', 'clicked');

-- ============================================
-- PARTITIONING SETUP (for large tables)
-- ============================================

-- Partition analytics_events by month (if table is large)
-- Note: This requires table recreation, should be done during maintenance window

-- Create partition function
CREATE OR REPLACE FUNCTION create_monthly_partition(
    p_table_name TEXT,
    p_year INT,
    p_month INT
) RETURNS VOID AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_date := make_date(p_year, p_month, 1);
    partition_name := p_table_name || '_' || p_year || '_' || LPAD(p_month::TEXT, 2, '0');
    start_date := partition_date;
    end_date := partition_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, p_table_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MATERIALIZED VIEWS (for reporting)
-- ============================================

-- Daily stats materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_events,
    COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN user_id END) as page_view_users,
    COUNT(DISTINCT CASE WHEN event_type = 'place_view' THEN user_id END) as place_view_users
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create index on materialized view
CREATE INDEX idx_mv_daily_stats_date ON mv_daily_stats (date);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- QUERY OPTIMIZATION SETTINGS
-- ============================================

-- Enable parallel query execution
SET max_parallel_workers_per_gather = 4;

-- Update table statistics
ANALYZE users;
ANALYZE places;
ANALYZE reviews;
ANALYZE analytics_events;
ANALYZE email_campaigns;

-- Log completion
SELECT 'Performance indexes created successfully' as status;
