/**
 * Migration 094: Rewards Catalog & Redemption
 * Rewards definitions and redemption tracking
 */

import type { Migration } from '../lib/migrations';

export const migration_094_rewards_catalog: Migration = {
  version: '094_rewards_catalog',
  description: 'Rewards definitions and redemption tracking',
  up: async (pool: any) => {
  try {
    // Rewards catalog
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reward_key VARCHAR(100) NOT NULL UNIQUE,
        reward_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        points_cost INT NOT NULL,
        image_url VARCHAR(500),
        stock_quantity INT,
        max_per_user INT,
        expiry_days INT,
        tier_requirement VARCHAR(50),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rewards_active
      ON rewards(is_active, display_order)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rewards_category
      ON rewards(category, points_cost)
    `);

    // User redemption history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reward_redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
        points_spent INT NOT NULL,
        redemption_code VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        fulfilled_at TIMESTAMP,
        fulfilled_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_redemptions_user
      ON reward_redemptions(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_redemptions_status
      ON reward_redemptions(status, created_at DESC)
    `);

    // Reward inventory tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reward_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE UNIQUE,
        total_stock INT DEFAULT 0,
        claimed_stock INT DEFAULT 0,
        available_stock INT DEFAULT 0,
        last_updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_available
      ON reward_inventory(available_stock) WHERE available_stock > 0
    `);

    // Special promotional rewards
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotional_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_name VARCHAR(255) NOT NULL,
        description TEXT,
        reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
        points_discount INT,
        discount_percent FLOAT,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        max_redemptions INT,
        current_redemptions INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_valid
      ON promotional_offers(valid_from, valid_until)
    `);

    console.log('✓ Migration 094 completed: Rewards catalog tables created');
  } catch (error) {
    console.error('Migration 094 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS promotional_offers CASCADE');
    await pool.query('DROP TABLE IF EXISTS reward_inventory CASCADE');
    await pool.query('DROP TABLE IF EXISTS reward_redemptions CASCADE');
    await pool.query('DROP TABLE IF EXISTS rewards CASCADE');
    console.log('✓ Migration 094 rolled back');
  } catch (error) {
    console.error('Rollback 094 failed:', error);
    throw error;
  }
  }
};
