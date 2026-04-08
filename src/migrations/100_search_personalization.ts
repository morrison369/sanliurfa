/**
 * Migration 100: Search Personalization
 * User preferences, personalized recommendations, and learning
 */

import { Pool } from 'pg';

export const migration_100_search_personalization = async (pool: Pool) => {
  try {
    // User search preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_search_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        preferred_categories TEXT[],
        preferred_locations TEXT[],
        price_range_min INT,
        price_range_max INT,
        rating_threshold FLOAT DEFAULT 3.0,
        distance_radius INT,
        sort_preference VARCHAR(50),
        include_closed BOOLEAN DEFAULT false,
        personalization_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_prefs
      ON user_search_preferences(user_id)
    `);

    // Personalized recommendations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS personalized_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        recommendation_reason VARCHAR(255),
        recommendation_score FLOAT,
        algorithm_version VARCHAR(50),
        displayed_at TIMESTAMP,
        clicked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, place_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_user
      ON personalized_recommendations(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_score
      ON personalized_recommendations(recommendation_score DESC)
    `);

    // Collaborative filtering signals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_item_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        signal_type VARCHAR(50),
        signal_strength FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, place_id, signal_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_item_signals
      ON user_item_signals(user_id, signal_type, created_at DESC)
    `);

    // Search context and sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_token VARCHAR(255),
        search_queries JSONB,
        clicked_results JSONB,
        query_count INT DEFAULT 0,
        session_duration INT,
        converted BOOLEAN DEFAULT false,
        conversion_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        UNIQUE(session_token)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_sessions_user
      ON search_sessions(user_id, created_at DESC)
    `);

    // Search result feedback
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_result_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        search_query VARCHAR(255),
        result_position INT,
        place_id UUID REFERENCES places(id) ON DELETE SET NULL,
        feedback_type VARCHAR(50),
        relevance_rating INT CHECK (relevance_rating >= 1 AND relevance_rating <= 5),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user
      ON search_result_feedback(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_place
      ON search_result_feedback(place_id, relevance_rating DESC)
    `);

    console.log('✓ Migration 100 completed: Search personalization tables created');
  } catch (error) {
    console.error('Migration 100 failed:', error);
    throw error;
  }
};

export const rollback_100 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS search_result_feedback CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_item_signals CASCADE');
    await pool.query('DROP TABLE IF EXISTS personalized_recommendations CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_search_preferences CASCADE');
    console.log('✓ Migration 100 rolled back');
  } catch (error) {
    console.error('Rollback 100 failed:', error);
    throw error;
  }
};
