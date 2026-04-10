import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { pool } from '../../lib/postgres';
import { getRedisClient, isRedisAvailable } from '../../lib/cache';
import { getRuntimeIntegrationSettings } from '../../lib/runtime-integration-settings';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    redis: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    integrations: {
      resend: {
        configured: boolean;
      };
      analytics: {
        configured: boolean;
      };
    };
  };
}

/**
 * GET /api/health - Health check with database and Redis status
 */
export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);

  try {
    let dbStatus: 'up' | 'down' = 'down';
    let dbResponseTime = 0;
    let redisStatus: 'up' | 'down' = 'down';
    let redisResponseTime = 0;
    const integrationSettings = await getRuntimeIntegrationSettings();
    const resendConfigured = Boolean(integrationSettings.resendApiKey);
    const analyticsConfigured = Boolean(integrationSettings.analyticsId);

    // Check database
    try {
      const dbStart = Date.now();
      const result = await pool.query('SELECT 1');
      dbResponseTime = Date.now() - dbStart;
      if (result.rows.length > 0) {
        dbStatus = 'up';
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      dbStatus = 'down';
    }

    // Check Redis
    try {
      if (isRedisAvailable()) {
        const redisStart = Date.now();
        const redis = await getRedisClient();
        await redis.ping();
        redisResponseTime = Date.now() - redisStart;
        redisStatus = 'up';
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
      redisStatus = 'down';
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbStatus === 'down') {
      overallStatus = 'unhealthy';
    } else if (redisStatus === 'down') {
      overallStatus = 'degraded';
    } else if (process.env.NODE_ENV === 'production' && (!resendConfigured || !analyticsConfigured)) {
      overallStatus = 'degraded';
    }

    const uptime = Math.floor(process.uptime());

    const healthData: HealthStatus = {
      status: overallStatus,
      uptime,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: {
        database: {
          status: dbStatus,
          ...(dbResponseTime && { responseTime: dbResponseTime })
        },
        redis: {
          status: redisStatus,
          ...(redisResponseTime && { responseTime: redisResponseTime })
        },
        integrations: {
          resend: {
            configured: resendConfigured
          },
          analytics: {
            configured: analyticsConfigured
          }
        }
      }
    };

    // Return appropriate status code based on health
    const statusCode = overallStatus === 'unhealthy' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;

    return apiResponse(healthData, statusCode, requestId);
  } catch (error) {
    console.error('Health check error:', error);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Health check failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
