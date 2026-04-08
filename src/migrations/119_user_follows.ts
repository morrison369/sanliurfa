/**
 * Migration 119: User Follows & Social Graph
 * User follow relationships, follow requests, social graph analytics
 */

import { Pool } from 'pg';

export const migration_119_user_follows = async (pool: Pool) => {
  try {
    // User follows (followers/following)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_approved BOOLEAN DEFAULT true,
        followed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(follower_user_id, following_user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_follows_follower
      ON user_follows(follower_user_id, followed_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_follows_following
      ON user_follows(following_user_id, followed_at DESC)
    `);

    // Follow requests (pending follows)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follow_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT NOW(),
        responded_at TIMESTAMP,
        UNIQUE(requester_user_id, recipient_user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_follow_requests_recipient
      ON follow_requests(recipient_user_id, status, requested_at DESC)
    `);

    // User social stats
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_social_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        follower_count INT DEFAULT 0,
        following_count INT DEFAULT 0,
        post_count INT DEFAULT 0,
        engagement_score FLOAT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_stats_user
      ON user_social_stats(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_stats_followers
      ON user_social_stats(follower_count DESC)
    `);

    console.log('✓ Migration 119 completed: User follows and social graph tables created');
  } catch (error) {
    console.error('Migration 119 failed:', error);
    throw error;
  }
};

export const rollback_119 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS user_social_stats CASCADE');
    await pool.query('DROP TABLE IF EXISTS follow_requests CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_follows CASCADE');
    console.log('✓ Migration 119 rolled back');
  } catch (error) {
    console.error('Rollback 119 failed:', error);
    throw error;
  }
};
