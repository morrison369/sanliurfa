/**
 * Migration 077: Trending & Recommendations
 * Trending content tracking and recommendation engine data
 */

import { Pool } from 'pg';

export const migration_077_trending_and_recommendations = async (pool: Pool) => {
  try {
    // Trending places (aggregated daily)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_places (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        trend_date DATE NOT NULL,
        view_count INT DEFAULT 0,
        like_count INT DEFAULT 0,
        review_count INT DEFAULT 0,
        share_count INT DEFAULT 0,
        engagement_score FLOAT DEFAULT 0,
        rank INT,
        trend_category VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, trend_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trending_places_date
      ON trending_places(trend_date DESC, engagement_score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trending_places_category
      ON trending_places(trend_category, trend_date DESC)
    `);

    // User recommendations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recommended_place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        recommendation_score FLOAT DEFAULT 0,
        reason VARCHAR(100),
        clicked BOOLEAN DEFAULT false,
        clicked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, recommended_place_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_recommendations_user
      ON user_recommendations(user_id, recommendation_score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_recommendations_place
      ON user_recommendations(recommended_place_id)
    `);

    // User preferences for recommendation engine
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        preferred_categories JSONB DEFAULT '[]',
        preferred_locations JSONB DEFAULT '[]',
        price_range VARCHAR(50),
        distance_radius_km INT DEFAULT 10,
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user
      ON user_preferences(user_id)
    `);

    // Engagement events for analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS engagement_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_engagement_events_user
      ON engagement_events(user_id, event_type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_engagement_events_place
      ON engagement_events(place_id, event_type)
    `);

    console.log('✓ Migration 077 completed: Trending and recommendations tables created');
  } catch (error) {
    console.error('Migration 077 failed:', error);
    throw error;
  }
};

export const rollback_077 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS engagement_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_recommendations CASCADE');
    await pool.query('DROP TABLE IF EXISTS trending_places CASCADE');
    console.log('✓ Migration 077 rolled back');
  } catch (error) {
    console.error('Rollback 077 failed:', error);
    throw error;
  }
};
