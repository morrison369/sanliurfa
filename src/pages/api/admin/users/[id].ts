import type { APIRoute } from 'astro';
import { getUserDetails, flagUserAccount, changeUserRole, logAdminAction } from '../../../../lib/admin-users';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

/**
 * Admin User Details API
 * GET: Get detailed user information
 * POST: Perform admin actions on user
 */
export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  const endpoint = `/api/admin/users/${params.id}`;
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint,
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', endpoint, statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', endpoint, response.status, duration);
        },
      },
      async () => {
        const details = await getUserDetails(params.id as string);
        if (!details) {
          return apiError(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
        }

        return apiResponse(
          {
            success: true,
            data: details,
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', endpoint, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get user details failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı detayları alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  const endpoint = `/api/admin/users/${params.id}`;
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint,
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', endpoint, statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', endpoint, response.status, duration);
        },
      },
      async () => {
        const body = await request.json();
        const { action, flagType, reason, severity, newRole, expiresAt, actionType, changes } = body;

        if (!action) {
          return apiError(ErrorCode.VALIDATION_ERROR, 'action gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
        }

        if (action === 'flag') {
          if (!flagType || !reason) {
            return apiError(
              ErrorCode.VALIDATION_ERROR,
              'flagType ve reason gereklidir',
              HttpStatus.UNPROCESSABLE_ENTITY,
              undefined,
              requestId
            );
          }

          await flagUserAccount(
            params.id as string,
            locals.user?.id || 'unknown',
            flagType,
            reason,
            severity || 'medium',
            expiresAt ? new Date(expiresAt) : undefined
          );
        } else if (action === 'changeRole') {
          if (!newRole) {
            return apiError(ErrorCode.VALIDATION_ERROR, 'newRole gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
          }

          await changeUserRole(params.id as string, locals.user?.id || 'unknown', newRole);
        } else if (action === 'log') {
          await logAdminAction(locals.user?.id || 'unknown', params.id as string, actionType, changes);
        }

        logger.info('Admin user action completed', {
          userId: params.id,
          action,
          adminId: locals.user?.id,
        });

        return apiResponse(
          {
            success: true,
            message: `Kullanıcı işlemi tamamlandı: ${action}`,
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', endpoint, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Admin user action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı işlemi başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
