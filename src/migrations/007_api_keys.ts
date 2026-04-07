/**
 * Migrasyon: API Keys Sistemi
 * Üçüncü taraf entegrasyonları için
 */

import type { Migration } from '../lib/migrations';

export const migration_007_api_keys: Migration = {
  version: '007_api_keys',
  description: 'API keys sistemi: ucuncu taraf entegrasyonlari',

  up: async (pool: any) => {
    // API Keys tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        last_used_at TIMESTAMP,
        last_ip_address VARCHAR(45),
        scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
        rate_limit INTEGER DEFAULT 1000,
        rate_limit_window INTEGER DEFAULT 3600,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
      CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
    `);

    -- API Key usage log'ları
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_key_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        endpoint VARCHAR(500) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        response_time_ms INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
      CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON api_key_usage(endpoint);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS api_key_usage CASCADE');
    await pool.query('DROP TABLE IF EXISTS api_keys CASCADE');
  }
};
