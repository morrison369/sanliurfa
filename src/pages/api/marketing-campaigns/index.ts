/**
 * Marketing Campaigns API
 * GET: List marketing campaigns (user's campaigns)
 * POST: Create new marketing campaign
 */

import type { APIRoute } from 'astro';
import {
  createMarketingCampaign,
  getUserCampaigns
} from '../../../lib/marketing/marketing-campaigns';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/marketing-campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/marketing-campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
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
        'Zorunlu alanlar eksik: place_id, name, campaign_type',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }
    if (name.length > 200) {
      recordRequest('POST', '/api/marketing-campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kampanya adı 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 2000)) {
      recordRequest('POST', '/api/marketing-campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Açıklama 2000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    const VALID_CAMPAIGN_TYPES = new Set(['promotion', 'awareness', 'conversion', 'promotional']);
    if (!VALID_CAMPAIGN_TYPES.has(campaign_type)) {
      recordRequest('POST', '/api/marketing-campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz kampanya tipi', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    const budgetNum = budget !== undefined ? parseFloat(String(budget)) : 0;
    if (!Number.isFinite(budgetNum) || budgetNum < 0) {
      recordRequest('POST', '/api/marketing-campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz bütçe değeri', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const campaign = await createMarketingCampaign(place_id, locals.user.id, {
      name,
      description,
      campaign_type,
      budget: budgetNum,
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
