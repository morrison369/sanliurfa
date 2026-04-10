/**
 * Migration 105: User Segments
 * User segmentation for targeted marketing
 */

import type { Migration } from '../lib/migrations';

export const migration_105_user_segments: Migration = {
  version: '105_user_segments',
  description: 'User segmentation for targeted marketing',
  up: async (pool: any) => {
  try {
    // User segments/groups
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        segment_name VARCHAR(255) UNIQUE NOT NULL,
        segment_key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        segment_rules JSONB,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_count INT DEFAULT 0,
        is_dynamic BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_segments_active
      ON user_segments(is_active, created_at DESC)
    `);

    // Segment membership
    await pool.query(`
      CREATE TABLE IF NOT EXISTS segment_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        segment_id UUID NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(segment_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_segment_members
      ON segment_members(segment_id, added_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_segments
      ON segment_members(user_id, segment_id)
    `);

    // Segment analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS segment_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        segment_id UUID NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
        analytics_date DATE NOT NULL,
        member_count INT DEFAULT 0,
        active_members INT DEFAULT 0,
        engagement_rate FLOAT,
        open_rate FLOAT,
        click_rate FLOAT,
        conversion_rate FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(segment_id, analytics_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_segment_analytics_date
      ON segment_analytics(segment_id, analytics_date DESC)
    `);

    // A/B test variants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ab_test_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        variant_name VARCHAR(255) NOT NULL,
        variant_type VARCHAR(50),
        subject_line VARCHAR(500),
        html_content TEXT,
        variant_percentage INT,
        is_control BOOLEAN DEFAULT false,
        total_sent INT DEFAULT 0,
        opens INT DEFAULT 0,
        clicks INT DEFAULT 0,
        conversions INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, variant_name)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ab_variants_campaign
      ON ab_test_variants(campaign_id)
    `);

    // A/B test results
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ab_test_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
        action_type VARCHAR(50),
        action_timestamp TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ab_test_results
      ON ab_test_results(variant_id, created_at DESC)
    `);

    console.log('✓ Migration 105 completed: User segments tables created');
  } catch (error) {
    console.error('Migration 105 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS ab_test_results CASCADE');
    await pool.query('DROP TABLE IF EXISTS ab_test_variants CASCADE');
    await pool.query('DROP TABLE IF EXISTS segment_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS segment_members CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_segments CASCADE');
    console.log('✓ Migration 105 rolled back');
  } catch (error) {
    console.error('Rollback 105 failed:', error);
    throw error;
  }
  }
};
