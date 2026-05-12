import type { APIRoute } from 'astro';
import { getPendingEmails, sendEmailViaService } from '../../../lib/email';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { verifyInternalToken } from '../../../lib/auth/internal-token';

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const authResult = verifyInternalToken(request);
    if (!authResult.ok) {
      recordRequest('POST', '/api/emails/process', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      logger.warn('Internal email-process call rejected', { reason: authResult.reason });
      return apiError(ErrorCode.UNAUTHORIZED, 'Unauthorized', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const pendingEmails = await getPendingEmails(50);
    let processed = 0;
    let failed = 0;

    const results = await Promise.allSettled(
      pendingEmails.map((email) => sendEmailViaService(email))
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value.success) {
        processed++;
      } else {
        const err = r.status === 'rejected' ? r.reason : new Error('Send returned failure');
        logger.error('Failed to send email', err instanceof Error ? err : new Error(String(err)), { emailId: pendingEmails[i].id });
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
