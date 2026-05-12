/**
 * Blog API - Abonelik (Newsletter)
 * POST /api/blog/subscribe - Blog bültenine abone ol
 * POST /api/blog/unsubscribe - Blog bülteninden çık
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { validateWithSchema } from '../../../lib/validation';
import type { ValidationSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeErrorDetail } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCache } from '../../../lib/cache';
import { subscribeToBlogNewsletter } from '../../../lib/blog/newsletter-subscriptions';

// Abonelik
export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();

    // Validasyon
    const schema: ValidationSchema = {
      email: { type: 'string' as const, required: true, sanitize: true },
      categories: { type: 'string' as const, required: false }
    };

    const validation = validateWithSchema(body, schema);
    if (!validation.valid) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/subscribe', HttpStatus.UNPROCESSABLE_ENTITY, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz e-posta adresi',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const subscription = await subscribeToBlogNewsletter(
      validation.data.email,
      validation.data.categories,
    );

    if (subscription.alreadySubscribed) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/subscribe', HttpStatus.CONFLICT, duration);
      return apiError(
        ErrorCode.CONFLICT,
        'Bu e-posta adresi zaten abone',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/subscribe', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'blog_subscriptions', validation.data.email, undefined);
    logger.info('Blog aboneliği oluşturuldu', {
      email: validation.data.email,
      duration,
    });

    return apiResponse(
      {
        success: true,
        message: 'Başarıyla abone oldunuz. Lütfen e-posta adresinizi onaylayın.'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: safeErrorDetail(err, 'Blog abonelik işlemi başarısız')
    });
    logger.error('Abonelik eklenemedi', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Abonelik eklenirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// Abonelikten çık
export const DELETE: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();

    const schema: ValidationSchema = {
      email: { type: 'string' as const, required: true, sanitize: true }
    };

    const validation = validateWithSchema(body, schema);
    if (!validation.valid) {
      const duration = Date.now() - startTime;
      recordRequest('DELETE', '/api/blog/subscribe', HttpStatus.UNPROCESSABLE_ENTITY, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz e-posta adresi',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const updated = await queryOne(
      `UPDATE blog_subscriptions
       SET status = $1, unsubscribed_at = NOW()
       WHERE email = $2`,
      ['unsubscribed', validation.data.email]
    );

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/blog/subscribe', HttpStatus.OK, duration);
    logger.info('Abonelik iptal edildi', { email: validation.data.email, updated: Boolean(updated) });

    // Cache temizle
    await deleteCache('blog:subscriptions:count');

    return apiResponse(
      {
        success: true,
        message: 'Blog bülteninden çıkış yapılmıştır'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/blog/subscribe', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: safeErrorDetail(err, 'Blog abonelik işlemi başarısız')
    });
    logger.error('Abonelik iptal edilemedi', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Abonelik iptal edilirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

