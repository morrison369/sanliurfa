import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getUserMatches } from '../../../lib/social/matchmaking-db';
import { problemJson } from '../../../lib/api';
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

    const limit = Number(url.searchParams.get('limit') || '30');
    const matches = await getUserMatches(auth.user.id, limit);

    return new Response(JSON.stringify({ success: true, data: matches }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Eşleşmeler Alınamadı',
      detail: error instanceof Error ? error.message : 'failed_to_get_matches',
      type: '/problems/social-matches-fetch-failed',
      instance: '/api/social/matches',
    });
  }
};
