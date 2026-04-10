/**
 * Migration 084: Push Subscriptions Management
 * Web push notification subscriptions
 */

import type { Migration } from '../lib/migrations';

export const migration_084_push_subscriptions: Migration = {
  version: '084_push_subscriptions',
  description: 'Web push notification subscriptions',
  up: async (pool: any) => {
  try {
    // Web push subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint VARCHAR(500) NOT NULL,
        auth_key VARCHAR(255),
        p256dh_key VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        device_type VARCHAR(50),
        device_name VARCHAR(255),
        browser VARCHAR(100),
        os VARCHAR(100),
        last_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
      ON push_subscriptions(user_id, is_active)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
      ON push_subscriptions(is_active, last_verified_at)
    `);

    // Push subscription statistics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscription_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        total_subscriptions INT DEFAULT 0,
        successful_deliveries INT DEFAULT 0,
        failed_deliveries INT DEFAULT 0,
        last_push_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_stats_user
      ON push_subscription_stats(user_id)
    `);

    console.log('✓ Migration 084 completed: Push subscriptions tables created');
  } catch (error) {
    console.error('Migration 084 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS push_subscription_stats CASCADE');
    await pool.query('DROP TABLE IF EXISTS push_subscriptions CASCADE');
    console.log('✓ Migration 084 rolled back');
  } catch (error) {
    console.error('Rollback 084 failed:', error);
    throw error;
  }
  }
};
