import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { createSwipe } from '../../../../lib/social-swipe';
import { canStartConversation } from '../../../../lib/social-policy';
import { enforceApiRateLimit } from '../../../../lib/api-rate-limit';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  if (!locals.user?.id) {
    return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  const isAllowed = await enforceApiRateLimit(request, 'social:swipe:action', 160, 15 * 60, locals.user.id);
  if (!isAllowed) {
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Çok hızlı işlem yapıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.',
      HttpStatus.RATE_LIMITED,
      undefined,
      requestId
    );
  }

  const body = await request.json();
  const targetId = typeof body?.targetId === 'string' ? body.targetId : '';
  const direction = body?.direction === 'pass' ? 'pass' : body?.direction === 'like' ? 'like' : '';

  if (!targetId || !direction) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      'targetId ve direction (like/pass) zorunludur',
      HttpStatus.UNPROCESSABLE_ENTITY,
      undefined,
      requestId
    );
  }

  const policy = await canStartConversation(locals.user.id, targetId);
  if (!policy.allowed && policy.code !== 'messages_disabled') {
    const statusCode = policy.code === 'target_not_found' ? HttpStatus.NOT_FOUND : HttpStatus.FORBIDDEN;
    return apiError(
      statusCode === HttpStatus.NOT_FOUND ? ErrorCode.NOT_FOUND : ErrorCode.FORBIDDEN,
      policy.message,
      statusCode,
      undefined,
      requestId
    );
  }

  const result = await createSwipe(locals.user.id, targetId, direction);
  return apiResponse(
    {
      success: true,
      data: {
        targetId,
        direction,
        matched: result.matched,
        matchId: result.matchId
      }
    },
    HttpStatus.OK,
    requestId
  );
};
