/**
 * Server-Sent Events endpoint for real-time analytics
 * Sends metrics updates every 5 seconds and KPI updates every 30 seconds
 * Admin-only access required
 */

import type { APIRoute } from 'astro';
import { metricsCollector } from '../../../lib/metrics';
import { getKPIs, checkMetricAlerts } from '../../../lib/business-analytics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  // Admin-only access
  if (!user?.id || user?.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  logger.info('Real-time analytics connection established', { userId: user.id });

  // SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  };

  let isClosed = false;

  const response = new Response(
    new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId: user.id })}\n\n`);

          // Send metrics every 5 seconds
          const metricsInterval = setInterval(async () => {
            if (isClosed) {
              clearInterval(metricsInterval);
              return;
            }

            try {
              const metrics = metricsCollector.getMetrics();
              const perfStats = metricsCollector.getPerformanceStats();

              const data = {
                type: 'metrics',
                timestamp: new Date().toISOString(),
                errorRate: metrics.errorRate,
                avgDuration: metrics.avgDuration,
                p95Duration: metrics.p95Duration,
                cacheHitRate: metrics.cacheHitRate,
                slowRequests: metrics.slowRequests,
                totalRequests: metrics.totalRequests,
                slowestEndpoints: metrics.slowestEndpoints.slice(0, 5),
                dbPool: perfStats.dbPoolStatus
              };

              controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
              logger.error('SSE metrics heartbeat failed', error instanceof Error ? error : new Error(String(error)), {
                userId: user.id
              });
              const errorData = {
                type: 'error',
                message: 'Failed to get metrics'
              };
              controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            }
          }, 5000); // 5 second interval

          // Send KPI updates every 30 seconds
          const kpiInterval = setInterval(async () => {
            if (isClosed) {
              clearInterval(kpiInterval);
              return;
            }

            try {
              const kpis = await getKPIs(true);
              await checkMetricAlerts();

              // Count triggered alerts
              const alertCount = kpis.filter((k: any) => k.alert_triggered).length;

              const data = {
                type: 'kpi',
                timestamp: new Date().toISOString(),
                kpis: kpis,
                alertCount: alertCount
              };

              controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
              logger.error('SSE KPI heartbeat failed', error instanceof Error ? error : new Error(String(error)), {
                userId: user.id
              });
              const errorData = {
                type: 'error',
                message: 'Failed to get KPIs'
              };
              controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            }
          }, 30000); // 30 second interval

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            isClosed = true;
            clearInterval(metricsInterval);
            clearInterval(kpiInterval);
            controller.close();
            logger.info('Real-time analytics connection closed', { userId: user.id });
          });
        } catch (error) {
          logger.error('SSE setup failed', error instanceof Error ? error : new Error(String(error)), {
            userId: user.id
          });
          controller.close();
        }
      }
    }),
    {
      headers,
      status: 200
    }
  );

  return response;
};
