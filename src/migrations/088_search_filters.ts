/**
 * Migration 088: Search Filters & Analytics
 * Search filter definitions and search analytics
 */

import type { Migration } from '../lib/migrations';

export const migration_088_search_filters: Migration = {
  version: '088_search_filters',
  description: 'Search filter definitions and search analytics',
  up: async (pool: any) => {
  try {
    // Available search filters
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_filters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        search_type VARCHAR(50) NOT NULL,
        filter_key VARCHAR(100) NOT NULL,
        filter_label VARCHAR(255),
        filter_values JSONB,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(search_type, filter_key)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_filters_type
      ON search_filters(search_type, is_active, display_order)
    `);

    // Search analytics - trending searches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        search_query VARCHAR(255) NOT NULL,
        search_type VARCHAR(50) NOT NULL,
        search_count INT DEFAULT 0,
        unique_users INT DEFAULT 0,
        avg_result_count INT DEFAULT 0,
        click_through_rate FLOAT DEFAULT 0,
        last_searched_at TIMESTAMP,
        trend_score FLOAT DEFAULT 0,
        is_trending BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(search_query, search_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_trending
      ON search_analytics(is_trending, trend_score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_analytics_recent
      ON search_analytics(last_searched_at DESC)
    `);

    // Filter combinations (popular searches with specific filters)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS popular_search_combinations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        search_query VARCHAR(255) NOT NULL,
        filters JSONB NOT NULL,
        combination_count INT DEFAULT 0,
        avg_results INT DEFAULT 0,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_popular_combinations_count
      ON popular_search_combinations(combination_count DESC)
    `);

    // Zero-result searches (for improvement tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zero_result_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        search_query VARCHAR(255) NOT NULL,
        search_type VARCHAR(50) NOT NULL,
        filters JSONB,
        occurrence_count INT DEFAULT 0,
        is_resolved BOOLEAN DEFAULT false,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(search_query, search_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_zero_result_unresolved
      ON zero_result_searches(is_resolved, occurrence_count DESC)
    `);

    console.log('✓ Migration 088 completed: Search filters and analytics tables created');
  } catch (error) {
    console.error('Migration 088 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS zero_result_searches CASCADE');
    await pool.query('DROP TABLE IF EXISTS popular_search_combinations CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_filters CASCADE');
    console.log('✓ Migration 088 rolled back');
  } catch (error) {
    console.error('Rollback 088 failed:', error);
    throw error;
  }
  }
};
