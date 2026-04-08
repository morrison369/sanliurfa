/**
 * Send Campaign
 * Execute campaign sending to segment users
 */

import type { APIRoute } from 'astro';
import { sendCampaign, getCampaign } from '../../../../../lib/email-campaigns';
import { validateWithSchema } from '../../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

const sendSchema = {
  testMode: { type: 'boolean' as const, required: false }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.isAdmin) {
      recordRequest('POST', `/api/marketing/campaigns/${params.id}/send`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('POST', '/api/marketing/campaigns/send', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.INVALID_INPUT, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get request body
    let testMode = false;
    try {
      const body = await request.json();
      const validation = validateWithSchema(body, sendSchema as any);
      if (validation.valid) {
        testMode = (validation.data as any).testMode || false;
      }
    } catch {
      // No body or parse error - continue with testMode = false
    }

    // Verify campaign exists
    const campaign = await getCampaign(id);
    if (!campaign) {
      recordRequest('POST', `/api/marketing/campaigns/${id}/send`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Send campaign
    const result = await sendCampaign(parseInt(id, 10), testMode);

    if (!result) {
      recordRequest('POST', `/api/marketing/campaigns/${id}/send`, HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to send campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/marketing/campaigns/${id}/send`, HttpStatus.OK, duration);

    logger.logMutation('send', 'email_campaigns', id, locals.user?.id, {
      sent: result.sent,
      failed: result.failed,
      testMode
    });

    return apiResponse(
      {
        success: true,
        data: {
          campaignId: id,
          sent: result.sent,
          failed: result.failed,
          testMode,
          message: testMode
            ? `Test emaili admin hesabına gönderildi (${result.sent} adress)`
            : `Kampanya gönderimi başladı (${result.sent}/${result.sent + result.failed} alıcı)`
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/marketing/campaigns/${params.id}/send`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Send campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
