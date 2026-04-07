/**
 * Migrasyon: Webhook Sistemi
 * Dış servislere bildirim göndermek için
 */

import type { Migration } from '../lib/migrations';

export const migration_004_webhooks: Migration = {
  version: '004_webhooks',
  description: 'Webhook sistemi: dış servislere bildirim gönderme',

  up: async (pool: any) => {
    // Webhook endpoints tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        events TEXT[] NOT NULL,
        active BOOLEAN DEFAULT true,
        secret VARCHAR(255),
        retry_count INTEGER DEFAULT 3,
        timeout_ms INTEGER DEFAULT 5000,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
    `);

    // Webhook deliveries tablosu (gönderilen bildirimlerin geçmişi)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status_code INTEGER,
        response_body TEXT,
        error_message TEXT,
        attempts INTEGER DEFAULT 1,
        next_retry_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at);
    `);

    // Webhook events tablosu (hangi eventleri dinleyebiliriz)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        example_payload JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Varsayılan eventler
      INSERT INTO webhook_events (event_name, description, example_payload)
      VALUES
        ('place.created', 'Yeni yer eklendi', '{"placeId":"uuid","name":"Göbekli Tepe","category":"Historical"}'),
        ('place.updated', 'Yer bilgisi güncellendi', '{"placeId":"uuid","changes":{"name":"...","rating":5}}'),
        ('place.deleted', 'Yer silindi', '{"placeId":"uuid","name":"..."}'),
        ('review.created', 'Yeni yorum eklendi', '{"reviewId":"uuid","placeId":"uuid","rating":5}'),
        ('review.deleted', 'Yorum silindi', '{"reviewId":"uuid","placeId":"uuid"}'),
        ('blog.published', 'Blog yazısı yayınlandı', '{"postId":"uuid","title":"..."}'),
        ('event.created', 'Yeni etkinlik eklendi', '{"eventId":"uuid","title":"..."}'),
        ('user.registered', 'Yeni kullanıcı kaydoldu', '{"userId":"uuid","email":"..."}')
      ON CONFLICT (event_name) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS webhook_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS webhook_deliveries CASCADE');
    await pool.query('DROP TABLE IF EXISTS webhooks CASCADE');
  }
};
