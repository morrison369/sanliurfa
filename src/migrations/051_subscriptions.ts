/**
 * Migration 051: Premium Subscription System
 * Implement tiered subscription model for users and place owners
 */

import type { Migration } from '../lib/migrations';

export const migration_051_subscriptions: Migration = {
  version: '051_subscriptions',
  description: 'Tiered subscriptions, billing history, and feature access',
  async up(pool: any) {
    // Subscription tiers definition
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        monthly_price DECIMAL(10, 2) NOT NULL,
        annual_price DECIMAL(10, 2),
        tier_level INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Features available per tier
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier_id UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
        feature_name VARCHAR(100) NOT NULL,
        feature_limit INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tier_id, feature_name)
      )
    `);

    // Active subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
        subscription_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        auto_renew BOOLEAN DEFAULT true,
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        next_billing_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user
      ON subscriptions(user_id, status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_tier
      ON subscriptions(tier_id, status)
    `);

    // Billing history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TRY',
        payment_status VARCHAR(20) DEFAULT 'pending',
        invoice_number VARCHAR(100) UNIQUE,
        stripe_invoice_id VARCHAR(255),
        billing_period_start TIMESTAMP,
        billing_period_end TIMESTAMP,
        payment_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_user
      ON billing_history(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_subscription
      ON billing_history(subscription_id, created_at DESC)
    `);

    // Feature access control per user
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        feature_name VARCHAR(100) NOT NULL,
        access_level VARCHAR(20) DEFAULT 'standard',
        limit_value INTEGER,
        current_usage INTEGER DEFAULT 0,
        reset_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, feature_name)
      )
    `);

    // Insert default tiers
    await pool.query(`
      INSERT INTO subscription_tiers (name, display_name, description, monthly_price, annual_price, tier_level, is_active)
      VALUES
        ('free', 'Ücretsiz', 'Temel özellikler', 0, 0, 0, true),
        ('basic', 'Başlangıç', 'Geliştirilmiş arama ve filtreler', 9.99, 99.99, 1, true),
        ('pro', 'Profesyonel', 'Mekan sahipleri için analytics ve promosyon', 29.99, 299.99, 2, true),
        ('enterprise', 'Kurumsal', 'Sınırsız özellikler ve öncelikli destek', 99.99, 999.99, 3, true)
      ON CONFLICT DO NOTHING
    `);

    console.log('✓ Migration 051: Subscription system created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS feature_access CASCADE');
    await pool.query('DROP TABLE IF EXISTS billing_history CASCADE');
    await pool.query('DROP TABLE IF EXISTS subscriptions CASCADE');
    await pool.query('DROP TABLE IF EXISTS tier_features CASCADE');
    await pool.query('DROP TABLE IF EXISTS subscription_tiers CASCADE');
    console.log('✓ Migration 051 rolled back');
  }
};
