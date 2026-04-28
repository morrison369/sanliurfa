import type { Migration } from '../lib/migrations';

export const migration_149_admin_export_tokens: Migration = {
  version: '149_admin_export_tokens',
  description: 'Short-lived signed export token storage for admin CSV/PDF/HTML exports',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_export_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash TEXT NOT NULL UNIQUE,
        resource_key VARCHAR(120) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        max_downloads INTEGER NOT NULL DEFAULT 1,
        used_count INTEGER NOT NULL DEFAULT 0,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_admin_export_tokens_resource_expires
      ON admin_export_tokens (resource_key, expires_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS admin_export_tokens CASCADE;`);
  },
};

