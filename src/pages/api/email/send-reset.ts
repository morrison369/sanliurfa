/**
 * Send Password Reset Email
 */

import type { APIRoute } from 'astro';
import { sendEmail, getPasswordResetEmailHTML } from '../../../lib/email';
import { queryOne } from '../../../lib/postgres';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { createToken } from '../../../lib/auth';

const schema = {
  email: { type: 'string' as const, required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' }
};

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/email/send-reset', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid email',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { email } = validation.data as { email: string };

    // Check if user exists
    const user = await queryOne('SELECT id, full_name FROM users WHERE email = $1', [email]);

    // For security, always return success even if user doesn't exist
    if (!user) {
      recordRequest('POST', '/api/email/send-reset', HttpStatus.OK, Date.now() - startTime);
      return apiResponse({ success: true, data: { email, sent: false } }, HttpStatus.OK, requestId);
    }

    // Create reset token (valid for 24 hours)
    const resetToken = createToken(user.id, email, 'user');
    const resetLink = `https://sanliurfa.com/reset-password?token=${resetToken}`;

    const html = getPasswordResetEmailHTML(user.full_name || 'Kullanıcı', resetLink);

    const sent = await sendEmail({
      to: email,
      subject: 'Şifreni Sıfırla - Şanlıurfa.com',
      html
    });

    if (!sent) {
      recordRequest('POST', '/api/email/send-reset', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-reset', HttpStatus.OK, duration);
    logger.info('Password reset email sent', { email: user.id, duration });

    return apiResponse({ success: true, data: { email, sent: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/send-reset', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Password reset email error', error instanceof Error ? error : new Error(String(error)), { duration });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
