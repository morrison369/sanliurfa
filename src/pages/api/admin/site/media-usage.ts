import type { APIRoute } from 'astro';
import {
  deleteMediaUsage,
  listMediaUsage,
  upsertMediaUsage,
} from '../../../../lib/site-platform';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

function auditCtx(request: Request, locals: App.Locals) {
  return {
    userId: locals?.user?.id ? String(locals.user.id) : null,
    actorEmail: locals?.user?.email ? String(locals.user.email) : null,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent') || null,
  };
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/media-usage',
    });
  }

  try {
    const assetKey = String(url.searchParams.get('assetKey') || '').trim();
    const items = await listMediaUsage(assetKey || undefined);
    return apiResponse({ success: true, items }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Media Usage Okunamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-media-usage-read-failed',
      instance: '/api/admin/site/media-usage',
    });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/media-usage',
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.asset_key || !body?.entity_type || !body?.entity_key || !body?.placement_key) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'asset_key, entity_type, entity_key ve placement_key zorunludur',
      type: '/problems/admin-media-usage-validation',
      instance: '/api/admin/site/media-usage',
    });
  }

  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== 'object' || Array.isArray(body.metadata) || JSON.stringify(body.metadata).length > 5000) {
      return problemJson({ status: 400, title: 'Validation Failed', detail: 'metadata geçersiz nesne veya 5000 karakteri aşıyor', type: '/problems/admin-media-usage-validation', instance: '/api/admin/site/media-usage' });
    }
  }
  try {
    const item = await upsertMediaUsage(
      {
        asset_key: String(body.asset_key),
        entity_type: String(body.entity_type),
        entity_key: String(body.entity_key),
        placement_key: String(body.placement_key),
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      },
      auditCtx(request, locals),
    );
    return apiResponse({ success: true, item }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Media Usage Yazılamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-media-usage-write-failed',
      instance: '/api/admin/site/media-usage',
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/media-usage',
    });
  }

  const body = await request.json().catch(() => null);
  const assetKey = String(body?.assetKey || '').trim();
  const entityType = String(body?.entityType || '').trim();
  const entityKey = String(body?.entityKey || '').trim();
  const placementKey = String(body?.placementKey || '').trim();

  if (!assetKey || !entityType || !entityKey || !placementKey) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'assetKey, entityType, entityKey ve placementKey zorunludur',
      type: '/problems/admin-media-usage-delete-validation',
      instance: '/api/admin/site/media-usage',
    });
  }

  try {
    await deleteMediaUsage(assetKey, entityType, entityKey, placementKey, auditCtx(request, locals));
    return apiResponse({ success: true, assetKey, entityType, entityKey, placementKey }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Media Usage Silinemedi',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-media-usage-delete-failed',
      instance: '/api/admin/site/media-usage',
    });
  }
};
