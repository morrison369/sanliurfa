/**
 * Legacy language preference endpoint.
 *
 * Şanlıurfa.com is Turkish-only. The route remains for old clients, but it
 * never exposes or stores another language.
 */

import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/i18n/language-preference', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/i18n/language-preference', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: { language: 'tr', locked: true } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/i18n/language-preference', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get language preference failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/i18n/language-preference', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json().catch(() => ({}));

    if (body.language && body.language !== 'tr') {
      recordRequest('PUT', '/api/i18n/language-preference', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Site sadece Türkçe kullanılabilir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { allowed: ['tr'] },
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/i18n/language-preference', HttpStatus.OK, duration);
    logger.info('Language preference locked to Turkish', { userId: locals.user.id });

    return apiResponse(
      { success: true, data: { language: 'tr', locked: true } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/i18n/language-preference', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update language preference failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
