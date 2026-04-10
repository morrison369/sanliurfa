/**
 * Migration 043: Activity Feed System
 * Tracks and displays activities from followed places and users
 */

import type { Migration } from '../lib/migrations';

export const migration_043_activity_feed: Migration = {
  version: '043_activity_feed',
  description: 'Activity feed timeline and fanout tables',
  async up(pool: any) {
    // Activity feed table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_feed (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        related_place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_feed_actor
      ON activity_feed(actor_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_feed_place
      ON activity_feed(related_place_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_feed_user
      ON activity_feed(related_user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_feed_type
      ON activity_feed(action_type, created_at DESC)
    `);

    // Activity likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_likes_activity
      ON activity_likes(activity_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_likes_user
      ON activity_likes(user_id, created_at DESC)
    `);

    console.log('✓ Migration 043: Activity feed system created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS activity_likes CASCADE');
    await pool.query('DROP TABLE IF EXISTS activity_feed CASCADE');
    console.log('✓ Migration 043 rolled back');
  }
};
