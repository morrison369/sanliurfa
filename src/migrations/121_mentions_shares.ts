/**
 * Migration 121: Mentions & Shares
 * User mentions, content sharing, social distribution
 */

import { Pool } from 'pg';

export const migration_121_mentions_shares = async (pool: Pool) => {
  try {
    // User mentions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_mentions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mentioned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type VARCHAR(100),
        content_id UUID,
        context_text TEXT,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mentions_user
      ON user_mentions(mentioned_user_id, is_read, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mentions_by_user
      ON user_mentions(mentioned_by_user_id, created_at DESC)
    `);

    // Content shares
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type VARCHAR(100),
        content_id UUID NOT NULL,
        share_type VARCHAR(50),
        share_message TEXT,
        share_platform VARCHAR(100),
        shared_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shares_user
      ON content_shares(shared_by_user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shares_content
      ON content_shares(content_type, content_id, created_at DESC)
    `);

    // Share analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS share_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type VARCHAR(100),
        content_id UUID,
        share_count INT DEFAULT 0,
        view_count_from_shares INT DEFAULT 0,
        engagement_rate FLOAT,
        last_shared_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(content_type, content_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_share_analytics_count
      ON share_analytics(share_count DESC)
    `);

    // Mention notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mention_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mention_id UUID NOT NULL REFERENCES user_mentions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mention_notif_user
      ON mention_notifications(user_id, notification_sent)
    `);

    console.log('✓ Migration 121 completed: Mentions and shares tables created');
  } catch (error) {
    console.error('Migration 121 failed:', error);
    throw error;
  }
};

export const rollback_121 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS mention_notifications CASCADE');
    await pool.query('DROP TABLE IF EXISTS share_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_shares CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_mentions CASCADE');
    console.log('✓ Migration 121 rolled back');
  } catch (error) {
    console.error('Rollback 121 failed:', error);
    throw error;
  }
};
