import type { Migration } from '../lib/migrations';

export const migration_155_media_usage_registry: Migration = {
  version: '155_media_usage_registry',
  description: 'Add media usage registry for DB-first asset relationships',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_media_asset_usage (
        id UUID PRIMARY KEY,
        asset_key TEXT NOT NULL REFERENCES site_media_assets(asset_key) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_key TEXT NOT NULL,
        placement_key TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT site_media_asset_usage_unique UNIQUE (asset_key, entity_type, entity_key, placement_key)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_site_media_asset_usage_entity
      ON site_media_asset_usage (entity_type, entity_key, placement_key);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_site_media_asset_usage_asset
      ON site_media_asset_usage (asset_key);
    `);

    await pool.query(`
      INSERT INTO site_media_asset_usage (
        id, asset_key, entity_type, entity_key, placement_key, metadata
      )
      SELECT
        'f5e8a2ca-7f60-4d0b-9000-155000000001',
        asset_key,
        'homepage',
        'home',
        'hero-background',
        '{"managedBy":"site-platform","scope":"public-homepage"}'::jsonb
      FROM site_media_assets
      WHERE asset_key = 'homepage.hero.background'
      ON CONFLICT (asset_key, entity_type, entity_key, placement_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM site_media_asset_usage
      WHERE id = 'f5e8a2ca-7f60-4d0b-9000-155000000001';
    `);
    await pool.query(`DROP INDEX IF EXISTS idx_site_media_asset_usage_asset;`);
    await pool.query(`DROP INDEX IF EXISTS idx_site_media_asset_usage_entity;`);
    await pool.query(`DROP TABLE IF EXISTS site_media_asset_usage;`);
  },
};
