-- Activity and Audit Tables
-- Created: 2026-04-13

-- User activities
CREATE TABLE IF NOT EXISTS user_activities (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(20),
  entity_id VARCHAR(50),
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activities_user ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(type);
CREATE INDEX idx_user_activities_entity ON user_activities(entity_type, entity_id);
CREATE INDEX idx_user_activities_created ON user_activities(created_at);

-- Activity summaries (for faster queries)
CREATE TABLE IF NOT EXISTS activity_summaries (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, date, activity_type)
);

CREATE INDEX idx_activity_summaries_user ON activity_summaries(user_id);
CREATE INDEX idx_activity_summaries_date ON activity_summaries(date);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  user_name VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Bulk operations
CREATE TABLE IF NOT EXISTS bulk_operations (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_ids TEXT[] NOT NULL,
  data JSONB,
  executed_by VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX idx_bulk_operations_executed_by ON bulk_operations(executed_by);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(50),
  metadata JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
