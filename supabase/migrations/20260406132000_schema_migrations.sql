-- Schema migrations tracking table

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schema_migrations_executed_at ON schema_migrations(executed_at);

-- Only admins can access
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view migrations"
  ON schema_migrations FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM users WHERE is_admin = true
  ));
