/**
 * Migration 079: Business Metrics
 * Place owner analytics and business metrics
 */

import { Pool } from 'pg';

export const migration_079_business_metrics = async (pool: Pool) => {
  try {
    // Place metrics aggregated daily
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_daily_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        metric_date DATE NOT NULL,
        view_count INT DEFAULT 0,
        click_count INT DEFAULT 0,
        phone_click_count INT DEFAULT 0,
        website_click_count INT DEFAULT 0,
        direction_click_count INT DEFAULT 0,
        review_count INT DEFAULT 0,
        review_sentiment_avg FLOAT,
        like_count INT DEFAULT 0,
        share_count INT DEFAULT 0,
        message_count INT DEFAULT 0,
        booking_count INT DEFAULT 0,
        revenue_cents INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, metric_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_daily_metrics_place
      ON place_daily_metrics(place_id, metric_date DESC)
    `);

    // Place visitor tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_visitors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(255),
        visit_type VARCHAR(50),
        device_type VARCHAR(50),
        city VARCHAR(100),
        country VARCHAR(100),
        action_taken VARCHAR(100),
        visited_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_visitors_place
      ON place_visitors(place_id, visited_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_visitors_user
      ON place_visitors(user_id, visited_at DESC)
    `);

    // Business owner analytics summary
    await pool.query(`
      CREATE TABLE IF NOT EXISTS owner_analytics_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        summary_date DATE NOT NULL,
        total_views INT DEFAULT 0,
        total_clicks INT DEFAULT 0,
        total_reviews INT DEFAULT 0,
        avg_rating FLOAT,
        response_rate FLOAT,
        avg_response_time_hours INT,
        total_messages INT DEFAULT 0,
        total_bookings INT DEFAULT 0,
        revenue_cents INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, place_id, summary_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_owner_analytics_user
      ON owner_analytics_summary(user_id, summary_date DESC)
    `);

    // Keyword performance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS keyword_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        keyword VARCHAR(255) NOT NULL,
        search_count INT DEFAULT 0,
        click_count INT DEFAULT 0,
        impression_count INT DEFAULT 0,
        ctr FLOAT,
        avg_position FLOAT,
        tracked_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, keyword, tracked_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_keyword_performance_place
      ON keyword_performance(place_id, tracked_date DESC)
    `);

    console.log('✓ Migration 079 completed: Business metrics tables created');
  } catch (error) {
    console.error('Migration 079 failed:', error);
    throw error;
  }
};

export const rollback_079 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS keyword_performance CASCADE');
    await pool.query('DROP TABLE IF EXISTS owner_analytics_summary CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_visitors CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_daily_metrics CASCADE');
    console.log('✓ Migration 079 rolled back');
  } catch (error) {
    console.error('Rollback 079 failed:', error);
    throw error;
  }
};
