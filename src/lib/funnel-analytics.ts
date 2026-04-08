/**
 * Conversion Funnel Analytics Library
 * Track and optimize conversion funnels
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function createFunnel(userId: string, funnelName: string, funnelKey: string, goalDescription: string, steps: any[]): Promise<any | null> {
  try {
    const result = await insert('conversion_funnels', {
      funnel_name: funnelName,
      funnel_key: funnelKey,
      goal_description: goalDescription,
      funnel_steps: steps,
      created_by_user_id: userId,
      is_active: true
    });

    await deleteCache('sanliurfa:funnels:list');
    logger.info('Funnel created', { funnelId: result.id, funnelName });
    return result;
  } catch (error) {
    logger.error('Failed to create funnel', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getFunnelById(funnelId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:funnel:${funnelId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const funnel = await queryOne(
      'SELECT * FROM conversion_funnels WHERE id = $1',
      [funnelId]
    );

    if (funnel) {
      await setCache(cacheKey, JSON.stringify(funnel), 3600);
    }

    return funnel || null;
  } catch (error) {
    logger.error('Failed to get funnel', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function listFunnels(): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:funnels:list';
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const funnels = await queryMany(
      'SELECT * FROM conversion_funnels WHERE is_active = true ORDER BY created_at DESC',
      []
    );

    await setCache(cacheKey, JSON.stringify(funnels), 1800);
    return funnels;
  } catch (error) {
    logger.error('Failed to list funnels', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function trackFunnelEntry(funnelId: string, userId: string, sessionId: string): Promise<any | null> {
  try {
    const result = await insert('funnel_entries', {
      funnel_id: funnelId,
      user_id: userId,
      session_id: sessionId,
      entered_at: new Date(),
      completed: false
    });

    logger.info('Funnel entry tracked', { funnelId, userId });
    return result;
  } catch (error) {
    logger.error('Failed to track funnel entry', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function trackFunnelStep(entryId: string, funnelId: string, userId: string, stepNumber: number, stepName: string): Promise<boolean> {
  try {
    await insert('funnel_step_completions', {
      funnel_entry_id: entryId,
      funnel_id: funnelId,
      user_id: userId,
      step_number: stepNumber,
      step_name: stepName,
      completed_at: new Date()
    });

    return true;
  } catch (error) {
    logger.error('Failed to track funnel step', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function completeFunnel(entryId: string): Promise<boolean> {
  try {
    await update('funnel_entries', { id: entryId }, {
      completed: true,
      completed_at: new Date()
    });

    await deleteCache(`sanliurfa:funnel:analytics:${entryId}`);
    return true;
  } catch (error) {
    logger.error('Failed to complete funnel', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function recordFunnelDropoff(entryId: string, stepNumber: number, reason: string): Promise<boolean> {
  try {
    await update('funnel_entries', { id: entryId }, {
      drop_step: stepNumber,
      drop_reason: reason
    });

    logger.info('Funnel dropout tracked', { entryId, step: stepNumber, reason });
    return true;
  } catch (error) {
    logger.error('Failed to record funnel dropout', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getFunnelAnalytics(funnelId: string, days: number = 30): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:funnel:analytics:${funnelId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const since = new Date(Date.now() - days * 24 * 3600000);

    const funnel = await getFunnelById(funnelId);
    if (!funnel) return null;

    const entries = await queryMany(
      'SELECT * FROM funnel_entries WHERE funnel_id = $1 AND entered_at >= $2',
      [funnelId, since]
    );

    const totalEntries = entries.length;
    const completedEntries = entries.filter((e: any) => e.completed).length;
    const completionRate = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;

    // Calculate drop-off by step
    const dropOffByStep: any = {};
    for (let i = 1; i <= funnel.funnel_steps.length; i++) {
      const stepDropoffs = entries.filter((e: any) => e.drop_step === i).length;
      dropOffByStep[`step_${i}`] = {
        name: funnel.funnel_steps[i - 1]?.name || `Step ${i}`,
        dropoffs: stepDropoffs,
        dropout_rate: totalEntries > 0 ? (stepDropoffs / totalEntries) * 100 : 0
      };
    }

    const analytics = {
      funnel_id: funnelId,
      funnel_name: funnel.funnel_name,
      total_entries: totalEntries,
      completed_entries: completedEntries,
      completion_rate: completionRate,
      drop_off_by_step: dropOffByStep,
      period_days: days
    };

    await setCache(cacheKey, JSON.stringify(analytics), 3600);
    return analytics;
  } catch (error) {
    logger.error('Failed to get funnel analytics', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getFunnelComparison(funnelIds: string[]): Promise<any[]> {
  try {
    const comparisons = await Promise.all(
      funnelIds.map(id => getFunnelAnalytics(id))
    );

    return comparisons.filter(c => c !== null);
  } catch (error) {
    logger.error('Failed to compare funnels', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function optimizeFunnelSteps(funnelId: string): Promise<any[]> {
  try {
    const analytics = await getFunnelAnalytics(funnelId);
    if (!analytics) return [];

    const dropOff = analytics.drop_off_by_step;
    const recommendations = [];

    for (const [stepKey, stepData] of Object.entries(dropOff)) {
      const step = stepData as any;
      if (step.dropout_rate > 30) {
        recommendations.push({
          step: stepKey,
          step_name: step.name,
          issue: 'High dropout rate',
          dropout_rate: step.dropout_rate.toFixed(1),
          recommendation: `Analyze and optimize ${step.name}. High dropout suggests friction or confusion.`
        });
      }
    }

    return recommendations;
  } catch (error) {
    logger.error('Failed to optimize funnel steps', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
