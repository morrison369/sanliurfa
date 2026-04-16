/**
 * Backup Management (Admin)
 */

import type { APIRoute } from 'astro';
import { getBackupConfigs, updateBackupConfig, simulateBackup } from '../../../../lib/deployment';
import { validateWithSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

const updateSchema = {
  enabled: { type: 'boolean' as const, required: false },
  schedule: { type: 'string' as const, required: false, pattern: '^(hourly|daily|weekly)$' },
  retention_days: { type: 'number' as const, required: false, min: 1, max: 365 },
  destination: { type: 'string' as const, required: false, pattern: '^(local|s3|gcs)$' }
};

// GET backup configs
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/deployment/backup',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/deployment/backup', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/deployment/backup', response.status, duration);
        },
      },
      async () => {
        const backups = getBackupConfigs();
        return apiResponse(
          { success: true, data: { backups, count: backups.length } },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/backup', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get backup configs failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// PUT update backup config
export const PUT: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/deployment/backup',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('PUT', '/api/admin/deployment/backup', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('PUT', '/api/admin/deployment/backup', response.status, duration);
        },
      },
      async () => {
        const id = url.searchParams.get('id');
        if (!id) {
          return apiError(
            ErrorCode.INVALID_INPUT,
            'Backup ID required',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }

        const body = await request.json();
        const validation = validateWithSchema(body, updateSchema as any);
        if (!validation.valid) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid backup configuration',
            HttpStatus.UNPROCESSABLE_ENTITY,
            validation.errors,
            requestId
          );
        }

        const result = updateBackupConfig(id, validation.data as any);
        if (!result) {
          return apiError(
            ErrorCode.NOT_FOUND,
            'Backup config not found',
            HttpStatus.NOT_FOUND,
            undefined,
            requestId
          );
        }

        logger.logMutation('update', 'backup_configs', id, locals.user?.id);
        return apiResponse({ success: true, data: result }, HttpStatus.OK, requestId);
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/admin/deployment/backup', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update backup config failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// POST trigger backup
export const POST: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/deployment/backup',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', '/api/admin/deployment/backup', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', '/api/admin/deployment/backup', response.status, duration);
        },
      },
      async () => {
        const id = url.searchParams.get('id');
        if (!id) {
          return apiError(
            ErrorCode.INVALID_INPUT,
            'Backup ID required',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }

        const result = await simulateBackup(id);
        if (result.status === 'failed') {
          return apiError(
            ErrorCode.INTERNAL_ERROR,
            result.error || 'Backup failed',
            HttpStatus.INTERNAL_SERVER_ERROR,
            undefined,
            requestId
          );
        }

        logger.info('Backup triggered', {
          backupId: id,
          size: result.size_bytes,
          duration: result.duration_seconds,
        });
        return apiResponse({ success: true, data: result }, HttpStatus.OK, requestId);
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/deployment/backup', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Backup trigger failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
