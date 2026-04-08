/**
 * Tenants API
 * Create, list, manage tenants
 */

import type { APIRoute } from 'astro';
import { createTenant, getTenantBySlug } from '../../../lib/multi-tenant';
import { queryMany } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/tenants', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get user's tenants (as owner or member)
    const tenants = await queryMany(
      `SELECT DISTINCT t.* FROM tenants t
       LEFT JOIN tenant_members tm ON t.id = tm.tenant_id
       WHERE t.owner_id = $1 OR tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [locals.user.id]
    );

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/tenants', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: tenants,
        count: tenants.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/tenants', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get tenants',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get tenants',
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
    if (!locals.user?.id) {
      recordRequest('POST', '/api/tenants', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { name, slug, description } = body;

    // Validate input
    if (!name || !slug) {
      recordRequest('POST', '/api/tenants', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'name and slug required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Check if slug already exists
    const existing = await getTenantBySlug(slug);
    if (existing) {
      recordRequest('POST', '/api/tenants', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'Slug already in use',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    // Create tenant
    const tenant = await createTenant(name, slug, locals.user.id, description);

    if (!tenant) {
      recordRequest('POST', '/api/tenants', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/tenants', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'tenants', tenant.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        data: tenant
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/tenants', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to create tenant',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create tenant',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
