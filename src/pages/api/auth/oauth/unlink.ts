/**
 * Unlink OAuth Provider
 * DELETE /api/auth/oauth/unlink/:provider
 */

import type { APIRoute } from 'astro';
import { queryOne, update as updateDb } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const DELETE: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('DELETE', '/api/auth/oauth/unlink', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const provider = url.searchParams.get('provider') || '';

    if (!['google', 'facebook', 'github'].includes(provider)) {
      recordRequest('DELETE', '/api/auth/oauth/unlink', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.BAD_REQUEST, 'Invalid provider', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get user's authentication methods (optimized: select only needed columns)
    const user = await queryOne(
      `SELECT password_hash, google_id, facebook_id, github_id FROM users WHERE id = $1`,
      [locals.user.id]
    );

    if (!user) {
      recordRequest('DELETE', '/api/auth/oauth/unlink', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Check if user has other authentication methods
    const authMethods = [
      user.password_hash ? 'password' : null,
      user.google_id ? 'google' : null,
      user.facebook_id ? 'facebook' : null,
      user.github_id ? 'github' : null
    ].filter(Boolean).length;

    if (authMethods <= 1) {
      recordRequest('DELETE', '/api/auth/oauth/unlink', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.BAD_REQUEST,
        'Cannot unlink last authentication method',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Unlink the provider
    const columnName = `${provider}_id`;
    const updateData: any = {};
    updateData[columnName] = null;

    await updateDb('users', locals.user.id, updateData);

    recordRequest('DELETE', '/api/auth/oauth/unlink', HttpStatus.OK, Date.now() - startTime);
    logger.info('OAuth provider unlinked', { userId: locals.user.id, provider });

    return apiResponse(
      { success: true, message: `${provider} account unlinked successfully` },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/auth/oauth/unlink', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to unlink OAuth provider', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to unlink provider',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
