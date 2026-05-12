/**
 * Email Campaigns API
 * GET: List campaigns
 * POST: Create campaign
 */

import type { APIRoute } from 'astro';
import { queryMany } from '../../../../lib/postgres';
import { createCampaign } from '../../../../lib/email/email-campaigns';
import type { SegmentType } from '../../../../lib/email/email-campaigns';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const VALID_CAMPAIGN_STATUSES = new Set(['draft', 'scheduled', 'active', 'paused', 'completed', 'failed']);
    const rawStatus = url.searchParams.get('status');
    if (rawStatus !== undefined && rawStatus !== null && (typeof rawStatus !== 'string' || !VALID_CAMPAIGN_STATUSES.has(rawStatus))) {
      recordRequest('GET', '/api/email/campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz campaign status', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    const status = rawStatus || null;
    const limit = safeIntParam(url.searchParams.get('limit'), 50, 0, 1_000_000);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [locals.user.id];

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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/email/campaigns', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
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

    if (typeof name !== 'string' || typeof campaign_type !== 'string' || typeof from_email !== 'string' || typeof subject_line !== 'string' || typeof html_content !== 'string' || !name || !campaign_type || !from_email || !subject_line || !html_content) {
      recordRequest('POST', '/api/email/campaigns', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (name.length > 255) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'name 255 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    const VALID_CAMPAIGN_TYPES = new Set(['newsletter', 'promotional', 'transactional', 'drip', 'announcement', 'welcome', 'reengagement']);
    if (!VALID_CAMPAIGN_TYPES.has(campaign_type)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz campaign_type', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (from_email.length > 254) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'from_email 254 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (subject_line.length > 500) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'subject_line 500 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (html_content.length > 500_000) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'html_content 500000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (plain_text_content !== undefined && plain_text_content !== null) {
      if (typeof plain_text_content !== 'string' || plain_text_content.length > 500_000) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'plain_text_content geçersiz veya 500000 karakteri aşıyor', HttpStatus.BAD_REQUEST, undefined, requestId);
      }
    }

    const campaign = await createCampaign({
      name,
      subject: subject_line,
      fromName: name,
      fromEmail: from_email,
      htmlContent: html_content,
      textContent: plain_text_content || '',
      segment: 'all_users' as SegmentType,
      status: 'draft',
    });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/campaigns', HttpStatus.CREATED, duration);

    logger.info('Campaign created', { id: campaign?.id, userId: locals.user.id, name });

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
