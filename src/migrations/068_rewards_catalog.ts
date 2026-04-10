/**
 * Migration 068: Rewards Catalog & Redemption System
 * Rewards catalog, redemption tracking, and reward fulfillment
 */

import type { Migration } from '../lib/migrations';

export const migration_068_rewards_catalog: Migration = {
  version: '068_rewards_catalog',
  description: 'Rewards catalog, redemption tracking, and reward fulfillment',
  up: async (pool: any) => {
  try {
    // Rewards catalog
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rewards_catalog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reward_name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        reward_type VARCHAR(50) NOT NULL,
        points_cost INT NOT NULL,
        tier_requirement VARCHAR(50),
        quantity_available INT,
        quantity_redeemed INT DEFAULT 0,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        supplier_id UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}',
        featured BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rewards_status
      ON rewards_catalog(status, featured DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rewards_points_cost
      ON rewards_catalog(points_cost)
    `);

    // Reward redemptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reward_redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id UUID NOT NULL REFERENCES rewards_catalog(id) ON DELETE CASCADE,
        points_spent INT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        redemption_code VARCHAR(100),
        fulfilled_at TIMESTAMP,
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

    // Reward fulfillment tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reward_fulfillment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        redemption_id UUID NOT NULL UNIQUE REFERENCES reward_redemptions(id) ON DELETE CASCADE,
        fulfillment_method VARCHAR(100) NOT NULL,
        fulfillment_details JSONB DEFAULT '{}',
        fulfillment_date TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Discount codes from points
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        discount_percentage INT,
        discount_amount DECIMAL(10, 2),
        max_uses INT DEFAULT 1,
        current_uses INT DEFAULT 0,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        created_from_redemption_id UUID REFERENCES reward_redemptions(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_discount_codes_user
      ON discount_codes(user_id, valid_until DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_discount_codes_active
      ON discount_codes(valid_from, valid_until)
      WHERE current_uses < max_uses
    `);

    // Points marketplace history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_marketplace_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reward_id UUID REFERENCES rewards_catalog(id) ON DELETE SET NULL,
        points_amount INT NOT NULL,
        usd_value DECIMAL(10, 2),
        transaction_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_user
      ON points_marketplace_transactions(buyer_id, created_at DESC)
    `);

    console.log('✓ Migration 068 completed: Rewards catalog and redemption system created');
  } catch (error) {
    console.error('Migration 068 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS points_marketplace_transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS discount_codes CASCADE');
    await pool.query('DROP TABLE IF EXISTS reward_fulfillment CASCADE');
    await pool.query('DROP TABLE IF EXISTS reward_redemptions CASCADE');
    await pool.query('DROP TABLE IF EXISTS rewards_catalog CASCADE');
    console.log('✓ Migration 068 rolled back');
  } catch (error) {
    console.error('Rollback 068 failed:', error);
    throw error;
  }
  }
};
