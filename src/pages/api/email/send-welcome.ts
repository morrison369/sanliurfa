/**
 * Send Welcome Email
 */

import type { APIRoute } from 'astro';
import { sendEmail, getWelcomeEmailHTML } from '../../../lib/email';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const schema = {
  name: { type: 'string' as const, required: true, minLength: 2 },
  email: { type: 'string' as const, required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Only admins can send emails programmatically
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/email/send-welcome', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/email/send-welcome', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid email data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { name, email } = validation.data as { name: string; email: string };
    const html = getWelcomeEmailHTML(name);

    const sent = await sendEmail({
      to: email,
      subject: 'Şanlıurfa\'ya Hoşgeldin!',
      html
    });

    if (!sent) {
      recordRequest('POST', '/api/email/send-welcome', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-welcome', HttpStatus.OK, duration);
    logger.info('Welcome email sent', { email, duration });

    return apiResponse({ success: true, data: { email, sent: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-welcome', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Welcome email error', error instanceof Error ? error : new Error(String(error)), { duration });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
