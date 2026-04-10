/**
 * Migration 091: Achievements & Leaderboards
 * Achievement tracking and leaderboard system
 */

import type { Migration } from '../lib/migrations';

export const migration_091_achievements_leaderboards: Migration = {
  version: '091_achievements_leaderboards',
  description: 'Achievement tracking and leaderboard system',
  up: async (pool: any) => {
  try {
    // Achievement definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        achievement_key VARCHAR(100) NOT NULL UNIQUE,
        achievement_name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_url VARCHAR(500),
        achievement_category VARCHAR(50),
        rarity VARCHAR(50) DEFAULT 'common',
        points_reward INT DEFAULT 25,
        tier INT DEFAULT 1,
        display_order INT DEFAULT 0,
        is_hidden BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_achievements_category
      ON achievements(achievement_category, tier, display_order)
    `);

    // User earned achievements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT NOW(),
        progress_percent INT DEFAULT 100,
        is_discovered BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_achievements
      ON user_achievements(user_id, earned_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_achievements_rarity
      ON user_achievements(user_id) WHERE is_discovered = true
    `);

    // Leaderboards (materialized views for performance)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leaderboard_type VARCHAR(50) NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rank INT,
        score INT DEFAULT 0,
        score_change INT DEFAULT 0,
        previous_rank INT,
        period VARCHAR(50) DEFAULT 'all_time',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(leaderboard_type, user_id, period)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboards_type
      ON leaderboards(leaderboard_type, period, rank)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboards_score
      ON leaderboards(leaderboard_type, score DESC)
    `);

    // Leaderboard snapshots (for historical tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leaderboard_type VARCHAR(50) NOT NULL,
        snapshot_date DATE NOT NULL,
        top_users JSONB,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(leaderboard_type, snapshot_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_date
      ON leaderboard_snapshots(leaderboard_type, snapshot_date DESC)
    `);

    // Achievement progress tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievement_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        current_progress INT DEFAULT 0,
        required_progress INT DEFAULT 1,
        progress_data JSONB,
        last_updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_achievement_progress_user
      ON achievement_progress(user_id)
    `);

    console.log('✓ Migration 091 completed: Achievements and leaderboards tables created');
  } catch (error) {
    console.error('Migration 091 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS achievement_progress CASCADE');
    await pool.query('DROP TABLE IF EXISTS leaderboard_snapshots CASCADE');
    await pool.query('DROP TABLE IF EXISTS leaderboards CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_achievements CASCADE');
    await pool.query('DROP TABLE IF EXISTS achievements CASCADE');
    console.log('✓ Migration 091 rolled back');
  } catch (error) {
    console.error('Rollback 091 failed:', error);
    throw error;
  }
  }
};
