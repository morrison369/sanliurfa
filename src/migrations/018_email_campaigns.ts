/**
 * Migration 018: Email Campaigns
 * Creates tables for email marketing campaigns
 */

export const migration_018_email_campaigns = {
  name: '018_email_campaigns',
  async up(pool: any) {
    // Create email_campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        from_name VARCHAR(255) NOT NULL,
        from_email VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        segment VARCHAR(50) NOT NULL,
        segment_filters JSONB,
        scheduled_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'draft',
        send_count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        unsubscribe_count INTEGER DEFAULT 0,
        bounce_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create campaign events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_events (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_status
      ON email_campaigns(status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_id
      ON campaign_events(campaign_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_events_user_id
      ON campaign_events(user_id)
    `);

    console.log('✓ Migration 018: Email campaigns tables created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS campaign_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_campaigns CASCADE');
    console.log('✓ Migration 018 rolled back');
  }
};
