import type { APIRoute } from 'astro';
import {
  deleteSeoOverride,
  listSeoOverrides,
  upsertSeoOverride,
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
      instance: '/api/admin/site/seo-overrides',
    });
  }

  try {
    const entityType = url.searchParams.get('entityType') || undefined;
    const items = await listSeoOverrides(entityType);
    return new Response(JSON.stringify({ success: true, items }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'SEO Override Kayıtları Okunamadı',
      detail: error instanceof Error ? error.message : 'unknown',
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

  try {
    const item = await upsertSeoOverride(body, auditCtx(request, locals));
    return new Response(JSON.stringify({ success: true, item }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'SEO Override Yazılamadı',
      detail: error instanceof Error ? error.message : 'unknown',
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
    return new Response(JSON.stringify({ success: true, entityType, entityKey }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'SEO Override Silinemedi',
      detail: error instanceof Error ? error.message : 'unknown',
      type: '/problems/admin-site-seo-overrides-delete-failed',
      instance: '/api/admin/site/seo-overrides',
    });
  }
};
