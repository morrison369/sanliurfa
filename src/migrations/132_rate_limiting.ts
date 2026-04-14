import type { Migration } from '../lib/migrations/migration-system';

const migration: Migration = {
  version: 132,
  name: 'rate_limiting',
  description: 'Add rate limiting logs table',
  
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) NOT NULL,
        identifier VARCHAR(255),
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX idx_rate_limit_key ON rate_limit_logs(key);
      CREATE INDEX idx_rate_limit_timestamp ON rate_limit_logs(timestamp);
    `);

    // Webhook tablolarını da ekleyelim
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        secret_key VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        UNIQUE(webhook_id, event_type)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(100),
        payload JSONB,
        response_status INTEGER,
        response_body TEXT,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
      CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);
    `);
  },

  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS webhook_logs;`);
    await client.query(`DROP TABLE IF EXISTS webhook_events;`);
    await client.query(`DROP TABLE IF EXISTS webhooks;`);
    await client.query(`DROP TABLE IF EXISTS rate_limit_logs;`);
  }
};

export default migration;
