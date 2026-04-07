import type { APIRoute } from 'astro';
import { sendEmail, getWelcomeEmailHTML } from '../../../lib/email';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.isAdmin) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Admin islemi', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'to, subject, html gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const success = await sendEmail({ to, subject, html });

    logger.info('Test email sent', { to, admin: locals.user.id });

    return apiResponse({ success }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Email send failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
