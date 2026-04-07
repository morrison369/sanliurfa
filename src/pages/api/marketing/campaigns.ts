/**
 * Email Campaign Management
 */

import type { APIRoute } from 'astro';
import { createCampaign, getAllCampaigns, getCampaign, updateCampaign, getCampaignMetrics } from '../../../lib/email-campaigns';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const createSchema = {
  name: { type: 'string' as const, required: true, minLength: 3 },
  subject: { type: 'string' as const, required: true, minLength: 5 },
  fromName: { type: 'string' as const, required: true },
  fromEmail: { type: 'string' as const, required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
  htmlContent: { type: 'string' as const, required: true, minLength: 10 },
  segment: { type: 'string' as const, required: true, pattern: '^(all_users|subscribers|premium|inactive|custom)$' }
};

// GET campaigns list
export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/marketing/campaigns', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const campaignId = url.searchParams.get('id');

    let data;

    if (campaignId) {
      const campaign = await getCampaign(campaignId);
      const metrics = await getCampaignMetrics(campaignId);

      if (!campaign) {
        recordRequest('GET', '/api/marketing/campaigns', HttpStatus.NOT_FOUND, Date.now() - startTime);
        return apiError(ErrorCode.NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND, undefined, requestId);
      }

      data = { campaign, metrics };
    } else {
      const campaigns = await getAllCampaigns();
      data = { campaigns, count: campaigns.length };
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing/campaigns', HttpStatus.OK, duration);

    return apiResponse({ success: true, data }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing/campaigns', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get campaigns failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// POST create campaign
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/marketing/campaigns', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, createSchema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/marketing/campaigns', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid campaign data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { name, subject, fromName, fromEmail, htmlContent, segment } = validation.data as any;

    const campaign = await createCampaign({
      name,
      subject,
      fromName,
      fromEmail,
      htmlContent,
      textContent: htmlContent.replace(/<[^>]*>/g, ''),
      segment,
      status: 'draft'
    });

    if (!campaign) {
      recordRequest('POST', '/api/marketing/campaigns', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/marketing/campaigns', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'email_campaigns', campaign.id, locals.user?.id, { name });

    return apiResponse({ success: true, data: campaign }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/marketing/campaigns', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// PUT update campaign
export const PUT: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('PUT', '/api/marketing/campaigns', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const id = url.searchParams.get('id');

    if (!id) {
      recordRequest('PUT', '/api/marketing/campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.INVALID_INPUT, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();

    const result = await updateCampaign(id, body as any);

    if (!result) {
      recordRequest('PUT', '/api/marketing/campaigns', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/marketing/campaigns', HttpStatus.OK, duration);
    logger.logMutation('update', 'email_campaigns', id, locals.user?.id);

    return apiResponse({ success: true, data: result }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/marketing/campaigns', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
