import type { Migration } from '../lib/migrations';

export const migration_187_classified_moderation: Migration = {
  version: '187_classified_moderation',
  description: 'Add moderation metadata fields to member classifieds',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE classified_listings
        ADD COLUMN IF NOT EXISTS moderation_note TEXT,
        ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      ALTER TABLE classified_listings
        DROP COLUMN IF EXISTS moderated_at,
        DROP COLUMN IF EXISTS moderated_by,
        DROP COLUMN IF EXISTS moderation_note;
    `);
  },
};
