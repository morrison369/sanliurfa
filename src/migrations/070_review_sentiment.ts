/**
 * Migration 070: Review Sentiment & Analytics
 * Review quality scoring, helpful votes, sentiment analysis
 */

import { Pool } from 'pg';

export const migration_070_review_sentiment = async (pool: Pool) => {
  try {
    // Helpful votes on reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_helpful_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_helpful BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(review_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_helpful_votes_review
      ON review_helpful_votes(review_id, is_helpful)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_helpful_votes_user
      ON review_helpful_votes(user_id, created_at DESC)
    `);

    // Review sentiment and quality scores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        helpful_count INT DEFAULT 0,
        unhelpful_count INT DEFAULT 0,
        sentiment_score DECIMAL(3, 2) DEFAULT 0.0,
        sentiment_label VARCHAR(50),
        quality_score DECIMAL(3, 2) DEFAULT 0.0,
        verification_badge BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_analytics_place
      ON review_analytics(place_id, quality_score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_analytics_sentiment
      ON review_analytics(sentiment_label, place_id)
    `);

    // Review trends per place
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_trends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_reviews INT DEFAULT 0,
        avg_rating DECIMAL(3, 2) DEFAULT 0.0,
        sentiment_positive_count INT DEFAULT 0,
        sentiment_neutral_count INT DEFAULT 0,
        sentiment_negative_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_trends_place
      ON review_trends(place_id, date DESC)
    `);

    // Review highlights - top positive and negative reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_highlights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        highlight_type VARCHAR(50) NOT NULL,
        rank INT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_highlights_place
      ON review_highlights(place_id, highlight_type, rank)
    `);

    console.log('✓ Migration 070 completed: Review sentiment and analytics created');
  } catch (error) {
    console.error('Migration 070 failed:', error);
    throw error;
  }
};

export const rollback_070 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS review_highlights CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_trends CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_helpful_votes CASCADE');
    console.log('✓ Migration 070 rolled back');
  } catch (error) {
    console.error('Rollback 070 failed:', error);
    throw error;
  }
};
