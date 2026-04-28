import type { Migration } from '../lib/migrations';

export const migration_152_site_setting_approvals: Migration = {
  version: '152_site_setting_approvals',
  description: 'Add site setting approval workflow table',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_setting_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(200) NOT NULL,
        draft_value JSONB NOT NULL DEFAULT '{}'::jsonb,
        note TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_site_setting_approvals_key_status
      ON site_setting_approvals (setting_key, status, created_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS site_setting_approvals CASCADE;`);
  },
};

