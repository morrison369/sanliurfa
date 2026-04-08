/**
 * Migration 074: Email Queue & Delivery
 * Email queue management and delivery tracking
 */

import { Pool } from 'pg';

export const migration_074_email_queue = async (pool: Pool) => {
  try {
    // Email queue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_email VARCHAR(255) NOT NULL,
        recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subject TEXT NOT NULL,
        html_content TEXT NOT NULL,
        plain_text_content TEXT,
        template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
        message_type VARCHAR(50) NOT NULL,
        priority INT DEFAULT 5,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        delivery_attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        last_error TEXT,
        last_attempt_at TIMESTAMP,
        scheduled_for TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for queue
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status
      ON email_queue(status, priority DESC, created_at ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_campaign
      ON email_queue(campaign_id, status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled
      ON email_queue(status, scheduled_for ASC)
      WHERE status IN ('pending', 'scheduled')
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_recipient
      ON email_queue(recipient_email, status)
    `);

    // Email delivery logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_delivery_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_id UUID NOT NULL REFERENCES email_queue(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        status_code INT,
        response_body TEXT,
        provider VARCHAR(50),
        provider_message_id VARCHAR(255),
        attempt_number INT DEFAULT 1,
        error_type VARCHAR(100),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_logs_queue
      ON email_delivery_logs(queue_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_logs_status
      ON email_delivery_logs(status, created_at DESC)
    `);

    // Email bounce tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_bounces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_address VARCHAR(255) NOT NULL,
        bounce_type VARCHAR(50) NOT NULL,
        bounce_subtype VARCHAR(100),
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
        bounce_reason TEXT,
        provider_bounce_id VARCHAR(255),
        bounced_at TIMESTAMP NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_permanent BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(email_address, bounce_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bounces_email
      ON email_bounces(email_address)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bounces_campaign
      ON email_bounces(campaign_id, bounced_at DESC)
    `);

    // Email complaints (spam/abuse reports)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_complaints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_address VARCHAR(255) NOT NULL,
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
        complaint_feedback_type VARCHAR(100),
        provider_complaint_id VARCHAR(255),
        complained_at TIMESTAMP NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(email_address, campaign_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_email
      ON email_complaints(email_address)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_campaign
      ON email_complaints(campaign_id, complained_at DESC)
    `);

    // Email suppression list
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_suppression_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_address VARCHAR(255) NOT NULL UNIQUE,
        suppression_reason VARCHAR(100) NOT NULL,
        added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_suppression_list_email
      ON email_suppression_list(email_address)
    `);

    // Email engagement tracking (opens, clicks, conversions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_engagement (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_id UUID NOT NULL REFERENCES email_queue(id) ON DELETE CASCADE,
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
        recipient_email VARCHAR(255) NOT NULL,
        engagement_type VARCHAR(50) NOT NULL,
        link_url TEXT,
        link_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        device_type VARCHAR(50),
        country VARCHAR(100),
        city VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_engagement_queue
      ON email_engagement(queue_id, engagement_type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_engagement_campaign
      ON email_engagement(campaign_id, engagement_type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_engagement_recipient
      ON email_engagement(recipient_id, created_at DESC)
    `);

    // Email validation records
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_validations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_address VARCHAR(255) NOT NULL UNIQUE,
        validation_status VARCHAR(50) NOT NULL,
        is_deliverable BOOLEAN,
        is_valid_format BOOLEAN,
        is_disposable BOOLEAN,
        is_free_email BOOLEAN,
        smtp_check BOOLEAN,
        validation_reason TEXT,
        validated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_validations_email
      ON email_validations(email_address)
    `);

    console.log('✓ Migration 074 completed: Email queue & delivery system created');
  } catch (error) {
    console.error('Migration 074 failed:', error);
    throw error;
  }
};

export const rollback_074 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS email_validations CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_engagement CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_suppression_list CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_complaints CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_bounces CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_delivery_logs CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_queue CASCADE');
    console.log('✓ Migration 074 rolled back');
  } catch (error) {
    console.error('Rollback 074 failed:', error);
    throw error;
  }
};
