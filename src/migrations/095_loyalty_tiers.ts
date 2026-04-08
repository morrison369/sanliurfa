/**
 * Migration 095: Loyalty Tiers & Benefits
 * Tier system and tier-specific benefits
 */

import { Pool } from 'pg';

export const migration_095_loyalty_tiers = async (pool: Pool) => {
  try {
    // Loyalty tier definitions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier_key VARCHAR(100) NOT NULL UNIQUE,
        tier_name VARCHAR(255) NOT NULL,
        tier_level INT NOT NULL UNIQUE,
        min_points_required INT DEFAULT 0,
        description TEXT,
        color VARCHAR(20),
        icon_url VARCHAR(500),
        points_multiplier FLOAT DEFAULT 1.0,
        exclusive_rewards BOOLEAN DEFAULT false,
        birthday_bonus INT DEFAULT 0,
        annual_gift_points INT DEFAULT 0,
        perks JSONB,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_level
      ON loyalty_tiers(tier_level)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_points
      ON loyalty_tiers(min_points_required)
    `);

    // User tier membership
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_tier_membership (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_tier_id UUID NOT NULL REFERENCES loyalty_tiers(id) ON DELETE RESTRICT,
        points_in_tier INT DEFAULT 0,
        tier_achieved_at TIMESTAMP DEFAULT NOW(),
        tier_expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tier_membership_user
      ON user_tier_membership(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tier_membership_tier
      ON user_tier_membership(current_tier_id)
    `);

    // Tier progression history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        previous_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
        new_tier_id UUID NOT NULL REFERENCES loyalty_tiers(id) ON DELETE RESTRICT,
        promotion_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tier_history_user
      ON tier_history(user_id, created_at DESC)
    `);

    // Tier benefits log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_benefits_redeemed (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier_id UUID NOT NULL REFERENCES loyalty_tiers(id) ON DELETE RESTRICT,
        benefit_type VARCHAR(100) NOT NULL,
        points_amount INT,
        redemption_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tier_benefits_user
      ON tier_benefits_redeemed(user_id, created_at DESC)
    `);

    // Annual tier reset tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_reset_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reset_date DATE NOT NULL,
        points_reset INT DEFAULT 0,
        new_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, reset_date)
      )
    `);

    console.log('✓ Migration 095 completed: Loyalty tiers tables created');
  } catch (error) {
    console.error('Migration 095 failed:', error);
    throw error;
  }
};

export const rollback_095 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS tier_reset_schedule CASCADE');
    await pool.query('DROP TABLE IF EXISTS tier_benefits_redeemed CASCADE');
    await pool.query('DROP TABLE IF EXISTS tier_history CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_tier_membership CASCADE');
    await pool.query('DROP TABLE IF EXISTS loyalty_tiers CASCADE');
    console.log('✓ Migration 095 rolled back');
  } catch (error) {
    console.error('Rollback 095 failed:', error);
    throw error;
  }
};
