/**
 * Email Campaign Detail API
 * GET: Get campaign
 * PUT: Update campaign, publish/pause
 * DELETE: Delete campaign
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import {
  getCampaign,
  updateCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
} from '../../../../lib/email-marketing';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: campaignId } = params;
    if (!campaignId) {
      recordRequest('GET', '/api/email/campaigns/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const campaign = await queryOne(
      'SELECT user_id FROM email_campaigns WHERE id = $1',
      [campaignId]
    );

    if (!campaign || campaign.user_id !== locals.user.id) {
      recordRequest('GET', '/api/email/campaigns/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const data = await getCampaign(campaignId);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns/[id]', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get campaign',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/email/campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: campaignId } = params;
    if (!campaignId) {
      recordRequest('PUT', '/api/email/campaigns/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { action, ...campaignData } = body;

    let result = null;

    if (action === 'launch') {
      const scheduledFor = campaignData.scheduled_for ? new Date(campaignData.scheduled_for) : undefined;
      result = await launchCampaign(campaignId, locals.user.id, scheduledFor);
      logger.info('Campaign launched', { campaignId, userId: locals.user.id });
    } else if (action === 'pause') {
      result = await pauseCampaign(campaignId, locals.user.id);
      logger.info('Campaign paused', { campaignId, userId: locals.user.id });
    } else {
      result = await updateCampaign(campaignId, locals.user.id, campaignData);
      logger.info('Campaign updated', { campaignId, userId: locals.user.id });
    }

    if (!result) {
      recordRequest('PUT', '/api/email/campaigns/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/email/campaigns/[id]', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: result,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/email/campaigns/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update campaign',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/email/campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: campaignId } = params;
    if (!campaignId) {
      recordRequest('DELETE', '/api/email/campaigns/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const deleted = await deleteCampaign(campaignId, locals.user.id);

    if (!deleted) {
      recordRequest('DELETE', '/api/email/campaigns/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/email/campaigns/[id]', HttpStatus.OK, duration);

    logger.info('Campaign deleted', { campaignId, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        message: 'Campaign deleted',
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/email/campaigns/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete campaign',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
