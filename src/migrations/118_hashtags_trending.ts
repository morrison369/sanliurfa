/**
 * Migration 118: Hashtags & Trending
 * Hashtag management, trending tracking, hashtag analytics
 */

import type { Migration } from '../lib/migrations';

export const migration_118_hashtags_trending: Migration = {
  version: '118_hashtags_trending',
  description: 'Hashtag management, trending tracking, hashtag analytics',
  up: async (pool: any) => {
  try {
    // Hashtags
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hashtags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tag_name VARCHAR(100) UNIQUE NOT NULL,
        tag_slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        usage_count INT DEFAULT 0,
        last_used_at TIMESTAMP,
        is_trending BOOLEAN DEFAULT false,
        trending_rank INT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hashtags_name
      ON hashtags(tag_name)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hashtags_trending
      ON hashtags(is_trending, trending_rank) WHERE is_trending = true
    `);

    // Hashtag usage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hashtag_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
        content_type VARCHAR(100),
        content_id UUID,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        used_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hashtag_usage_hashtag
      ON hashtag_usage(hashtag_id, used_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hashtag_usage_user
      ON hashtag_usage(user_id, used_at DESC)
    `);

    // Trending analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50),
        entity_id UUID,
        entity_name VARCHAR(255),
        rank_position INT,
        score FLOAT,
        trend_direction VARCHAR(20),
        period_type VARCHAR(50),
        calculated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(entity_type, entity_id, period_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trending_type
      ON trending_analytics(entity_type, rank_position ASC)
    `);

    // Trending places (locations)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_places (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        trending_score FLOAT,
        view_count INT DEFAULT 0,
        review_count INT DEFAULT 0,
        check_in_count INT DEFAULT 0,
        period_type VARCHAR(50),
        calculated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, period_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trending_places_score
      ON trending_places(period_type, trending_score DESC)
    `);

    console.log('✓ Migration 118 completed: Hashtags and trending tables created');
  } catch (error) {
    console.error('Migration 118 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS trending_places CASCADE');
    await pool.query('DROP TABLE IF EXISTS trending_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS hashtag_usage CASCADE');
    await pool.query('DROP TABLE IF EXISTS hashtags CASCADE');
    console.log('✓ Migration 118 rolled back');
  } catch (error) {
    console.error('Rollback 118 failed:', error);
    throw error;
  }
  }
};
