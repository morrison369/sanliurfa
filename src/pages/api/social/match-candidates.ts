import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getMatchCandidates, getSwipeQuota } from '../../../lib/social/matchmaking-db';
import { getSocialFeatureConfig } from '../../../lib/social/match-features';
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
        type: '/problems/social-match-candidates-unauthorized',
        instance: '/api/social/match-candidates',
      });
    }
    const rate = await enforceSocialRateLimit(request, auth.user.id, 'message_read', auth.user.role || null);
    if (!rate.allowed) {
      return problemJson({
        status: 429,
        title: 'Rate Limit Aşıldı',
        detail: 'Aday listeleme limiti aşıldı, lütfen kısa süre sonra tekrar deneyin.',
        type: '/problems/social-match-candidates-rate-limit',
        instance: '/api/social/match-candidates',
      });
    }

    const config = getSocialFeatureConfig();
    if (!config.tinderEnabled) {
      return new Response(JSON.stringify({ success: true, data: [], quota: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const limit = Number(url.searchParams.get('limit') || '20');
    const candidates = await getMatchCandidates(auth.user.id, limit);
    const quota = await getSwipeQuota(auth.user.id);

    return new Response(JSON.stringify({ success: true, data: candidates, quota }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Eşleşme Adayları Alınamadı',
      detail: error instanceof Error ? error.message : 'failed_to_get_match_candidates',
      type: '/problems/social-match-candidates-fetch-failed',
      instance: '/api/social/match-candidates',
    });
  }
};
