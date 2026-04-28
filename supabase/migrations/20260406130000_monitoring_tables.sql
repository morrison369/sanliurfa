-- Monitoring tables for error tracking and performance metrics

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  level TEXT DEFAULT 'error',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('ms', 'bytes', 'count')),
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Only admins can view error logs"
  ON error_logs FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE is_admin = true
  ));

CREATE POLICY "Only admins can view performance metrics"
  ON performance_metrics FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE is_admin = true
  ));

-- Function to clean old logs
CREATE OR REPLACE FUNCTION clean_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete errors older than 30 days
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete metrics older than 7 days
  DELETE FROM performance_metrics WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
