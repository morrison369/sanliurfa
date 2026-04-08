/**
 * 2FA Verification Endpoint
 * Verify two-factor authentication code and complete setup
 */

import type { APIRoute } from 'astro';
import { verify2FAMethod, activate2FAMethod, generateRecoveryCodes } from '../../../../lib/two-factor-auth';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    // Auth check
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { method_id, code } = body;

    if (!method_id || !code) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Method ID and code required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Verify code
    const isValid = await verify2FAMethod(method_id, code);
    if (!isValid) {
      return apiError(ErrorCode.AUTH_ERROR, 'Invalid verification code', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Activate method
    const activated = await activate2FAMethod(method_id);
    if (!activated) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to activate method', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    // Generate recovery codes
    const codes = await generateRecoveryCodes(method_id);

    logger.info('2FA method verified and activated', { userId: locals.user.id, methodId: method_id });

    return apiResponse({
      success: true,
      data: {
        message: '2FA successfully enabled',
        recovery_codes: codes
      }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('2FA verification failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Verification failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
