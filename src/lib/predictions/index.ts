/**
 * Predictive Analytics Module
 * Time series forecasting and trend prediction
 */

import { query } from '../postgres';

export interface TimeSeriesPoint {
  date: Date;
  value: number;
}

export interface ForecastResult {
  predictions: { date: Date; value: number; confidence: { lower: number; upper: number } }[];
  trend: 'up' | 'down' | 'stable';
  seasonality?: { period: number; strength: number };
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: number; // 0-1
  changeRate: number; // Percentage change
  forecast: ForecastResult;
}

/**
 * Simple moving average forecast
 */
export function movingAverageForecast(
  data: TimeSeriesPoint[],
  periods: number,
  windowSize: number = 7
): ForecastResult {
  if (data.length < windowSize) {
    return { predictions: [], trend: 'stable' };
  }

  const values = data.map(d => d.value);
  const predictions: ForecastResult['predictions'] = [];

  // Calculate last date
  const lastDate = new Date(data[data.length - 1].date);
  
  // Generate predictions
  let currentWindow = values.slice(-windowSize);
  
  for (let i = 1; i <= periods; i++) {
    const avg = currentWindow.reduce((a, b) => a + b, 0) / currentWindow.length;
    const stdDev = Math.sqrt(
      currentWindow.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / currentWindow.length
    );
    
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);
    
    predictions.push({
      date: predictionDate,
      value: Math.round(avg),
      confidence: {
        lower: Math.max(0, Math.round(avg - 1.96 * stdDev)),
        upper: Math.round(avg + 1.96 * stdDev),
      },
    });

    currentWindow = [...currentWindow.slice(1), avg];
  }

  // Determine trend
  const firstAvg = values.slice(0, windowSize).reduce((a, b) => a + b, 0) / windowSize;
  const lastAvg = values.slice(-windowSize).reduce((a, b) => a + b, 0) / windowSize;
  const trendChange = (lastAvg - firstAvg) / firstAvg;

  let trend: ForecastResult['trend'];
  if (trendChange > 0.05) trend = 'up';
  else if (trendChange < -0.05) trend = 'down';
  else trend = 'stable';

  return { predictions, trend };
}

/**
 * Linear regression forecast
 */
export function linearRegressionForecast(
  data: TimeSeriesPoint[],
  periods: number
): ForecastResult {
  const n = data.length;
  if (n < 2) return { predictions: [], trend: 'stable' };

  // Calculate means
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, d) => sum + d.value, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  data.forEach((point, i) => {
    numerator += (i - xMean) * (point.value - yMean);
    denominator += Math.pow(i - xMean, 2);
  });

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate residuals for confidence
  const residuals = data.map((point, i) => 
    Math.abs(point.value - (intercept + slope * i))
  );
  const avgResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;

  // Generate predictions
  const predictions: ForecastResult['predictions'] = [];
  const lastDate = new Date(data[data.length - 1].date);

  for (let i = 1; i <= periods; i++) {
    const x = n - 1 + i;
    const value = intercept + slope * x;
    
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);

    predictions.push({
      date: predictionDate,
      value: Math.max(0, Math.round(value)),
      confidence: {
        lower: Math.max(0, Math.round(value - 1.96 * avgResidual)),
        upper: Math.round(value + 1.96 * avgResidual),
      },
    });
  }

  const trend = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';

  return { predictions, trend };
}

/**
 * Analyze trends in daily visits
 */
export async function analyzeVisitTrends(
  days: number = 30
): Promise<TrendAnalysis> {
  const result = await query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as visits
    FROM user_activities
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC`,
    []
  );

  const data: TimeSeriesPoint[] = result.rows.map(r => ({
    date: new Date(r.date),
    value: parseInt(r.visits),
  }));

  if (data.length < 7) {
    return {
      direction: 'stable',
      strength: 0,
      changeRate: 0,
      forecast: { predictions: [], trend: 'stable' },
    };
  }

  const forecast = linearRegressionForecast(data, 7);
  
  const firstWeek = data.slice(0, 7).reduce((a, b) => a + b.value, 0);
  const lastWeek = data.slice(-7).reduce((a, b) => a + b.value, 0);
  const changeRate = ((lastWeek - firstWeek) / firstWeek) * 100;

  return {
    direction: forecast.trend,
    strength: Math.min(Math.abs(changeRate) / 50, 1),
    changeRate,
    forecast,
  };
}

/**
 * Predict popular times
 */
export async function predictPopularTimes(
  placeId: string
): Promise<{ day: number; hour: number; predictedBusy: number }[]> {
  // Get historical visit patterns
  const result = await query(
    `SELECT 
      EXTRACT(DOW FROM created_at) as day_of_week,
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as visits
    FROM user_activities
    WHERE entity_id = $1
    AND entity_type = 'place'
    AND created_at >= NOW() - INTERVAL '90 days'
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour`,
    [placeId]
  );

  const patterns = result.rows.map(r => ({
    day: parseInt(r.day_of_week),
    hour: parseInt(r.hour),
    visits: parseInt(r.visits),
  }));

  // Calculate average busyness for each day/hour
  const predictions: { day: number; hour: number; predictedBusy: number }[] = [];

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const matches = patterns.filter(p => p.day === day && p.hour === hour);
      const avgVisits = matches.length > 0
        ? matches.reduce((a, b) => a + b.visits, 0) / matches.length
        : 0;
      
      // Normalize to 0-100 scale
      const maxVisits = Math.max(...patterns.map(p => p.visits), 1);
      const busyScore = Math.round((avgVisits / maxVisits) * 100);

      predictions.push({
        day,
        hour,
        predictedBusy: busyScore,
      });
    }
  }

  return predictions;
}

/**
 * Predict search trends
 */
export async function predictSearchTrends(
  days: number = 7
): Promise<{ term: string; predictedVolume: number; trend: 'rising' | 'stable' | 'falling' }[]> {
  // Get recent search history
  const result = await query(
    `SELECT 
      query,
      DATE(created_at) as search_date,
      COUNT(*) as searches
    FROM search_history
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY query, DATE(created_at)
    ORDER BY query, search_date`,
    []
  );

  const trends: Map<string, { dates: Date[]; volumes: number[] }> = new Map();

  result.rows.forEach(row => {
    if (!trends.has(row.query)) {
      trends.set(row.query, { dates: [], volumes: [] });
    }
    const data = trends.get(row.query)!;
    data.dates.push(new Date(row.search_date));
    data.volumes.push(parseInt(row.searches));
  });

  const predictions: { term: string; predictedVolume: number; trend: 'rising' | 'stable' | 'falling' }[] = [];

  for (const [term, data] of trends.entries()) {
    if (data.volumes.length < 7) continue;

    const timeSeries: TimeSeriesPoint[] = data.dates.map((d, i) => ({
      date: d,
      value: data.volumes[i],
    }));

    const forecast = linearRegressionForecast(timeSeries, days);
    const totalPredicted = forecast.predictions.reduce((a, p) => a + p.value, 0);
    
    let trend: 'rising' | 'stable' | 'falling';
    if (forecast.trend === 'up') trend = 'rising';
    else if (forecast.trend === 'down') trend = 'falling';
    else trend = 'stable';

    predictions.push({
      term,
      predictedVolume: totalPredicted,
      trend,
    });
  }

  return predictions.sort((a, b) => b.predictedVolume - a.predictedVolume).slice(0, 20);
}

/**
 * Anomaly detection
 */
export function detectAnomalies(
  data: TimeSeriesPoint[],
  threshold: number = 2
): { point: TimeSeriesPoint; zScore: number; type: 'spike' | 'drop' }[] {
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  );

  const anomalies: { point: TimeSeriesPoint; zScore: number; type: 'spike' | 'drop' }[] = [];

  data.forEach(point => {
    const zScore = (point.value - mean) / stdDev;
    if (Math.abs(zScore) > threshold) {
      anomalies.push({
        point,
        zScore,
        type: zScore > 0 ? 'spike' : 'drop',
      });
    }
  });

  return anomalies;
}

/**
 * Predict review helpfulness
 */
export async function predictReviewHelpfulness(
  reviewId: string
): Promise<{ helpfulnessScore: number; factors: Record<string, number> }> {
  // Get review features
  const result = await query(
    `SELECT 
      r.content,
      r.rating,
      r.created_at,
      u.review_count as user_total_reviews,
      u.helpful_votes_received as user_helpfulness
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = $1`,
    [reviewId]
  );

  if (result.rows.length === 0) {
    return { helpfulnessScore: 0.5, factors: {} };
  }

  const review = result.rows[0];
  
  // Calculate features
  const factors: Record<string, number> = {
    length: Math.min(review.content.length / 500, 1), // Longer is better (up to 500 chars)
    detail: (review.content.match(/\d+/g) || []).length / 10, // Numbers indicate detail
    extremes: review.rating === 1 || review.rating === 5 ? 0.8 : 0.5, // Extreme ratings
    userHistory: Math.min(review.user_total_reviews / 10, 1), // Experienced reviewers
    userReputation: Math.min(review.user_helpfulness / 50, 1), // Helpful voters
    recency: Math.max(0, 1 - (Date.now() - new Date(review.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)),
  };

  // Weighted sum
  const weights = { length: 0.2, detail: 0.15, extremes: 0.1, userHistory: 0.25, userReputation: 0.2, recency: 0.1 };
  const helpfulnessScore = Object.entries(factors).reduce((sum, [key, value]) => 
    sum + value * weights[key as keyof typeof weights], 0
  );

  return { helpfulnessScore, factors };
}

/**
 * Demand forecasting for businesses
 */
export async function forecastBusinessDemand(
  placeId: string,
  days: number = 30
): Promise<ForecastResult & { peakDays: Date[]; lowDays: Date[] }> {
  // Get historical booking/reservation data
  const result = await query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as bookings
    FROM reservations
    WHERE place_id = $1
    AND created_at >= NOW() - INTERVAL '90 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC`,
    [placeId]
  );

  const data: TimeSeriesPoint[] = result.rows.map(r => ({
    date: new Date(r.date),
    value: parseInt(r.bookings),
  }));

  if (data.length < 7) {
    return { 
      predictions: [], 
      trend: 'stable',
      peakDays: [],
      lowDays: [],
    };
  }

  const forecast = linearRegressionForecast(data, days);
  
  // Identify peak and low days
  const sorted = [...forecast.predictions].sort((a, b) => b.value - a.value);
  const peakDays = sorted.slice(0, Math.ceil(days * 0.2)).map(p => p.date);
  const lowDays = sorted.slice(-Math.ceil(days * 0.2)).map(p => p.date);

  return { ...forecast, peakDays, lowDays };
}
