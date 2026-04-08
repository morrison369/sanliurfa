/**
 * Migration 065: Loyalty Points System
 * User points tracking and point transactions
 */

import { Pool } from 'pg';

export const migration_065_loyalty_points = async (pool: Pool) => {
  try {
    // User loyalty points balance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_loyalty_balance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        total_points INT DEFAULT 0,
        available_points INT DEFAULT 0,
        redeemed_points INT DEFAULT 0,
        lifetime_points INT DEFAULT 0,
        current_tier VARCHAR(50) DEFAULT 'bronze',
        points_last_earned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index for user lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_balance_user
      ON user_loyalty_balance(user_id)
    `);

    // Points transaction history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        reason VARCHAR(255) NOT NULL,
        reference_type VARCHAR(100),
        reference_id UUID,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for transactions
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user
      ON loyalty_transactions(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type
      ON loyalty_transactions(transaction_type, created_at DESC)
    `);

    // Points earning rules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_earning_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name VARCHAR(255) NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        base_points INT NOT NULL,
        multiplier DECIMAL(3, 2) DEFAULT 1.00,
        max_points_per_day INT DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(activity_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_points_rules_activity
      ON points_earning_rules(activity_type)
    `);

    // Bonus points campaigns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bonus_point_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        bonus_multiplier DECIMAL(3, 2) DEFAULT 1.5,
        activity_type VARCHAR(100),
        max_bonus_per_user INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bonus_campaigns_date
      ON bonus_point_campaigns(start_date, end_date)
    `);

    console.log('✓ Migration 065 completed: Loyalty points system created');
  } catch (error) {
    console.error('Migration 065 failed:', error);
    throw error;
  }
};

export const rollback_065 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS bonus_point_campaigns CASCADE');
    await pool.query('DROP TABLE IF EXISTS points_earning_rules CASCADE');
    await pool.query('DROP TABLE IF EXISTS loyalty_transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_loyalty_balance CASCADE');
    console.log('✓ Migration 065 rolled back');
  } catch (error) {
    console.error('Rollback 065 failed:', error);
    throw error;
  }
};
