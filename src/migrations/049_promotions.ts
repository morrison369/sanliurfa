/**
 * Migration 049: Business Promotions & Coupons System
 * Allow place owners to create and manage promotional offers
 */

import type { Migration } from '../lib/migrations';

export const migration_049_promotions: Migration = {
  version: '049_promotions',
  description: 'Business promotions and coupon management',
  async up(pool: any) {
    // Promotions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        coupon_code VARCHAR(50) UNIQUE,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        minimum_purchase DECIMAL(10, 2),
        applicable_categories TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_promotions_place
      ON promotions(place_id, is_active)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_promotions_coupon
      ON promotions(coupon_code) WHERE coupon_code IS NOT NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_promotions_dates
      ON promotions(start_date, end_date)
    `);

    // Promotion redemptions tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotion_redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        discount_amount DECIMAL(10, 2),
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(promotion_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_redemptions_promotion
      ON promotion_redemptions(promotion_id, redeemed_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_redemptions_user
      ON promotion_redemptions(user_id, redeemed_at DESC)
    `);

    console.log('✓ Migration 049: Promotions system created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS promotion_redemptions CASCADE');
    await pool.query('DROP TABLE IF EXISTS promotions CASCADE');
    console.log('✓ Migration 049 rolled back');
  }
};
