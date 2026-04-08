/**
 * Trending & Recommendations Engine
 * Trending algorithms, recommendation engine, content discovery
 */

import { queryOne, queryMany, insert, update, query } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export interface TrendingScore {
  id: string;
  entity_type: string;
  entity_id: string;
  period: 'hourly' | 'daily' | 'weekly';
  score: number;
  view_count: number;
  interaction_count: number;
  share_count: number;
}

export interface ContentPopularity {
  id: string;
  content_type: string;
  content_id: string;
  total_views: number;
  total_interactions: number;
  total_shares: number;
  engagement_rate: number;
  virality_score: number;
}

export interface UserRecommendation {
  id: string;
  user_id: string;
  recommendation_type: string;
  recommended_entity_type: string;
  recommended_entity_id: string;
  relevance_score: number;
  reason?: string;
}

export interface UserInterest {
  user_id: string;
  interest_category: string;
  interest_score: number;
  interaction_count: number;
}

// ===== TRENDING SCORES =====

export async function calculateTrendingScore(
  entityType: string,
  entityId: string,
  period: 'hourly' | 'daily' | 'weekly',
  viewCount: number,
  interactionCount: number,
  shareCount: number
): Promise<number> {
  // Trending score algorithm
  // Views: 1 point each
  // Interactions (likes, comments): 5 points each
  // Shares: 10 points each
  // Decay factor based on time

  const score = viewCount * 1 + interactionCount * 5 + shareCount * 10;
  return Math.max(0, score);
}

export async function getTrendingScores(
  entityType: string,
  period: 'hourly' | 'daily' | 'weekly',
  limit: number = 20
): Promise<TrendingScore[]> {
  try {
    const cacheKey = `sanliurfa:trending:${entityType}:${period}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const scores = await queryMany(
      `SELECT * FROM trending_scores
       WHERE entity_type = $1 AND period = $2 AND valid_until > NOW()
       ORDER BY score DESC
       LIMIT $3`,
      [entityType, period, limit]
    );

    await setCache(cacheKey, JSON.stringify(scores), 1800);
    return scores as TrendingScore[];
  } catch (error) {
    logger.error(
      'Failed to get trending scores',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function updateTrendingScore(
  entityType: string,
  entityId: string,
  period: 'hourly' | 'daily' | 'weekly',
  stats: {
    viewCount: number;
    interactionCount: number;
    shareCount: number;
  }
): Promise<boolean> {
  try {
    const score = await calculateTrendingScore(
      entityType,
      entityId,
      period,
      stats.viewCount,
      stats.interactionCount,
      stats.shareCount
    );

    const existing = await queryOne(
      'SELECT id FROM trending_scores WHERE entity_type = $1 AND entity_id = $2 AND period = $3',
      [entityType, entityId, period]
    );

    const validUntil = getValidUntilDate(period);

    if (existing) {
      await update(
        'trending_scores',
        { entity_type: entityType, entity_id: entityId, period },
        {
          score,
          view_count: stats.viewCount,
          interaction_count: stats.interactionCount,
          share_count: stats.shareCount,
          calculated_at: new Date(),
          valid_until: validUntil
        }
      );
    } else {
      await insert('trending_scores', {
        entity_type: entityType,
        entity_id: entityId,
        period,
        score,
        view_count: stats.viewCount,
        interaction_count: stats.interactionCount,
        share_count: stats.shareCount,
        valid_until: validUntil,
        created_at: new Date()
      });
    }

    await deleteCache(`sanliurfa:trending:${entityType}:${period}`);
    return true;
  } catch (error) {
    logger.error(
      'Failed to update trending score',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

function getValidUntilDate(period: string): Date {
  const now = new Date();
  if (period === 'hourly') {
    return new Date(now.getTime() + 3600000); // 1 hour
  } else if (period === 'daily') {
    return new Date(now.getTime() + 86400000); // 24 hours
  } else {
    return new Date(now.getTime() + 604800000); // 7 days
  }
}

// ===== RECOMMENDATIONS =====

export async function generateUserRecommendations(userId: string, limit: number = 10): Promise<UserRecommendation[]> {
  try {
    // Get user interests
    const interests = await queryMany(
      'SELECT interest_category, interest_score FROM user_interests WHERE user_id = $1 ORDER BY interest_score DESC LIMIT 5',
      [userId]
    );

    if (interests.length === 0) {
      // Return trending items if no interests
      return getTrendingRecommendations(limit);
    }

    const categories = interests.map((i: any) => i.interest_category);

    // Get popular content in user's interest categories
    const recommendations = await queryMany(
      `SELECT DISTINCT
         'content' as recommendation_type,
         cp.content_type as recommended_entity_type,
         cp.content_id as recommended_entity_id,
         cp.engagement_rate as relevance_score,
         'Popular in your interests' as reason
       FROM content_popularity cp
       WHERE cp.content_type = ANY($1)
       AND cp.content_id NOT IN (
         SELECT recommended_entity_id FROM user_recommendations
         WHERE user_id = $2 AND created_at > NOW() - INTERVAL '7 days'
       )
       ORDER BY cp.engagement_rate DESC
       LIMIT $3`,
      [categories, userId, limit]
    );

    return recommendations as UserRecommendation[];
  } catch (error) {
    logger.error(
      'Failed to generate recommendations',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function getTrendingRecommendations(limit: number = 10): Promise<UserRecommendation[]> {
  try {
    const trending = await queryMany(
      `SELECT DISTINCT
         'trending' as recommendation_type,
         ts.entity_type as recommended_entity_type,
         ts.entity_id as recommended_entity_id,
         ts.score as relevance_score,
         'Trending now' as reason
       FROM trending_scores ts
       WHERE ts.period = 'daily'
       ORDER BY ts.score DESC
       LIMIT $1`,
      [limit]
    );

    return trending as UserRecommendation[];
  } catch (error) {
    logger.error(
      'Failed to get trending recommendations',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function saveUserRecommendation(
  userId: string,
  entityType: string,
  entityId: string,
  type: string = 'personalized',
  reason?: string,
  score?: number
): Promise<UserRecommendation | null> {
  try {
    const recommendation = await insert('user_recommendations', {
      user_id: userId,
      recommendation_type: type,
      recommended_entity_type: entityType,
      recommended_entity_id: entityId,
      relevance_score: score || 0.5,
      reason,
      created_at: new Date()
    });

    return recommendation as UserRecommendation;
  } catch (error) {
    logger.error(
      'Failed to save recommendation',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getUserRecommendations(userId: string, limit: number = 20): Promise<UserRecommendation[]> {
  try {
    const cacheKey = `sanliurfa:recommendations:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const recommendations = await queryMany(
      `SELECT * FROM user_recommendations
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY relevance_score DESC
       LIMIT $2`,
      [userId, limit]
    );

    await setCache(cacheKey, JSON.stringify(recommendations), 1800);
    return recommendations as UserRecommendation[];
  } catch (error) {
    logger.error(
      'Failed to get user recommendations',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

// ===== USER INTERESTS =====

export async function trackUserInterest(userId: string, category: string, weight: number = 1): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id, interaction_count FROM user_interests WHERE user_id = $1 AND interest_category = $2',
      [userId, category]
    );

    if (existing) {
      await update(
        'user_interests',
        { user_id: userId, interest_category: category },
        {
          interest_score: (existing.interaction_count + weight) * 0.5,
          interaction_count: existing.interaction_count + 1,
          last_interacted_at: new Date()
        }
      );
    } else {
      await insert('user_interests', {
        user_id: userId,
        interest_category: category,
        interest_score: weight,
        interaction_count: 1,
        last_interacted_at: new Date(),
        created_at: new Date()
      });
    }

    await deleteCache(`sanliurfa:recommendations:${userId}`);
    return true;
  } catch (error) {
    logger.error(
      'Failed to track interest',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function getUserInterests(userId: string): Promise<UserInterest[]> {
  try {
    return await queryMany(
      'SELECT * FROM user_interests WHERE user_id = $1 ORDER BY interest_score DESC',
      [userId]
    );
  } catch (error) {
    logger.error(
      'Failed to get user interests',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

// ===== CONTENT POPULARITY =====

export async function updateContentPopularity(
  contentType: string,
  contentId: string,
  metrics: {
    views: number;
    interactions: number;
    shares: number;
  }
): Promise<boolean> {
  try {
    const total = metrics.views + metrics.interactions + metrics.shares;
    const engagementRate = total > 0 ? (metrics.interactions + metrics.shares * 2) / (metrics.views || 1) : 0;
    const viralityScore = metrics.shares > 0 ? Math.log(metrics.shares + 1) * engagementRate : 0;

    const existing = await queryOne(
      'SELECT id FROM content_popularity WHERE content_type = $1 AND content_id = $2',
      [contentType, contentId]
    );

    if (existing) {
      await update(
        'content_popularity',
        { content_type: contentType, content_id: contentId },
        {
          total_views: metrics.views,
          total_interactions: metrics.interactions,
          total_shares: metrics.shares,
          engagement_rate: engagementRate,
          virality_score: viralityScore,
          peak_popularity_date: new Date(),
          updated_at: new Date()
        }
      );
    } else {
      await insert('content_popularity', {
        content_type: contentType,
        content_id: contentId,
        total_views: metrics.views,
        total_interactions: metrics.interactions,
        total_shares: metrics.shares,
        engagement_rate: engagementRate,
        virality_score: viralityScore,
        peak_popularity_date: new Date(),
        created_at: new Date()
      });
    }

    return true;
  } catch (error) {
    logger.error(
      'Failed to update content popularity',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function getPopularContent(
  contentType: string,
  limit: number = 20,
  sortBy: 'engagement' | 'virality' = 'engagement'
): Promise<ContentPopularity[]> {
  try {
    const sortColumn = sortBy === 'engagement' ? 'engagement_rate' : 'virality_score';

    return await queryMany(
      `SELECT * FROM content_popularity
       WHERE content_type = $1
       ORDER BY ${sortColumn} DESC
       LIMIT $2`,
      [contentType, limit]
    );
  } catch (error) {
    logger.error(
      'Failed to get popular content',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

// ===== TRENDING KEYWORDS =====

export async function getTrendingKeywords(period: 'hourly' | 'daily' | 'weekly', limit: number = 20): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:keywords:${period}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const keywords = await queryMany(
      `SELECT * FROM trending_keywords
       WHERE period = $1
       ORDER BY trend_score DESC
       LIMIT $2`,
      [period, limit]
    );

    await setCache(cacheKey, JSON.stringify(keywords), 1800);
    return keywords;
  } catch (error) {
    logger.error(
      'Failed to get trending keywords',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

// ===== DISCOVERY FEED =====

export async function getDiscoveryFeed(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:discovery:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const feed = await queryMany(
      `SELECT * FROM discovery_feeds
       WHERE user_id = $1
       ORDER BY position ASC, created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    await setCache(cacheKey, JSON.stringify(feed), 600);
    return feed;
  } catch (error) {
    logger.error(
      'Failed to get discovery feed',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function addToDiscoveryFeed(
  userId: string,
  contentType: string,
  contentId: string,
  position: number,
  reason?: string
): Promise<boolean> {
  try {
    await insert('discovery_feeds', {
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      position,
      reason,
      created_at: new Date()
    });

    await deleteCache(`sanliurfa:discovery:${userId}`);
    return true;
  } catch (error) {
    logger.error(
      'Failed to add to discovery feed',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}
