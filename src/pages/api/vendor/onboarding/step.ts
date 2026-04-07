/**
 * Save Vendor Onboarding Step
 */

import type { APIRoute } from 'astro';
import { saveOnboardingProgress } from '../../../../lib/vendor-onboarding';
import { validateWithSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

const schema = {
  step: { type: 'number' as const, required: true, min: 1, max: 10 },
  data: { type: 'string' as const, required: true }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/vendor/onboarding/step', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/vendor/onboarding/step', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid step data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { step, data } = validation.data as any;

    // Parse data if it's a JSON string
    let parsedData: Record<string, any> = {};
    try {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      parsedData = { raw: data };
    }

    const saved = await saveOnboardingProgress(locals.user.id, step, parsedData);

    if (!saved) {
      recordRequest('POST', '/api/vendor/onboarding/step', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to save progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/vendor/onboarding/step', HttpStatus.OK, duration);
    logger.info('Onboarding step saved', { userId: locals.user.id, step, duration });

    return apiResponse({ success: true, data: { step, saved: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/vendor/onboarding/step', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Onboarding step save failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
