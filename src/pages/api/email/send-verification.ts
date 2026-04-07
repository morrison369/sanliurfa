/**
 * Send Email Verification
 */

import type { APIRoute } from 'astro';
import { sendEmail, getEmailVerificationHTML } from '../../../lib/email';
import { queryOne } from '../../../lib/postgres';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { createToken } from '../../../lib/auth';

const schema = {
  email: { type: 'string' as const, required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user?.id) {
      recordRequest('POST', '/api/email/send-verification', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/email/send-verification', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid email',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { email } = validation.data as { email: string };

    // Get user info
    const user = await queryOne('SELECT id, full_name FROM users WHERE id = $1', [locals.user.id]);

    if (!user) {
      recordRequest('POST', '/api/email/send-verification', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Create verification token
    const verifyToken = createToken(user.id, email, 'user');
    const verifyLink = `https://sanliurfa.com/verify-email?token=${verifyToken}`;

    const html = getEmailVerificationHTML(user.full_name || 'Kullanıcı', verifyLink);

    const sent = await sendEmail({
      to: email,
      subject: 'E-posta Adresini Doğrula - Şanlıurfa.com',
      html
    });

    if (!sent) {
      recordRequest('POST', '/api/email/send-verification', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-verification', HttpStatus.OK, duration);
    logger.info('Verification email sent', { userId: user.id, email, duration });

    return apiResponse({ success: true, data: { email, sent: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-verification', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Verification email error', error instanceof Error ? error : new Error(String(error)), { duration });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
