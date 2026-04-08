/**
 * Admin Loyalty Rewards Management API
 * Manage rewards catalog for admins
 */

import type { APIRoute } from 'astro';
import { queryMany, insert } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { getCache, setCache, deleteCache } from '../../../../lib/cache';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin guard
    if (!locals.user || locals.user.role !== 'admin') {
      recordRequest('GET', '/api/admin/loyalty/rewards', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Check cache
    const cacheKey = 'sanliurfa:admin:rewards:catalog';
    const cached = await getCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/admin/loyalty/rewards', HttpStatus.OK, duration);
      return apiResponse(
        { success: true, data: JSON.parse(cached) },
        HttpStatus.OK,
        requestId
      );
    }

    // Fetch all rewards (both active and inactive)
    const rewards = await queryMany(
      `SELECT r.id, r.reward_name, r.description, r.category, r.points_cost,
              r.tier_requirement, r.is_active, r.display_order, r.created_at,
              COALESCE(ri.available_stock, 0) as available_stock,
              COALESCE(ri.total_stock, 0) as total_stock
       FROM rewards r
       LEFT JOIN reward_inventory ri ON r.id = ri.reward_id
       ORDER BY r.display_order ASC, r.created_at DESC`,
      []
    );

    // Cache result (2 min TTL for admin panel)
    await setCache(cacheKey, JSON.stringify(rewards), 120);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/loyalty/rewards', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: rewards },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/loyalty/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get rewards catalog',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch rewards',
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
    // Admin guard
    if (!locals.user || locals.user.role !== 'admin') {
      recordRequest('POST', '/api/admin/loyalty/rewards', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Parse body
    const body = await request.json();
    const { reward_name, description, category, points_cost, stock_quantity, tier_requirement, is_active } = body;

    // Validation
    if (!reward_name || !category || points_cost === undefined) {
      recordRequest('POST', '/api/admin/loyalty/rewards', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'reward_name, category, and points_cost are required',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (typeof points_cost !== 'number' || points_cost < 1) {
      recordRequest('POST', '/api/admin/loyalty/rewards', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'points_cost must be a number greater than 0',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Insert reward
    const newReward = await insert('rewards', {
      reward_name,
      description: description || null,
      category,
      points_cost,
      tier_requirement: tier_requirement || null,
      is_active: is_active !== false,
      display_order: 0,
      created_at: new Date().toISOString()
    });

    // If stock_quantity provided, create inventory entry
    if (stock_quantity && stock_quantity > 0) {
      await insert('reward_inventory', {
        reward_id: newReward.id,
        available_stock: stock_quantity,
        total_stock: stock_quantity,
        created_at: new Date().toISOString()
      });
    }

    // Invalidate cache
    await deleteCache('sanliurfa:admin:rewards:catalog');
    await deleteCache(`sanliurfa:reward:${newReward.id}`);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/rewards', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'rewards', newReward.id, locals.user.id, { reward_name, category, points_cost });

    return apiResponse(
      { success: true, data: newReward },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/rewards', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to create reward',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create reward',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
