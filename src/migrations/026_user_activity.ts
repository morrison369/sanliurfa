/**
 * Migration 026: User Activity Tracking
 * Tracks user actions (reviews, favorites, badges, etc.) for activity feed
 */

import type { Migration } from '../lib/migrations';

export const migration_026_user_activity: Migration = {
  version: '026_user_activity',
  description: 'User activity tracking for feed and analytics',
  async up(pool: any) {
    // User activity table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        reference_type VARCHAR(50),
        reference_id TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id
      ON user_activity(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_action_type
      ON user_activity(action_type, created_at DESC)
    `);

    console.log('✓ Migration 026: User activity table created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS user_activity CASCADE');
    console.log('✓ Migration 026 rolled back');
  }
};
