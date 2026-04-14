-- AI/ML Recommendation and NLP Tables

-- Recommendation feedback table
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('place', 'blog', 'event', 'collection')),
    recommendation_score DECIMAL(10, 4),
    feedback VARCHAR(50) NOT NULL CHECK (feedback IN ('clicked', 'dismissed', 'visited', 'saved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id, item_type)
);

CREATE INDEX idx_rec_feedback_user ON recommendation_feedback(user_id);
CREATE INDEX idx_rec_feedback_item ON recommendation_feedback(item_id, item_type);

-- Recommendation weights table
CREATE TABLE IF NOT EXISTS recommendation_weights (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    weight_delta DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, item_type, reason)
);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query VARCHAR(500) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    results_count INTEGER DEFAULT 0,
    clicked_results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_history_query ON search_history(query);
CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_created ON search_history(created_at);

-- Popular times cache table
CREATE TABLE IF NOT EXISTS place_popular_times (
    place_id UUID PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
    predictions JSONB NOT NULL, -- Array of {day, hour, busy}
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trending searches materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_searches AS
SELECT 
    query,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as last_searched
FROM search_history
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY query
HAVING COUNT(*) >= 3
ORDER BY search_count DESC;

CREATE UNIQUE INDEX idx_trending_searches_query ON trending_searches(query);

-- Function to refresh trending searches
CREATE OR REPLACE FUNCTION refresh_trending_searches()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_searches;
END;
$$ LANGUAGE plpgsql;
