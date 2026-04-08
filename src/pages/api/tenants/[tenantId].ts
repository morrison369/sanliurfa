/**
 * Tenant Detail API
 * Get, update tenant settings
 */

import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../lib/postgres';
import { getTenantBranding, updateTenantBranding, getTenantMembers, logTenantAudit } from '../../../lib/multi-tenant';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCache } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tenantId } = params;

    if (!locals.user?.id) {
      recordRequest('GET', `/api/tenants/${tenantId}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get tenant (optimized: select common tenant columns)
    const tenant = await queryOne(
      `SELECT id, owner_id, name, slug, plan, subscription_status, is_active, created_at, updated_at
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (!tenant) {
      recordRequest('GET', `/api/tenants/${tenantId}`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Tenant not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Check access (owner or member)
    if (tenant.owner_id !== locals.user.id) {
      const member = await queryOne(
        'SELECT id FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, locals.user.id]
      );

      if (!member) {
        recordRequest('GET', `/api/tenants/${tenantId}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
        return apiError(
          ErrorCode.FORBIDDEN,
          'Access denied',
          HttpStatus.FORBIDDEN,
          undefined,
          requestId
        );
      }
    }

    // Get branding and members
    const branding = await getTenantBranding(tenantId);
    const members = await getTenantMembers(tenantId);
    // Optimized: select specific settings columns instead of SELECT *
    const settings = await queryOne(
      `SELECT id, tenant_id, setting_key, setting_value, updated_at
       FROM tenant_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/tenants/${tenantId}`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          tenant,
          branding,
          members,
          settings
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/tenants/${params.tenantId}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get tenant',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get tenant',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tenantId } = params;
    const body = await request.json();

    if (!locals.user?.id) {
      recordRequest('PATCH', `/api/tenants/${tenantId}`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get tenant and verify ownership
    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [tenantId]);

    if (!tenant) {
      recordRequest('PATCH', `/api/tenants/${tenantId}`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Tenant not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    if (tenant.owner_id !== locals.user.id) {
      recordRequest('PATCH', `/api/tenants/${tenantId}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Only owner can update tenant',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const { name, description, custom_domain, logo_url, favicon_url, branding, settings } = body;

    // Update tenant
    if (name || description || custom_domain || logo_url || favicon_url) {
      await update('tenants', { id: tenantId }, {
        name: name || tenant.name,
        description: description || tenant.description,
        custom_domain: custom_domain || tenant.custom_domain,
        logo_url: logo_url || tenant.logo_url,
        favicon_url: favicon_url || tenant.favicon_url,
        updated_at: new Date()
      });

      await deleteCache(`sanliurfa:tenant:slug:${tenant.slug}`);
      if (tenant.custom_domain) {
        await deleteCache(`sanliurfa:tenant:domain:${tenant.custom_domain}`);
      }
    }

    // Update branding
    if (branding) {
      await updateTenantBranding(tenantId, branding);
    }

    // Update settings
    if (settings) {
      await update('tenant_settings', { tenant_id: tenantId }, settings);
    }

    // Log audit
    await logTenantAudit(tenantId, locals.user.id, 'update_settings');

    const duration = Date.now() - startTime;
    recordRequest('PATCH', `/api/tenants/${tenantId}`, HttpStatus.OK, duration);
    logger.logMutation('update', 'tenants', tenantId, locals.user.id);

    return apiResponse(
      {
        success: true,
        message: 'Tenant updated'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PATCH', `/api/tenants/${params.tenantId}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to update tenant',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update tenant',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
