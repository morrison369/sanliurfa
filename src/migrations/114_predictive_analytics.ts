/**
 * Migration 114: Predictive Analytics
 * ML predictions, churn risk, LTV, trends forecasting
 */

import type { Migration } from '../lib/migrations';

export const migration_114_predictive_analytics: Migration = {
  version: '114_predictive_analytics',
  description: 'ML predictions, churn risk, LTV, trends forecasting',
  up: async (pool: any) => {
  try {
    // ML predictions (churn, LTV, engagement)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        churn_probability FLOAT,
        churn_risk_level VARCHAR(50),
        lifetime_value_predicted FLOAT,
        engagement_score FLOAT,
        conversion_likelihood FLOAT,
        recommended_action VARCHAR(255),
        model_version VARCHAR(50),
        prediction_date TIMESTAMP DEFAULT NOW(),
        actual_churn BOOLEAN,
        churn_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_predictions_churn_risk
      ON user_predictions(churn_risk_level, churn_probability DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_predictions_ltv
      ON user_predictions(lifetime_value_predicted DESC)
    `);

    // Trend forecasting
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trend_forecasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_name VARCHAR(255) NOT NULL,
        forecast_type VARCHAR(50),
        forecast_horizon_days INT,
        current_value FLOAT,
        forecasted_value FLOAT,
        confidence_interval FLOAT,
        trend_direction VARCHAR(50),
        seasonality_factor FLOAT,
        anomaly_detected BOOLEAN DEFAULT false,
        model_type VARCHAR(100),
        forecast_date TIMESTAMP DEFAULT NOW(),
        actual_value FLOAT,
        accuracy_score FLOAT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forecasts_metric
      ON trend_forecasts(metric_name, forecast_date DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forecasts_anomaly
      ON trend_forecasts(anomaly_detected) WHERE anomaly_detected = true
    `);

    // Feature importance (for ML models)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_importance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        model_name VARCHAR(255),
        feature_name VARCHAR(255),
        importance_score FLOAT,
        impact_type VARCHAR(50),
        description TEXT,
        model_version VARCHAR(50),
        calculated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(model_name, feature_name, model_version)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_importance_model
      ON feature_importance(model_name, importance_score DESC)
    `);

    // Recommendation engine data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recommendation_type VARCHAR(100),
        recommendation_item_id UUID,
        recommendation_item_type VARCHAR(100),
        recommendation_reason TEXT,
        score FLOAT,
        rank_position INT,
        clicked BOOLEAN DEFAULT false,
        converted BOOLEAN DEFAULT false,
        feedback_rating INT,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_user
      ON user_recommendations(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_type
      ON user_recommendations(recommendation_type, score DESC)
    `);

    // Anomaly detection records
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        anomaly_type VARCHAR(100),
        entity_type VARCHAR(100),
        entity_id UUID,
        anomaly_score FLOAT,
        severity VARCHAR(50),
        description TEXT,
        details JSONB,
        detected_at TIMESTAMP DEFAULT NOW(),
        investigated BOOLEAN DEFAULT false,
        investigated_at TIMESTAMP,
        investigation_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_anomalies_type
      ON anomalies(anomaly_type, detected_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_anomalies_severity
      ON anomalies(severity, anomaly_score DESC)
    `);

    console.log('✓ Migration 114 completed: Predictive analytics tables created');
  } catch (error) {
    console.error('Migration 114 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS anomalies CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_recommendations CASCADE');
    await pool.query('DROP TABLE IF EXISTS feature_importance CASCADE');
    await pool.query('DROP TABLE IF EXISTS trend_forecasts CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_predictions CASCADE');
    console.log('✓ Migration 114 rolled back');
  } catch (error) {
    console.error('Rollback 114 failed:', error);
    throw error;
  }
  }
};
