/**
 * Campaign Subscribers API
 * GET: List campaign subscribers
 * POST: Add subscribers to campaign
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../../lib/postgres';
import { getCampaignSubscribers, addCampaignSubscribers } from '../../../../../lib/email-marketing';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/campaigns/[id]/subscribers', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: campaignId } = params;
    if (!campaignId) {
      recordRequest('GET', '/api/email/campaigns/[id]/subscribers', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const campaign = await queryOne(
      'SELECT user_id FROM email_campaigns WHERE id = $1',
      [campaignId]
    );

    if (!campaign || campaign.user_id !== locals.user.id) {
      recordRequest('GET', '/api/email/campaigns/[id]/subscribers', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const subscribers = await getCampaignSubscribers(campaignId, limit, offset);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns/[id]/subscribers', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: subscribers,
        count: subscribers.length,
        limit,
        offset,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns/[id]/subscribers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get campaign subscribers failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get subscribers',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/email/campaigns/[id]/subscribers', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: campaignId } = params;
    if (!campaignId) {
      recordRequest('POST', '/api/email/campaigns/[id]/subscribers', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const campaign = await queryOne(
      'SELECT user_id FROM email_campaigns WHERE id = $1',
      [campaignId]
    );

    if (!campaign || campaign.user_id !== locals.user.id) {
      recordRequest('POST', '/api/email/campaigns/[id]/subscribers', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { subscribers } = body;

    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      recordRequest('POST', '/api/email/campaigns/[id]/subscribers', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Subscribers array required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const added = await addCampaignSubscribers(campaignId, subscribers);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/campaigns/[id]/subscribers', HttpStatus.CREATED, duration);

    logger.info('Campaign subscribers added', { campaignId, count: added, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        message: `Added ${added} subscribers`,
        count: added,
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/campaigns/[id]/subscribers', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Add subscribers failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to add subscribers',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
