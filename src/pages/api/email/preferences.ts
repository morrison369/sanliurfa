/**
 * Email Preferences Endpoint
 */

import type { APIRoute } from 'astro';
import { getUserPreferences, updateUserPreferences } from '../../../lib/email-preferences';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const updateSchema = {
  reviewResponse: { type: 'boolean' as const, required: false },
  newReview: { type: 'boolean' as const, required: false },
  weeklySummary: { type: 'boolean' as const, required: false },
  promotional: { type: 'boolean' as const, required: false },
  accountChanges: { type: 'boolean' as const, required: false },
  preferredChannel: { type: 'string' as const, required: false, pattern: '^(email|in_app|push)$' }
};

// GET preferences
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const prefs = await getUserPreferences(locals.user.id);

    if (!prefs) {
      recordRequest('GET', '/api/email/preferences', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Preferences not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/preferences', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: prefs }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get preferences failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// PUT update preferences
export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/email/preferences', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, updateSchema as any);

    if (!validation.valid) {
      recordRequest('PUT', '/api/email/preferences', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid preferences',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const updated = await updateUserPreferences(locals.user.id, validation.data as any);

    if (!updated) {
      recordRequest('PUT', '/api/email/preferences', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const prefs = await getUserPreferences(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/email/preferences', HttpStatus.OK, duration);
    logger.logMutation('update', 'email_preferences', locals.user.id, locals.user.id);

    return apiResponse({ success: true, data: prefs }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/email/preferences', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update preferences failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
