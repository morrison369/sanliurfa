/**
 * Email verification endpoint
 * GET /api/users/verify-email?token=xxx
 */

import type { APIRoute } from 'astro';
import { verifyEmailWithToken } from '../../../lib/email';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const token = context.url.searchParams.get('token');

    if (!token || typeof token !== 'string' || token.length !== 64) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid verification token', HttpStatus.BAD_REQUEST, undefined, undefined);
    }

    const result = await verifyEmailWithToken(token);

    if (!result) {
      return apiError(ErrorCode.NOT_FOUND, 'Invalid or expired verification token', HttpStatus.NOT_FOUND, undefined, undefined);
    }

    logger.info('Email verified via API', { success: result });

    return apiResponse(
      {
        success: true,
        message: 'Email verified successfully',
      },
      HttpStatus.OK,
      undefined
    );
  } catch (error) {
    logger.error('Email verification error', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to verify email', HttpStatus.INTERNAL_SERVER_ERROR, undefined, undefined);
  }
};
