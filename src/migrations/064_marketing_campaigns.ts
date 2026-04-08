/**
 * Migration 064: Marketing Campaigns
 * Marketing campaign management with targeting, performance tracking, and automation
 */

import { Pool } from 'pg';

export const migration_064_marketing_campaigns = async (pool: Pool) => {
  try {
    // Marketing campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        campaign_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        budget DECIMAL(12, 2) DEFAULT 0,
        spent DECIMAL(12, 2) DEFAULT 0,
        targeting JSONB DEFAULT '{}',
        creative_content JSONB DEFAULT '{}',
        schedule_config JSONB DEFAULT '{}',
        performance_goals JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        published_at TIMESTAMP
      )
    `);

    // Indexes for campaigns
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_place
      ON marketing_campaigns(place_id, status, start_date DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user
      ON marketing_campaigns(user_id, created_at DESC)
    `);

    // Campaign performance metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        impressions INT DEFAULT 0,
        clicks INT DEFAULT 0,
        conversions INT DEFAULT 0,
        spent DECIMAL(10, 2) DEFAULT 0,
        revenue DECIMAL(10, 2) DEFAULT 0,
        ctr DECIMAL(5, 2) DEFAULT 0,
        conversion_rate DECIMAL(5, 2) DEFAULT 0,
        roi DECIMAL(7, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_performance_date
      ON campaign_performance(campaign_id, date DESC)
    `);

    // Campaign targeting rules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_targeting (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        target_type VARCHAR(100) NOT NULL,
        target_value TEXT NOT NULL,
        operator VARCHAR(50) DEFAULT 'equals',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_targeting_campaign
      ON campaign_targeting(campaign_id)
    `);

    // Campaign budget allocation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        allocation_channel VARCHAR(50) NOT NULL,
        allocated_amount DECIMAL(10, 2) NOT NULL,
        spent_amount DECIMAL(10, 2) DEFAULT 0,
        performance_score DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_budgets_campaign
      ON campaign_budgets(campaign_id)
    `);

    // Campaign notifications/events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign
      ON campaign_events(campaign_id, created_at DESC)
    `);

    console.log('✓ Migration 064 completed: Marketing campaigns system created');
  } catch (error) {
    console.error('Migration 064 failed:', error);
    throw error;
  }
};

export const rollback_064 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS campaign_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_budgets CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_targeting CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaign_performance CASCADE');
    await pool.query('DROP TABLE IF EXISTS marketing_campaigns CASCADE');
    console.log('✓ Migration 064 rolled back');
  } catch (error) {
    console.error('Rollback 064 failed:', error);
    throw error;
  }
};
