/**
 * Migration 172: Loyalty Tiers Schema Alignment
 * Align legacy 066 loyalty_tiers table with the 095+ runtime contract.
 */

import { Pool } from 'pg';

export const migration_172_loyalty_tiers_schema_alignment = async (pool: Pool) => {
  try {
    await pool.query(`
      ALTER TABLE loyalty_tiers
      ADD COLUMN IF NOT EXISTS tier_key VARCHAR(100),
      ADD COLUMN IF NOT EXISTS min_points_required INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS points_multiplier FLOAT DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS color VARCHAR(20),
      ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS perks JSONB,
      ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS birthday_bonus INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS annual_gift_points INT DEFAULT 0
    `);

    await pool.query(`
      UPDATE loyalty_tiers
      SET
        tier_key = COALESCE(
          tier_key,
          regexp_replace(lower(tier_name), '[^a-z0-9]+', '-', 'g')
        ),
        min_points_required = COALESCE(min_points_required, min_points, 0),
        points_multiplier = COALESCE(points_multiplier, point_multiplier::float, 1.0),
        icon_url = COALESCE(icon_url, badge_icon_url),
        perks = COALESCE(perks, benefits, '{}'::jsonb),
        display_order = COALESCE(display_order, tier_level, 0),
        is_active = COALESCE(is_active, true)
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS loyalty_tiers_tier_key_idx
      ON loyalty_tiers(tier_key)
      WHERE tier_key IS NOT NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_min_points_required
      ON loyalty_tiers(min_points_required)
    `);

    console.log('✓ Migration 172 completed: loyalty tiers schema aligned');
  } catch (error) {
    console.error('Migration 172 failed:', error);
    throw error;
  }
};

export const rollback_172 = async (pool: Pool) => {
  try {
    await pool.query('DROP INDEX IF EXISTS idx_loyalty_tiers_min_points_required');
    await pool.query('DROP INDEX IF EXISTS loyalty_tiers_tier_key_idx');
    console.log('✓ Migration 172 rolled back');
  } catch (error) {
    console.error('Rollback 172 failed:', error);
    throw error;
  }
};
