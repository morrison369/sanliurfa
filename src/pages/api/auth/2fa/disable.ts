/**
 * Disable 2FA
 * DELETE /api/auth/2fa
 */

import type { APIRoute } from 'astro';
import { disableTwoFactor } from '../../../../lib/two-factor';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('DELETE', '/api/auth/2fa', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const success = await disableTwoFactor(locals.user.id);

    if (!success) {
      recordRequest('DELETE', '/api/auth/2fa', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to disable 2FA', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    recordRequest('DELETE', '/api/auth/2fa', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      { success: true, message: '2FA disabled' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/auth/2fa', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to disable 2FA', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Disable failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
