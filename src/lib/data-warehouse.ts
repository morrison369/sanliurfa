/**
 * Data Warehouse & OLAP Engine
 * Star-schema ETL and multidimensional analytics
 */

import { query, queryMany, queryOne } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface OLAPQuery {
  cube: 'place_activity' | 'business_metrics' | 'kpi_trend';
  dimensions: string[];
  measures: string[];
  filters?: Record<string, any>;
  orderBy?: string;
  limit?: number;
}

export interface OLAPResult {
  rows: any[];
  total: number;
  cached: boolean;
  duration_ms: number;
}

/**
 * Populate date dimension (idempotent)
 */
export async function populateDateDimension(startDate: string, endDate: string): Promise<number> {
  try {
    const result = await query(`
      INSERT INTO dim_date (
        date_key, year, quarter, month, week, day_of_week,
        is_weekend, fiscal_year, fiscal_quarter, date_label
      )
      SELECT
        d::DATE as date_key,
        EXTRACT(YEAR FROM d)::INT as year,
        CEIL(EXTRACT(MONTH FROM d) / 3)::INT as quarter,
        EXTRACT(MONTH FROM d)::INT as month,
        EXTRACT(WEEK FROM d)::INT as week,
        EXTRACT(DOW FROM d)::INT as day_of_week,
        EXTRACT(DOW FROM d) IN (0, 6) as is_weekend,
        EXTRACT(YEAR FROM d)::INT as fiscal_year,
        CEIL(EXTRACT(MONTH FROM d) / 3)::INT as fiscal_quarter,
        TO_CHAR(d, 'YYYY-MM-DD') as date_label
      FROM generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL) d
      ON CONFLICT(date_key) DO NOTHING
    `, [startDate, endDate]);

    const rows = result.rowCount || 0;
    logger.info('Date dimension populated', { rows, start: startDate, end: endDate });
    return rows;
  } catch (error) {
    logger.error('Failed to populate date dimension', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Populate place dimension (idempotent)
 */
export async function populatePlaceDimension(): Promise<number> {
  try {
    const result = await query(`
      INSERT INTO dim_place (place_key, category, subcategory, city, district, rating_band, size_band, is_verified)
      SELECT
        p.id,
        p.category,
        p.category,
        'Şanlıurfa' as city,
        COALESCE(p.district, 'Merkez') as district,
        CASE
          WHEN p.rating >= 4.5 THEN 'excellent'
          WHEN p.rating >= 3.5 THEN 'good'
          ELSE 'average'
        END as rating_band,
        CASE
          WHEN p.visit_count >= 1000 THEN 'high'
          WHEN p.visit_count >= 100 THEN 'medium'
          ELSE 'low'
        END as size_band,
        p.verified = true as is_verified
      FROM places p
      ON CONFLICT(place_key) DO UPDATE SET
        category = EXCLUDED.category,
        rating_band = EXCLUDED.rating_band,
        size_band = EXCLUDED.size_band,
        updated_at = NOW()
    `);

    const rows = result.rowCount || 0;
    logger.info('Place dimension populated', { rows });
    return rows;
  } catch (error) {
    logger.error('Failed to populate place dimension', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Populate user dimension (idempotent)
 */
export async function populateUserDimension(): Promise<number> {
  try {
    const result = await query(`
      INSERT INTO dim_user (
        user_key, role, registration_cohort, engagement_level,
        churn_risk, lifetime_value_band, preferred_device
      )
      SELECT
        u.id,
        u.role,
        DATE_TRUNC('month', u.created_at)::DATE::VARCHAR as registration_cohort,
        'medium' as engagement_level,
        'low' as churn_risk,
        'standard' as lifetime_value_band,
        'web' as preferred_device
      FROM users u
      ON CONFLICT(user_key) DO UPDATE SET
        engagement_level = EXCLUDED.engagement_level,
        churn_risk = EXCLUDED.churn_risk,
        updated_at = NOW()
    `);

    const rows = result.rowCount || 0;
    logger.info('User dimension populated', { rows });
    return rows;
  } catch (error) {
    logger.error('Failed to populate user dimension', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Load place activity facts from analytics snapshots
 */
export async function loadPlaceActivityFacts(dateKey: string): Promise<number> {
  try {
    // Ensure dimensions exist
    const dateExists = await queryOne('SELECT 1 FROM dim_date WHERE date_key = $1', [dateKey]);
    if (!dateExists) {
      await populateDateDimension(dateKey, dateKey);
    }

    const result = await query(`
      INSERT INTO fact_place_activity (
        date_key, place_key, visit_count, review_count, avg_rating, interaction_count
      )
      SELECT
        $1::DATE as date_key,
        a.place_id as place_key,
        a.visitor_count::INT as visit_count,
        a.new_reviews::INT as review_count,
        a.avg_rating::FLOAT as avg_rating,
        0 as interaction_count
      FROM analytics_snapshots a
      WHERE DATE(a.metric_date) = $1::DATE
      ON CONFLICT(date_key, place_key, COALESCE(user_key, '00000000-0000-0000-0000-000000000000'::UUID))
      DO UPDATE SET
        visit_count = EXCLUDED.visit_count,
        review_count = EXCLUDED.review_count,
        avg_rating = EXCLUDED.avg_rating
    `, [dateKey]);

    const rows = result.rowCount || 0;
    logger.info('Place activity facts loaded', { date: dateKey, rows });
    return rows;
  } catch (error) {
    logger.error('Failed to load place activity facts', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Main ETL runner
 */
export async function runWarehouseETL(date?: string): Promise<{ dimensions: number; facts: number; duration_ms: number }> {
  const startTime = Date.now();

  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date(targetDate).setDate(1)).toISOString().split('T')[0];
    const endOfMonth = targetDate;

    // Populate dimensions
    const dateDim = await populateDateDimension(startOfMonth, endOfMonth);
    const placeDim = await populatePlaceDimension();
    const userDim = await populateUserDimension();

    // Load facts for target date
    const facts = await loadPlaceActivityFacts(targetDate);

    const duration = Date.now() - startTime;
    logger.info('Warehouse ETL completed', { date: targetDate, duration_ms: duration, facts });

    return {
      dimensions: dateDim + placeDim + userDim,
      facts,
      duration_ms: duration
    };
  } catch (error) {
    logger.error('Warehouse ETL failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Execute OLAP query with caching
 */
export async function queryOLAP(olapQuery: OLAPQuery): Promise<OLAPResult> {
  const startTime = Date.now();
  const cacheKey = `sanliurfa:olap:${olapQuery.cube}:${JSON.stringify(olapQuery)}`;

  try {
    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      const result = JSON.parse(cached);
      return { ...result, cached: true, duration_ms: duration };
    }

    let sql = '';
    let params: any[] = [];

    // Build query based on cube type
    if (olapQuery.cube === 'place_activity') {
      const selectDims = olapQuery.dimensions
        .map(d => {
          if (d === 'category') return 'dp.category';
          if (d === 'district') return 'dp.district';
          if (d === 'year') return 'dd.year';
          if (d === 'month') return 'dd.month';
          return 'dp.' + d;
        })
        .join(', ');

      const groupDims = olapQuery.dimensions
        .map(d => {
          if (d === 'category') return 'dp.category';
          if (d === 'district') return 'dp.district';
          if (d === 'year') return 'dd.year';
          if (d === 'month') return 'dd.month';
          return 'dp.' + d;
        })
        .join(', ');

      const measures = olapQuery.measures
        .map(m => {
          if (m === 'visit_sum') return 'SUM(f.visit_count) as visit_sum';
          if (m === 'review_avg') return 'AVG(f.avg_rating) as review_avg';
          if (m === 'interaction_sum') return 'SUM(f.interaction_count) as interaction_sum';
          return 'SUM(f.' + m + ') as ' + m;
        })
        .join(', ');

      sql = `
        SELECT ${selectDims}, ${measures}
        FROM fact_place_activity f
        JOIN dim_place dp ON f.place_key = dp.place_key
        JOIN dim_date dd ON f.date_key = dd.date_key
        WHERE 1=1
      `;

      // Add filters
      if (olapQuery.filters) {
        if (olapQuery.filters.startDate) {
          sql += ` AND dd.date_key >= $${params.length + 1}`;
          params.push(olapQuery.filters.startDate);
        }
        if (olapQuery.filters.endDate) {
          sql += ` AND dd.date_key <= $${params.length + 1}`;
          params.push(olapQuery.filters.endDate);
        }
        if (olapQuery.filters.category) {
          sql += ` AND dp.category = $${params.length + 1}`;
          params.push(olapQuery.filters.category);
        }
      }

      sql += ` GROUP BY ${groupDims}`;

      if (olapQuery.orderBy) {
        sql += ` ORDER BY ${olapQuery.orderBy} DESC`;
      }

      if (olapQuery.limit) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(olapQuery.limit);
      }
    }

    // Execute query
    const result = await queryMany(sql, params);
    const duration = Date.now() - startTime;

    const olapResult: OLAPResult = {
      rows: result,
      total: result.length,
      cached: false,
      duration_ms: duration
    };

    // Cache result (1 hour TTL)
    await setCache(cacheKey, JSON.stringify(olapResult), 3600);

    return olapResult;
  } catch (error) {
    logger.error('OLAP query failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Drill down to finer granularity
 */
export async function drillDown(
  cube: string,
  currentDimensions: string[],
  nextDimension: string,
  filters?: Record<string, any>
): Promise<any[]> {
  try {
    const query_obj: OLAPQuery = {
      cube: cube as any,
      dimensions: [...currentDimensions, nextDimension],
      measures: ['visit_sum', 'review_avg'],
      filters,
      limit: 100
    };

    const result = await queryOLAP(query_obj);
    return result.rows;
  } catch (error) {
    logger.error('Drill-down failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get top N along a dimension
 */
export async function getTopN(
  dimension: string,
  measure: string,
  n: number,
  filters?: Record<string, any>
): Promise<any[]> {
  try {
    const query_obj: OLAPQuery = {
      cube: 'place_activity',
      dimensions: [dimension],
      measures: [measure],
      filters,
      orderBy: measure,
      limit: n
    };

    const result = await queryOLAP(query_obj);
    return result.rows;
  } catch (error) {
    logger.error('TopN query failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get available dimensions
 */
export function getAvailableDimensions() {
  return [
    { name: 'category', label: 'Category', levels: ['all', 'category'] },
    { name: 'district', label: 'District', levels: ['all', 'district'] },
    { name: 'year', label: 'Year', levels: ['all', 'year'] },
    { name: 'month', label: 'Month', levels: ['all', 'year', 'month'] },
    { name: 'rating_band', label: 'Rating Band', levels: ['all', 'rating_band'] }
  ];
}

/**
 * Get available measures
 */
export function getAvailableMeasures() {
  return [
    { name: 'visit_sum', label: 'Total Visits', type: 'sum' },
    { name: 'review_avg', label: 'Avg Rating', type: 'avg' },
    { name: 'review_count', label: 'Review Count', type: 'sum' },
    { name: 'interaction_sum', label: 'Interactions', type: 'sum' }
  ];
}
