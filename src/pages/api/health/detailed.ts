import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { pool } from '../../../lib/postgres';
import { getRedisClient, isRedisAvailable } from '../../../lib/cache';
import { query } from '../../../lib/postgres';

interface DetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  system: {
    nodeVersion: string;
    platform: string;
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    cpuUsage: {
      user: number;
      system: number;
    };
  };
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      poolSize?: number;
      poolAvailable?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
  };
}

/**
 * GET /api/health/detailed - Detailed health check with system metrics
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);

  // Only admin can access detailed health
  if (!locals.isAdmin) {
    return apiError(ErrorCode.FORBIDDEN, 'Unauthorized', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  try {
    let dbStatus: 'up' | 'down' = 'down';
    let dbResponseTime = 0;
    let dbError: string | undefined;
    let redisStatus: 'up' | 'down' = 'down';
    let redisResponseTime = 0;
    let redisError: string | undefined;

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
      dbError = error instanceof Error ? error.message : String(error);
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
      redisError = error instanceof Error ? error.message : String(error);
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbStatus === 'down') {
      overallStatus = 'unhealthy';
    } else if (redisStatus === 'down') {
      overallStatus = 'degraded';
    }

    const uptime = Math.floor(process.uptime());

    const healthData: DetailedHealth = {
      status: overallStatus,
      uptime,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024)
        },
        cpuUsage: {
          user: Math.round(cpuUsage.user / 1000),
          system: Math.round(cpuUsage.system / 1000)
        }
      },
      checks: {
        database: {
          status: dbStatus,
          ...(dbResponseTime && { responseTime: dbResponseTime }),
          ...(dbError && { error: dbError })
        },
        redis: {
          status: redisStatus,
          ...(redisResponseTime && { responseTime: redisResponseTime }),
          ...(redisError && { error: redisError })
        }
      }
    };

    const statusCode = overallStatus === 'unhealthy' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;

    return apiResponse(healthData, statusCode, requestId);
  } catch (error) {
    console.error('Detailed health check error:', error);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Health check failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
