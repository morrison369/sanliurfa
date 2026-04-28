/**
 * Admin: User Quotas Management
 * GET /api/admin/quotas/[userId] - Get user's quotas (admin only)
 * POST /api/admin/quotas/[userId] - Reset/update user quotas (admin only)
 */

import type { APIRoute } from 'astro';
import {
  FEATURE_QUOTAS,
  getUserUsage,
  resetUsage,
  updateUserQuotas,
  type QuotaFeature,
} from '../../../../lib/usage/usage-tracking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

type QuotaAction = 'reset_all' | 'reset_feature';

interface QuotaUpdateBody {
  action?: QuotaAction;
  features?: string[];
}

function isQuotaFeature(feature: string): feature is QuotaFeature {
  return Object.prototype.hasOwnProperty.call(FEATURE_QUOTAS, feature);
}

// GET - Get user's quotas
export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check admin access (HARD RULE #52 — quota reset is high-impact, moderator must not access)
    if (locals.user?.role !== 'admin') {
      recordRequest('GET', '/api/admin/quotas/[userId]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin erişimi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const userId = params.userId;

    if (!userId || userId.length !== 36) {
      recordRequest('GET', '/api/admin/quotas/[userId]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz kullanıcı ID',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Get user quotas
    const usageRecords = await getUserUsage(userId);

    const quotas = usageRecords.map((record) => {
      const remaining = record.limitValue ? record.limitValue - record.currentUsage : null;
      return {
        feature: record.featureName,
        current: record.currentUsage,
        limit: record.limitValue,
        remaining: remaining ? Math.max(0, remaining) : null,
        resetDate: record.resetDate,
      };
    });

    recordRequest('GET', '/api/admin/quotas/[userId]', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        userId,
        quotas,
        totalQuotas: quotas.length,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/quotas/[userId]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get user quotas', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kotalar alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// POST - Reset/update user quotas
export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check admin access (HARD RULE #52 — quota reset is high-impact, moderator must not access)
    if (locals.user?.role !== 'admin') {
      recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin erişimi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const userId = params.userId;
    const body = (await request.json().catch(() => ({}))) as QuotaUpdateBody;
    const action = body.action || 'reset_all';
    const features = body.features || [];

    if (!userId || userId.length !== 36) {
      recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz kullanıcı ID',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (action === 'reset_all') {
      // Update all quotas based on current subscription
      await updateUserQuotas(userId);
      recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.OK, Date.now() - startTime);
      logger.logMutation('reset_quotas', 'feature_access', userId, locals.user?.id);

      return apiResponse(
        {
          success: true,
          message: 'Tüm kotalar mevcut aboneliğe göre sıfırlandı',
          userId,
        },
        HttpStatus.OK,
        requestId
      );
    } else if (action === 'reset_feature') {
      // Reset specific features
      if (!Array.isArray(features) || features.length === 0) {
        recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Sıfırlanacak özellik listesi gereklidir',
          HttpStatus.BAD_REQUEST,
          undefined,
          requestId
        );
      }

      const invalidFeatures = features.filter((feature) => !isQuotaFeature(feature));
      if (invalidFeatures.length > 0) {
        recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Geçersiz kota özelliği',
          HttpStatus.BAD_REQUEST,
          { invalidFeatures },
          requestId
        );
      }

      const quotaFeatures = features.filter(isQuotaFeature);

      for (const feature of quotaFeatures) {
        try {
          await resetUsage(userId, feature);
        } catch (err) {
          logger.warn('Failed to reset feature', Object.assign(new Error('Failed to reset feature'), { userId, feature, error: err }));
        }
      }

      recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.OK, Date.now() - startTime);
      logger.logMutation('reset_features', 'feature_access', userId, locals.user?.id);

      return apiResponse(
        {
          success: true,
          message: `${quotaFeatures.length} özellik için kota sıfırlandı`,
          userId,
          features: quotaFeatures,
        },
        HttpStatus.OK,
        requestId
      );
    }

    recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      'Geçersiz işlem',
      HttpStatus.BAD_REQUEST,
      undefined,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to update quotas', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kotalar güncellenemedi',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
