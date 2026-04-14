/**
 * Migration 036: Collection Indexes
 * Performance indexes for place collections feature
 * 
 * NOT: Eksik migrasyon - 035 ile 037 arasına eklendi
 */

import type { Migration } from '../lib/migrations';

export const migration_036_collection_indexes: Migration = {
  version: '036_collection_indexes',
  description: 'Performance indexes for place collections',

  up: async (pool: any) => {
    // Collection user index (for user's collections list)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_collections_user 
      ON place_collections(user_id, created_at DESC)
    `);

    // Collection public index (for exploring public collections)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_collections_public 
      ON place_collections(is_public, place_count DESC) 
      WHERE is_public = true
    `);

    // Collection items lookup index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collection_items_place 
      ON collection_items(place_id)
    `);

    // Collection followers index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collection_followers_user 
      ON collection_followers(user_id, followed_at DESC)
    `);

    console.log('✓ Migration 036: Collection indexes created');
  },

  down: async (pool: any) => {
    await pool.query(`DROP INDEX IF EXISTS idx_place_collections_user`);
    await pool.query(`DROP INDEX IF EXISTS idx_place_collections_public`);
    await pool.query(`DROP INDEX IF EXISTS idx_collection_items_place`);
    await pool.query(`DROP INDEX IF EXISTS idx_collection_followers_user`);
    console.log('✓ Migration 036 rolled back');
  }
};
