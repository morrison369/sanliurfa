/**
 * Search Intelligence Library
 * AI-powered search ranking, personalization, and recommendations
 */
import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function rankSearchResults(results: any[], userId?: string, query?: string): Promise<any[]> {
  try {
    if (!results.length) return results;

    const placIds = results.map((r) => r.id);

    const signals = await queryMany(`
      SELECT
        place_id,
        relevance_score,
        popularity_score,
        quality_score,
        engagement_score,
        overall_rank_score
      FROM ranking_signals
      WHERE place_id = ANY($1)
    `, [placIds]);

    const signalMap = new Map(signals.map((s) => [s.place_id, s]));

    const ranked = results.map((result) => {
      const signal = signalMap.get(result.id);
      if (!signal) return { ...result, ranking_score: 0.5 };

      const baseScore = signal.overall_rank_score || 0.5;
      const recencyBoost = Math.max(0, 1 - (Date.now() - new Date(result.updated_at).getTime()) / (30 * 24 * 60 * 60 * 1000));

      return {
        ...result,
        ranking_score: (baseScore * 0.7) + (recencyBoost * 0.3)
      };
    });

    return ranked.sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));
  } catch (error) {
    logger.error('Failed to rank results', error instanceof Error ? error : new Error(String(error)));
    return results;
  }
}

export async function getPersonalizedRecommendations(userId: string, limit: number = 10): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:recommendations:${userId}:${limit}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const recommendations = await queryMany(`
      SELECT
        pr.id,
        pr.place_id,
        p.title,
        p.average_rating,
        p.category,
        pr.recommendation_reason,
        pr.recommendation_score,
        pr.created_at
      FROM personalized_recommendations pr
      JOIN places p ON pr.place_id = p.id
      WHERE pr.user_id = $1
      AND pr.clicked_at IS NULL
      ORDER BY pr.recommendation_score DESC
      LIMIT $2
    `, [userId, limit]);

    await setCache(cacheKey, JSON.stringify(recommendations), 1800);
    return recommendations;
  } catch (error) {
    logger.error('Failed to get recommendations', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordSearchQuery(userId: string | null, queryText: string, resultsCount: number, filters?: any): Promise<void> {
  try {
    const queryHash = Buffer.from(queryText).toString('base64');

    await insert('search_queries', {
      user_id: userId,
      query_text: queryText,
      results_count: resultsCount,
      filters: filters || {},
      query_hash: queryHash
    });

    await deleteCache(`sanliurfa:search:suggestions:*`);
  } catch (error) {
    logger.error('Failed to record search query', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordSearchFeedback(
  userId: string,
  placeId: string,
  query: string,
  position: number,
  feedback: 'helpful' | 'not_helpful' | 'relevant' | 'not_relevant',
  rating?: number
): Promise<void> {
  try {
    await insert('search_result_feedback', {
      user_id: userId,
      place_id: placeId,
      search_query: query,
      result_position: position,
      feedback_type: feedback,
      relevance_rating: rating
    });

    await deleteCache(`sanliurfa:recommendations:${userId}:*`);
  } catch (error) {
    logger.error('Failed to record feedback', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getUserSearchPreferences(userId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:search:prefs:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const prefs = await queryOne(
      'SELECT * FROM user_search_preferences WHERE user_id = $1',
      [userId]
    );

    if (prefs) {
      await setCache(cacheKey, JSON.stringify(prefs), 3600);
    }

    return prefs || null;
  } catch (error) {
    logger.error('Failed to get search preferences', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function updateSearchPreferences(userId: string, preferences: any): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id FROM user_search_preferences WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      await update(
        'user_search_preferences',
        { user_id: userId },
        preferences
      );
    } else {
      await insert('user_search_preferences', {
        user_id: userId,
        ...preferences
      });
    }

    await deleteCache(`sanliurfa:search:prefs:${userId}`);
    return true;
  } catch (error) {
    logger.error('Failed to update preferences', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getSearchCorrection(query: string): Promise<string | null> {
  try {
    const correction = await queryOne(
      'SELECT corrected_query FROM search_corrections WHERE original_query = $1 ORDER BY confidence_score DESC LIMIT 1',
      [query]
    );

    return correction?.corrected_query || null;
  } catch (error) {
    logger.error('Failed to get correction', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function recordSearchSession(userId: string | null, sessionToken: string, queries: string[]): Promise<void> {
  try {
    const existing = await queryOne(
      'SELECT id FROM search_sessions WHERE session_token = $1',
      [sessionToken]
    );

    if (existing) {
      await update(
        'search_sessions',
        { session_token: sessionToken },
        {
          query_count: queries.length,
          search_queries: queries
        }
      );
    } else {
      await insert('search_sessions', {
        user_id: userId,
        session_token: sessionToken,
        search_queries: queries,
        query_count: queries.length
      });
    }
  } catch (error) {
    logger.error('Failed to record session', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateRankingSignals(placeId: string, signals: any): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id FROM ranking_signals WHERE place_id = $1',
      [placeId]
    );

    if (existing) {
      await update(
        'ranking_signals',
        { place_id: placeId },
        {
          ...signals,
          overall_rank_score: (
            (signals.relevance_score || 0.5) * 0.2 +
            (signals.popularity_score || 0.5) * 0.25 +
            (signals.quality_score || 0.5) * 0.25 +
            (signals.engagement_score || 0.5) * 0.2 +
            (signals.freshness_score || 0.5) * 0.1
          ),
          updated_at: new Date()
        }
      );
    } else {
      await insert('ranking_signals', {
        place_id: placeId,
        ...signals,
        overall_rank_score: (
          (signals.relevance_score || 0.5) * 0.2 +
          (signals.popularity_score || 0.5) * 0.25 +
          (signals.quality_score || 0.5) * 0.25 +
          (signals.engagement_score || 0.5) * 0.2 +
          (signals.freshness_score || 0.5) * 0.1
        )
      });
    }

    return true;
  } catch (error) {
    logger.error('Failed to update ranking signals', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getTrendingSearches(limit: number = 10, days: number = 7): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:trending:searches:${limit}:${days}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const trending = await queryMany(`
      SELECT
        query_text,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results,
        MAX(created_at) as last_searched
      FROM search_queries
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY query_text
      ORDER BY search_count DESC, last_searched DESC
      LIMIT $2
    `, [days, limit]);

    await setCache(cacheKey, JSON.stringify(trending), 3600);
    return trending;
  } catch (error) {
    logger.error('Failed to get trending searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getSimilarSearches(query: string, limit: number = 5): Promise<string[]> {
  try {
    const similar = await queryMany(`
      SELECT DISTINCT query_text
      FROM search_queries
      WHERE query_text ILIKE '%' || $1 || '%'
      AND query_text != $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [query, limit]);

    return similar.map((s) => s.query_text);
  } catch (error) {
    logger.error('Failed to get similar searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
