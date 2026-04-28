import type { Migration } from '../lib/migrations/migration-system';

const migration: Migration = {
  version: '133',
  name: 'logging_system',
  description: 'Add system logs table for structured logging',
  
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
        message TEXT NOT NULL,
        context JSONB,
        metadata JSONB,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX idx_system_logs_level ON system_logs(level);
      CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
      CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
    `);

    // Log aggregation view
    await client.query(`
      CREATE OR REPLACE VIEW log_stats AS
      SELECT 
        level,
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count
      FROM system_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY level, DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC, level;
    `);

    // Error summary view
    await client.query(`
      CREATE OR REPLACE VIEW error_summary AS
      SELECT 
        message,
        COUNT(*) as occurrence_count,
        MAX(created_at) as last_occurrence,
        MIN(created_at) as first_occurrence
      FROM system_logs
      WHERE level IN ('error', 'fatal')
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY message
      ORDER BY occurrence_count DESC;
    `);
  },

  down: async (client) => {
    await client.query(`DROP VIEW IF EXISTS error_summary;`);
    await client.query(`DROP VIEW IF EXISTS log_stats;`);
    await client.query(`DROP TABLE IF EXISTS system_logs;`);
  }
};

export default migration;

