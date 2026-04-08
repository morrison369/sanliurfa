/**
 * Tenant Features API
 * Feature toggles and configuration
 */

import type { APIRoute } from 'astro';
import { queryOne, queryMany } from '../../../../lib/postgres';
import { isTenantFeatureEnabled, setTenantFeature, logTenantAudit } from '../../../../lib/multi-tenant';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tenantId } = params;

    if (!locals.user?.id) {
      recordRequest('GET', `/api/tenants/${tenantId}/features`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Verify access
    const tenant = await queryOne('SELECT owner_id FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant || (tenant.owner_id !== locals.user.id)) {
      const member = await queryOne(
        'SELECT id FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, locals.user.id]
      );
      if (!member) {
        recordRequest('GET', `/api/tenants/${tenantId}/features`, HttpStatus.FORBIDDEN, Date.now() - startTime);
        return apiError(
          ErrorCode.FORBIDDEN,
          'Access denied',
          HttpStatus.FORBIDDEN,
          undefined,
          requestId
        );
      }
    }

    // Get all features (optimized: select specific feature columns)
    const features = await queryMany(
      `SELECT id, tenant_id, feature_key, is_enabled, feature_limit, usage_count, updated_at
       FROM tenant_features WHERE tenant_id = $1 ORDER BY feature_key ASC`,
      [tenantId]
    );

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/tenants/${tenantId}/features`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: features,
        count: features.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/tenants/${params.tenantId}/features`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get features',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get features',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tenantId } = params;
    const body = await request.json();
    const { feature_key, enabled, config } = body;

    if (!locals.user?.id) {
      recordRequest('POST', `/api/tenants/${tenantId}/features`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Verify ownership
    const tenant = await queryOne('SELECT owner_id FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant || tenant.owner_id !== locals.user.id) {
      recordRequest('POST', `/api/tenants/${tenantId}/features`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Only owner can manage features',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    if (!feature_key || typeof enabled !== 'boolean') {
      recordRequest('POST', `/api/tenants/${tenantId}/features`, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'feature_key and enabled (boolean) required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Set feature
    const success = await setTenantFeature(tenantId, feature_key, enabled, config);

    if (!success) {
      recordRequest('POST', `/api/tenants/${tenantId}/features`, HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to set feature',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    // Log audit
    await logTenantAudit(tenantId, locals.user.id, 'toggle_feature', 'feature', feature_key, { enabled });

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/tenants/${tenantId}/features`, HttpStatus.OK, duration);
    logger.logMutation('update', 'tenant_features', feature_key, locals.user.id, { enabled });

    return apiResponse(
      {
        success: true,
        message: `Feature ${feature_key} ${enabled ? 'enabled' : 'disabled'}`
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/tenants/${params.tenantId}/features`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to set feature',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to set feature',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
