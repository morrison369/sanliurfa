import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { getSwipeCandidates } from '../../../../lib/social-swipe';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  if (!locals.user?.id) {
    return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  const limit = Number.parseInt(url.searchParams.get('limit') || '20', 10);
  const candidates = await getSwipeCandidates(locals.user.id, limit);
  return apiResponse({ success: true, data: candidates, count: candidates.length }, HttpStatus.OK, requestId);
};
