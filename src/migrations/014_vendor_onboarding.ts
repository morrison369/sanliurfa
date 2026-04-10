/**
 * Migration 014: Vendor Onboarding Tables
 * Creates tables for vendor onboarding and progress tracking
 */

import type { Migration } from '../lib/migrations';

export const migration_014_vendor_onboarding: Migration = {
  version: '014_vendor_onboarding',
  description: 'Vendor onboarding tables and progress tracking',
  async up(pool: any) {
    // Add vendor_onboarded flag to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS vendor_onboarded BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_vendor BOOLEAN DEFAULT false
    `);

    // Create onboarding_progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS onboarding_progress (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        step INTEGER NOT NULL,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, step)
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id
      ON onboarding_progress(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_step
      ON onboarding_progress(step)
    `);

    // Add rejection_reason column to vendor_profiles
    await pool.query(`
      ALTER TABLE vendor_profiles
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);

    console.log('✓ Migration 014: Vendor onboarding tables created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS onboarding_progress CASCADE');
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS vendor_onboarded,
      DROP COLUMN IF EXISTS is_vendor
    `);
    await pool.query(`
      ALTER TABLE vendor_profiles
      DROP COLUMN IF EXISTS rejection_reason
    `);
    console.log('✓ Migration 014 rolled back');
  }
};
