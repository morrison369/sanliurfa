/**
 * Migration 053: Subscription Admin Tools
 * Add tables for admin logs and subscription event tracking
 */

import { Pool } from 'pg';

export const migration_053_subscription_admin = async (pool: Pool) => {
  try {
    // Admin activity logs (audit trail)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_subscription_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        target_subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
        details JSONB,
        notes TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_subscription_logs_admin
      ON admin_subscription_logs(admin_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_subscription_logs_user
      ON admin_subscription_logs(target_user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_subscription_logs_action
      ON admin_subscription_logs(action, created_at DESC)
    `);

    // Subscription events (for analytics)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        old_tier_id UUID REFERENCES subscription_tiers(id),
        new_tier_id UUID REFERENCES subscription_tiers(id),
        amount DECIMAL(10, 2),
        currency VARCHAR(3),
        reason VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription
      ON subscription_events(subscription_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_events_user
      ON subscription_events(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_events_type
      ON subscription_events(event_type, created_at DESC)
    `);

    // Refund requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refund_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        billing_id UUID NOT NULL REFERENCES billing_history(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        reason VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        admin_notes TEXT,
        processed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_refund_requests_user
      ON refund_requests(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_refund_requests_status
      ON refund_requests(status, created_at DESC)
    `);

    // Webhook delivery tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        stripe_event_id VARCHAR(255),
        payload JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        http_status INTEGER,
        response_body TEXT,
        retry_count INTEGER DEFAULT 0,
        next_retry_at TIMESTAMP,
        last_tried_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
      ON webhook_deliveries(status, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type
      ON webhook_deliveries(event_type, created_at DESC)
    `);

    console.log('✓ Migration 053 completed: Admin subscription tools created');
  } catch (error) {
    console.error('Migration 053 failed:', error);
    throw error;
  }
};

export const rollback_053 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS webhook_deliveries CASCADE');
    await pool.query('DROP TABLE IF EXISTS refund_requests CASCADE');
    await pool.query('DROP TABLE IF EXISTS subscription_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS admin_subscription_logs CASCADE');

    console.log('✓ Migration 053 rolled back');
  } catch (error) {
    console.error('Rollback 053 failed:', error);
    throw error;
  }
};
