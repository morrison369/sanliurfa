/**
 * Campaign Targeting API
 * GET: Get targeting rules
 * POST: Add targeting rule
 */

import type { APIRoute } from 'astro';
import {
  getCampaignTargeting,
  addCampaignTargetingRule
} from '../../../../lib/marketing-campaigns';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/marketing-campaigns/[id]/targeting', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('GET', '/api/marketing-campaigns/[id]/targeting', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const targeting = await getCampaignTargeting(id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing-campaigns/[id]/targeting', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: targeting, count: targeting.length },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing-campaigns/[id]/targeting', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get campaign targeting failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get targeting rules',
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
      recordRequest('POST', '/api/marketing-campaigns/[id]/targeting', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('POST', '/api/marketing-campaigns/[id]/targeting', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { target_type, target_value, operator } = body;

    if (!target_type || !target_value) {
      recordRequest('POST', '/api/marketing-campaigns/[id]/targeting', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'target_type and target_value required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const rule = await addCampaignTargetingRule(id, locals.user.id, {
      target_type,
      target_value,
      operator: operator || 'equals'
    });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/marketing-campaigns/[id]/targeting', HttpStatus.CREATED, duration);

    return apiResponse(
      { success: true, data: rule },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error instanceof Error && error.message === 'Access denied') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('POST', '/api/marketing-campaigns/[id]/targeting', statusCode, duration);
    logger.error('Add targeting rule failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to add targeting rule',
      statusCode,
      undefined,
      requestId
    );
  }
};
