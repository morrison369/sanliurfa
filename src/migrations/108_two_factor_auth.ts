/**
 * Migration 108: Two-Factor Authentication
 * Support for TOTP, email, and SMS-based 2FA
 */

import type { Migration } from '../lib/migrations';

export const migration_108_two_factor_auth: Migration = {
  version: '108_two_factor_auth',
  description: 'Support for TOTP, email, and SMS-based 2FA',
  up: async (pool: any) => {
  try {
    // 2FA methods per user
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_2fa_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method_type VARCHAR(50) NOT NULL,
        method_identifier VARCHAR(255),
        secret_key VARCHAR(500),
        is_verified BOOLEAN DEFAULT false,
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        backup_codes TEXT[],
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, method_type, method_identifier)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_2fa_methods_user
      ON user_2fa_methods(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_2fa_methods_primary
      ON user_2fa_methods(user_id) WHERE is_primary
    `);

    // 2FA verification attempts and sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_2fa_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(500) UNIQUE NOT NULL,
        method_id UUID REFERENCES user_2fa_methods(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent VARCHAR(500),
        verified_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_user
      ON user_2fa_sessions(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_token
      ON user_2fa_sessions(session_token)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_expires
      ON user_2fa_sessions(expires_at) WHERE verified_at IS NULL
    `);

    // Failed verification attempts (rate limiting)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS two_fa_verification_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES user_2fa_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempt_count INT DEFAULT 1,
        last_attempt_at TIMESTAMP DEFAULT NOW(),
        is_locked BOOLEAN DEFAULT false,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_2fa_attempts_user
      ON two_fa_verification_attempts(user_id, last_attempt_at DESC)
    `);

    // Recovery codes for account recovery
    await pool.query(`
      CREATE TABLE IF NOT EXISTS two_fa_recovery_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(255) NOT NULL,
        is_used BOOLEAN DEFAULT false,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recovery_codes_user
      ON two_fa_recovery_codes(user_id) WHERE NOT is_used
    `);

    console.log('✓ Migration 108 completed: Two-factor authentication tables created');
  } catch (error) {
    console.error('Migration 108 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS two_fa_recovery_codes CASCADE');
    await pool.query('DROP TABLE IF EXISTS two_fa_verification_attempts CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_2fa_sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_2fa_methods CASCADE');
    console.log('✓ Migration 108 rolled back');
  } catch (error) {
    console.error('Rollback 108 failed:', error);
    throw error;
  }
  }
};
