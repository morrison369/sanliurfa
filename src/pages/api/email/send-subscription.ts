/**
 * Send Subscription Confirmation Email
 */

import type { APIRoute } from 'astro';
import { sendEmail, getSubscriptionEmailHTML } from '../../../lib/email';
import { queryOne } from '../../../lib/postgres';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const schema = {
  userId: { type: 'string' as const, required: true },
  tier: { type: 'string' as const, required: true, pattern: '^(premium|pro)$' },
  price: { type: 'number' as const, required: true, min: 0 }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user?.id) {
      recordRequest('POST', '/api/email/send-subscription', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/email/send-subscription', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid subscription data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { userId, tier, price } = validation.data as { userId: string; tier: 'premium' | 'pro'; price: number };

    // Get user info
    const user = await queryOne('SELECT email, full_name FROM users WHERE id = $1', [userId]);

    if (!user) {
      recordRequest('POST', '/api/email/send-subscription', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const html = getSubscriptionEmailHTML(user.full_name || 'Kullanıcı', tier, price);

    const sent = await sendEmail({
      to: user.email,
      subject: `${tier === 'premium' ? 'Premium' : 'Pro'} Üyeliğe Hoşgeldin!`,
      html
    });

    if (!sent) {
      recordRequest('POST', '/api/email/send-subscription', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-subscription', HttpStatus.OK, duration);
    logger.info('Subscription email sent', { userId, tier, email: user.email, duration });

    return apiResponse({ success: true, data: { email: user.email, sent: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-subscription', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Subscription email error', error instanceof Error ? error : new Error(String(error)), { duration });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
