import type { APIRoute } from 'astro';
import {
  deleteSiteServiceEntry,
  listSiteServiceEntries,
  upsertSiteServiceEntry,
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
      instance: '/api/admin/site/services',
    });
  }

  try {
    const group = url.searchParams.get('group') || undefined;
    const items = await listSiteServiceEntries(group);
    return apiResponse({ success: true, items }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Servis Kayıtları Okunamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-services-read-failed',
      instance: '/api/admin/site/services',
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
      instance: '/api/admin/site/services',
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.service_key || !body?.service_group || !body?.title || !body?.slug || !body?.href) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'service_key, service_group, title, slug ve href zorunludur',
      type: '/problems/admin-site-services-validation',
      instance: '/api/admin/site/services',
    });
  }
  if (typeof body.service_key !== 'string' || body.service_key.length > 100) return problemJson({ status: 400, title: 'Validation Failed', detail: 'service_key 100 karakterden uzun olamaz', type: '/problems/admin-site-services-validation', instance: '/api/admin/site/services' });
  if (typeof body.service_group !== 'string' || body.service_group.length > 100) return problemJson({ status: 400, title: 'Validation Failed', detail: 'service_group 100 karakterden uzun olamaz', type: '/problems/admin-site-services-validation', instance: '/api/admin/site/services' });
  if (typeof body.title !== 'string' || body.title.length > 200) return problemJson({ status: 400, title: 'Validation Failed', detail: 'title 200 karakterden uzun olamaz', type: '/problems/admin-site-services-validation', instance: '/api/admin/site/services' });
  if (typeof body.slug !== 'string' || body.slug.length > 200) return problemJson({ status: 400, title: 'Validation Failed', detail: 'slug 200 karakterden uzun olamaz', type: '/problems/admin-site-services-validation', instance: '/api/admin/site/services' });
  if (typeof body.href !== 'string' || body.href.length > 500) return problemJson({ status: 400, title: 'Validation Failed', detail: 'href 500 karakterden uzun olamaz', type: '/problems/admin-site-services-validation', instance: '/api/admin/site/services' });

  try {
    const item = await upsertSiteServiceEntry(body, auditCtx(request, locals));
    return apiResponse({ success: true, item }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Servis Kaydı Yazılamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-services-write-failed',
      instance: '/api/admin/site/services',
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
      instance: '/api/admin/site/services',
    });
  }

  const body = await request.json().catch(() => null);
  const serviceKey = String(body?.serviceKey || '').trim();
  if (!serviceKey) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'serviceKey zorunludur',
      type: '/problems/admin-site-services-delete-validation',
      instance: '/api/admin/site/services',
    });
  }

  try {
    await deleteSiteServiceEntry(serviceKey, auditCtx(request, locals));
    return apiResponse({ success: true, serviceKey }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Servis Kaydı Silinemedi',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-services-delete-failed',
      instance: '/api/admin/site/services',
    });
  }
};
