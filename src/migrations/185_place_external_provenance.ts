import type { Migration } from '../lib/migrations';

export const migration_185_place_external_provenance: Migration = {
  version: '185_place_external_provenance',
  description: 'Add external provenance fields for place enrichment',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS google_place_id TEXT;
      ALTER TABLE places ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
      ALTER TABLE places ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';
      ALTER TABLE places ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;
      ALTER TABLE places ADD COLUMN IF NOT EXISTS verified_by TEXT;

      CREATE INDEX IF NOT EXISTS idx_places_google_place_id ON places(google_place_id);
      CREATE INDEX IF NOT EXISTS idx_places_data_source ON places(data_source);
      CREATE INDEX IF NOT EXISTS idx_places_last_verified_at ON places(last_verified_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP INDEX IF EXISTS idx_places_last_verified_at;
      DROP INDEX IF EXISTS idx_places_data_source;
      DROP INDEX IF EXISTS idx_places_google_place_id;
      ALTER TABLE places DROP COLUMN IF EXISTS verified_by;
      ALTER TABLE places DROP COLUMN IF EXISTS last_verified_at;
      ALTER TABLE places DROP COLUMN IF EXISTS data_source;
      ALTER TABLE places DROP COLUMN IF EXISTS google_maps_url;
      ALTER TABLE places DROP COLUMN IF EXISTS google_place_id;
    `);
  },
};
