/**
 * Migrasyon: Web Push Subscriptions
 * Push bildirimleri için cihaz aboneliklerinin depolanması
 */

import type { Migration } from '../lib/migrations';

export const migration_008_push_subscriptions: Migration = {
  version: '008_push_subscriptions',
  description: 'Web push subscriptions tablosu',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint VARCHAR(500) NOT NULL UNIQUE,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_expires_at ON push_subscriptions(expires_at);
    `);

    // Push notification log tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        body TEXT,
        icon VARCHAR(500),
        badge VARCHAR(500),
        tag VARCHAR(100),
        data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at ON push_notifications(created_at DESC);
    `);

    // Push delivery log (hangi cihaza gönderildi)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
        subscription_id UUID NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_push_deliveries_notification_id ON push_deliveries(notification_id);
      CREATE INDEX IF NOT EXISTS idx_push_deliveries_subscription_id ON push_deliveries(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_push_deliveries_status ON push_deliveries(status);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS push_deliveries CASCADE');
    await pool.query('DROP TABLE IF EXISTS push_notifications CASCADE');
    await pool.query('DROP TABLE IF EXISTS push_subscriptions CASCADE');
  }
};
