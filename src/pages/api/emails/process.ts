import type { APIRoute } from 'astro';
import { getPendingEmails, sendEmailViaService } from '../../../lib/email';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('Bearer ')) {
      recordRequest('POST', '/api/emails/process', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Unauthorized', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const pendingEmails = await getPendingEmails(50);
    let processed = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        const success = await sendEmailViaService(email);
        if (success) {
          processed++;
        } else {
          failed++;
        }
      } catch (err) {
        logger.error('Failed to send email', err instanceof Error ? err : new Error(String(err)), { emailId: email.id });
        failed++;
      }
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/emails/process', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        message: 'Emails processed',
        processed,
        failed
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/emails/process', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Email processing failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Email processing failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
