/**
 * Migration 121: Notifications System
 */

import { Pool } from 'pg';

export const migration_121_notifications = async (pool: Pool) => {
  try {
    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        read_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user 
      ON notifications(user_id, read, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_unread 
      ON notifications(user_id, read) WHERE read = false
    `);

    console.log('✓ Migration 121 completed: Notifications table created');
  } catch (error) {
    console.error('Migration 121 failed:', error);
    throw error;
  }
};

export const rollback_121 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS notifications CASCADE');
    console.log('✓ Migration 121 rolled back');
  } catch (error) {
    console.error('Rollback 121 failed:', error);
    throw error;
  }
};
