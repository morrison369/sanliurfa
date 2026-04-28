/**
 * Email Campaign Detail API
 * GET: Get campaign
 * PUT: Update campaign, publish/pause
 * DELETE: Delete campaign
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import {
  getMarketingCampaign,
  updateMarketingCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
} from '../../../../lib/email/email-marketing';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
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

    const data = await getMarketingCampaign(campaignId);

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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/email/campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: campaignId } = params;
    if (!campaignId) {
      recordRequest('PUT', '/api/email/campaigns/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { action } = body;

    let result = null;

    if (action === 'launch') {
      const scheduledFor = body.scheduled_for ? new Date(body.scheduled_for) : undefined;
      result = await launchCampaign(campaignId, locals.user.id, scheduledFor);
      logger.info('Campaign launched', { campaignId, userId: locals.user.id });
    } else if (action === 'pause') {
      result = await pauseCampaign(campaignId, locals.user.id);
      logger.info('Campaign paused', { campaignId, userId: locals.user.id });
    } else {
      // HARD RULE #51: only allowlisted fields reach updateMarketingCampaign
      const ALLOWED_CAMPAIGN_FIELDS = new Set(['name', 'subject_line', 'preview_text', 'html_content', 'plain_text_content', 'from_name', 'from_email', 'reply_to_email', 'campaign_type', 'settings']);
      const updates: Record<string, unknown> = {};
      for (const key of ALLOWED_CAMPAIGN_FIELDS) {
        if (body[key] !== undefined) updates[key] = body[key];
      }
      if (updates.name !== undefined && (typeof updates.name !== 'string' || (updates.name as string).length > 255)) return apiError(ErrorCode.VALIDATION_ERROR, 'name 255 karakteri aşamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
      if (updates.subject_line !== undefined && (typeof updates.subject_line !== 'string' || (updates.subject_line as string).length > 500)) return apiError(ErrorCode.VALIDATION_ERROR, 'subject_line 500 karakteri aşamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
      if (updates.html_content !== undefined && (typeof updates.html_content !== 'string' || (updates.html_content as string).length > 500000)) return apiError(ErrorCode.VALIDATION_ERROR, 'html_content 500000 karakteri aşamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
      if (updates.from_name !== undefined && (typeof updates.from_name !== 'string' || (updates.from_name as string).length > 200)) return apiError(ErrorCode.VALIDATION_ERROR, 'from_name 200 karakteri aşamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
      if (updates.from_email !== undefined && (typeof updates.from_email !== 'string' || (updates.from_email as string).length > 254)) return apiError(ErrorCode.VALIDATION_ERROR, 'from_email 254 karakteri aşamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
      result = await updateMarketingCampaign(campaignId, locals.user.id, updates);
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/email/campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
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
