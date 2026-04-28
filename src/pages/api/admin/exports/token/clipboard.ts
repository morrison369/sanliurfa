import type { APIRoute } from 'astro';
import { apiResponse, problemJson, HttpStatus } from '../../../../../lib/api';
import { auditSiteChange } from '../../../../../lib/site-content';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-export-token-clipboard-unauthorized',
      instance: '/api/admin/exports/token/clipboard',
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // optional
  }
  await auditSiteChange(
    'admin.export.token',
    'publish',
    {
      userId: locals?.user?.id ? String(locals.user.id) : null,
      actorEmail: locals?.user?.email ? String(locals.user.email) : null,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    },
    {
      action: 'export_token_clipboard_copy',
      resourceKey: body?.resourceKey || null,
      tokenId: body?.tokenId || null,
    },
  );
  return apiResponse({ success: true }, HttpStatus.OK);
};
