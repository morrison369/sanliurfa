/**
 * Migration 098: Business Insights
 * AI-driven insights, trend analysis, and predictive analytics
 */

import { Pool } from 'pg';

export const migration_098_business_insights = async (pool: Pool) => {
  try {
    // Trend analysis data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_trends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        trend_type VARCHAR(100),
        metric_name VARCHAR(100),
        data_points JSONB,
        trend_direction VARCHAR(20),
        trend_strength FLOAT,
        forecast_30d FLOAT,
        forecast_90d FLOAT,
        anomaly_detected BOOLEAN DEFAULT false,
        anomaly_explanation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trends_place
      ON business_trends(place_id, trend_type, created_at DESC)
    `);

    // Seasonality patterns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seasonality_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        metric_name VARCHAR(100),
        month INT CHECK (month >= 1 AND month <= 12),
        day_of_week INT CHECK (day_of_week >= 0 AND day_of_week < 7),
        expected_value FLOAT,
        variance FLOAT,
        confidence_level FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, metric_name, month, day_of_week)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_seasonality_place
      ON seasonality_patterns(place_id, metric_name)
    `);

    // Customer satisfaction tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS satisfaction_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        score_date DATE,
        overall_satisfaction FLOAT,
        cleanliness_score FLOAT,
        service_score FLOAT,
        price_score FLOAT,
        atmosphere_score FLOAT,
        sample_size INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, score_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_satisfaction_place_date
      ON satisfaction_scores(place_id, score_date DESC)
    `);

    // Predictive models
    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictive_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        model_type VARCHAR(100),
        prediction_target VARCHAR(100),
        model_accuracy FLOAT,
        last_training_date TIMESTAMP,
        next_training_date TIMESTAMP,
        model_params JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, model_type, prediction_target)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_models_place_active
      ON predictive_models(place_id, is_active)
    `);

    // Competitor analysis
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competitor_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        competitor_place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        comparison_date DATE,
        rating_comparison FLOAT,
        review_count_comparison INT,
        followers_comparison INT,
        engagement_comparison FLOAT,
        price_comparison VARCHAR(50),
        strengths TEXT[],
        weaknesses TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, competitor_place_id, comparison_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_competitor_analysis
      ON competitor_analysis(place_id, comparison_date DESC)
    `);

    // Action suggestions log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS action_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        suggestion_type VARCHAR(100),
        title VARCHAR(255),
        description TEXT,
        estimated_impact VARCHAR(255),
        difficulty_level VARCHAR(20),
        time_to_implement INT,
        priority INT,
        accepted BOOLEAN DEFAULT false,
        implemented BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        implemented_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_suggestions_place
      ON action_suggestions(place_id, priority DESC, created_at DESC)
    `);

    console.log('✓ Migration 098 completed: Business insights tables created');
  } catch (error) {
    console.error('Migration 098 failed:', error);
    throw error;
  }
};

export const rollback_098 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS action_suggestions CASCADE');
    await pool.query('DROP TABLE IF EXISTS competitor_analysis CASCADE');
    await pool.query('DROP TABLE IF EXISTS predictive_models CASCADE');
    await pool.query('DROP TABLE IF EXISTS satisfaction_scores CASCADE');
    await pool.query('DROP TABLE IF EXISTS seasonality_patterns CASCADE');
    await pool.query('DROP TABLE IF EXISTS business_trends CASCADE');
    console.log('✓ Migration 098 rolled back');
  } catch (error) {
    console.error('Rollback 098 failed:', error);
    throw error;
  }
};
