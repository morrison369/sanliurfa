/**
 * Migration 025: Email Marketing Enhancement
 * Adds newsletter subscribers, automation sequences, and tracking
 */

import type { Migration } from '../lib/migrations';

export const migration_025_email_marketing: Migration = {
  version: '025_email_marketing',
  description: 'Email marketing subscribers, automations, and tracking',
  async up(pool: any) {
    // Newsletter subscribers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'active',
        source VARCHAR(100),
        unsubscribed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email sequences (automation templates)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_sequences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        delay_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sequence steps (individual emails in sequence)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_sequence_steps (
        id SERIAL PRIMARY KEY,
        sequence_id INTEGER REFERENCES email_sequences(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        delay_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sequence_id, step_number)
      )
    `);

    // Sequence enrollments (tracks user progress through sequences)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        sequence_id INTEGER REFERENCES email_sequences(id) ON DELETE CASCADE,
        current_step INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        next_send_at TIMESTAMP,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(user_id, sequence_id)
      )
    `);

    // Campaign tracking (pixel/click tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_tracking (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES email_campaigns(id),
        user_id UUID,
        event_type VARCHAR(50) NOT NULL,
        link_url TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
      ON newsletter_subscribers(email)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
      ON newsletter_subscribers(status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_next_send
      ON email_sequence_enrollments(next_send_at)
      WHERE status = 'active'
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_tracking_campaign_id
      ON campaign_tracking(campaign_id, created_at DESC)
    `);

    console.log('✓ Migration 025: Email marketing tables created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS campaign_tracking CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_sequence_enrollments CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_sequence_steps CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_sequences CASCADE');
    await pool.query('DROP TABLE IF EXISTS newsletter_subscribers CASCADE');
    console.log('✓ Migration 025 rolled back');
  }
};
