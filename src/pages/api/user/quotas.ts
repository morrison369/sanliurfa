/**
 * User Quotas
 * GET /api/user/quotas - Get user's current usage quotas
 */

import type { APIRoute } from 'astro';
import { getUserUsage, getQuotaMessage, FEATURE_QUOTAS } from '../../../lib/usage-tracking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { getUserTierInfo } from '../../../lib/feature-gating';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/user/quotas', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get user tier
    const tierInfo = await getUserTierInfo(locals.user.id);

    // Get all usage records
    const usageRecords = await getUserUsage(locals.user.id);

    // Format quota information
    const quotas = usageRecords.map((record) => {
      const remaining = record.limitValue ? record.limitValue - record.currentUsage : null;
      const percentageUsed = record.limitValue
        ? Math.round((record.currentUsage / record.limitValue) * 100)
        : 0;

      return {
        feature: record.featureName,
        current: record.currentUsage,
        limit: record.limitValue,
        remaining: remaining ? Math.max(0, remaining) : null,
        percentageUsed,
        resetDate: record.resetDate,
        message: getQuotaMessage(
          record.featureName as any,
          {
            current: record.currentUsage,
            limit: record.limitValue,
            remaining,
          }
        ),
      };
    });

    // Sort by limit (limited first, unlimited last)
    quotas.sort((a, b) => {
      if (a.limit === null && b.limit !== null) return 1;
      if (a.limit !== null && b.limit === null) return -1;
      return 0;
    });

    recordRequest('GET', '/api/user/quotas', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        tier: tierInfo,
        quotas,
        summary: {
          totalQuotas: quotas.length,
          limitedQuotas: quotas.filter((q) => q.limit !== null).length,
          unlimitedQuotas: quotas.filter((q) => q.limit === null).length,
        },
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/quotas', HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
