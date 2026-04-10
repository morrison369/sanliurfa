/**
 * Migration 083: User Management & Activity Audit
 * User audit logging, account flags, and admin session tracking
 */

import type { Migration } from '../lib/migrations';

export const migration_083_user_management_audit: Migration = {
  version: '083_user_management_audit',
  description: 'User audit logging, account flags, and admin session tracking',
  up: async (pool: any) => {
  try {
    // User audit log (track all admin actions on users)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        action_details JSONB,
        changes JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_audit_log_admin
      ON user_audit_log(admin_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_audit_log_target
      ON user_audit_log(target_user_id, created_at DESC)
    `);

    // Account flags and restrictions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        flag_type VARCHAR(50) NOT NULL,
        reason TEXT,
        severity VARCHAR(50) DEFAULT 'medium',
        flagged_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_account_flags_active
      ON account_flags(is_active, expires_at)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_account_flags_user
      ON account_flags(user_id, is_active)
    `);

    // Admin session tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        location VARCHAR(255),
        country VARCHAR(100),
        city VARCHAR(100),
        last_activity_at TIMESTAMP DEFAULT NOW(),
        logged_out_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin
      ON admin_sessions(admin_id, last_activity_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_active
      ON admin_sessions(logged_out_at) WHERE logged_out_at IS NULL
    `);

    // User activity summary (for admin viewing user stats)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        last_login_at TIMESTAMP,
        last_activity_at TIMESTAMP,
        post_count INT DEFAULT 0,
        comment_count INT DEFAULT 0,
        review_count INT DEFAULT 0,
        report_count INT DEFAULT 0,
        flagged_count INT DEFAULT 0,
        suspension_count INT DEFAULT 0,
        warning_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_summary_activity
      ON user_activity_summary(last_activity_at DESC)
    `);

    console.log('✓ Migration 083 completed: User management audit tables created');
  } catch (error) {
    console.error('Migration 083 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS user_activity_summary CASCADE');
    await pool.query('DROP TABLE IF EXISTS admin_sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS account_flags CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_audit_log CASCADE');
    console.log('✓ Migration 083 rolled back');
  } catch (error) {
    console.error('Rollback 083 failed:', error);
    throw error;
  }
  }
};
