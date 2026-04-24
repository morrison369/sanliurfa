import type { APIRoute } from 'astro';
import {
  deleteSiteServiceEntry,
  listSiteServiceEntries,
  upsertSiteServiceEntry,
} from '../../../../lib/site-platform';
import { problemJson } from '../../../../lib/api';

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

function auditCtx(request: Request, locals: any) {
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
    return new Response(JSON.stringify({ success: true, items }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Servis Kayıtları Okunamadı',
      detail: error instanceof Error ? error.message : 'unknown',
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

  try {
    const item = await upsertSiteServiceEntry(body, auditCtx(request, locals));
    return new Response(JSON.stringify({ success: true, item }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Servis Kaydı Yazılamadı',
      detail: error instanceof Error ? error.message : 'unknown',
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
    return new Response(JSON.stringify({ success: true, serviceKey }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Servis Kaydı Silinemedi',
      detail: error instanceof Error ? error.message : 'unknown',
      type: '/problems/admin-site-services-delete-failed',
      instance: '/api/admin/site/services',
    });
  }
};
