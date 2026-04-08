/**
 * Email Campaigns API
 * GET: List campaigns
 * POST: Create campaign
 */

import type { APIRoute } from 'astro';
import { queryMany } from '../../../../lib/postgres';
import { createCampaign } from '../../../../lib/email-marketing';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [locals.user.id];

    if (status) {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    const campaigns = await queryMany(`
      SELECT id, name, campaign_type, status,
        send_count, open_count, click_count, conversion_count,
        bounce_count, unsubscribe_count, complaint_count,
        budget_cents, spent_cents, started_at, completed_at, created_at
      FROM email_campaigns
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: campaigns,
        count: campaigns.length,
        limit,
        offset,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
      recordRequest('POST', '/api/email/campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const {
      name,
      campaign_type,
      from_email,
      subject_line,
      html_content,
      plain_text_content,
    } = body;

    if (!name || !campaign_type || !from_email || !subject_line || !html_content) {
      recordRequest('POST', '/api/email/campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const campaign = await createCampaign(
      locals.user.id,
      name,
      campaign_type,
      from_email,
      subject_line,
      html_content,
      plain_text_content
    );

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/campaigns', HttpStatus.CREATED, duration);

    logger.info('Campaign created', { id: campaign.id, userId: locals.user.id, name });

    return apiResponse(
      {
        success: true,
        data: campaign,
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/campaigns', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
