import type { Migration } from '../lib/migrations';

export const migration_150_admin_export_tokens_security: Migration = {
  version: '150_admin_export_tokens_security',
  description: 'Add binding and revoke controls to admin export tokens',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE admin_export_tokens
      ADD COLUMN IF NOT EXISTS bound_ip TEXT,
      ADD COLUMN IF NOT EXISTS bound_user_agent TEXT,
      ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

      CREATE INDEX IF NOT EXISTS idx_admin_export_tokens_revoked
      ON admin_export_tokens (revoked_at);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP INDEX IF EXISTS idx_admin_export_tokens_revoked;`);
    await pool.query(`
      ALTER TABLE admin_export_tokens
      DROP COLUMN IF EXISTS revoke_reason,
      DROP COLUMN IF EXISTS revoked_by,
      DROP COLUMN IF EXISTS revoked_at,
      DROP COLUMN IF EXISTS bound_user_agent,
      DROP COLUMN IF EXISTS bound_ip;
    `);
  },
};

