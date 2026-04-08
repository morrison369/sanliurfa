/**
 * Migration 110: Security Audit & Session Management
 * Suspicious activity detection, device tracking, and encryption key management
 */

import { Pool } from 'pg';

export const migration_110_security_audit = async (pool: Pool) => {
  try {
    // Security events log (audit trail)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50),
        ip_address INET,
        user_agent VARCHAR(500),
        location VARCHAR(255),
        description TEXT,
        metadata JSONB,
        is_suspicious BOOLEAN DEFAULT false,
        is_reviewed BOOLEAN DEFAULT false,
        reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_user
      ON security_events(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_suspicious
      ON security_events(is_suspicious, created_at DESC) WHERE is_suspicious
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_type
      ON security_events(event_type, created_at DESC)
    `);

    // User sessions (device tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(500) UNIQUE NOT NULL,
        device_name VARCHAR(255),
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),
        ip_address INET,
        location VARCHAR(255),
        is_mobile BOOLEAN DEFAULT false,
        is_trusted BOOLEAN DEFAULT false,
        last_activity_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        invalidated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user
      ON user_sessions(user_id, last_activity_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token
      ON user_sessions(session_token)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires
      ON user_sessions(expires_at) WHERE invalidated_at IS NULL
    `);

    // Trusted devices (skip 2FA on trusted devices)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        device_fingerprint VARCHAR(500),
        ip_address INET,
        user_agent VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP,
        UNIQUE(user_id, device_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trusted_devices_user
      ON trusted_devices(user_id, is_active)
    `);

    // Encryption keys for at-rest data encryption
    await pool.query(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_version INT NOT NULL,
        key_material TEXT NOT NULL,
        algorithm VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        is_rotated BOOLEAN DEFAULT false,
        rotation_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(key_version)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_active
      ON encryption_keys(is_active)
    `);

    // Encrypted fields registry
    await pool.query(`
      CREATE TABLE IF NOT EXISTS encrypted_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name VARCHAR(100) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        record_id UUID NOT NULL,
        key_version INT NOT NULL REFERENCES encryption_keys(key_version),
        is_encrypted BOOLEAN DEFAULT true,
        encrypted_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(table_name, field_name, record_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_encrypted_fields_table
      ON encrypted_fields(table_name, record_id)
    `);

    // Login history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address INET,
        location VARCHAR(255),
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),
        login_method VARCHAR(50),
        is_successful BOOLEAN DEFAULT true,
        failure_reason VARCHAR(255),
        session_duration_seconds INT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_login_history_user
      ON login_history(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_login_history_failed
      ON login_history(user_id, created_at DESC) WHERE NOT is_successful
    `);

    console.log('✓ Migration 110 completed: Security audit and session management tables created');
  } catch (error) {
    console.error('Migration 110 failed:', error);
    throw error;
  }
};

export const rollback_110 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS login_history CASCADE');
    await pool.query('DROP TABLE IF EXISTS encrypted_fields CASCADE');
    await pool.query('DROP TABLE IF EXISTS encryption_keys CASCADE');
    await pool.query('DROP TABLE IF EXISTS trusted_devices CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS security_events CASCADE');
    console.log('✓ Migration 110 rolled back');
  } catch (error) {
    console.error('Rollback 110 failed:', error);
    throw error;
  }
};
