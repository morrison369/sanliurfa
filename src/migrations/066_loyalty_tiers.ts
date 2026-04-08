/**
 * Migration 066: Loyalty Tiers System
 * Tier progression and tier-specific benefits
 */

import { Pool } from 'pg';

export const migration_066_loyalty_tiers = async (pool: Pool) => {
  try {
    // Loyalty tier definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier_name VARCHAR(100) NOT NULL UNIQUE,
        tier_level INT NOT NULL UNIQUE,
        min_points INT NOT NULL,
        max_points INT,
        description TEXT,
        badge_icon_url TEXT,
        benefits JSONB DEFAULT '{}',
        point_multiplier DECIMAL(3, 2) DEFAULT 1.0,
        exclusive_rewards INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index for tier lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_level
      ON loyalty_tiers(tier_level)
    `);

    // User tier history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_tier_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        previous_tier VARCHAR(100),
        new_tier VARCHAR(100) NOT NULL,
        milestone_points INT NOT NULL,
        promoted_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tier_history
      ON user_tier_history(user_id, promoted_at DESC)
    `);

    // Tier-specific bonuses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_benefits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier_id UUID NOT NULL REFERENCES loyalty_tiers(id) ON DELETE CASCADE,
        benefit_type VARCHAR(100) NOT NULL,
        benefit_value TEXT NOT NULL,
        benefit_description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tier_benefits_tier
      ON tier_benefits(tier_id)
    `);

    // Tier redemption limits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_redemption_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier_id UUID NOT NULL REFERENCES loyalty_tiers(id) ON DELETE CASCADE,
        max_redemptions_per_month INT DEFAULT 0,
        early_access_hours INT DEFAULT 0,
        exclusive_reward_access BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_redemption_limits_tier
      ON tier_redemption_limits(tier_id)
    `);

    console.log('✓ Migration 066 completed: Loyalty tiers system created');
  } catch (error) {
    console.error('Migration 066 failed:', error);
    throw error;
  }
};

export const rollback_066 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS tier_redemption_limits CASCADE');
    await pool.query('DROP TABLE IF EXISTS tier_benefits CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_tier_history CASCADE');
    await pool.query('DROP TABLE IF EXISTS loyalty_tiers CASCADE');
    console.log('✓ Migration 066 rolled back');
  } catch (error) {
    console.error('Rollback 066 failed:', error);
    throw error;
  }
};
