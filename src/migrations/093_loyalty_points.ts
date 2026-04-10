/**
 * Migration 093: Loyalty Points & Transactions
 * Points system and transaction tracking
 */

import type { Migration } from '../lib/migrations';

export const migration_093_loyalty_points: Migration = {
  version: '093_loyalty_points',
  description: 'Points system and transaction tracking',
  up: async (pool: any) => {
  try {
    // User points balance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        current_balance INT DEFAULT 0,
        lifetime_earned INT DEFAULT 0,
        lifetime_spent INT DEFAULT 0,
        pending_points INT DEFAULT 0,
        last_earned_at TIMESTAMP,
        last_spent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_balance
      ON loyalty_points(current_balance DESC)
    `);

    // Points transactions (earn/spend/expire)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        points_amount INT NOT NULL,
        transaction_reason TEXT,
        related_entity_type VARCHAR(50),
        related_entity_id UUID,
        balance_before INT,
        balance_after INT,
        expires_at TIMESTAMP,
        is_expired BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user
      ON loyalty_transactions(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type
      ON loyalty_transactions(transaction_type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_expiry
      ON loyalty_transactions(expires_at) WHERE expires_at IS NOT NULL AND is_expired = false
    `);

    // Points earning rules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS earning_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_key VARCHAR(100) NOT NULL UNIQUE,
        rule_name VARCHAR(255),
        action_type VARCHAR(100) NOT NULL,
        points_amount INT NOT NULL,
        multiplier_enabled BOOLEAN DEFAULT false,
        max_points_per_day INT,
        expiry_days INT,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_earning_rules_active
      ON earning_rules(is_active, rule_key)
    `);

    console.log('✓ Migration 093 completed: Loyalty points tables created');
  } catch (error) {
    console.error('Migration 093 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS earning_rules CASCADE');
    await pool.query('DROP TABLE IF EXISTS loyalty_transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS loyalty_points CASCADE');
    console.log('✓ Migration 093 rolled back');
  } catch (error) {
    console.error('Rollback 093 failed:', error);
    throw error;
  }
  }
};
