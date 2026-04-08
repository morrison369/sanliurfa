/**
 * Resend email verification endpoint
 * POST /api/users/resend-verification
 */

import type { APIRoute } from 'astro';
import { requestEmailVerification, isEmailVerified } from '../../../lib/email';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async (context) => {
  try {
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;

    // Get user's current email
    const user = await queryOne(
      'SELECT id, email, full_name, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return apiError(context, HttpStatus.NOT_FOUND, 'User not found');
    }

    // Check if email already verified
    if (user.email_verified) {
      return apiResponse(context, HttpStatus.OK, {
        success: true,
        message: 'Email is already verified',
        verified: true
      });
    }

    // Send verification email
    const sent = await requestEmailVerification(userId, user.email, user.full_name);

    if (!sent) {
      return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to send verification email');
    }

    logger.info('Verification email resent', { userId, email: user.email });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    logger.error('Resend verification error', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to resend verification email');
  }
};
