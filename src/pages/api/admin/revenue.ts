import type { APIRoute } from 'astro';
import { queryOne, queryRows } from '../../../lib/postgres';
import { verifyToken } from '../../../lib/auth';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { hasPermission } from '../../../lib/rbac';
import { withAdminOpsReadAccess } from '../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const token = cookies.get('auth-token')?.value;
    if (!token) {
      recordRequest('GET', '/api/admin/revenue', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const sessionData = await verifyToken(token);
    if (!sessionData) {
      recordRequest('GET', '/api/admin/revenue', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Invalid or expired token', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const canAccessRevenue = sessionData.role === 'admin' || await hasPermission(sessionData.userId, 'admin.access');
    const accessLocals = canAccessRevenue
      ? {
          ...locals,
          isAdmin: true,
          user: {
            id: sessionData.userId,
            role: 'admin',
          },
        }
      : locals;

    return await withAdminOpsReadAccess(
      {
        request,
        locals: accessLocals as any,
        endpoint: '/api/admin/revenue',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/revenue', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/revenue', response.status, duration);
        },
      },
      async () => {
        const subscriptionsByTier = await queryRows(
          `SELECT tier, COUNT(*) as count
           FROM memberships
           WHERE status = 'active'
           GROUP BY tier`
        );

        const mrrQuery = await queryRows(
          `SELECT
            tier,
            COUNT(*) as subscriber_count,
            CASE
              WHEN tier = 'premium' THEN COUNT(*) * 2.99
              WHEN tier = 'pro' THEN COUNT(*) * 5.99
              ELSE 0
            END as tier_mrr
           FROM memberships
           WHERE status = 'active'
           GROUP BY tier`
        );

        let totalMRR = 0;
        const tiers: Record<string, { count: number; monthlyRevenue: number }> = {};

        for (const row of mrrQuery as Array<{ tier: string; subscriber_count: number; tier_mrr: number }>) {
          tiers[row.tier] = {
            count: row.subscriber_count,
            monthlyRevenue: row.tier_mrr,
          };
          totalMRR += row.tier_mrr;
        }

        const dailyRevenue = await queryRows(
          `SELECT
            DATE(started_at) as date,
            CASE
              WHEN tier = 'premium' THEN COUNT(*) * 2.99
              WHEN tier = 'pro' THEN COUNT(*) * 5.99
              ELSE 0
            END as revenue
           FROM memberships
           WHERE started_at >= NOW() - INTERVAL '30 days'
           AND status IN ('active', 'expired')
           GROUP BY DATE(started_at), tier
           ORDER BY date ASC`
        );

        const churnQuery = await queryOne(
          `SELECT
            COUNT(*) as churned_subscriptions,
            (SELECT COUNT(*) FROM memberships WHERE expires_at < NOW() AND expires_at >= NOW() - INTERVAL '30 days') as churned_30d
           FROM memberships
           WHERE expires_at < NOW()
           AND expires_at >= NOW() - INTERVAL '30 days'`
        );

        const totalActiveSubscriptions = (subscriptionsByTier as Array<{ count?: number }>)
          .reduce((sum, item) => sum + (item.count || 0), 0);

        const churnRate = totalActiveSubscriptions > 0
          ? ((Number(churnQuery?.churned_30d || 0) / totalActiveSubscriptions) * 100).toFixed(2)
          : 0;

        const totalRevenueQuery = await queryOne(
          `SELECT
            COALESCE(SUM(CASE
              WHEN tier = 'premium' THEN 2.99
              WHEN tier = 'pro' THEN 5.99
              ELSE 0
            END), 0) as total
           FROM memberships
           WHERE status IN ('active', 'expired')`
        );

        logger.info('Revenue dashboard fetched', { totalMRR });

        return apiResponse(
          {
            success: true,
            data: {
              summary: {
                totalMRR: parseFloat(totalMRR.toFixed(2)),
                totalActiveSubscriptions,
                churnRatePercent: parseFloat(String(churnRate)),
                totalRevenueAllTime: Number(totalRevenueQuery?.total || 0),
              },
              byTier: tiers,
              dailyRevenue: (dailyRevenue as Array<{ date: string; revenue: number }>).map((row) => ({
                date: row.date,
                revenue: parseFloat(Number(row.revenue).toFixed(2)),
              })),
            },
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/revenue', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: error instanceof Error ? error.message : String(error)
    });
    logger.error('Revenue dashboard request failed', error instanceof Error ? error : new Error(String(error)), {
      duration
    });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch revenue data', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
