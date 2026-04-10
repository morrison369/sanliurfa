/**
 * Migration 063: Featured Listings
 * Premium featured listing system for places with analytics and scheduling
 */

import type { Migration } from '../lib/migrations';

export const migration_063_featured_listings: Migration = {
  version: '063_featured_listings',
  description: 'Featured listings scheduling and analytics',
  up: async (pool: any) => {
    try {
    // Featured listings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS featured_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        featured_image_url TEXT,
        position_tier VARCHAR(50) DEFAULT 'standard',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        views_count INT DEFAULT 0,
        clicks_count INT DEFAULT 0,
        conversions_count INT DEFAULT 0,
        cost_per_day DECIMAL(10, 2) DEFAULT 0,
        total_cost DECIMAL(12, 2) DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'pending',
        settings JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for featured listings
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_featured_listings_place
      ON featured_listings(place_id, status, start_date DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_featured_listings_user
      ON featured_listings(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_featured_listings_active
      ON featured_listings(status, start_date, end_date)
      WHERE status = 'active'
    `);

    // Featured listing daily metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS featured_listing_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        featured_listing_id UUID NOT NULL REFERENCES featured_listings(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        views INT DEFAULT 0,
        clicks INT DEFAULT 0,
        conversions INT DEFAULT 0,
        impressions INT DEFAULT 0,
        ctr DECIMAL(5, 2) DEFAULT 0,
        conversion_rate DECIMAL(5, 2) DEFAULT 0,
        revenue_generated DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(featured_listing_id, date)
      )
    `);

    // Indexes for metrics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_featured_listing_metrics_date
      ON featured_listing_metrics(featured_listing_id, date DESC)
    `);

    // Featured listing performance tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS featured_listing_clicks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        featured_listing_id UUID NOT NULL REFERENCES featured_listings(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        source VARCHAR(100),
        device_type VARCHAR(50),
        click_timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_featured_listing_clicks_listing
      ON featured_listing_clicks(featured_listing_id, click_timestamp DESC)
    `);

    console.log('✓ Migration 063 completed: Featured listings system created');
  } catch (error) {
    console.error('Migration 063 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
    try {
    await pool.query('DROP TABLE IF EXISTS featured_listing_clicks CASCADE');
    await pool.query('DROP TABLE IF EXISTS featured_listing_metrics CASCADE');
    await pool.query('DROP TABLE IF EXISTS featured_listings CASCADE');
    console.log('✓ Migration 063 rolled back');
  } catch (error) {
    console.error('Rollback 063 failed:', error);
    throw error;
  }
  }
};
