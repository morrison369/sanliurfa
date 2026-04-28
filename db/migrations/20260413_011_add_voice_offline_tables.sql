-- Voice Search and Offline Support Tables

-- Voice search history table
CREATE TABLE IF NOT EXISTS voice_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    parsed_intent VARCHAR(50),
    parsed_entities JSONB,
    confidence DECIMAL(3, 2),
    success BOOLEAN DEFAULT true,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_search_user ON voice_search_history(user_id);
CREATE INDEX idx_voice_search_created ON voice_search_history(created_at);

-- Offline sync queue table
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('create', 'update', 'delete')),
    endpoint VARCHAR(500) NOT NULL,
    data JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_user ON offline_sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON offline_sync_queue(status);
CREATE INDEX idx_sync_queue_pending ON offline_sync_queue(user_id, status) WHERE status = 'pending';

-- Offline cached pages table
CREATE TABLE IF NOT EXISTS offline_cached_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL UNIQUE,
    html_content TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    thumbnail_url VARCHAR(500),
    expires_at TIMESTAMPTZ,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cached_pages_expires ON offline_cached_pages(expires_at);
CREATE INDEX idx_cached_pages_url ON offline_cached_pages(url);

-- Function to clean expired cached pages
CREATE OR REPLACE FUNCTION clean_expired_cached_pages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM offline_cached_pages 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Accessibility audit log table
CREATE TABLE IF NOT EXISTS accessibility_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL,
    issues JSONB NOT NULL,
    score INTEGER,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_a11y_audit_url ON accessibility_audit_log(url);
CREATE INDEX idx_a11y_audit_created ON accessibility_audit_log(created_at);

-- Performance metrics table (for RUM - Real User Monitoring)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    url VARCHAR(500) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10, 3) NOT NULL,
    rating VARCHAR(50),
    connection_type VARCHAR(50),
    device_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perf_metrics_name ON performance_metrics(metric_name);
CREATE INDEX idx_perf_metrics_url ON performance_metrics(url);
CREATE INDEX idx_perf_metrics_created ON performance_metrics(created_at);
CREATE INDEX idx_perf_metrics_user ON performance_metrics(user_id);

-- Materialized view for performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_summary AS
SELECT 
    url,
    metric_name,
    COUNT(*) as sample_count,
    AVG(metric_value) as avg_value,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM performance_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY url, metric_name;

CREATE UNIQUE INDEX idx_perf_summary_unique ON performance_summary(url, metric_name);
