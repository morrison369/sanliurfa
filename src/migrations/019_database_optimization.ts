/**
 * Migration 019: Database Optimization
 * Adds strategic indexes for query performance
 */

import type { Migration } from '../lib/migrations';

export const migration_019_database_optimization: Migration = {
  version: '019_database_optimization',
  description: 'Database optimization indexes and performance tuning',
  async up(pool: any) {
    // Filtered queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_category_id
      ON places(category_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_district_id
      ON places(district_id)
    `);

    // Joins
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_place_id
      ON reviews(place_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id
      ON reviews(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_user_id
      ON favorites(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_place_id
      ON favorites(place_id)
    `);

    // Sorting and pagination
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_created_at
      ON places(created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_created_at
      ON reviews(created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_rating
      ON places(rating DESC)
    `);

    // Composite indexes for common queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_place_created
      ON reviews(place_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_user_place
      ON favorites(user_id, place_id) UNIQUE
    `);

    // Full-text search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_search
      ON places USING GIN(search_vector)
    `);

    // Geo-spatial queries (if coordinates are used)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_location
      ON places(latitude, longitude)
    `);

    // Activity tracking
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id
      ON analytics(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_place_id
      ON analytics(place_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_action_type
      ON analytics(action_type)
    `);

    // Audit logging
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
      ON audit_logs(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs(action)
    `);

    console.log('✓ Migration 019: Database optimization indexes created');
  },

  async down(pool: any) {
    const indexes = [
      'idx_places_category_id',
      'idx_places_district_id',
      'idx_reviews_place_id',
      'idx_reviews_user_id',
      'idx_favorites_user_id',
      'idx_favorites_place_id',
      'idx_places_created_at',
      'idx_reviews_created_at',
      'idx_places_rating',
      'idx_reviews_place_created',
      'idx_favorites_user_place',
      'idx_places_search',
      'idx_places_location',
      'idx_analytics_user_id',
      'idx_analytics_place_id',
      'idx_analytics_action_type',
      'idx_audit_logs_user_id',
      'idx_audit_logs_action'
    ];

    for (const indexName of indexes) {
      await pool.query(`DROP INDEX IF EXISTS ${indexName}`);
    }

    console.log('✓ Migration 019 rolled back');
  }
};
