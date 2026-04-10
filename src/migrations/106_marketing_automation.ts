/**
 * Migration 106: Marketing Automation
 * Automated workflows and drip campaigns
 */

import type { Migration } from '../lib/migrations';

export const migration_106_marketing_automation: Migration = {
  version: '106_marketing_automation',
  description: 'Automated workflows and drip campaigns',
  up: async (pool: any) => {
  try {
    // Automation workflows
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_name VARCHAR(255) UNIQUE NOT NULL,
        workflow_key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        trigger_type VARCHAR(100),
        trigger_conditions JSONB,
        is_active BOOLEAN DEFAULT true,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        execution_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_automation_workflows_active
      ON automation_workflows(is_active, created_at DESC)
    `);

    // Workflow steps/actions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
        step_order INT NOT NULL,
        action_type VARCHAR(100),
        action_config JSONB,
        delay_seconds INT DEFAULT 0,
        delay_unit VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(workflow_id, step_order)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_steps
      ON workflow_steps(workflow_id, step_order)
    `);

    // Workflow executions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        triggered_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'in_progress',
        execution_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_executions
      ON workflow_executions(workflow_id, triggered_at DESC)
    `);

    // Drip campaigns (sequences of emails)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drip_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        trigger_event VARCHAR(100),
        target_segment_id UUID REFERENCES user_segments(id) ON DELETE SET NULL,
        total_emails INT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_drip_campaigns_active
      ON drip_campaigns(is_active, created_at DESC)
    `);

    // Drip campaign emails
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drip_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        drip_campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
        email_order INT NOT NULL,
        delay_hours INT DEFAULT 0,
        subject_line VARCHAR(500) NOT NULL,
        html_content TEXT NOT NULL,
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(drip_campaign_id, email_order)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_drip_emails
      ON drip_emails(drip_campaign_id, email_order)
    `);

    // Subscriber preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_subscriber_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        subscribed_to_marketing BOOLEAN DEFAULT true,
        subscribed_to_newsletter BOOLEAN DEFAULT true,
        subscribed_to_promotions BOOLEAN DEFAULT true,
        subscribed_to_events BOOLEAN DEFAULT true,
        email_frequency VARCHAR(50) DEFAULT 'weekly',
        preferred_email_type VARCHAR(50),
        last_updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_prefs_user
      ON email_subscriber_preferences(user_id)
    `);

    console.log('✓ Migration 106 completed: Marketing automation tables created');
  } catch (error) {
    console.error('Migration 106 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS email_subscriber_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS drip_emails CASCADE');
    await pool.query('DROP TABLE IF EXISTS drip_campaigns CASCADE');
    await pool.query('DROP TABLE IF EXISTS workflow_executions CASCADE');
    await pool.query('DROP TABLE IF EXISTS workflow_steps CASCADE');
    await pool.query('DROP TABLE IF EXISTS automation_workflows CASCADE');
    console.log('✓ Migration 106 rolled back');
  } catch (error) {
    console.error('Rollback 106 failed:', error);
    throw error;
  }
  }
};
