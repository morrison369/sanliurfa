-- Job execution logs
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_job_logs_name ON job_logs(name);
CREATE INDEX idx_job_logs_created_at ON job_logs(created_at);
CREATE INDEX idx_job_logs_success ON job_logs(success);

-- Enable RLS
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view job logs
CREATE POLICY "Only admins can view job logs"
  ON job_logs FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE is_admin = true
  ));
