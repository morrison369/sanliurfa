/**
 * Public social stats — anonymous, cached.
 * Used by /eslesme + anasayfa community panel for social proof.
 *
 * Privacy: sadece toplam sayılar, hiçbir user-identifying bilgi yok.
 */
import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, ErrorCode, HttpStatus, getRequestId } from '../../../lib/api';
import { getCache, setCache } from '../../../lib/cache/cache';
import { logger } from '../../../lib/logging';

const CACHE_KEY = 'social:stats:public';
const CACHE_TTL_SEC = 300; // 5 dakika

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);
  try {
    const cached = await getCache<any>(CACHE_KEY);
    if (cached) {
      return apiResponse({ success: true, data: cached, cached: true }, HttpStatus.OK, requestId);
    }

    const [profilesRow, matchesRow, followsRow, swipesRow] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM user_match_profiles WHERE is_discoverable = true`,
      ).catch(() => ({ rows: [{ count: '0' }] })),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM social_matches WHERE created_at > NOW() - INTERVAL '30 days'`,
      ).catch(() => ({ rows: [{ count: '0' }] })),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM user_follows WHERE created_at > NOW() - INTERVAL '30 days'`,
      ).catch(() => ({ rows: [{ count: '0' }] })),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM social_swipes WHERE created_at > NOW() - INTERVAL '7 days'`,
      ).catch(() => ({ rows: [{ count: '0' }] })),
    ]);

    const data = {
      activeProfiles: parseInt(profilesRow.rows[0]?.count || '0', 10),
      matchesLast30Days: parseInt(matchesRow.rows[0]?.count || '0', 10),
      newFollowsLast30Days: parseInt(followsRow.rows[0]?.count || '0', 10),
      swipesLast7Days: parseInt(swipesRow.rows[0]?.count || '0', 10),
      updatedAt: new Date().toISOString(),
    };

    await setCache(CACHE_KEY, data, CACHE_TTL_SEC).catch(() => null);
    return apiResponse({ success: true, data, cached: false }, HttpStatus.OK, requestId);
  } catch (err) {
    logger.error('Social stats fetch failed', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Stats unavailable', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
