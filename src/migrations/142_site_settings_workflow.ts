import type { Migration } from '../lib/migrations';

/**
 * Migration 142: Site settings workflow and audit
 * - drafts (taslak)
 * - versions (surumleme)
 * - audit trail (kim neyi degistirdi)
 */
export const migration_142_site_settings_workflow: Migration = {
  version: '142_site_settings_workflow',
  description: 'Create site_setting_drafts, site_setting_versions, site_change_audit',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_setting_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(200) NOT NULL,
        setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
        note TEXT,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(setting_key)
      );
      CREATE INDEX IF NOT EXISTS idx_site_setting_drafts_key ON site_setting_drafts(setting_key);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_setting_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(200) NOT NULL,
        version_no INTEGER NOT NULL,
        setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
        note TEXT,
        changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(setting_key, version_no)
      );
      CREATE INDEX IF NOT EXISTS idx_site_setting_versions_key ON site_setting_versions(setting_key, version_no DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_change_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(200) NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('draft_save', 'publish', 'rollback', 'media_import')),
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        actor_email VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_site_change_audit_key_time ON site_change_audit(setting_key, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_site_change_audit_actor_time ON site_change_audit(actor_user_id, created_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS site_change_audit CASCADE;
      DROP TABLE IF EXISTS site_setting_versions CASCADE;
      DROP TABLE IF EXISTS site_setting_drafts CASCADE;
    `);
  },
};

