/**
 * Migration 073: Email Campaigns
 * Complete email marketing campaign infrastructure
 */

import type { Migration } from '../lib/migrations';

export const migration_073_email_campaigns: Migration = {
  version: '073_email_campaigns',
  description: 'Complete email marketing campaign infrastructure',
  up: async (pool: any) => {
  try {
    // Email campaigns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        campaign_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        subject_line TEXT NOT NULL,
        preview_text VARCHAR(255),
        html_content TEXT NOT NULL,
        plain_text_content TEXT,
        from_name VARCHAR(255),
        from_email VARCHAR(255) NOT NULL,
        reply_to_email VARCHAR(255),
        target_segments JSONB DEFAULT '[]',
        scheduling_info JSONB,
        budget_cents INT,
        spent_cents INT DEFAULT 0,
        send_count INT DEFAULT 0,
        open_count INT DEFAULT 0,
        click_count INT DEFAULT 0,
        conversion_count INT DEFAULT 0,
        bounce_count INT DEFAULT 0,
        unsubscribe_count INT DEFAULT 0,
        complaint_count INT DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for campaigns
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_user
      ON email_campaigns(user_id, status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_status
      ON email_campaigns(status, created_at DESC)
    `);

    // Campaign performance metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        metric_date DATE NOT NULL,
        sends INT DEFAULT 0,
        opens INT DEFAULT 0,
        clicks INT DEFAULT 0,
        conversions INT DEFAULT 0,
        bounces INT DEFAULT 0,
        unsubscribes INT DEFAULT 0,
        complaints INT DEFAULT 0,
        revenue_cents INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, metric_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign
      ON campaign_performance(campaign_id, metric_date DESC)
    `);

    // Campaign targeting rules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_targeting_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        rule_type VARCHAR(50) NOT NULL,
        field VARCHAR(255) NOT NULL,
        operator VARCHAR(50) NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_targeting_campaign
      ON campaign_targeting_rules(campaign_id)
    `);

    // Campaign budget allocation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE UNIQUE,
        budget_cents INT NOT NULL,
        spent_cents INT DEFAULT 0,
        cost_per_1000 INT,
        daily_limit_cents INT,
        allocated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_budgets_campaign
      ON campaign_budgets(campaign_id)
    `);

    // Campaign events (opens, clicks, conversions tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
        recipient_email VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign
      ON campaign_events(campaign_id, event_type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_events_recipient
      ON campaign_events(recipient_id, created_at DESC)
    `);

    // A/B test variants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        variant_name VARCHAR(255) NOT NULL,
        is_control BOOLEAN DEFAULT false,
        subject_line TEXT NOT NULL,
        html_content TEXT NOT NULL,
        send_percentage INT DEFAULT 50,
        winner BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, variant_name)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign
      ON campaign_variants(campaign_id)
    `);

    // Campaign subscriber list
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        bounced_at TIMESTAMP,
        unsubscribed_at TIMESTAMP,
        complained_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_subscribers_campaign
      ON campaign_subscribers(campaign_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_subscribers_email
      ON campaign_subscribers(campaign_id, email)
    `);

    console.log('✓ Migration 073 completed: Email campaigns system created');
  } catch (error) {
    console.error('Migration 073 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS campaign_subscribers CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_variants CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_budgets CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_targeting_rules CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_performance CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_campaigns CASCADE');
    console.log('✓ Migration 073 rolled back');
  } catch (error) {
    console.error('Rollback 073 failed:', error);
    throw error;
  }
  }
};
