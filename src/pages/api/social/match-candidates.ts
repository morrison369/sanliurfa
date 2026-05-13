import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getSwipeQuota } from '../../../lib/social/matchmaking-db';
import { getRankedCandidates } from '../../../lib/social/match-scoring';
import { getSocialFeatureConfig } from '../../../lib/social/match-features';
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
      return apiResponse({ success: true, data: [], quota: null }, HttpStatus.OK);
    }

    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const ranked = await getRankedCandidates(auth.user.id, limit);
    const quota = await getSwipeQuota(auth.user.id);

    // UI-friendly shape: MatchCandidate + score/matchReasons
    const data = ranked.map((r) => ({
      userId: r.user_id,
      fullName: r.full_name || 'Üye',
      username: r.username,
      bio: r.bio || '',
      photos: Array.isArray(r.photos) ? r.photos : [],
      score: r.score,
      matchReasons: r.matchReasons,
      preferredDistrict: r.preferred_district,
      profileCompleteness: r.profile_completeness,
    }));

    return apiResponse({ success: true, data, quota }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Eşleşme Adayları Alınamadı',
      detail: safeErrorDetail(error, 'failed_to_get_match_candidates'),
      type: '/problems/social-match-candidates-fetch-failed',
      instance: '/api/social/match-candidates',
    });
  }
};
