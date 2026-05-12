import { pool } from '../lib/postgres';

export async function up() {
  await pool.query(`
    ALTER TABLE reviews ALTER COLUMN place_id DROP NOT NULL;

    ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS historical_site_id UUID
        REFERENCES historical_sites(id) ON DELETE CASCADE;

    ALTER TABLE reviews
      DROP CONSTRAINT IF EXISTS reviews_entity_check;

    ALTER TABLE reviews
      ADD CONSTRAINT reviews_entity_check CHECK (
        (place_id IS NOT NULL AND historical_site_id IS NULL) OR
        (place_id IS NULL AND historical_site_id IS NOT NULL)
      );

    CREATE INDEX IF NOT EXISTS reviews_historical_site_id_idx
      ON reviews(historical_site_id)
      WHERE historical_site_id IS NOT NULL;
  `);
}

export async function down() {
  await pool.query(`
    DROP INDEX IF EXISTS reviews_historical_site_id_idx;
    ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_entity_check;
    ALTER TABLE reviews DROP COLUMN IF EXISTS historical_site_id;
    ALTER TABLE reviews ALTER COLUMN place_id SET NOT NULL;
  `);
}
