/**
 * Migration 130: Turkish-only language lock
 * Enforces the product rule that sanliurfa.com is Turkish-only.
 */

import type { Migration } from '../lib/migrations';

export const migration_130_turkish_only_language_lock: Migration = {
  version: '130_turkish_only_language_lock',
  description: 'Lock user and tenant language preferences to Turkish only',

  up: async (pool: any) => {
    await pool.query(`
      UPDATE users
      SET language_preference = 'tr',
          updated_at = NOW()
      WHERE language_preference IS DISTINCT FROM 'tr'
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'tenant_settings'
            AND column_name = 'default_language'
        ) THEN
          UPDATE tenant_settings
          SET default_language = 'tr',
              updated_at = NOW()
          WHERE default_language IS DISTINCT FROM 'tr';
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_users_language_preference_tr_only'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT chk_users_language_preference_tr_only
          CHECK (language_preference = 'tr');
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'tenant_settings'
            AND column_name = 'default_language'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_tenant_settings_default_language_tr_only'
        ) THEN
          ALTER TABLE tenant_settings
          ADD CONSTRAINT chk_tenant_settings_default_language_tr_only
          CHECK (default_language = 'tr');
        END IF;
      END $$;
    `);
  },

  down: async (pool: any) => {
    await pool.query(
      'ALTER TABLE IF EXISTS tenant_settings DROP CONSTRAINT IF EXISTS chk_tenant_settings_default_language_tr_only'
    );
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_language_preference_tr_only');
  },
};
