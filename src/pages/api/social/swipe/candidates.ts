import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { getSwipeCandidates } from '../../../../lib/social-swipe';
import { enforceApiRateLimit } from '../../../../lib/api-rate-limit';
import { isSocialMatchingEnabled } from '../../../../lib/feature-flags';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  if (!isSocialMatchingEnabled()) {
    return apiError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Sosyal eşleşme modülü şu anda bakımda.',
      HttpStatus.SERVICE_UNAVAILABLE,
      undefined,
      requestId
    );
  }

  if (!locals.user?.id) {
    return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  const isAllowed = await enforceApiRateLimit(request, 'social:swipe:candidates', 100, 15 * 60, locals.user.id);
  if (!isAllowed) {
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Çok sık yenileme yapıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
      HttpStatus.RATE_LIMITED,
      undefined,
      requestId
    );
  }

  const limit = Number.parseInt(url.searchParams.get('limit') || '20', 10);
  const candidates = await getSwipeCandidates(locals.user.id, limit);
  return apiResponse({ success: true, data: candidates, count: candidates.length }, HttpStatus.OK, requestId);
};
