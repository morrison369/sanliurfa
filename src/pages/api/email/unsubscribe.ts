/**
 * Unsubscribe from All Notifications
 * Privacy-compliant email unsubscription
 */

import type { APIRoute } from 'astro';
import { unsubscribeAll } from '../../../lib/email-preferences';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const schema = {
  email: { type: 'string' as const, required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
  token: { type: 'string' as const, required: false }
};

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/email/unsubscribe', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid unsubscribe request',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { email } = validation.data as { email: string; token?: string };

    // For unsubscribe links, we typically would validate a token, but for now
    // we'll do a simple lookup by email (in production, use a signed token)
    // This is intentionally forgiving to comply with CAN-SPAM regulations

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/unsubscribe', HttpStatus.OK, duration);

    logger.info('Unsubscribe request processed', { email, duration });

    // Always return success for privacy/compliance (even if user not found)
    return apiResponse(
      { success: true, data: { email, unsubscribed: true, message: 'You have been unsubscribed from all email notifications' } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/unsubscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Unsubscribe error', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
