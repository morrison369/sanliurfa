import type { APIRoute } from 'astro';
import {
  deleteSeoOverride,
  listSeoOverrides,
  upsertSeoOverride,
} from '../../../../lib/site-platform';
import type { SeoOverrideRow } from '../../../../lib/site-platform';
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
      instance: '/api/admin/site/seo-overrides',
    });
  }

  try {
    const entityType = url.searchParams.get('entityType') || undefined;
    const items = await listSeoOverrides(entityType);
    return apiResponse({ success: true, items }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'SEO Override Kayıtları Okunamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-seo-overrides-read-failed',
      instance: '/api/admin/site/seo-overrides',
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
      instance: '/api/admin/site/seo-overrides',
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.entity_type || !body?.entity_key || !body?.canonical_path) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'entity_type, entity_key ve canonical_path zorunludur',
      type: '/problems/admin-site-seo-overrides-validation',
      instance: '/api/admin/site/seo-overrides',
    });
  }

  const seoData: Partial<SeoOverrideRow> &
    Pick<SeoOverrideRow, 'entity_type' | 'entity_key' | 'canonical_path'> &
    Record<string, any> = {
    entity_type: String(body.entity_type),
    entity_key: String(body.entity_key),
    canonical_path: String(body.canonical_path),
    seo_payload: {},
  };
  const SEO_OPTIONAL_STRINGS: Array<[string, number]> = [
    ['title_override', 300],
    ['meta_description', 500],
    ['og_title', 300],
    ['og_description', 500],
    ['og_image', 2000],
    ['robots', 200],
    ['redirect_to', 2000],
  ];
  for (const [field, max] of SEO_OPTIONAL_STRINGS) {
    if (body[field] !== undefined && body[field] !== null) {
      if (typeof body[field] !== 'string' || (body[field] as string).length > max) {
        return problemJson({ status: 400, title: 'Validation Failed', detail: `${field} geçersiz veya ${max} karakteri aşıyor`, type: '/problems/admin-site-seo-overrides-validation', instance: '/api/admin/site/seo-overrides' });
      }
      seoData[field] = body[field];
    }
  }
  if (body.noindex !== undefined) seoData.noindex = Boolean(body.noindex);
  if (body.nofollow !== undefined) seoData.nofollow = Boolean(body.nofollow);
  if (body.structured_data !== undefined && body.structured_data !== null) {
    if (typeof body.structured_data !== 'object' || Array.isArray(body.structured_data) || JSON.stringify(body.structured_data).length > 10000) {
      return problemJson({ status: 400, title: 'Validation Failed', detail: 'structured_data geçersiz nesne veya 10000 karakteri aşıyor', type: '/problems/admin-site-seo-overrides-validation', instance: '/api/admin/site/seo-overrides' });
    }
    seoData.structured_data = body.structured_data;
  }
  try {
    const item = await upsertSeoOverride(seoData, auditCtx(request, locals));
    return apiResponse({ success: true, item }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'SEO Override Yazılamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-seo-overrides-write-failed',
      instance: '/api/admin/site/seo-overrides',
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
      instance: '/api/admin/site/seo-overrides',
    });
  }

  const body = await request.json().catch(() => null);
  const entityType = String(body?.entityType || '').trim();
  const entityKey = String(body?.entityKey || '').trim();
  if (!entityType || !entityKey) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'entityType ve entityKey zorunludur',
      type: '/problems/admin-site-seo-overrides-delete-validation',
      instance: '/api/admin/site/seo-overrides',
    });
  }

  try {
    await deleteSeoOverride(entityType, entityKey, auditCtx(request, locals));
    return apiResponse({ success: true, entityType, entityKey }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'SEO Override Silinemedi',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-seo-overrides-delete-failed',
      instance: '/api/admin/site/seo-overrides',
    });
  }
};
