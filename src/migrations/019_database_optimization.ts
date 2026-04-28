/**
 * Migration 019: Database Optimization
 * Adds strategic indexes for query performance
 */

export const migration_019_database_optimization = {
  name: '019_database_optimization',
  async up(pool: any) {
    const ensureIndex = async (table: string, columns: string[], createSql: string) => {
      const tableCheck = await pool.query(
        'SELECT to_regclass($1) IS NOT NULL AS exists',
        [`public.${table}`]
      );
      if (!tableCheck.rows[0]?.exists) return;

      const colsCheck = await pool.query(
        `
          SELECT COUNT(*)::int AS count
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = ANY($2::text[])
        `,
        [table, columns]
      );
      if (Number(colsCheck.rows[0]?.count || 0) !== columns.length) return;

      await pool.query(createSql);
    };

    // Filtered queries
    await ensureIndex('places', ['category_id'], 'CREATE INDEX IF NOT EXISTS idx_places_category_id ON places(category_id)');
    await ensureIndex('places', ['district_id'], 'CREATE INDEX IF NOT EXISTS idx_places_district_id ON places(district_id)');

    // Joins
    await ensureIndex('reviews', ['place_id'], 'CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id)');
    await ensureIndex('reviews', ['user_id'], 'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)');
    await ensureIndex('favorites', ['user_id'], 'CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)');
    await ensureIndex('favorites', ['place_id'], 'CREATE INDEX IF NOT EXISTS idx_favorites_place_id ON favorites(place_id)');

    // Sorting and pagination
    await ensureIndex('places', ['created_at'], 'CREATE INDEX IF NOT EXISTS idx_places_created_at ON places(created_at DESC)');
    await ensureIndex('reviews', ['created_at'], 'CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC)');
    await ensureIndex('places', ['rating'], 'CREATE INDEX IF NOT EXISTS idx_places_rating ON places(rating DESC)');

    // Composite indexes for common queries
    await ensureIndex('reviews', ['place_id', 'created_at'], 'CREATE INDEX IF NOT EXISTS idx_reviews_place_created ON reviews(place_id, created_at DESC)');
    await ensureIndex('favorites', ['user_id', 'place_id'], 'CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_place ON favorites(user_id, place_id)');

    // Full-text search
    await ensureIndex('places', ['search_vector'], 'CREATE INDEX IF NOT EXISTS idx_places_search ON places USING GIN(search_vector)');

    // Geo-spatial queries
    await ensureIndex('places', ['latitude', 'longitude'], 'CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude)');

    // Activity tracking
    await ensureIndex('analytics', ['user_id'], 'CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id)');
    await ensureIndex('analytics', ['place_id'], 'CREATE INDEX IF NOT EXISTS idx_analytics_place_id ON analytics(place_id)');
    await ensureIndex('analytics', ['action_type'], 'CREATE INDEX IF NOT EXISTS idx_analytics_action_type ON analytics(action_type)');

    // Audit logging
    await ensureIndex('audit_logs', ['user_id'], 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await ensureIndex('audit_logs', ['action'], 'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');

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
