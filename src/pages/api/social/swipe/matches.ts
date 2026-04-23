import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { getUserMatches } from '../../../../lib/social-swipe';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  if (!locals.user?.id) {
    return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
  const matches = await getUserMatches(locals.user.id, limit);
  return apiResponse({ success: true, data: matches, count: matches.length }, HttpStatus.OK, requestId);
};
