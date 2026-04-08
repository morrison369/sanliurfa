/**
 * Unsubscribe from All Notifications
 * Privacy-compliant email unsubscription
 */

import type { APIRoute } from 'astro';
import { unsubscribeAll } from '../../../lib/email-preferences';
import { queryOne } from '../../../lib/postgres';
import { trackCampaignEvent } from '../../../lib/email-campaigns';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const schema = {
  email: { type: 'string' as const, required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
  token: { type: 'string' as const, required: false }
};

export const POST: APIRoute = async ({ request, url }) => {
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

    // Find user by email
    const user = await queryOne('SELECT id FROM users WHERE email = $1', [email]);

    if (user) {
      // Unsubscribe from all notifications
      await unsubscribeAll(user.id);

      // Track campaign unsubscribe if campaign ID provided
      const campaignId = url.searchParams.get('cid');
      if (campaignId && user.id) {
        await trackCampaignEvent(parseInt(campaignId, 10), user.id, 'unsubscribe');
      }

      logger.info('User unsubscribed', { userId: user.id, email });
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/unsubscribe', HttpStatus.OK, duration);

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
