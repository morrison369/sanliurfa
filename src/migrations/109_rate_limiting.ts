/**
 * Migration 109: Rate Limiting & IP Management
 * API rate limiting, IP whitelist/blacklist, and DDoS protection
 */

import { Pool } from 'pg';

export const migration_109_rate_limiting = async (pool: Pool) => {
  try {
    // API rate limit rules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ip_address INET,
        endpoint_pattern VARCHAR(255),
        requests_per_minute INT DEFAULT 60,
        requests_per_hour INT DEFAULT 1000,
        requests_per_day INT DEFAULT 10000,
        is_active BOOLEAN DEFAULT true,
        is_whitelisted BOOLEAN DEFAULT false,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, endpoint_pattern)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_user
      ON api_rate_limits(user_id, is_active)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_ip
      ON api_rate_limits(ip_address, is_active)
    `);

    // Request tracking for rate limiting
    await pool.query(`
      CREATE TABLE IF NOT EXISTS request_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10),
        status_code INT,
        response_time_ms INT,
        request_size_bytes INT,
        response_size_bytes INT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_request_metrics_timestamp
      ON request_metrics(timestamp DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_request_metrics_user
      ON request_metrics(user_id, timestamp DESC) WHERE user_id IS NOT NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_request_metrics_ip
      ON request_metrics(ip_address, timestamp DESC)
    `);

    // IP whitelist (trusted IPs, partners, internal)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_whitelist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address INET NOT NULL,
        ip_range CIDR,
        name VARCHAR(255),
        description TEXT,
        reason VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(ip_address)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_whitelist_active
      ON ip_whitelist(is_active)
    `);

    // IP blacklist (blocked IPs, attackers)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address INET NOT NULL,
        ip_range CIDR,
        name VARCHAR(255),
        reason VARCHAR(100),
        severity VARCHAR(50),
        block_reason TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP,
        abuse_reports_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(ip_address)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_blacklist_active
      ON ip_blacklist(is_active)
    `);

    // DDoS attempt tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ddos_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address INET NOT NULL,
        endpoint VARCHAR(255),
        request_count INT DEFAULT 1,
        time_window_seconds INT DEFAULT 60,
        severity VARCHAR(50),
        is_mitigated BOOLEAN DEFAULT false,
        mitigation_action VARCHAR(100),
        first_attempt_at TIMESTAMP DEFAULT NOW(),
        last_attempt_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ddos_attempts_ip
      ON ddos_attempts(ip_address, last_attempt_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ddos_attempts_active
      ON ddos_attempts(is_mitigated) WHERE NOT is_mitigated
    `);

    console.log('✓ Migration 109 completed: Rate limiting and IP management tables created');
  } catch (error) {
    console.error('Migration 109 failed:', error);
    throw error;
  }
};

export const rollback_109 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS ddos_attempts CASCADE');
    await pool.query('DROP TABLE IF EXISTS ip_blacklist CASCADE');
    await pool.query('DROP TABLE IF EXISTS ip_whitelist CASCADE');
    await pool.query('DROP TABLE IF EXISTS request_metrics CASCADE');
    await pool.query('DROP TABLE IF EXISTS api_rate_limits CASCADE');
    console.log('✓ Migration 109 rolled back');
  } catch (error) {
    console.error('Rollback 109 failed:', error);
    throw error;
  }
};
