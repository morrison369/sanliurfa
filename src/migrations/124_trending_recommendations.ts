/**
 * Migration 124: Trending & Recommendations System
 * Trending algorithms, recommendation engine, content discovery
 */

import { Pool } from 'pg';

export const migration_124_trending_recommendations = async (pool: Pool) => {
  try {
    // Trending scores (hourly, daily, weekly)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        period VARCHAR(50) NOT NULL,
        score FLOAT DEFAULT 0,
        view_count INT DEFAULT 0,
        interaction_count INT DEFAULT 0,
        share_count INT DEFAULT 0,
        calculated_at TIMESTAMP DEFAULT NOW(),
        valid_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(entity_type, entity_id, period)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trending_period
      ON trending_scores(period, score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trending_entity
      ON trending_scores(entity_type, entity_id)
    `);

    // Content popularity
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_popularity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type VARCHAR(50) NOT NULL,
        content_id UUID NOT NULL,
        total_views INT DEFAULT 0,
        total_interactions INT DEFAULT 0,
        total_shares INT DEFAULT 0,
        engagement_rate FLOAT DEFAULT 0,
        virality_score FLOAT DEFAULT 0,
        peak_popularity_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(content_type, content_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_popularity_engagement
      ON content_popularity(engagement_rate DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_popularity_virality
      ON content_popularity(virality_score DESC)
    `);

    // User recommendations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recommendation_type VARCHAR(50) NOT NULL,
        recommended_entity_type VARCHAR(50) NOT NULL,
        recommended_entity_id UUID NOT NULL,
        relevance_score FLOAT,
        reason VARCHAR(255),
        clicked BOOLEAN DEFAULT false,
        clicked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_user
      ON user_recommendations(user_id, recommendation_type, relevance_score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_entity
      ON user_recommendations(recommended_entity_type, recommended_entity_id)
    `);

    // User interests/preferences (for recommendations)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_interests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interest_category VARCHAR(100) NOT NULL,
        interest_score FLOAT DEFAULT 0,
        interaction_count INT DEFAULT 0,
        last_interacted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, interest_category)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interests_user
      ON user_interests(user_id, interest_score DESC)
    `);

    // Recommendation impressions (A/B testing)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recommendation_impressions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recommendation_id UUID NOT NULL REFERENCES user_recommendations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shown_at TIMESTAMP DEFAULT NOW(),
        clicked_at TIMESTAMP,
        interaction_type VARCHAR(50),
        conversion BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_impressions_recommendation
      ON recommendation_impressions(recommendation_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_impressions_user_conversion
      ON recommendation_impressions(user_id, conversion)
    `);

    // Trending keywords/topics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_keywords (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword VARCHAR(255) NOT NULL,
        period VARCHAR(50) NOT NULL,
        search_count INT DEFAULT 0,
        mention_count INT DEFAULT 0,
        trend_score FLOAT DEFAULT 0,
        related_keywords VARCHAR(255)[],
        calculated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(keyword, period)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_keywords_period
      ON trending_keywords(period, trend_score DESC)
    `);

    // Discovery feed (personalized content discovery)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discovery_feeds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type VARCHAR(50) NOT NULL,
        content_id UUID NOT NULL,
        feed_type VARCHAR(50),
        position INT,
        reason VARCHAR(255),
        shown_at TIMESTAMP,
        clicked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_discovery_user
      ON discovery_feeds(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_discovery_content
      ON discovery_feeds(content_type, content_id)
    `);

    console.log('✓ Migration 124 completed: Trending and recommendations tables created');
  } catch (error) {
    console.error('Migration 124 failed:', error);
    throw error;
  }
};

export const rollback_124 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS discovery_feeds CASCADE');
    await pool.query('DROP TABLE IF EXISTS trending_keywords CASCADE');
    await pool.query('DROP TABLE IF EXISTS recommendation_impressions CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_interests CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_recommendations CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_popularity CASCADE');
    await pool.query('DROP TABLE IF EXISTS trending_scores CASCADE');
    console.log('✓ Migration 124 rolled back');
  } catch (error) {
    console.error('Rollback 124 failed:', error);
    throw error;
  }
};
