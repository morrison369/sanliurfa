/**
 * Migration 041: Points & Rewards System
 * Tracks user points earned through activities and reward achievements
 */

import type { Migration } from '../lib/migrations';

export const migration_041_points_rewards: Migration = {
  version: '041_points_rewards',
  description: 'User points and rewards tracking',
  async up(pool: any) {
    // User points transactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_points_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points_earned INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        action_id UUID,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_points_user
      ON user_points_transactions(user_id, created_at DESC)
    `);

    // User current points balance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_points INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_points_balance
      ON user_points(total_points DESC)
    `);

    // Reward levels
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reward_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL UNIQUE,
        points_required INTEGER NOT NULL,
        badge_emoji VARCHAR(10),
        description VARCHAR(255),
        benefits TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User reward achievements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_reward_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_level_id UUID NOT NULL REFERENCES reward_levels(id) ON DELETE CASCADE,
        achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, reward_level_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_rewards
      ON user_reward_achievements(user_id, achieved_at DESC)
    `);

    // Insert default reward levels
    await pool.query(`
      INSERT INTO reward_levels (name, points_required, badge_emoji, description, benefits)
      VALUES
        ('Bronze', 100, '🥉', 'Entry level contributor', 'Base benefits'),
        ('Silver', 500, '🥈', 'Active community member', 'Enhanced visibility'),
        ('Gold', 1000, '🥇', 'Expert contributor', 'Featured badge'),
        ('Platinum', 2500, '💎', 'Community leader', 'Special privileges')
      ON CONFLICT DO NOTHING
    `);

    console.log('✓ Migration 041: Points and rewards tables created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS user_reward_achievements CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_points CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_points_transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS reward_levels CASCADE');
    console.log('✓ Migration 041 rolled back');
  }
};
