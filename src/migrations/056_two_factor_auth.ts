/**
 * Migration 056: Two-Factor Authentication
 * Add TOTP-based 2FA support with backup codes
 */

import type { Migration } from '../lib/migrations';

export const migration_056_two_factor_auth: Migration = {
  version: '056_two_factor_auth',
  description: 'Two-factor authentication support with trusted devices and audit',
  up: async (pool: any) => {
    try {
    // Add 2FA columns to users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_2fa_at TIMESTAMP;
    `);

    // Device trust table (for "remember this device" feature)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        user_agent TEXT,
        trusted_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        UNIQUE(user_id, device_fingerprint)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id, expires_at DESC);
    `);

    // 2FA audit log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS two_factor_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_2fa_audit_user ON two_factor_audit(user_id, created_at DESC);
    `);

    console.log('✓ Migration 056 completed: Two-factor authentication support added');
  } catch (error) {
    console.error('Migration 056 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
    try {
    await pool.query('DROP TABLE IF EXISTS two_factor_audit CASCADE');
    await pool.query('DROP TABLE IF EXISTS trusted_devices CASCADE');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS last_2fa_at');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS two_factor_backup_codes');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS two_factor_secret');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled');

    console.log('✓ Migration 056 rolled back');
  } catch (error) {
    console.error('Rollback 056 failed:', error);
    throw error;
  }
  }
};
