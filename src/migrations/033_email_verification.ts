/**
 * Migration 033: Email Verification System
 * Adds email verification token fields for email verification flow
 */

import type { Migration } from '../lib/migrations';

export const migration_033_email_verification: Migration = {
  version: '033_email_verification',
  description: 'Email verification tokens and tracking',

  up: async (pool: any) => {
    // Add email verification token fields to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64),
      ADD COLUMN IF NOT EXISTS email_verification_token_expires TIMESTAMP
    `);

    // Create index for efficient token lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
      ON users(email_verification_token)
      WHERE email_verification_token IS NOT NULL
    `);

    // Create table for email verification history/audit
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_email VARCHAR(255),
        new_email VARCHAR(255),
        verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_verification_history_user ON email_verification_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_verification_history_status ON email_verification_history(verification_status);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS email_verification_history CASCADE;
    `);

    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS email_verification_token,
      DROP COLUMN IF EXISTS email_verification_token_expires
    `);
  }
};
