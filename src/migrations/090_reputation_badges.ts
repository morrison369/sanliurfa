/**
 * Migration 090: User Reputation & Badges
 * User reputation scores and badge system
 */

import type { Migration } from '../lib/migrations';

export const migration_090_reputation_badges: Migration = {
  version: '090_reputation_badges',
  description: 'User reputation scores and badge system',
  up: async (pool: any) => {
  try {
    // User reputation scores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_reputation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        total_score INT DEFAULT 0,
        review_score INT DEFAULT 0,
        comment_score INT DEFAULT 0,
        helpful_score INT DEFAULT 0,
        community_score INT DEFAULT 0,
        trust_score FLOAT DEFAULT 50,
        last_updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reputation_score
      ON user_reputation(total_score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trust_score
      ON user_reputation(trust_score DESC)
    `);

    // Badge definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        badge_key VARCHAR(100) NOT NULL UNIQUE,
        badge_name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_url VARCHAR(500),
        color VARCHAR(20),
        badge_category VARCHAR(50),
        points_value INT DEFAULT 10,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_badges_category
      ON badges(badge_category, display_order)
    `);

    // User earned badges
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT NOW(),
        unlock_reason TEXT,
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_badges
      ON user_badges(user_id, earned_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_badges_featured
      ON user_badges(user_id, is_featured) WHERE is_featured = true
    `);

    // Badge progression (e.g., first 10 reviews, then 25, then 50)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        requirement_type VARCHAR(50) NOT NULL,
        requirement_value INT NOT NULL,
        requirement_metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(badge_id, requirement_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_badge_requirements_badge
      ON badge_requirements(badge_id)
    `);

    console.log('✓ Migration 090 completed: User reputation and badges tables created');
  } catch (error) {
    console.error('Migration 090 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS badge_requirements CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_badges CASCADE');
    await pool.query('DROP TABLE IF EXISTS badges CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_reputation CASCADE');
    console.log('✓ Migration 090 rolled back');
  } catch (error) {
    console.error('Rollback 090 failed:', error);
    throw error;
  }
  }
};
