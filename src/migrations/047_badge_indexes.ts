/**
 * Migration 047: Badge Indexes
 * Performance indexes for place badges system
 * 
 * NOT: Eksik migrasyon - 046 ile 048 arasına eklendi
 */

import type { Migration } from '../lib/migrations';

export const migration_047_badge_indexes: Migration = {
  version: '047_badge_indexes',
  description: 'Performance indexes for place badges',

  up: async (pool: any) => {
    // Place badges lookup index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_badges_lookup 
      ON place_badges(place_id, badge_type)
    `);

    // Badge definitions type index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_badge_definitions_type 
      ON badge_definitions(type)
    `);

    // User awarded badges index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_badges_awarded 
      ON place_badges(awarded_by, awarded_at DESC) 
      WHERE awarded_by IS NOT NULL
    `);

    console.log('✓ Migration 047: Badge indexes created');
  },

  down: async (pool: any) => {
    await pool.query(`DROP INDEX IF EXISTS idx_place_badges_lookup`);
    await pool.query(`DROP INDEX IF EXISTS idx_badge_definitions_type`);
    await pool.query(`DROP INDEX IF EXISTS idx_place_badges_awarded`);
    console.log('✓ Migration 047 rolled back');
  }
};
