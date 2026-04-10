/**
 * Migration 120: Activity Feed
 * User activity tracking, feed generation, content distribution
 */

import type { Migration } from '../lib/migrations';

export const migration_120_activity_feed: Migration = {
  version: '120_activity_feed',
  description: 'User activity tracking, feed generation, content distribution',
  up: async (pool: any) => {
  try {
    // User activities (feed events)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(100),
        object_type VARCHAR(100),
        object_id UUID,
        object_title VARCHAR(255),
        description TEXT,
        metadata JSONB,
        visibility VARCHAR(50) DEFAULT 'public',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_user
      ON user_activities(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_type
      ON user_activities(activity_type, created_at DESC)
    `);

    // Activity feed (personalized)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_feeds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
        from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        feed_type VARCHAR(50),
        seen BOOLEAN DEFAULT false,
        liked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, activity_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feed_user
      ON activity_feeds(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feed_unseen
      ON activity_feeds(user_id, seen) WHERE seen = false
    `);

    // Activity interactions (like, share, comment)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(activity_id, user_id, interaction_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interactions_activity
      ON activity_interactions(activity_id, interaction_type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interactions_user
      ON activity_interactions(user_id, created_at DESC)
    `);

    console.log('✓ Migration 120 completed: Activity feed tables created');
  } catch (error) {
    console.error('Migration 120 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS activity_interactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS activity_feeds CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_activities CASCADE');
    console.log('✓ Migration 120 rolled back');
  } catch (error) {
    console.error('Rollback 120 failed:', error);
    throw error;
  }
  }
};
