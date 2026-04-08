/**
 * User Journey Analytics Library
 * Track and analyze user paths and interactions
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import crypto from 'crypto';

export async function createJourneySession(userId: string, sessionId: string, deviceType: string, browser: string, referrerSource: string, landingPage: string): Promise<any | null> {
  try {
    const result = await insert('user_journey_sessions', {
      user_id: userId,
      session_id: sessionId,
      device_type: deviceType,
      browser: browser,
      referrer_source: referrerSource,
      landing_page: landingPage,
      start_time: new Date(),
      page_views: 0,
      interactions: 0,
      bounce: true,
      conversion: false
    });

    logger.info('Journey session created', { userId, sessionId: sessionId.substring(0, 8) });
    return result;
  } catch (error) {
    logger.error('Failed to create journey session', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function recordJourneyStep(journeySessionId: string, userId: string, stepNumber: number, pageUrl: string, pageTitle: string, actionType: string, timeOnPage: number): Promise<boolean> {
  try {
    await insert('journey_steps', {
      journey_session_id: journeySessionId,
      user_id: userId,
      step_number: stepNumber,
      page_url: pageUrl,
      page_title: pageTitle,
      action_type: actionType,
      time_on_page_seconds: timeOnPage,
      timestamp: new Date()
    });

    // Update session page views
    await update('user_journey_sessions', { id: journeySessionId }, {
      page_views: stepNumber,
      bounce: false  // More than one page view = not a bounce
    });

    return true;
  } catch (error) {
    logger.error('Failed to record journey step', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function endJourneySession(sessionId: string, converted: boolean = false): Promise<boolean> {
  try {
    const session = await queryOne(
      'SELECT * FROM user_journey_sessions WHERE session_id = $1',
      [sessionId]
    );

    if (!session) return false;

    const durationSeconds = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000);

    await update('user_journey_sessions', { session_id: sessionId }, {
      end_time: new Date(),
      duration_seconds: durationSeconds,
      conversion: converted
    });

    // Record path if conversion
    if (converted) {
      await recordJourneyPath(sessionId);
    }

    return true;
  } catch (error) {
    logger.error('Failed to end journey session', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function recordJourneyPath(sessionId: string): Promise<void> {
  try {
    const steps = await queryMany(
      `SELECT page_url FROM journey_steps
       WHERE journey_session_id = (SELECT id FROM user_journey_sessions WHERE session_id = $1)
       ORDER BY step_number ASC`,
      [sessionId]
    );

    const pathSequence = steps.map((s: any) => s.page_url).join(' -> ');
    const pathHash = crypto.createHash('sha256').update(pathSequence).digest('hex');

    const existing = await queryOne(
      'SELECT * FROM journey_paths WHERE path_hash = $1',
      [pathHash]
    );

    if (existing) {
      await update('journey_paths', { path_hash: pathHash }, {
        user_count: existing.user_count + 1,
        conversion_count: existing.conversion_count + 1,
        conversion_rate: ((existing.conversion_count + 1) / (existing.user_count + 1)) * 100,
        last_seen: new Date()
      });
    } else {
      await insert('journey_paths', {
        path_hash: pathHash,
        path_sequence: pathSequence,
        path_length: steps.length,
        user_count: 1,
        conversion_count: 1,
        conversion_rate: 100,
        avg_duration_seconds: 0,
        first_seen: new Date(),
        last_seen: new Date()
      });
    }

    await deleteCache('sanliurfa:journey:paths');
  } catch (error) {
    logger.error('Failed to record journey path', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getTopConvertingPaths(limit: number = 10): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:journey:paths:top';
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const paths = await queryMany(
      'SELECT * FROM journey_paths ORDER BY conversion_rate DESC, user_count DESC LIMIT $1',
      [limit]
    );

    await setCache(cacheKey, JSON.stringify(paths), 3600);
    return paths;
  } catch (error) {
    logger.error('Failed to get top paths', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUserJourneys(userId: string, limit: number = 20): Promise<any[]> {
  try {
    return await queryMany(
      'SELECT * FROM user_journey_sessions WHERE user_id = $1 ORDER BY start_time DESC LIMIT $2',
      [userId, limit]
    );
  } catch (error) {
    logger.error('Failed to get user journeys', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getJourneyDetails(journeySessionId: string): Promise<any> {
  try {
    const session = await queryOne(
      'SELECT * FROM user_journey_sessions WHERE id = $1',
      [journeySessionId]
    );

    if (!session) return null;

    const steps = await queryMany(
      'SELECT * FROM journey_steps WHERE journey_session_id = $1 ORDER BY step_number ASC',
      [journeySessionId]
    );

    return {
      session: session,
      steps: steps
    };
  } catch (error) {
    logger.error('Failed to get journey details', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function analyzeBehaviorPattern(userId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:behavior:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const journeys = await getUserJourneys(userId, 100);

    const engagementScores = journeys.map((j: any) => j.duration_seconds || 0);
    const avgEngagement = engagementScores.reduce((a: number, b: number) => a + b, 0) / journeys.length;

    const conversionCount = journeys.filter((j: any) => j.conversion).length;
    const conversionRate = journeys.length > 0 ? (conversionCount / journeys.length) * 100 : 0;

    const churnRisk = conversionRate < 10 && journeys.length > 3 ? 0.7 : 0.2;

    const pattern = {
      user_id: userId,
      engagement_level: avgEngagement > 300 ? 'high' : avgEngagement > 60 ? 'medium' : 'low',
      conversion_rate: conversionRate,
      churn_risk: churnRisk,
      total_journeys: journeys.length,
      avg_engagement: Math.floor(avgEngagement)
    };

    await setCache(cacheKey, JSON.stringify(pattern), 3600);
    return pattern;
  } catch (error) {
    logger.error('Failed to analyze behavior pattern', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
