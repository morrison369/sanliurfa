import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail } from '../../../../../lib/api';
import { rollbackSiteSetting } from '../../../../../lib/site-content';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Gecersiz JSON' }, 400);
  }

  const key = String(body?.key || '').trim();
  const versionNo = Number(body?.versionNo);
  if (!key) return json({ error: 'key zorunlu' }, 400);
  if (!Number.isInteger(versionNo) || versionNo < 1) return json({ error: 'versionNo gecersiz' }, 400);

  try {
    await rollbackSiteSetting(key, versionNo, {
      userId: locals?.user?.id ? String(locals.user.id) : null,
      actorEmail: locals?.user?.email ? String(locals.user.email) : null,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    });
    return json({ success: true, key, versionNo });
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'rollback failed') }, 500);
  }
};
