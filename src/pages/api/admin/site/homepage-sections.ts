import type { APIRoute } from 'astro';
import {
  deleteHomepageSection,
  listHomepageSections,
  upsertHomepageSection,
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

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/homepage-sections',
    });
  }

  try {
    const items = await listHomepageSections();
    return apiResponse({ success: true, items }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Homepage Sections Okunamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-homepage-sections-read-failed',
      instance: '/api/admin/site/homepage-sections',
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
      instance: '/api/admin/site/homepage-sections',
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.section_key || !body?.title) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'section_key ve title zorunludur',
      type: '/problems/admin-homepage-sections-validation',
      instance: '/api/admin/site/homepage-sections',
    });
  }

  if (typeof body.section_key !== 'string' || body.section_key.length > 100) return problemJson({ status: 400, title: 'Validation Failed', detail: 'section_key 100 karakterden uzun olamaz', type: '/problems/admin-homepage-sections-validation', instance: '/api/admin/site/homepage-sections' });
  if (typeof body.title !== 'string' || body.title.length > 200) return problemJson({ status: 400, title: 'Validation Failed', detail: 'title 200 karakterden uzun olamaz', type: '/problems/admin-homepage-sections-validation', instance: '/api/admin/site/homepage-sections' });
  if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 1000)) return problemJson({ status: 400, title: 'Validation Failed', detail: 'description 1000 karakterden uzun olamaz', type: '/problems/admin-homepage-sections-validation', instance: '/api/admin/site/homepage-sections' });
  if (body.config && typeof body.config === 'object') {
    if (Array.isArray(body.config) || JSON.stringify(body.config).length > 10000) {
      return problemJson({ status: 400, title: 'Validation Failed', detail: 'config nesnesi 10000 karakteri aşamaz', type: '/problems/admin-homepage-sections-validation', instance: '/api/admin/site/homepage-sections' });
    }
  }

  try {
    const item = await upsertHomepageSection(
      {
        id: body.id,
        section_key: String(body.section_key),
        title: String(body.title),
        description: body.description ? String(body.description) : null,
        config: body.config && typeof body.config === 'object' ? body.config : {},
        is_active: body.is_active !== false,
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      },
      auditCtx(request, locals),
    );

    return apiResponse({ success: true, item }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Homepage Section Yazılamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-homepage-sections-write-failed',
      instance: '/api/admin/site/homepage-sections',
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
      instance: '/api/admin/site/homepage-sections',
    });
  }

  const body = await request.json().catch(() => null);
  const sectionKey = String(body?.sectionKey || '').trim();
  if (!sectionKey) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'sectionKey zorunludur',
      type: '/problems/admin-homepage-sections-delete-validation',
      instance: '/api/admin/site/homepage-sections',
    });
  }

  try {
    await deleteHomepageSection(sectionKey, auditCtx(request, locals));
    return apiResponse({ success: true, sectionKey }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Homepage Section Silinemedi',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-homepage-sections-delete-failed',
      instance: '/api/admin/site/homepage-sections',
    });
  }
};
