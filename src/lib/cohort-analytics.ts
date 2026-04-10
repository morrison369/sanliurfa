/**
 * Cohort Analysis Library
 * User cohort management and retention tracking
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function createCohort(userId: string, cohortName: string, cohortKey: string, cohortType: string, criteria: any): Promise<any | null> {
  try {
    const result = await insert('user_cohorts', {
      cohort_name: cohortName,
      cohort_key: cohortKey,
      cohort_type: cohortType,
      creation_criteria: criteria,
      created_by_user_id: userId,
      is_active: true
    });

    await deleteCache('sanliurfa:cohorts:list');
    logger.info('Cohort created', { cohortId: result.id, cohortName });
    return result;
  } catch (error) {
    logger.error('Failed to create cohort', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getCohortById(cohortId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:cohort:${cohortId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const cohort = await queryOne(
      'SELECT * FROM user_cohorts WHERE id = $1',
      [cohortId]
    );

    if (cohort) {
      await setCache(cacheKey, JSON.stringify(cohort), 3600);
    }

    return cohort || null;
  } catch (error) {
    logger.error('Failed to get cohort', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function listCohorts(limit: number = 50): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:cohorts:list';
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const cohorts = await queryRows(
      'SELECT * FROM user_cohorts WHERE is_active = true ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    await setCache(cacheKey, JSON.stringify(cohorts), 1800);
    return cohorts;
  } catch (error) {
    logger.error('Failed to list cohorts', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function addUserToCohort(cohortId: string, userId: string): Promise<boolean> {
  try {
    await insert('cohort_members', {
      cohort_id: cohortId,
      user_id: userId,
      joined_at: new Date()
    });

    // Update member count
    const count = await queryOne(
      'SELECT COUNT(*) as count FROM cohort_members WHERE cohort_id = $1',
      [cohortId]
    );

    await update('user_cohorts', { id: cohortId }, {
      member_count: parseInt(count?.count || '0')
    });

    await deleteCache(`sanliurfa:cohort:${cohortId}`);
    return true;
  } catch (error) {
    logger.error('Failed to add user to cohort', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getCohortMembers(cohortId: string, limit: number = 100): Promise<any[]> {
  try {
    return await queryRows(
      'SELECT * FROM cohort_members WHERE cohort_id = $1 ORDER BY joined_at DESC LIMIT $2',
      [cohortId, limit]
    );
  } catch (error) {
    logger.error('Failed to get cohort members', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getRetentionCurve(cohortId: string): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:retention:${cohortId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const retention = await queryRows(
      'SELECT * FROM retention_cohorts WHERE cohort_id = $1 ORDER BY week_number ASC',
      [cohortId]
    );

    await setCache(cacheKey, JSON.stringify(retention), 3600);
    return retention;
  } catch (error) {
    logger.error('Failed to get retention curve', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function calculateRetention(cohortId: string, weekNumber: number): Promise<boolean> {
  try {
    const cohort = await getCohortById(cohortId);
    if (!cohort) return false;

    const cohortMembers = await getCohortMembers(cohortId);
    const totalUsers = cohortMembers.length;

    // Get active users in this week
    const activeUsers = await queryRows(
      `SELECT COUNT(DISTINCT user_id) as count FROM request_metrics
       WHERE user_id IN (SELECT user_id FROM cohort_members WHERE cohort_id = $1)
       AND EXTRACT(WEEK FROM timestamp) = $2`,
      [cohortId, weekNumber]
    );

    const activeCount = parseInt(activeUsers[0]?.count || '0');
    const retentionRate = totalUsers > 0 ? (activeCount / totalUsers) * 100 : 0;

    await insert('retention_cohorts', {
      cohort_id: cohortId,
      week_number: weekNumber,
      period_type: 'weekly',
      total_users: totalUsers,
      active_users: activeCount,
      retention_rate: retentionRate
    });

    await deleteCache(`sanliurfa:retention:${cohortId}`);
    logger.info('Retention calculated', { cohortId, week: weekNumber, rate: retentionRate });
    return true;
  } catch (error) {
    logger.error('Failed to calculate retention', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getCohortMetrics(cohortId: string, days: number = 30): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:cohort:metrics:${cohortId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const since = new Date(Date.now() - days * 24 * 3600000);
    const metrics = await queryRows(
      'SELECT * FROM cohort_metrics WHERE cohort_id = $1 AND metric_date >= $2 ORDER BY metric_date DESC',
      [cohortId, since.toISOString().split('T')[0]]
    );

    await setCache(cacheKey, JSON.stringify(metrics), 1800);
    return metrics;
  } catch (error) {
    logger.error('Failed to get cohort metrics', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
