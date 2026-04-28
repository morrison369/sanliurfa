-- Final Feature Migrations
CREATE TABLE IF NOT EXISTS csp_violations (
  id TEXT PRIMARY KEY,
  document_uri TEXT,
  blocked_uri TEXT,
  violated_directive TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  type TEXT,
  source TEXT,
  contact JSONB,
  details JSONB,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programmatic_pages (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  template TEXT,
  variables JSONB,
  meta_title TEXT,
  meta_description TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY,
  trace_id TEXT,
  span_id TEXT,
  parent_span_id TEXT,
  operation TEXT,
  duration_ms INTEGER,
  tags JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apm_metrics (
  id TEXT PRIMARY KEY,
  endpoint TEXT,
  duration_ms INTEGER,
  status_code INTEGER,
  is_error BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_usage (
  id TEXT PRIMARY KEY,
  resource TEXT,
  requests INTEGER,
  bandwidth_mb NUMERIC,
  storage_gb NUMERIC,
  compute_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_export_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT,
  format TEXT,
  data_types JSONB,
  download_url TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT,
  granted BOOLEAN,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- Indexes
CREATE INDEX idx_leads_business ON leads (business_id);
CREATE INDEX idx_traces_trace ON traces (trace_id);
CREATE INDEX idx_apm_metrics_endpoint ON apm_metrics (endpoint, created_at);
