import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { getUserMatches } from '../../../../lib/social-swipe';
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

  const isAllowed = await enforceApiRateLimit(request, 'social:swipe:matches', 100, 15 * 60, locals.user.id);
  if (!isAllowed) {
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Çok sık sorgu yapıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
      HttpStatus.RATE_LIMITED,
      undefined,
      requestId
    );
  }

  const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
  const matches = await getUserMatches(locals.user.id, limit);
  return apiResponse({ success: true, data: matches, count: matches.length }, HttpStatus.OK, requestId);
};
