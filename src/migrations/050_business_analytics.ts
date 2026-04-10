/**
 * Migration 050: Business Analytics System
 * Track and aggregate business metrics for place owners
 */

import type { Migration } from '../lib/migrations';

export const migration_050_business_analytics: Migration = {
  version: '050_business_analytics',
  description: 'Business analytics snapshots and review intelligence',
  async up(pool: any) {
    // Daily analytics snapshots for performance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        metric_date DATE NOT NULL,
        metric_type VARCHAR(50) NOT NULL,
        visitor_count INTEGER DEFAULT 0,
        new_reviews INTEGER DEFAULT 0,
        avg_rating DECIMAL(3, 2),
        review_sentiment VARCHAR(20),
        promotion_clicks INTEGER DEFAULT 0,
        promotion_conversions INTEGER DEFAULT 0,
        event_registrations INTEGER DEFAULT 0,
        event_attendances INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(place_id, metric_date, metric_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_place_date
      ON analytics_snapshots(place_id, metric_date DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_type
      ON analytics_snapshots(metric_type, metric_date DESC)
    `);

    // Hourly visitor tracking for real-time analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visitor_hourly (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        hour_timestamp TIMESTAMP NOT NULL,
        visit_count INTEGER DEFAULT 0,
        unique_visitors INTEGER DEFAULT 0,
        peak_hours BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(place_id, hour_timestamp)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_visitor_hourly_place
      ON visitor_hourly(place_id, hour_timestamp DESC)
    `);

    // Review sentiment tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
        sentiment VARCHAR(20),
        sentiment_score DECIMAL(3, 2),
        categories TEXT[],
        keywords TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_analytics_place
      ON review_analytics(place_id, created_at DESC)
    `);

    console.log('✓ Migration 050: Business analytics system created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS review_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS visitor_hourly CASCADE');
    await pool.query('DROP TABLE IF EXISTS analytics_snapshots CASCADE');
    console.log('✓ Migration 050 rolled back');
  }
};
