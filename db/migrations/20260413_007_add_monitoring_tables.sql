-- Monitoring and Error Tracking Tables
-- Created: 2026-04-13

-- Backup logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  path TEXT,
  size BIGINT,
  error TEXT,
  tables TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_backup_logs_type ON backup_logs(type);
CREATE INDEX idx_backup_logs_status ON backup_logs(status);
CREATE INDEX idx_backup_logs_created ON backup_logs(created_at);

-- Backup jobs
CREATE TABLE IF NOT EXISTS backup_jobs (
  id VARCHAR(100) PRIMARY KEY,
  config JSONB NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE,
  last_status VARCHAR(20),
  next_run TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_backup_jobs_next_run ON backup_jobs(next_run);
CREATE INDEX idx_backup_jobs_active ON backup_jobs(is_active);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  value NUMERIC(15, 4) NOT NULL,
  unit VARCHAR(20) DEFAULT 'ms',
  labels JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Alert rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  metric VARCHAR(100) NOT NULL,
  condition VARCHAR(10) NOT NULL CHECK (condition IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  threshold NUMERIC(15, 4) NOT NULL,
  duration INTEGER DEFAULT 0,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical')),
  notification_channels TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active alerts
CREATE TABLE IF NOT EXISTS active_alerts (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(100) NOT NULL,
  metric_value NUMERIC(15, 4),
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  severity VARCHAR(20) NOT NULL
);

CREATE INDEX idx_active_alerts_rule ON active_alerts(rule_id);
CREATE INDEX idx_active_alerts_triggered ON active_alerts(triggered_at);

-- Alert notifications
CREATE TABLE IF NOT EXISTS alert_notifications (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs
CREATE TABLE IF NOT EXISTS error_logs (
  id VARCHAR(100) PRIMARY KEY,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'error' CHECK (type IN ('error', 'warning', 'info')),
  stack TEXT,
  context JSONB,
  user_id VARCHAR(50),
  tags JSONB,
  url TEXT,
  fingerprint VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_created ON error_logs(created_at);

-- Error fingerprints
CREATE TABLE IF NOT EXISTS error_fingerprints (
  fingerprint VARCHAR(64) PRIMARY KEY,
  count INTEGER DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved', 'ignored')),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_error_fingerprints_status ON error_fingerprints(status);
CREATE INDEX idx_error_fingerprints_last_seen ON error_fingerprints(last_seen);
