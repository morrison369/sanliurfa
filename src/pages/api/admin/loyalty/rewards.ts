/**
 * Admin: Loyalty Rewards Management
 * GET - List all rewards (active + inactive)
 * POST - Create new reward
 */

import type { APIRoute } from 'astro';
import { queryMany, insert } from '../../../../lib/postgres';
import { getCache, setCache, deleteCache } from '../../../../lib/cache';
import { apiResponse, apiError } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Admin only
    if (!locals.user || locals.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/admin/loyalty/rewards', 403, duration);
      return apiError('FORBIDDEN', 'Admin access required', 403, undefined, requestId);
    }

    // Check cache
    const cacheKey = 'sanliurfa:admin:rewards:catalog';
    const cached = await getCache(cacheKey);
    if (cached) {
      return apiResponse({ success: true, data: cached }, 200, requestId);
    }

    // Get all rewards (active + inactive)
    const rewards = await queryMany('SELECT * FROM rewards ORDER BY is_active DESC, display_order ASC');

    // Cache for 2 minutes
    await setCache(cacheKey, rewards.rows || [], 120);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/loyalty/rewards', 200, duration);

    return apiResponse({ success: true, data: rewards.rows || [] }, 200, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/loyalty/rewards', 500, duration);
    logger.error('Failed to get rewards', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to retrieve rewards', 500, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Admin only
    if (!locals.user || locals.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/admin/loyalty/rewards', 403, duration);
      return apiError('FORBIDDEN', 'Admin access required', 403, undefined, requestId);
    }

    const body = await request.json();
    const { reward_name, description, category, points_cost, stock_quantity, tier_requirement, is_active } = body;

    // Validation
    if (!reward_name || !category || typeof points_cost !== 'number') {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/admin/loyalty/rewards', 422, duration);
      return apiError('VALIDATION_ERROR', 'Missing required fields', 422, undefined, requestId);
    }

    // Create reward
    const reward = await insert('rewards', {
      reward_name,
      description: description || null,
      category,
      points_cost,
      tier_requirement: tier_requirement || null,
      is_active: is_active !== false, // Default to true
      display_order: 999
    });

    // Create inventory if stock_quantity provided
    if (stock_quantity && stock_quantity > 0) {
      await insert('reward_inventory', {
        reward_id: reward.id,
        available_stock: stock_quantity,
        total_stock: stock_quantity
      });
    }

    // Invalidate cache
    await deleteCache('sanliurfa:admin:rewards:catalog');

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/rewards', 201, duration);

    logger.info('Reward created', { rewardId: reward.id, reward_name });

    return apiResponse({ success: true, data: reward }, 201, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/rewards', 500, duration);
    logger.error('Failed to create reward', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to create reward', 500, undefined, requestId);
  }
};
