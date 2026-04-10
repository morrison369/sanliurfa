/**
 * Migration 099: Search Intelligence
 * AI-powered search and intelligent ranking
 */

import type { Migration } from '../lib/migrations';

export const migration_099_search_intelligence: Migration = {
  version: '099_search_intelligence',
  description: 'AI-powered search and intelligent ranking',
  up: async (pool: any) => {
  try {
    // Search query analysis
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_queries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        query_text VARCHAR(255) NOT NULL,
        search_type VARCHAR(50),
        filters JSONB,
        results_count INT DEFAULT 0,
        click_through_rate FLOAT DEFAULT 0,
        dwell_time INT,
        query_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(query_hash, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_queries_user
      ON search_queries(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_queries_text
      ON search_queries(query_text)
    `);

    // Search embeddings for semantic search
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        searchable_id UUID NOT NULL,
        searchable_type VARCHAR(50) NOT NULL,
        embedding_vector FLOAT8[] NOT NULL,
        embedding_model VARCHAR(50),
        similarity_score FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(searchable_id, searchable_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_type
      ON search_embeddings(searchable_type, created_at DESC)
    `);

    // Search ranking factors
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ranking_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        relevance_score FLOAT DEFAULT 0.5,
        freshness_score FLOAT DEFAULT 0.5,
        popularity_score FLOAT DEFAULT 0.5,
        quality_score FLOAT DEFAULT 0.5,
        engagement_score FLOAT DEFAULT 0.5,
        search_frequency_boost FLOAT DEFAULT 1.0,
        overall_rank_score FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ranking_signals_score
      ON ranking_signals(overall_rank_score DESC)
    `);

    // Search corrections and suggestions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_corrections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_query VARCHAR(255) NOT NULL,
        corrected_query VARCHAR(255) NOT NULL,
        correction_type VARCHAR(50),
        confidence_score FLOAT,
        used_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(original_query, corrected_query)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_corrections_original
      ON search_corrections(original_query)
    `);

    // Search result cache
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_result_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query_hash VARCHAR(64) UNIQUE NOT NULL,
        results JSONB NOT NULL,
        result_count INT,
        cache_key VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_cache_expires
      ON search_result_cache(expires_at) WHERE expires_at IS NOT NULL
    `);

    console.log('✓ Migration 099 completed: Search intelligence tables created');
  } catch (error) {
    console.error('Migration 099 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS search_result_cache CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_corrections CASCADE');
    await pool.query('DROP TABLE IF EXISTS ranking_signals CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_embeddings CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_queries CASCADE');
    console.log('✓ Migration 099 rolled back');
  } catch (error) {
    console.error('Rollback 099 failed:', error);
    throw error;
  }
  }
};
