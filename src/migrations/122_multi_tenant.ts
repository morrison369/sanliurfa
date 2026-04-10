/**
 * Migration 122: Multi-Tenant White-Label Support
 * Tenant management, branding, isolation, custom domains
 */

import type { Migration } from '../lib/migrations';

export const migration_122_multi_tenant: Migration = {
  version: '122_multi_tenant',
  description: 'Tenant management, branding, isolation, custom domains',
  up: async (pool: any) => {
  try {
    // Tenants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        subscription_tier VARCHAR(50) DEFAULT 'free',
        custom_domain VARCHAR(255),
        logo_url TEXT,
        favicon_url TEXT,
        is_white_label BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_owner
      ON tenants(owner_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_slug
      ON tenants(slug)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
      ON tenants(custom_domain)
    `);

    // Tenant branding
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_branding (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
        primary_color VARCHAR(7) DEFAULT '#3B82F6',
        secondary_color VARCHAR(7) DEFAULT '#1F2937',
        accent_color VARCHAR(7) DEFAULT '#F59E0B',
        font_family VARCHAR(100) DEFAULT 'system-ui',
        logo_url TEXT,
        favicon_url TEXT,
        banner_image_url TEXT,
        footer_text TEXT,
        custom_css TEXT,
        hide_branding BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant
      ON tenant_branding(tenant_id)
    `);

    // Tenant features (feature toggles)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        feature_key VARCHAR(100) NOT NULL,
        enabled BOOLEAN DEFAULT false,
        config JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, feature_key)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant
      ON tenant_features(tenant_id)
    `);

    // Tenant members (multi-user per tenant)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        permissions VARCHAR(255)[],
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant
      ON tenant_members(tenant_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_members_user
      ON tenant_members(user_id)
    `);

    // Tenant API keys
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(100),
        permissions VARCHAR(255)[],
        rate_limit_per_hour INT DEFAULT 1000,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant
      ON tenant_api_keys(tenant_id)
    `);

    // Tenant settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
        default_language VARCHAR(10) DEFAULT 'tr',
        timezone VARCHAR(100) DEFAULT 'Europe/Istanbul',
        data_retention_days INT DEFAULT 365,
        enable_analytics BOOLEAN DEFAULT true,
        enable_webhooks BOOLEAN DEFAULT true,
        max_users INT,
        max_places INT,
        max_storage_gb INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant
      ON tenant_settings(tenant_id)
    `);

    // Tenant audit log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id UUID,
        changes JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_audit_tenant
      ON tenant_audit_logs(tenant_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_audit_user
      ON tenant_audit_logs(user_id, created_at DESC)
    `);

    console.log('✓ Migration 122 completed: Multi-tenant tables created');
  } catch (error) {
    console.error('Migration 122 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS tenant_audit_logs CASCADE');
    await pool.query('DROP TABLE IF EXISTS tenant_settings CASCADE');
    await pool.query('DROP TABLE IF EXISTS tenant_api_keys CASCADE');
    await pool.query('DROP TABLE IF EXISTS tenant_members CASCADE');
    await pool.query('DROP TABLE IF EXISTS tenant_features CASCADE');
    await pool.query('DROP TABLE IF EXISTS tenant_branding CASCADE');
    await pool.query('DROP TABLE IF EXISTS tenants CASCADE');
    console.log('✓ Migration 122 rolled back');
  } catch (error) {
    console.error('Rollback 122 failed:', error);
    throw error;
  }
  }
};
