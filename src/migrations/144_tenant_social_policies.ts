import type { Migration } from '../lib/migrations';

export const migration_144_tenant_social_policies: Migration = {
  version: '144_tenant_social_policies',
  description: 'Tenant bazlı sosyal abuse/rate limit politika tablosu',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_social_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        swipe_limit INTEGER NOT NULL DEFAULT 120,
        swipe_window_seconds INTEGER NOT NULL DEFAULT 60,
        follow_limit INTEGER NOT NULL DEFAULT 60,
        follow_window_seconds INTEGER NOT NULL DEFAULT 60,
        message_write_limit INTEGER NOT NULL DEFAULT 80,
        message_write_window_seconds INTEGER NOT NULL DEFAULT 60,
        is_active BOOLEAN NOT NULL DEFAULT true,
        note TEXT,
        updated_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_social_policies_active
      ON tenant_social_policies (tenant_id, is_active);
    `);

    await pool.query(`
      INSERT INTO tenant_social_policies (
        tenant_id,
        swipe_limit,
        swipe_window_seconds,
        follow_limit,
        follow_window_seconds,
        message_write_limit,
        message_write_window_seconds,
        is_active,
        note
      )
      VALUES ('default', 120, 60, 60, 60, 80, 60, true, 'default fallback policy')
      ON CONFLICT (tenant_id) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS tenant_social_policies;`);
  },
};
