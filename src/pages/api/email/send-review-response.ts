/**
 * Send Review Response Notification Email
 */

import type { APIRoute } from 'astro';
import { sendEmail, getReviewResponseEmailHTML } from '../../../lib/email';
import { queryOne } from '../../../lib/postgres';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const schema = {
  reviewerId: { type: 'string' as const, required: true },
  placeName: { type: 'string' as const, required: true, minLength: 2 },
  responseText: { type: 'string' as const, required: true, minLength: 5 }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user?.id) {
      recordRequest('POST', '/api/email/send-review-response', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/email/send-review-response', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid review response data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { reviewerId, placeName, responseText } = validation.data as { reviewerId: string; placeName: string; responseText: string };

    // Get reviewer info
    const reviewer = await queryOne('SELECT email, full_name FROM users WHERE id = $1', [reviewerId]);

    if (!reviewer) {
      recordRequest('POST', '/api/email/send-review-response', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const html = getReviewResponseEmailHTML(reviewer.full_name || 'Kullanıcı', placeName, responseText);

    const sent = await sendEmail({
      to: reviewer.email,
      subject: `${placeName}'e Yanıt Geldi - Şanlıurfa.com`,
      html
    });

    if (!sent) {
      recordRequest('POST', '/api/email/send-review-response', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-review-response', HttpStatus.OK, duration);
    logger.info('Review response email sent', { reviewerId, placeName, email: reviewer.email, duration });

    return apiResponse({ success: true, data: { email: reviewer.email, sent: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-review-response', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Review response email error', error instanceof Error ? error : new Error(String(error)), { duration });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
