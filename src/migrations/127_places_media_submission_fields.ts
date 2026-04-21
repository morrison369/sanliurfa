/**
 * Migration 127: Places media and public submission fields
 * Keeps the public place submission form and place rich snippets portable across environments.
 */

import type { Migration } from '../lib/migrations';

export const migration_127_places_media_submission_fields: Migration = {
  version: '127_places_media_submission_fields',
  description: 'Places media fields and public submission metadata',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE places
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS images TEXT[],
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_status
      ON places(status)
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      ALTER TABLE places
      DROP COLUMN IF EXISTS submitter_email,
      DROP COLUMN IF EXISTS submitter_name,
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS images,
      DROP COLUMN IF EXISTS image_url
    `);
  },
};
