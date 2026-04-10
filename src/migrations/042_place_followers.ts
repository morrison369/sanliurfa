/**
 * Migration 042: Place Following System
 * Allows users to follow places and receive updates
 */

import type { Migration } from '../lib/migrations';

export const migration_042_place_followers: Migration = {
  version: '042_place_followers',
  description: 'Place following and notification subscriptions',
  async up(pool: any) {
    // Place followers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_followers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, place_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_followers_user
      ON place_followers(user_id, followed_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_followers_place
      ON place_followers(place_id, followed_at DESC)
    `);

    // Denormalized follower count on places table (for performance)
    await pool.query(`
      ALTER TABLE places
      ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0
    `);

    console.log('✓ Migration 042: Place followers system created');
  },

  async down(pool: any) {
    await pool.query('ALTER TABLE places DROP COLUMN IF EXISTS follower_count');
    await pool.query('DROP TABLE IF EXISTS place_followers CASCADE');
    console.log('✓ Migration 042 rolled back');
  }
};
