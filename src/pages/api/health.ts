import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { buildArtifactHealth, classifyIntegrationStatus, classifyOverallOpsStatus, classifyThresholdStatus } from '../../lib/admin-status';
import { pool } from '../../lib/postgres';
import { getRedisClient, isRedisAvailable } from '../../lib/cache';
import { getRuntimeIntegrationSettings } from '../../lib/runtime-integration-settings';
import { getNightlyOpsSummary } from '../../lib/nightly-ops-summary';
import { getReleaseGateSummary } from '../../lib/release-gate-summary';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'blocked';
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
    artifacts: {
      releaseGate: {
        available: boolean;
        status: 'healthy' | 'degraded' | 'blocked';
      };
      nightlyRegression: {
        available: boolean;
        status: 'healthy' | 'degraded' | 'blocked';
      };
      nightlyE2E: {
        available: boolean;
        status: 'healthy' | 'degraded' | 'blocked';
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
    const [integrationSettings, releaseGate, nightly] = await Promise.all([
      getRuntimeIntegrationSettings(),
      getReleaseGateSummary(),
      getNightlyOpsSummary()
    ]);
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
    const integrationStatus = classifyIntegrationStatus({
      configuredCount: Number(resendConfigured) + Number(analyticsConfigured),
      total: 2
    });
    const databaseStatus = classifyThresholdStatus({
      blockedWhen: dbStatus === 'down',
      degradedWhen: false
    });
    const cacheStatus = classifyThresholdStatus({
      blockedWhen: false,
      degradedWhen: redisStatus === 'down'
    });
    const overallStatus = classifyOverallOpsStatus(
      process.env.NODE_ENV === 'production'
        ? [databaseStatus, cacheStatus, integrationStatus]
        : [databaseStatus, cacheStatus]
    );

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
        },
        artifacts: {
          releaseGate: buildArtifactHealth({
            kind: 'releaseGate',
            available: releaseGate.available,
            generatedAt: releaseGate.generatedAt
          }),
          nightlyRegression: buildArtifactHealth({
            kind: 'nightlyRegression',
            available: nightly.regression.available,
            generatedAt: nightly.regression.generatedAt
          }),
          nightlyE2E: buildArtifactHealth({
            kind: 'nightlyE2E',
            available: nightly.e2e.available,
            generatedAt: nightly.e2e.generatedAt
          })
        }
      }
    };

    // Return appropriate status code based on health
    const statusCode = overallStatus === 'blocked' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;

    return apiResponse(healthData, statusCode, requestId);
  } catch (error) {
    console.error('Health check error:', error);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Health check failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
