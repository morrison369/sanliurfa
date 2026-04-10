/**
 * Tenant Members API
 * Invite, manage, remove members
 */

import type { APIRoute } from 'astro';
import { queryOne, queryRows } from '../../../../lib/postgres';
import { addTenantMember, removeTenantMember, logTenantAudit } from '../../../../lib/multi-tenant';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, validators } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

const ALLOWED_TENANT_MEMBER_ROLES = new Set(['admin', 'member', 'viewer']);

function isValidUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && validators.uuid(value);
}

async function parseJsonBody(request: Request, requestId: string, route: string, startTime: number) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return {
      response: apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type application/json olmalı',
        HttpStatus.BAD_REQUEST,
        { contentType },
        requestId
      )
    };
  }

  try {
    return { body: await request.json() };
  } catch {
    recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return {
      response: apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz JSON body',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      )
    };
  }
}

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tenantId } = params;
    const route = `/api/tenants/${tenantId ?? 'unknown'}/members`;

    if (!locals.user?.id) {
      recordRequest('GET', route, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    if (!isValidUuid(tenantId)) {
      recordRequest('GET', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid tenant ID',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Verify access
    const tenant = await queryOne('SELECT owner_id FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant) {
      recordRequest('GET', route, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Tenant not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    if (tenant.owner_id !== locals.user.id) {
      const member = await queryOne(
        'SELECT id FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, locals.user.id]
      );
      if (!member) {
        recordRequest('GET', route, HttpStatus.FORBIDDEN, Date.now() - startTime);
        return apiError(
          ErrorCode.FORBIDDEN,
          'Access denied',
          HttpStatus.FORBIDDEN,
          undefined,
          requestId
        );
      }
    }

    // Get members with user details
    const members = await queryRows(
      `SELECT tm.*, u.full_name, u.email, u.avatar_url
       FROM tenant_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.tenant_id = $1
       ORDER BY tm.joined_at DESC`,
      [tenantId]
    );

    const duration = Date.now() - startTime;
    recordRequest('GET', route, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: members,
        count: members.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/tenants/${params.tenantId}/members`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get members',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get members',
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
    const route = `/api/tenants/${tenantId ?? 'unknown'}/members`;

    if (!locals.user?.id) {
      recordRequest('POST', route, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    if (!isValidUuid(tenantId)) {
      recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid tenant ID',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const parsed = await parseJsonBody(request, requestId, route, startTime);
    if (parsed.response) {
      return parsed.response;
    }

    const { user_id, role } = parsed.body as { user_id?: unknown; role?: unknown };

    if (!isValidUuid(typeof user_id === 'string' ? user_id : undefined)) {
      recordRequest('POST', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid user_id',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (role !== undefined && (typeof role !== 'string' || !ALLOWED_TENANT_MEMBER_ROLES.has(role))) {
      recordRequest('POST', route, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid tenant role',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { allowedRoles: [...ALLOWED_TENANT_MEMBER_ROLES] },
        requestId
      );
    }

    // Verify ownership
    const tenant = await queryOne('SELECT owner_id FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant) {
      recordRequest('POST', route, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Tenant not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    if (tenant.owner_id !== locals.user.id) {
      recordRequest('POST', route, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Only owner can add members',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Verify user exists
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [user_id]);
    if (!user) {
      recordRequest('POST', route, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Add member
    const member = await addTenantMember(tenantId, user_id, typeof role === 'string' ? role : 'member');

    if (!member) {
      recordRequest('POST', route, HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'User already a member',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    // Log audit
    await logTenantAudit(tenantId, locals.user.id, 'add_member', 'user', user_id);

    const duration = Date.now() - startTime;
    recordRequest('POST', route, HttpStatus.CREATED, duration);
    logger.logMutation('create', 'tenant_members', member.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        data: member
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/tenants/${params.tenantId}/members`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to add member',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to add member',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals, params, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tenantId } = params;
    const userId = url.searchParams.get('user_id');
    const route = `/api/tenants/${tenantId ?? 'unknown'}/members`;

    if (!locals.user?.id) {
      recordRequest('DELETE', route, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    if (!isValidUuid(tenantId)) {
      recordRequest('DELETE', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid tenant ID',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (!isValidUuid(userId)) {
      recordRequest('DELETE', route, HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid user_id',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Verify ownership
    const tenant = await queryOne('SELECT owner_id FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant) {
      recordRequest('DELETE', route, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Tenant not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    if (tenant.owner_id !== locals.user.id) {
      recordRequest('DELETE', route, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Only owner can remove members',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    if (userId === tenant.owner_id) {
      recordRequest('DELETE', route, HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'Tenant owner cannot be removed',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    // Remove member
    const success = await removeTenantMember(tenantId, userId);

    if (!success) {
      recordRequest('DELETE', route, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Member not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Log audit
    await logTenantAudit(tenantId, locals.user.id, 'remove_member', 'user', userId);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', route, HttpStatus.OK, duration);
    logger.logMutation('delete', 'tenant_members', userId, locals.user.id);

    return apiResponse(
      {
        success: true,
        message: 'Member removed'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/tenants/${params.tenantId}/members`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to remove member',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to remove member',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
