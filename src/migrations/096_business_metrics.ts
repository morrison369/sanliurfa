/**
 * Migration 096: Business Metrics
 * Business analytics and performance metrics for places
 */

import type { Migration } from '../lib/migrations';

export const migration_096_business_metrics: Migration = {
  version: '096_business_metrics',
  description: 'Business analytics and performance metrics for places',
  up: async (pool: any) => {
  try {
    // Daily place metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_daily_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        view_count INT DEFAULT 0,
        click_count INT DEFAULT 0,
        review_count INT DEFAULT 0,
        average_rating FLOAT DEFAULT 0,
        new_followers INT DEFAULT 0,
        booking_inquiries INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_daily_metrics_place_date
      ON place_daily_metrics(place_id, date DESC)
    `);

    // Hourly visit patterns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_hourly_traffic (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        hour_of_day INT NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day < 24),
        visit_count INT DEFAULT 0,
        average_session_duration INT,
        day_of_week INT CHECK (day_of_week >= 0 AND day_of_week < 7),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, hour_of_day, day_of_week)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hourly_traffic_place
      ON place_hourly_traffic(place_id, hour_of_day)
    `);

    // User interaction events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        interaction_type VARCHAR(50) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interactions_place
      ON place_interactions(place_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interactions_type
      ON place_interactions(interaction_type, created_at DESC)
    `);

    // Review sentiment analysis
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_sentiment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        sentiment_score FLOAT,
        sentiment_label VARCHAR(20),
        key_topics TEXT[],
        sentiment_details JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(review_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sentiment_place
      ON review_sentiment(sentiment_label, created_at DESC)
    `);

    // Competitive ranking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_rankings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        category VARCHAR(100),
        rank_position INT,
        percentile_score FLOAT,
        comparison_metric VARCHAR(100),
        period VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, category, comparison_metric, period)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rankings_category
      ON place_rankings(category, rank_position, period)
    `);

    console.log('✓ Migration 096 completed: Business metrics tables created');
  } catch (error) {
    console.error('Migration 096 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS place_rankings CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_sentiment CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_interactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_hourly_traffic CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_daily_metrics CASCADE');
    console.log('✓ Migration 096 rolled back');
  } catch (error) {
    console.error('Rollback 096 failed:', error);
    throw error;
  }
  }
};
