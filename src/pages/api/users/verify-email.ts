/**
 * Email verification endpoint
 * GET /api/users/verify-email?token=xxx
 */

import type { APIRoute } from 'astro';
import { verifyEmailWithToken } from '../../../lib/email';
import { apiResponse, apiError, HttpStatus } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const { token } = context.url.searchParams;

    if (!token || typeof token !== 'string' || token.length !== 64) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Invalid verification token');
    }

    const result = await verifyEmailWithToken(token);

    if (!result) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Invalid or expired verification token');
    }

    logger.info('Email verified via API', { userId: result.userId, email: result.email });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Email verified successfully',
      userId: result.userId,
      email: result.email
    });
  } catch (error) {
    logger.error('Email verification error', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to verify email');
  }
};
