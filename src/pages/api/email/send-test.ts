import type { APIRoute } from 'astro';
import { sendEmail } from '../../../lib/email';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (locals.user?.role !== 'admin') {
      return apiError(ErrorCode.UNAUTHORIZED, 'Admin islemi', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html || typeof to !== 'string' || typeof subject !== 'string' || typeof html !== 'string') {
      return apiError(ErrorCode.VALIDATION_ERROR, 'to, subject, html gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (to.length > 254) return apiError(ErrorCode.VALIDATION_ERROR, 'to 254 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (subject.length > 500) return apiError(ErrorCode.VALIDATION_ERROR, 'subject 500 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (html.length > 500_000) return apiError(ErrorCode.VALIDATION_ERROR, 'html 500000 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);

    const result = await sendEmail({ to, subject, html });

    logger.info('Test email sent', { to, admin: locals.user.id, tier: result.tier, success: result.success });

    return apiResponse({ success: result.success, tier: result.tier, error: result.error }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Email send failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
