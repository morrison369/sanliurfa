/**
 * Migrasyon: In-App Notifications
 * Kullanıcılara dönük bildirim sistemi
 */

import type { Migration } from '../lib/migrations';

export const migration_009_notifications: Migration = {
  version: '009_notifications',
  description: 'In-app notifications table',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'info',
        icon VARCHAR(500),
        action_url VARCHAR(500),
        action_label VARCHAR(100),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS notifications CASCADE');
  }
};
