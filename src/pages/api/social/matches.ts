import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getUserMatches } from '../../../lib/social/matchmaking-db';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail, safeIntParam } from '../../../lib/api';
import { enforceSocialRateLimit } from '../../../lib/social/abuse-policy';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/social-matches-unauthorized',
        instance: '/api/social/matches',
      });
    }
    const rate = await enforceSocialRateLimit(request, auth.user.id, 'message_read', auth.user.role || null);
    if (!rate.allowed) {
      return problemJson({
        status: 429,
        title: 'Rate Limit Aşıldı',
        detail: 'Eşleşme listeleme limiti aşıldı, lütfen kısa süre sonra tekrar deneyin.',
        type: '/problems/social-matches-rate-limit',
        instance: '/api/social/matches',
      });
    }

    const limit = safeIntParam(url.searchParams.get('limit'), 30, 1, 100);
    const matches = await getUserMatches(auth.user.id, limit);

    return apiResponse({ success: true, data: matches }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Eşleşmeler Alınamadı',
      detail: safeErrorDetail(error, 'failed_to_get_matches'),
      type: '/problems/social-matches-fetch-failed',
      instance: '/api/social/matches',
    });
  }
};
