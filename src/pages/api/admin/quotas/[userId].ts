/**
 * Admin: User Quotas Management
 * GET /api/admin/quotas/[userId] - Get user's quotas (admin only)
 * POST /api/admin/quotas/[userId] - Reset/update user quotas (admin only)
 */

import type { APIRoute } from 'astro';
import { getUserUsage, resetUsage, updateUserQuotas } from '../../../../lib/usage-tracking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

// GET - Get user's quotas
export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess({
      request,
      locals,
      endpoint: '/api/admin/quotas/[userId]',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('GET', '/api/admin/quotas/[userId]', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('GET', '/api/admin/quotas/[userId]', HttpStatus.OK, duration);
      }
    }, async () => {
      const userId = params.userId;

      if (!userId || userId.length !== 36) {
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid user ID',
          HttpStatus.BAD_REQUEST,
          undefined,
          requestId
        );
      }

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
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/quotas/[userId]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get user quotas', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get quotas',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// POST - Reset/update user quotas
export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/quotas/[userId]',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('POST', '/api/admin/quotas/[userId]', statusCode, duration);
      },
      onSuccess: (response, duration) => {
        recordRequest('POST', '/api/admin/quotas/[userId]', response.status, duration);
      }
    }, async () => {
      const userId = params.userId;
      const body = await request.json() as { action?: string; features?: string[] };
      const action = body.action || 'reset_all';
      const features = body.features || [];

      if (!userId || userId.length !== 36) {
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid user ID',
          HttpStatus.BAD_REQUEST,
          undefined,
          requestId
        );
      }

      if (action === 'reset_all') {
        await updateUserQuotas(userId);
        logger.logMutation('reset_quotas', 'feature_access', userId, locals.user?.id);
        return apiResponse(
          {
            success: true,
            message: 'All quotas reset based on current subscription',
            userId,
          },
          HttpStatus.OK,
          requestId
        );
      } else if (action === 'reset_feature') {
        if (!Array.isArray(features) || features.length === 0) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Features array required',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }

        for (const feature of features) {
          try {
            await resetUsage(userId, feature as any);
          } catch (err) {
            logger.warn('Failed to reset feature', { userId, feature, error: err });
          }
        }

        logger.logMutation('reset_features', 'feature_access', userId, locals.user?.id, { features });
        return apiResponse(
          {
            success: true,
            message: `Reset ${features.length} features for user`,
            userId,
            features,
          },
          HttpStatus.OK,
          requestId
        );
      }

      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid action',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/quotas/[userId]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to update quotas', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update quotas',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
