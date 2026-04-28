-- A/B Testing Framework Tables
-- Created: 2026-04-12

CREATE TABLE IF NOT EXISTS experiments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variants JSONB NOT NULL DEFAULT '[]',
  targeting JSONB,
  goals TEXT[] DEFAULT '{}',
  traffic_allocation INTEGER NOT NULL DEFAULT 100 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_experiments_key ON experiments(key);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_dates ON experiments(start_date, end_date);

-- Experiment assignments (which user got which variant)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  variant_id VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(experiment_id, user_id)
);

CREATE INDEX idx_exp_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX idx_exp_assignments_user ON experiment_assignments(user_id);

-- Experiment events (impressions and conversions)
CREATE TABLE IF NOT EXISTS experiment_events (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50),
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression', 'conversion')),
  goal VARCHAR(100),
  value NUMERIC,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exp_events_experiment ON experiment_events(experiment_id);
CREATE INDEX idx_exp_events_variant ON experiment_events(variant_id);
CREATE INDEX idx_exp_events_type ON experiment_events(event_type);
CREATE INDEX idx_exp_events_occurred ON experiment_events(occurred_at);

-- Feature flags (simple experiments)
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  target_percentage INTEGER NOT NULL DEFAULT 100 CHECK (target_percentage >= 0 AND target_percentage <= 100),
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
