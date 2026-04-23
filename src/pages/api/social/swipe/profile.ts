import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { getSwipeProfile, upsertSwipeProfile } from '../../../../lib/social-swipe';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  if (!locals.user?.id) {
    return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  const profile = await getSwipeProfile(locals.user.id);
  return apiResponse({ success: true, data: profile }, HttpStatus.OK, requestId);
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  if (!locals.user?.id) {
    return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  const body = await request.json();
  const profile = await upsertSwipeProfile(locals.user.id, {
    bio: body?.bio,
    photos: body?.photos
  });

  return apiResponse({ success: true, data: profile }, HttpStatus.OK, requestId);
};
