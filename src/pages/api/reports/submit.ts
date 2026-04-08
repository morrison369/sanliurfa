/**
 * Report Content API
 * POST: Submit a report for content or user
 */

import type { APIRoute } from 'astro';
import { submitReport, isUserBanned } from '../../../lib/moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const reportSchema = {
  content_type: {
    type: 'string' as const,
    required: true,
    pattern: '^(comment|review|message|user|place)$'
  },
  content_id: {
    type: 'string' as const,
    required: true
  },
  reason: {
    type: 'string' as const,
    required: true,
    pattern: '^(spam|harassment|hate_speech|misinformation|explicit_content|copyright|scam|impersonation|other)$'
  },
  description: {
    type: 'string' as const,
    required: false,
    maxLength: 1000,
    sanitize: true
  },
  reported_user_id: {
    type: 'string' as const,
    required: false
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user) {
      recordRequest('POST', '/api/reports/submit', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Check if reporter is banned
    const isBanned = await isUserBanned(user.id);
    if (isBanned) {
      recordRequest('POST', '/api/reports/submit', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Hesabınız geçici olarak kapatılmıştır',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, reportSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/reports/submit', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz giriş',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    // Prevent self-reporting for comments/reviews
    if (['comment', 'review'].includes(validation.data.content_type) && validation.data.reported_user_id === user.id) {
      recordRequest('POST', '/api/reports/submit', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Kendi içeriğinizi raporlayamazsınız',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const report = await submitReport(
      user.id,
      validation.data.content_type,
      validation.data.content_id,
      validation.data.reason,
      validation.data.description,
      validation.data.reported_user_id
    );

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reports/submit', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'reports', report.id, user.id, { reason: validation.data.reason });

    return apiResponse(
      {
        success: true,
        data: report,
        message: 'Raporunuz başarıyla gönderildi. Ekibimiz inceleyecektir.'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reports/submit', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Submit report failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rapor gönderilirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
