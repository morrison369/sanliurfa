/**
 * Predictive Analytics Library
 * ML predictions, churn risk, LTV, trend forecasting
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function predictUserChurn(userId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:prediction:churn:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get user activity data
    const lastActivity = await queryOne(
      'SELECT MAX(timestamp) as last_activity FROM request_metrics WHERE user_id = $1',
      [userId]
    );

    const daysSinceActivity = lastActivity?.last_activity
      ? Math.floor((Date.now() - new Date(lastActivity.last_activity).getTime()) / (24 * 3600000))
      : 365;

    // Calculate churn probability (simplified model)
    const churnProbability = Math.min(daysSinceActivity / 90, 1.0); // 90 days = 100% churn risk

    const prediction = {
      user_id: userId,
      churn_probability: parseFloat(churnProbability.toFixed(2)),
      churn_risk_level: churnProbability > 0.7 ? 'high' : churnProbability > 0.4 ? 'medium' : 'low',
      days_inactive: daysSinceActivity,
      model_version: 'v1.0',
      prediction_date: new Date()
    };

    await setCache(cacheKey, JSON.stringify(prediction), 86400); // Cache for 24 hours

    // Update or insert prediction
    const existing = await queryOne(
      'SELECT * FROM user_predictions WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      await update('user_predictions', { user_id: userId }, {
        churn_probability: prediction.churn_probability,
        churn_risk_level: prediction.churn_risk_level
      });
    } else {
      await insert('user_predictions', {
        user_id: userId,
        churn_probability: prediction.churn_probability,
        churn_risk_level: prediction.churn_risk_level,
        engagement_score: 100 - (churnProbability * 100),
        model_version: 'v1.0',
        prediction_date: new Date()
      });
    }

    return prediction;
  } catch (error) {
    logger.error('Failed to predict churn', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function calculateLifetimeValue(userId: string): Promise<number> {
  try {
    // Get user revenue data
    const revenue = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE user_id = $1`,
      [userId]
    );

    const totalRevenue = parseFloat(revenue?.total || '0');

    // Get user tenure
    const userProfile = await queryOne(
      'SELECT created_at FROM users WHERE id = $1',
      [userId]
    );

    const tenureDays = userProfile?.created_at
      ? Math.floor((Date.now() - new Date(userProfile.created_at).getTime()) / (24 * 3600000))
      : 1;

    // Simple LTV = total revenue (more sophisticated models would use monthly spend * expected lifespan)
    const ltv = totalRevenue;

    // Update prediction
    await update('user_predictions', { user_id: userId }, {
      lifetime_value_predicted: ltv
    });

    return ltv;
  } catch (error) {
    logger.error('Failed to calculate LTV', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

export async function forecastTrend(metricName: string, horizonDays: number = 30): Promise<any | null> {
  try {
    // Get historical data
    const since = new Date(Date.now() - 90 * 24 * 3600000);
    const historicalData = await queryRows(
      `SELECT * FROM trend_forecasts WHERE metric_name = $1 AND forecast_date >= $2 ORDER BY forecast_date ASC LIMIT 90`,
      [metricName, since]
    );

    if (historicalData.length < 10) {
      return null; // Not enough data for prediction
    }

    // Simple trend: average of last 7 days
    const recentData = historicalData.slice(-7);
    const avgValue = recentData.reduce((sum: number, d: any) => sum + (d.forecasted_value || d.current_value || 0), 0) / 7;

    // Detect trend direction
    const oldAvg = historicalData.slice(0, 7).reduce((sum: number, d: any) => sum + (d.current_value || 0), 0) / 7;
    const trendDirection = avgValue > oldAvg ? 'up' : avgValue < oldAvg ? 'down' : 'stable';

    const forecast = {
      metric_name: metricName,
      current_value: recentData[recentData.length - 1]?.current_value || 0,
      forecasted_value: avgValue,
      trend_direction: trendDirection,
      confidence_interval: 0.85,
      forecast_date: new Date(),
      forecast_horizon_days: horizonDays
    };

    return forecast;
  } catch (error) {
    logger.error('Failed to forecast trend', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function detectAnomalies(metricName: string, threshold: number = 2.0): Promise<any[]> {
  try {
    // Get recent data
    const since = new Date(Date.now() - 30 * 24 * 3600000);
    const data = await queryRows(
      `SELECT * FROM trend_forecasts WHERE metric_name = $1 AND forecast_date >= $2 ORDER BY forecast_date DESC LIMIT 30`,
      [metricName, since]
    );

    if (data.length < 10) {
      return []; // Not enough data
    }

    // Calculate mean and std dev
    const values = data.map((d: any) => d.current_value || 0);
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Find anomalies (values > threshold * std dev from mean)
    const anomalies = [];
    for (const record of data) {
      const value = record.current_value || 0;
      const deviation = Math.abs(value - mean) / (stdDev || 1);

      if (deviation > threshold) {
        anomalies.push({
          metric_name: metricName,
          value: value,
          expected_value: mean,
          deviation: deviation.toFixed(2),
          severity: deviation > 3 ? 'critical' : 'warning',
          timestamp: record.forecast_date
        });
      }
    }

    return anomalies;
  } catch (error) {
    logger.error('Failed to detect anomalies', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getRecommendations(userId: string): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:recommendations:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const recommendations = await queryRows(
      'SELECT * FROM user_recommendations WHERE user_id = $1 AND expires_at > NOW() ORDER BY score DESC LIMIT 10',
      [userId]
    );

    await setCache(cacheKey, JSON.stringify(recommendations), 3600);
    return recommendations;
  } catch (error) {
    logger.error('Failed to get recommendations', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordRecommendationFeedback(recommendationId: string, clicked: boolean, rating?: number): Promise<boolean> {
  try {
    const updateData: any = {};
    if (clicked !== undefined) updateData.clicked = clicked;
    if (rating !== undefined) updateData.feedback_rating = rating;

    await update('user_recommendations', { id: recommendationId }, updateData);
    return true;
  } catch (error) {
    logger.error('Failed to record feedback', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getHighRiskUsers(limit: number = 50): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:users:high_risk';
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const users = await queryRows(
      'SELECT * FROM user_predictions WHERE churn_risk_level = $1 ORDER BY churn_probability DESC LIMIT $2',
      ['high', limit]
    );

    await setCache(cacheKey, JSON.stringify(users), 3600);
    return users;
  } catch (error) {
    logger.error('Failed to get high risk users', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getModelPerformanceMetrics(): Promise<any> {
  try {
    // Get predictions with outcomes
    const predictions = await queryRows(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN churn_probability > 0.5 AND actual_churn = true THEN 1 ELSE 0 END) as true_positives,
              SUM(CASE WHEN churn_probability > 0.5 AND actual_churn = false THEN 1 ELSE 0 END) as false_positives,
              SUM(CASE WHEN churn_probability <= 0.5 AND actual_churn = false THEN 1 ELSE 0 END) as true_negatives,
              SUM(CASE WHEN churn_probability <= 0.5 AND actual_churn = true THEN 1 ELSE 0 END) as false_negatives
       FROM user_predictions WHERE actual_churn IS NOT NULL`,
      []
    );

    const metrics = predictions[0] || {};
    const tp = parseInt(metrics.true_positives || '0');
    const fp = parseInt(metrics.false_positives || '0');
    const tn = parseInt(metrics.true_negatives || '0');
    const fn = parseInt(metrics.false_negatives || '0');

    return {
      accuracy: ((tp + tn) / (tp + tn + fp + fn)) || 0,
      precision: (tp / (tp + fp)) || 0,
      recall: (tp / (tp + fn)) || 0,
      f1_score: (2 * ((tp / (tp + fp)) * (tp / (tp + fn)))) / ((tp / (tp + fp)) + (tp / (tp + fn))) || 0
    };
  } catch (error) {
    logger.error('Failed to get model metrics', error instanceof Error ? error : new Error(String(error)));
    return {};
  }
}
