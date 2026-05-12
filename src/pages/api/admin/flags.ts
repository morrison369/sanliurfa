import type { APIRoute } from 'astro';
import { listFlags, updateFlag, deleteFlag, createFlag, getFlagStats } from '../../../lib/feature-flags/feature-flags';
import type { FlagType } from '../../../lib/feature-flags/feature-flags';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { logger } from '../../../lib/logging';

// GET: List all flags (admin only)
export const GET: APIRoute = async ({ locals }) => {
  if (locals.user?.role !== 'admin') {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  try {
    const [flags, stats] = await Promise.all([listFlags(), getFlagStats()]);
    return new Response(
      JSON.stringify({ flags, stats }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Failed to list flags', error instanceof Error ? error : new Error(String(error)));
    return problemJson({
      status: 500,
      title: 'Sunucu Hatası',
      detail: safeErrorDetail(error, 'Flag listesi alınamadı'),
      type: '/problems/admin-flags-server-error',
      instance: '/api/admin/flags',
    });
  }
};

// POST: Create flag (admin only)
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  try {
    const { key, name, type, value } = await request.json();
    if (!key || !name || !type) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'key, name, type zorunludur',
        type: '/problems/admin-flags-validation',
        instance: '/api/admin/flags',
      });
    }
    if (typeof key !== 'string' || key.length > 100) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'key geçerli string olmalı (max 100)', type: '/problems/admin-flags-key-invalid', instance: '/api/admin/flags' });
    if (typeof name !== 'string' || name.length > 200) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'name geçerli string olmalı (max 200)', type: '/problems/admin-flags-name-invalid', instance: '/api/admin/flags' });
    const VALID_FLAG_TYPES = new Set<FlagType>(['boolean', 'percentage', 'user', 'group']);
    const flagType = type as FlagType;
    if (typeof type !== 'string' || !VALID_FLAG_TYPES.has(flagType)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz flag tipi', type: '/problems/admin-flags-type-invalid', instance: '/api/admin/flags' });
    const flag = await createFlag(key, name, flagType, value ?? false);
    return apiResponse({ success: true, flag }, HttpStatus.CREATED);
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Invalid request',
      type: '/problems/admin-flags-invalid-request',
      instance: '/api/admin/flags',
    });
  }
};

// PUT: Update flag (admin only)
export const PUT: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  try {
    const body = await request.json();
    const { key } = body;
    if (!key || typeof key !== 'string' || key.length > 100) {
      return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'key geçerli string olmalı (max 100)', type: '/problems/admin-flags-key-invalid', instance: '/api/admin/flags' });
    }
    const ALLOWED_FLAG_UPDATE_FIELDS = new Set(['name', 'description', 'enabled', 'rollout_percentage', 'value', 'target_audience', 'rolloutPercentage', 'targetAudience']);
    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FLAG_UPDATE_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    const updated = await updateFlag(key, updates);
    if (!updated) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Flag not found',
        type: '/problems/admin-flags-not-found',
        instance: '/api/admin/flags',
      });
    }
    return apiResponse({ success: true, flag: updated }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Invalid request',
      type: '/problems/admin-flags-invalid-request',
      instance: '/api/admin/flags',
    });
  }
};

// DELETE: Delete flag (admin only)
export const DELETE: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  try {
    const { key } = await request.json();
    if (!key || typeof key !== 'string' || key.length > 100) {
      return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'key geçerli string olmalı (max 100)', type: '/problems/admin-flags-key-invalid', instance: '/api/admin/flags' });
    }
    const deleted = await deleteFlag(key);
    return apiResponse({ success: deleted }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Invalid request',
      type: '/problems/admin-flags-invalid-request',
      instance: '/api/admin/flags',
    });
  }
};
