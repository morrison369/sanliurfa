-- Enhanced Analytics Tables
-- Created: 2026-04-12

-- Page views with enhanced tracking
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  user_id VARCHAR(50),
  session_id VARCHAR(100),
  referrer VARCHAR(500),
  user_agent TEXT,
  ip_address INET,
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser VARCHAR(50),
  os VARCHAR(50),
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_page_views_path ON page_views(path);
CREATE INDEX idx_page_views_user ON page_views(user_id);
CREATE INDEX idx_page_views_session ON page_views(session_id);
CREATE INDEX idx_page_views_created ON page_views(created_at);
CREATE INDEX idx_page_views_device ON page_views(device_type);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_active ON user_sessions(last_active);

-- Search logs
CREATE TABLE IF NOT EXISTS search_logs (
  id SERIAL PRIMARY KEY,
  query VARCHAR(500) NOT NULL,
  user_id VARCHAR(50),
  results_count INTEGER,
  clicked_result VARCHAR(200),
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_logs_query ON search_logs(query);
CREATE INDEX idx_search_logs_user ON search_logs(user_id);
CREATE INDEX idx_search_logs_created ON search_logs(created_at);

-- Social shares
CREATE TABLE IF NOT EXISTS social_shares (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL,
  content_id VARCHAR(50) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  user_id VARCHAR(50),
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_social_shares_content ON social_shares(content_type, content_id);
CREATE INDEX idx_social_shares_platform ON social_shares(platform);
CREATE INDEX idx_social_shares_user ON social_shares(user_id);

-- API request logs
CREATE TABLE IF NOT EXISTS api_request_logs (
  id SERIAL PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  user_id VARCHAR(50),
  tenant_id INTEGER,
  status INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_logs_path ON api_request_logs(path);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id);
CREATE INDEX idx_api_logs_tenant ON api_request_logs(tenant_id);
CREATE INDEX idx_api_logs_created ON api_request_logs(created_at);
CREATE INDEX idx_api_logs_status ON api_request_logs(status);

-- Analytics aggregates (for faster dashboard queries)
CREATE TABLE IF NOT EXISTS analytics_aggregates (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('hour', 'day', 'week', 'month')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  value NUMERIC NOT NULL,
  dimensions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metric_type, metric_name, period, period_start, dimensions)
);

CREATE INDEX idx_analytics_aggregates_metric ON analytics_aggregates(metric_type, metric_name);
CREATE INDEX idx_analytics_aggregates_period ON analytics_aggregates(period, period_start);

-- Conversion events
CREATE TABLE IF NOT EXISTS conversion_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(50),
  value NUMERIC,
  currency VARCHAR(3),
  source VARCHAR(100),
  campaign VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversion_events_name ON conversion_events(event_name);
CREATE INDEX idx_conversion_events_user ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_created ON conversion_events(created_at);
