/**
 * Admin: Loyalty Rewards Management
 * GET - List all rewards (active + inactive)
 * POST - Create new reward
 */

import type { APIRoute } from 'astro';
import { queryRows, insert } from '../../../../lib/postgres';
import { getCache, setCache, deleteCache } from '../../../../lib/cache';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/loyalty/rewards',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/loyalty/rewards', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/loyalty/rewards', response.status, duration);
        },
      },
      async () => {
        const cacheKey = 'sanliurfa:admin:rewards:catalog';
        const cached = await getCache(cacheKey);
        if (cached) {
          return apiResponse({ success: true, data: cached }, HttpStatus.OK, requestId);
        }

        const rewards = await queryRows(
          'SELECT * FROM rewards ORDER BY is_active DESC, display_order ASC'
        );
        await setCache(cacheKey, rewards, 120);

        return apiResponse({ success: true, data: rewards }, HttpStatus.OK, requestId);
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/loyalty/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get rewards', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve rewards',
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
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/loyalty/rewards',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', '/api/admin/loyalty/rewards', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', '/api/admin/loyalty/rewards', response.status, duration);
        },
      },
      async () => {
        const body = await request.json();
        const {
          reward_name,
          description,
          category,
          points_cost,
          stock_quantity,
          tier_requirement,
          is_active,
        } = body;

        if (!reward_name || !category || typeof points_cost !== 'number') {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Missing required fields',
            HttpStatus.UNPROCESSABLE_ENTITY,
            undefined,
            requestId
          );
        }

        const reward = await insert('rewards', {
          reward_name,
          description: description || null,
          category,
          points_cost,
          tier_requirement: tier_requirement || null,
          is_active: is_active !== false,
          display_order: 999,
        });

        if (stock_quantity && stock_quantity > 0) {
          await insert('reward_inventory', {
            reward_id: reward.id,
            available_stock: stock_quantity,
            total_stock: stock_quantity,
          });
        }

        await deleteCache('sanliurfa:admin:rewards:catalog');
        logger.info('Reward created', { rewardId: reward.id, reward_name });

        return apiResponse({ success: true, data: reward }, HttpStatus.CREATED, requestId);
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to create reward', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create reward',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
