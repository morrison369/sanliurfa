import type { Migration } from '../lib/migrations';

/**
 * Migration 143: extend site_change_audit action check for social abuse events
 */
export const migration_143_site_change_audit_social_abuse: Migration = {
  version: '143_site_change_audit_social_abuse',
  description: 'Allow social_abuse action in site_change_audit action check constraint',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE site_change_audit
      DROP CONSTRAINT IF EXISTS site_change_audit_action_check;
    `);

    await pool.query(`
      ALTER TABLE site_change_audit
      ADD CONSTRAINT site_change_audit_action_check
      CHECK (action IN ('draft_save', 'publish', 'rollback', 'media_import', 'social_abuse'));
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      ALTER TABLE site_change_audit
      DROP CONSTRAINT IF EXISTS site_change_audit_action_check;
    `);

    await pool.query(`
      ALTER TABLE site_change_audit
      ADD CONSTRAINT site_change_audit_action_check
      CHECK (action IN ('draft_save', 'publish', 'rollback', 'media_import'));
    `);
  },
};
