/**
 * Migration 107: OAuth Support
 * OAuth 2.0 / OpenID Connect integration with multiple providers
 */

import type { Migration } from '../lib/migrations';

export const migration_107_oauth_support: Migration = {
  version: '107_oauth_support',
  description: 'OAuth 2.0 / OpenID Connect integration with multiple providers',
  up: async (pool: any) => {
  try {
    // OAuth provider configurations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_name VARCHAR(100) UNIQUE NOT NULL,
        provider_key VARCHAR(100) UNIQUE NOT NULL,
        client_id VARCHAR(500) NOT NULL,
        client_secret VARCHAR(500) NOT NULL,
        auth_url VARCHAR(500) NOT NULL,
        token_url VARCHAR(500) NOT NULL,
        userinfo_url VARCHAR(500) NOT NULL,
        scope VARCHAR(500),
        is_enabled BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_providers_enabled
      ON oauth_providers(is_enabled)
    `);

    // User OAuth linked accounts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_oauth_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_key VARCHAR(100) NOT NULL,
        provider_user_id VARCHAR(500) NOT NULL,
        provider_email VARCHAR(255),
        provider_name VARCHAR(255),
        provider_avatar_url VARCHAR(500),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        is_primary BOOLEAN DEFAULT false,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, provider_key),
        UNIQUE(provider_key, provider_user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_user
      ON user_oauth_accounts(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_provider
      ON user_oauth_accounts(provider_key, provider_user_id)
    `);

    // OAuth authorization states (CSRF protection)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        state_token VARCHAR(500) UNIQUE NOT NULL,
        provider_key VARCHAR(100) NOT NULL,
        redirect_uri VARCHAR(500),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        is_used BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_states_token
      ON oauth_states(state_token)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_states_expires
      ON oauth_states(expires_at) WHERE NOT is_used
    `);

    console.log('✓ Migration 107 completed: OAuth support tables created');
  } catch (error) {
    console.error('Migration 107 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS oauth_states CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_oauth_accounts CASCADE');
    await pool.query('DROP TABLE IF EXISTS oauth_providers CASCADE');
    console.log('✓ Migration 107 rolled back');
  } catch (error) {
    console.error('Rollback 107 failed:', error);
    throw error;
  }
  }
};
