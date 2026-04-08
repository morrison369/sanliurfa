/**
 * Migration 104: Marketing Campaigns
 * Email campaigns and campaign management
 */

import { Pool } from 'pg';

export const migration_104_marketing_campaigns = async (pool: Pool) => {
  try {
    // Email campaigns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_name VARCHAR(255) UNIQUE NOT NULL,
        campaign_type VARCHAR(50),
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_line VARCHAR(500) NOT NULL,
        preview_text VARCHAR(255),
        html_content TEXT NOT NULL,
        plain_text_content TEXT,
        from_name VARCHAR(255),
        from_email VARCHAR(255),
        reply_to_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        total_recipients INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        open_count INT DEFAULT 0,
        click_count INT DEFAULT 0,
        bounce_count INT DEFAULT 0,
        unsubscribe_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_status
      ON email_campaigns(status, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled
      ON email_campaigns(scheduled_at) WHERE status = 'scheduled'
    `);

    // Campaign segments (who gets the campaign)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        segment_id UUID NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
        recipient_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, segment_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_segments
      ON campaign_segments(campaign_id, segment_id)
    `);

    // Campaign performance metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        metric_date DATE NOT NULL,
        sent INT DEFAULT 0,
        opened INT DEFAULT 0,
        clicked INT DEFAULT 0,
        bounced INT DEFAULT 0,
        unsubscribed INT DEFAULT 0,
        reported_spam INT DEFAULT 0,
        converted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, metric_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date
      ON campaign_metrics(campaign_id, metric_date DESC)
    `);

    // Campaign recipient tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        bounced_at TIMESTAMP,
        unsubscribed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, recipient_email)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status
      ON campaign_recipients(campaign_id, status, created_at DESC)
    `);

    // Campaign links (for click tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        original_url VARCHAR(2048) NOT NULL,
        tracking_code VARCHAR(255) UNIQUE NOT NULL,
        click_count INT DEFAULT 0,
        unique_click_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_links
      ON campaign_links(campaign_id, tracking_code)
    `);

    console.log('✓ Migration 104 completed: Marketing campaigns tables created');
  } catch (error) {
    console.error('Migration 104 failed:', error);
    throw error;
  }
};

export const rollback_104 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS campaign_links CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_recipients CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_metrics CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_segments CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_campaigns CASCADE');
    console.log('✓ Migration 104 rolled back');
  } catch (error) {
    console.error('Rollback 104 failed:', error);
    throw error;
  }
};
