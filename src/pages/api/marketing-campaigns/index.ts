/**
 * Marketing Campaigns API
 * GET: List marketing campaigns (user's campaigns)
 * POST: Create new marketing campaign
 */

import type { APIRoute } from 'astro';
import {
  createMarketingCampaign,
  getUserCampaigns
} from '../../../lib/marketing-campaigns';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/marketing-campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const campaigns = await getUserCampaigns(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing-campaigns', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: campaigns, count: campaigns.length },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing-campaigns', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get campaigns failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get campaigns',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/marketing-campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const {
      place_id,
      name,
      description,
      campaign_type,
      budget,
      targeting,
      creative_content,
      schedule_config,
      performance_goals
    } = body;

    // Validation
    if (!place_id || !name || !campaign_type) {
      recordRequest('POST', '/api/marketing-campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Missing required fields: place_id, name, campaign_type',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const campaign = await createMarketingCampaign(place_id, locals.user.id, {
      name,
      description,
      campaign_type,
      budget: budget || 0,
      targeting,
      creative_content,
      schedule_config,
      performance_goals
    });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/marketing-campaigns', HttpStatus.CREATED, duration);

    logger.info('Marketing campaign created via API', { id: campaign.id, userId: locals.user.id });

    return apiResponse(
      { success: true, data: campaign },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/marketing-campaigns', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create campaign',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
