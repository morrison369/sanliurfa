/**
 * Migration 089: Search Suggestions & Autocomplete
 * Search suggestions, autocomplete data, and personalized recommendations
 */

import { Pool } from 'pg';

export const migration_089_search_suggestions = async (pool: Pool) => {
  try {
    // Global search suggestions (for autocomplete)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        suggestion_text VARCHAR(255) NOT NULL,
        suggestion_type VARCHAR(50) NOT NULL,
        search_count INT DEFAULT 0,
        last_searched_at TIMESTAMP,
        is_promoted BOOLEAN DEFAULT false,
        relevance_score FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(suggestion_text, suggestion_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_suggestions_text
      ON search_suggestions(suggestion_text)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_suggestions_promoted
      ON search_suggestions(is_promoted, relevance_score DESC)
    `);

    // Personalized search suggestions per user
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_search_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        suggestion_text VARCHAR(255) NOT NULL,
        suggestion_type VARCHAR(50) NOT NULL,
        user_search_count INT DEFAULT 0,
        relevance_to_user FLOAT DEFAULT 0,
        last_suggested_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_suggestions_user
      ON user_search_suggestions(user_id, relevance_to_user DESC)
    `);

    // Search autocomplete index (denormalized for fast lookup)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS autocomplete_index (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prefix VARCHAR(100) NOT NULL,
        completion_text VARCHAR(255) NOT NULL,
        search_type VARCHAR(50) NOT NULL,
        frequency INT DEFAULT 0,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(prefix, completion_text, search_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_autocomplete_prefix
      ON autocomplete_index(prefix, search_type, frequency DESC)
    `);

    // Search click-through data (for ranking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_clicks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        search_query VARCHAR(255) NOT NULL,
        result_id UUID NOT NULL,
        result_type VARCHAR(50) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        position INT DEFAULT 0,
        dwell_time_seconds INT DEFAULT 0,
        is_relevant BOOLEAN,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_query
      ON search_clicks(search_query, result_type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_result
      ON search_clicks(result_id, created_at DESC)
    `);

    // Search metrics summary
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_metrics_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_date DATE NOT NULL,
        total_searches INT DEFAULT 0,
        unique_searchers INT DEFAULT 0,
        avg_results_returned INT DEFAULT 0,
        zero_result_searches INT DEFAULT 0,
        avg_response_time_ms INT DEFAULT 0,
        top_search_query VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(metric_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_metrics_date
      ON search_metrics_summary(metric_date DESC)
    `);

    console.log('✓ Migration 089 completed: Search suggestions tables created');
  } catch (error) {
    console.error('Migration 089 failed:', error);
    throw error;
  }
};

export const rollback_089 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS search_metrics_summary CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_clicks CASCADE');
    await pool.query('DROP TABLE IF EXISTS autocomplete_index CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_search_suggestions CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_suggestions CASCADE');
    console.log('✓ Migration 089 rolled back');
  } catch (error) {
    console.error('Rollback 089 failed:', error);
    throw error;
  }
};
