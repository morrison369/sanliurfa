-- Content Versioning and API Gateway Tables

-- Content versions table
CREATE TABLE IF NOT EXISTS content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL,
    change_summary TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, version_number)
);

CREATE INDEX idx_content_versions_entity ON content_versions(entity_type, entity_id);
CREATE INDEX idx_content_versions_current ON content_versions(entity_type, entity_id, is_current) WHERE is_current = true;
CREATE INDEX idx_content_versions_changed_by ON content_versions(changed_by);
CREATE INDEX idx_content_versions_created ON content_versions(created_at);

-- Search history table (if not exists)
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query VARCHAR(500) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    results_count INTEGER,
    clicked_result VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_history_query ON search_history(query);
CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_created ON search_history(created_at);

-- API request logs table
CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_params JSONB,
    headers JSONB,
    ip INET,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    api_version VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_logs_path ON api_request_logs(path);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id);
CREATE INDEX idx_api_logs_created ON api_request_logs(created_at);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code);

-- API rate limit tracking
CREATE TABLE IF NOT EXISTS api_rate_limit_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_rate_limit_identifier ON api_rate_limit_tracking(identifier, endpoint);
CREATE INDEX idx_rate_limit_window ON api_rate_limit_tracking(window_start);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    permissions TEXT[] DEFAULT '{}',
    rate_limit_tier VARCHAR(50) DEFAULT 'default',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL,
    event VARCHAR(255) NOT NULL,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_delivery_logs(webhook_id);
CREATE INDEX idx_webhook_logs_event ON webhook_delivery_logs(event);
CREATE INDEX idx_webhook_logs_created ON webhook_delivery_logs(created_at);

-- Function to clean old API logs
CREATE OR REPLACE FUNCTION clean_old_api_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_request_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get version diff
CREATE OR REPLACE FUNCTION get_version_diff(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_version_from INTEGER,
    p_version_to INTEGER
)
RETURNS TABLE (
    field_name TEXT,
    old_value JSONB,
    new_value JSONB,
    change_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH from_version AS (
        SELECT data FROM content_versions
        WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND version_number = p_version_from
    ),
    to_version AS (
        SELECT data FROM content_versions
        WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND version_number = p_version_to
    )
    SELECT 
        key as field_name,
        fv.data->key as old_value,
        tv.data->key as new_value,
        CASE 
            WHEN fv.data->key IS NULL THEN 'added'
            WHEN tv.data->key IS NULL THEN 'removed'
            WHEN fv.data->key != tv.data->key THEN 'modified'
            ELSE 'unchanged'
        END as change_type
    FROM jsonb_object_keys((SELECT data FROM to_version)) AS key
    LEFT JOIN from_version fv ON true
    LEFT JOIN to_version tv ON true
    WHERE (fv.data->key IS NULL OR tv.data->key IS NULL OR fv.data->key != tv.data->key);
END;
$$ LANGUAGE plpgsql;
