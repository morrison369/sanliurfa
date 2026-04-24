/**
 * Backup Management (Admin)
 */

import type { APIRoute } from 'astro';
import { getBackupConfigs, updateBackupConfig, type BackupConfig } from '../../../../lib/deployment';
import { runBackup } from '../../../../lib/backup';
import { validateWithSchema, type ValidationSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

const updateSchema: ValidationSchema = {
  enabled: { type: 'boolean', required: false },
  schedule: { type: 'string', required: false, pattern: '^(hourly|daily|weekly)$' },
  retention_days: { type: 'number', required: false, min: 1, max: 365 },
  destination: { type: 'string', required: false, pattern: '^local$' },
};

// GET backup configs
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/deployment/backup', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const backups = await getBackupConfigs();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/backup', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: { backups, count: backups.length } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/backup', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Backup yapılandırmaları alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// PUT update backup config
export const PUT: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('PUT', '/api/admin/deployment/backup', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const id = url.searchParams.get('id');

    if (!id) {
      recordRequest('PUT', '/api/admin/deployment/backup', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.INVALID_INPUT, 'Backup ID gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, updateSchema);

    if (!validation.valid) {
      recordRequest('PUT', '/api/admin/deployment/backup', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Backup yapılandırması geçersiz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const result = await updateBackupConfig(id, validation.data as Partial<BackupConfig>);

    if (!result) {
      recordRequest('PUT', '/api/admin/deployment/backup', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Backup yapılandırması bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/admin/deployment/backup', HttpStatus.OK, duration);
    logger.logMutation('update', 'backup_configs', id, locals.user?.id);

    return apiResponse({ success: true, data: result }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/admin/deployment/backup', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Backup yapılandırması güncellenemedi', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// POST trigger backup
export const POST: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/admin/deployment/backup', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const id = url.searchParams.get('id');

    if (!id) {
      recordRequest('POST', '/api/admin/deployment/backup', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.INVALID_INPUT, 'Backup ID gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const result = await runBackup(id);

    if (result.status === 'failed') {
      recordRequest('POST', '/api/admin/deployment/backup', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(ErrorCode.INTERNAL_ERROR, result.error || 'Backup başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/deployment/backup', HttpStatus.OK, duration);
    logger.info('Backup tetiklendi', { backupId: id, size: result.size, duration: result.duration });

    return apiResponse({ success: true, data: result }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/deployment/backup', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Backup tetikleme başarısız', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

