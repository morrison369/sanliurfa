/**
 * Set User Language Preference
 */

import type { APIRoute } from 'astro';
import { update, queryOne } from '../../lib/postgres';
import { validateWithSchema } from '../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { recordRequest } from '../../lib/metrics';
import { logger } from '../../lib/logging';

const schema = {
  language: {
    type: 'string' as const,
    required: true,
    pattern: '^(tr|en)$'
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/i18n/language-preference', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const user = await queryOne('SELECT language_preference FROM users WHERE id = $1', [locals.user.id]);

    if (!user) {
      recordRequest('GET', '/api/i18n/language-preference', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/i18n/language-preference', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: { language: user.language_preference || 'tr' } },
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

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('PUT', '/api/i18n/language-preference', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid language',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { language } = validation.data as { language: 'tr' | 'en' };

    const result = await update('users', { id: locals.user.id }, {
      language_preference: language,
      updated_at: new Date().toISOString()
    });

    if (!result) {
      recordRequest('PUT', '/api/i18n/language-preference', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update preference',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/i18n/language-preference', HttpStatus.OK, duration);
    logger.info('Language preference updated', { userId: locals.user.id, language });

    return apiResponse(
      { success: true, data: { language } },
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
