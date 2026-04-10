/**
 * Migration 045: Place Verification System
 * Manages place verification status and trust badges
 */

import type { Migration } from '../lib/migrations';

export const migration_045_place_verification: Migration = {
  version: '045_place_verification',
  description: 'Place verification workflow and status tracking',
  async up(pool: any) {
    // Place verification table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_verification (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID UNIQUE NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMP,
        reason TEXT,
        documents JSONB DEFAULT '[]',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_status
      ON place_verification(status, requested_at DESC)
    `);

    // Add verification_status column to places table
    await pool.query(`
      ALTER TABLE places
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified'
    `);

    console.log('✓ Migration 045: Place verification system created');
  },

  async down(pool: any) {
    await pool.query('ALTER TABLE places DROP COLUMN IF EXISTS verification_status');
    await pool.query('DROP TABLE IF EXISTS place_verification CASCADE');
    console.log('✓ Migration 045 rolled back');
  }
};
