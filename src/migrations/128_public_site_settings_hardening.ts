/**
 * Migration 128: Public site settings hardening
 * Keeps the admin-managed public site settings deterministic across environments.
 */

import type { Migration } from '../lib/migrations';

export const migration_128_public_site_settings_hardening: Migration = {
  version: '128_public_site_settings_hardening',
  description: 'Public site settings global uniqueness and lookup indexes',

  up: async (pool: any) => {
    await pool.query(`
      DELETE FROM admin_dashboard_settings a
      USING admin_dashboard_settings b
      WHERE a.setting_key = b.setting_key
        AND a.is_global = true
        AND b.is_global = true
        AND a.ctid < b.ctid
    `);

    await pool.query(`
      UPDATE admin_dashboard_settings
      SET setting_value = jsonb_set(
            jsonb_set(setting_value, '{footer,phoneLabel}', '""'::jsonb, true),
            '{footer,phoneHref}',
            '""'::jsonb,
            true
          ),
          updated_at = NOW()
      WHERE setting_key = 'public_site_settings'
        AND is_global = true
        AND setting_value #>> '{footer,phoneHref}' = '+904141234567'
    `);

    await pool.query(`
      UPDATE admin_dashboard_settings
      SET setting_value = jsonb_set(setting_value, '{footer,brandName}', '"sanliurfa.com"'::jsonb, true),
          updated_at = NOW()
      WHERE setting_key = 'public_site_settings'
        AND is_global = true
        AND setting_value #>> '{footer,brandName}' IN ('Şanlıurfa.com', 'Şanliurfa.com')
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_dashboard_settings_global_key
      ON admin_dashboard_settings(setting_key)
      WHERE is_global = true
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_dashboard_settings_public_site
      ON admin_dashboard_settings(setting_key, updated_at DESC)
      WHERE is_global = true
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP INDEX IF EXISTS idx_admin_dashboard_settings_public_site');
    await pool.query('DROP INDEX IF EXISTS idx_admin_dashboard_settings_global_key');
  },
};
