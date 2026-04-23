import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { getSwipeProfile, upsertSwipeProfile } from '../../../../lib/social-swipe';
import { enforceApiRateLimit } from '../../../../lib/api-rate-limit';
import { isSocialMatchingEnabled } from '../../../../lib/feature-flags';

export const GET: APIRoute = async ({ request, locals }) => {
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

  const isAllowed = await enforceApiRateLimit(request, 'social:swipe:profile:get', 120, 15 * 60, locals.user.id);
  if (!isAllowed) {
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Çok sık profil sorguluyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
      HttpStatus.RATE_LIMITED,
      undefined,
      requestId
    );
  }

  const profile = await getSwipeProfile(locals.user.id);
  return apiResponse({ success: true, data: profile }, HttpStatus.OK, requestId);
};

export const PUT: APIRoute = async ({ request, locals }) => {
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

  const isAllowed = await enforceApiRateLimit(request, 'social:swipe:profile:put', 40, 15 * 60, locals.user.id);
  if (!isAllowed) {
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Çok sık profil güncellemesi yapıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
      HttpStatus.RATE_LIMITED,
      undefined,
      requestId
    );
  }

  const body = await request.json();
  const profile = await upsertSwipeProfile(locals.user.id, {
    bio: body?.bio,
    photos: body?.photos
  });

  return apiResponse({ success: true, data: profile }, HttpStatus.OK, requestId);
};
