/**
 * Migration 067: Achievements & Badges System
 * User achievements, badges, and gamification elements
 */

import type { Migration } from '../lib/migrations';

export const migration_067_loyalty_achievements: Migration = {
  version: '067_loyalty_achievements',
  description: 'User achievements, badges, and gamification elements',
  up: async (pool: any) => {
  try {
    // Achievement definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        achievement_key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_url TEXT,
        category VARCHAR(100) NOT NULL,
        points_reward INT DEFAULT 0,
        rarity VARCHAR(50) DEFAULT 'common',
        hidden BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_achievements_category
      ON achievements(category)
    `);

    // User achievements (unlocked)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        viewed BOOLEAN DEFAULT false,
        UNIQUE(user_id, achievement_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user
      ON user_achievements(user_id, unlocked_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement
      ON user_achievements(achievement_id)
    `);

    // Badge definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        badge_key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_url TEXT,
        color_code VARCHAR(7),
        special BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // User badges
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT NOW(),
        is_featured BOOLEAN DEFAULT false,
        UNIQUE(user_id, badge_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_badges_user
      ON user_badges(user_id)
    `);

    // Challenge system
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challenge_name VARCHAR(255) NOT NULL,
        description TEXT,
        challenge_type VARCHAR(100) NOT NULL,
        goal_value INT NOT NULL,
        reward_points INT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        difficulty VARCHAR(50) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_challenges_date
      ON loyalty_challenges(start_date, end_date)
    `);

    // User challenge progress
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_challenge_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge_id UUID NOT NULL REFERENCES loyalty_challenges(id) ON DELETE CASCADE,
        current_progress INT DEFAULT 0,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        UNIQUE(user_id, challenge_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_challenge_progress_user
      ON user_challenge_progress(user_id, completed)
    `);

    console.log('✓ Migration 067 completed: Achievements and badges system created');
  } catch (error) {
    console.error('Migration 067 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS user_challenge_progress CASCADE');
    await pool.query('DROP TABLE IF EXISTS loyalty_challenges CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_badges CASCADE');
    await pool.query('DROP TABLE IF EXISTS badges CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_achievements CASCADE');
    await pool.query('DROP TABLE IF EXISTS achievements CASCADE');
    console.log('✓ Migration 067 rolled back');
  } catch (error) {
    console.error('Rollback 067 failed:', error);
    throw error;
  }
  }
};
