/**
 * Migration 085: In-app Notification History & Archive
 * Notification history, read status, and archiving
 */

import type { Migration } from '../lib/migrations';

export const migration_085_notification_history: Migration = {
  version: '085_notification_history',
  description: 'Notification history, read status, and archiving',
  up: async (pool: any) => {
  try {
    // Notification history and center
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        data JSONB,
        action_url VARCHAR(500),
        related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        related_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        is_archived BOOLEAN DEFAULT false,
        archived_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_history_user
      ON notification_history(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_history_unread
      ON notification_history(user_id, is_read) WHERE is_read = false
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_history_archived
      ON notification_history(user_id, is_archived) WHERE is_archived = false
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_history_type
      ON notification_history(user_id, notification_type, created_at DESC)
    `);

    // Notification grouping (for digest/batching)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_type VARCHAR(50) NOT NULL,
        group_key VARCHAR(255),
        notification_count INT DEFAULT 0,
        is_sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, group_type, group_key)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_groups_user
      ON notification_groups(user_id, group_type)
    `);

    // Notification templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_key VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        message_template TEXT,
        icon VARCHAR(100),
        color VARCHAR(20),
        action_button_text VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_templates_active
      ON notification_templates(is_active)
    `);

    console.log('✓ Migration 085 completed: Notification history tables created');
  } catch (error) {
    console.error('Migration 085 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS notification_templates CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_groups CASCADE');
    await pool.query('DROP TABLE IF EXISTS notification_history CASCADE');
    console.log('✓ Migration 085 rolled back');
  } catch (error) {
    console.error('Rollback 085 failed:', error);
    throw error;
  }
  }
};
