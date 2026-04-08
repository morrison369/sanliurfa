/**
 * Marketing Campaign Detail API
 * GET: Get campaign details
 * PUT: Update campaign
 * DELETE: Delete campaign
 */

import type { APIRoute } from 'astro';
import {
  getMarketingCampaign,
  updateMarketingCampaign,
  deleteMarketingCampaign,
  pauseCampaign,
  publishCampaign
} from '../../../lib/marketing-campaigns';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;
    if (!id) {
      recordRequest('GET', '/api/marketing-campaigns/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const campaign = await getMarketingCampaign(id);
    if (!campaign) {
      recordRequest('GET', '/api/marketing-campaigns/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Check ownership if user is authenticated
    if (locals.user?.id && campaign.user_id !== locals.user.id) {
      recordRequest('GET', '/api/marketing-campaigns/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing-campaigns/[id]', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: campaign },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing-campaigns/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
      recordRequest('PUT', '/api/marketing-campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('PUT', '/api/marketing-campaigns/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { action } = body;

    let updated;

    // Handle special actions
    if (action === 'publish') {
      updated = await publishCampaign(id, locals.user.id);
    } else if (action === 'pause') {
      updated = await pauseCampaign(id, locals.user.id);
    } else {
      updated = await updateMarketingCampaign(id, locals.user.id, body);
    }

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/marketing-campaigns/[id]', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: updated },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error instanceof Error && error.message.includes('Access denied')) ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('PUT', '/api/marketing-campaigns/[id]', statusCode, duration);
    logger.error('Update campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update campaign',
      statusCode,
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
      recordRequest('DELETE', '/api/marketing-campaigns/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('DELETE', '/api/marketing-campaigns/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const deleted = await deleteMarketingCampaign(id, locals.user.id);

    if (!deleted) {
      recordRequest('DELETE', '/api/marketing-campaigns/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Campaign not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/marketing-campaigns/[id]', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, message: 'Campaign deleted' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error instanceof Error && error.message.includes('cannot')) ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('DELETE', '/api/marketing-campaigns/[id]', statusCode, duration);
    logger.error('Delete campaign failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete campaign',
      statusCode,
      undefined,
      requestId
    );
  }
};
