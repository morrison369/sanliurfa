/**
 * Migration 126: Data Warehouse & OLAP
 * Star-schema dimension tables, fact table, and OLAP aggregates
 */

import { Pool } from 'pg';

export const migration_126_data_warehouse = async (pool: Pool) => {
  try {
    // Date dimension (calendar + fiscal hierarchies)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dim_date (
        date_key DATE PRIMARY KEY,
        year INT NOT NULL,
        quarter INT NOT NULL,
        month INT NOT NULL,
        week INT NOT NULL,
        day_of_week INT NOT NULL,
        is_weekend BOOLEAN DEFAULT false,
        is_holiday BOOLEAN DEFAULT false,
        fiscal_year INT,
        fiscal_quarter INT,
        date_label VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dim_date_year_month
      ON dim_date(year, month)
    `);

    // Place dimension (category/region hierarchy)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dim_place (
        place_key UUID PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        city VARCHAR(100),
        district VARCHAR(100),
        rating_band VARCHAR(20),
        size_band VARCHAR(20),
        is_verified BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dim_place_category_district
      ON dim_place(category, district)
    `);

    // User dimension (segment + behavior enrichment)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dim_user (
        user_key UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50),
        registration_cohort VARCHAR(20),
        engagement_level VARCHAR(20),
        churn_risk VARCHAR(20),
        lifetime_value_band VARCHAR(20),
        preferred_device VARCHAR(50),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dim_user_engagement
      ON dim_user(engagement_level)
    `);

    // Fact table: place activity (grain: place + date + user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fact_place_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date_key DATE NOT NULL REFERENCES dim_date(date_key) ON DELETE CASCADE,
        place_key UUID NOT NULL REFERENCES dim_place(place_key) ON DELETE CASCADE,
        user_key UUID REFERENCES dim_user(user_key) ON DELETE SET NULL,
        visit_count INT DEFAULT 0,
        review_count INT DEFAULT 0,
        avg_rating FLOAT,
        interaction_count INT DEFAULT 0,
        share_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date_key, place_key, COALESCE(user_key, '00000000-0000-0000-0000-000000000000'::UUID))
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fact_place_activity_date_place
      ON fact_place_activity(date_key, place_key)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fact_place_activity_date
      ON fact_place_activity(date_key)
    `);

    // OLAP pre-aggregated cubes (cache expensive drill-down queries)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS olap_aggregates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cube_name VARCHAR(100) NOT NULL,
        dimension_keys JSONB NOT NULL,
        measures JSONB NOT NULL,
        aggregation_level VARCHAR(50),
        valid_until TIMESTAMP,
        computed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cube_name, aggregation_level, (dimension_keys::text))
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_olap_aggregates_cube
      ON olap_aggregates(cube_name, aggregation_level, valid_until)
    `);

    console.log('✓ Migration 126 completed: Data warehouse tables created');
  } catch (error) {
    console.error('Migration 126 failed:', error);
    throw error;
  }
};

export const rollback_126 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS olap_aggregates CASCADE');
    await pool.query('DROP TABLE IF EXISTS fact_place_activity CASCADE');
    await pool.query('DROP TABLE IF EXISTS dim_user CASCADE');
    await pool.query('DROP TABLE IF EXISTS dim_place CASCADE');
    await pool.query('DROP TABLE IF EXISTS dim_date CASCADE');
    console.log('✓ Migration 126 rolled back');
  } catch (error) {
    console.error('Rollback 126 failed:', error);
    throw error;
  }
};
