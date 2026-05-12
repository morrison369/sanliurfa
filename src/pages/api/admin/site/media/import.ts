import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail } from '../../../../../lib/api';
import { upsertMediaAsset } from '../../../../../lib/site-platform';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
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

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Gecersiz JSON' }, 400);
  }

  const assetKey = String(body?.assetKey || '').trim();
  const url = String(body?.url || '').trim();
  const alt = body?.alt ? String(body.alt) : null;
  const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};

  if (!assetKey) return json({ error: 'assetKey zorunlu' }, 400);
  if (!url || !/^https?:\/\//i.test(url)) return json({ error: 'url gecersiz' }, 400);
  if (assetKey.length > 200) return json({ error: 'assetKey 200 karakterden uzun olamaz' }, 400);
  if (url.length > 2000) return json({ error: 'url 2000 karakterden uzun olamaz' }, 400);
  if (alt !== undefined && alt !== null && (typeof alt !== 'string' || alt.length > 500)) return json({ error: 'alt 500 karakterden uzun olamaz' }, 400);
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== 'object' || Array.isArray(body.metadata) || JSON.stringify(body.metadata).length > 5000) {
      return json({ error: 'metadata geçersiz nesne veya 5000 karakteri aşıyor' }, 400);
    }
  }

  try {
    await upsertMediaAsset(
      {
        asset_key: assetKey,
        url,
        alt,
        metadata,
      },
      auditCtx(request, locals),
    );

    return json({ success: true, assetKey, url });
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'import failed') }, 500);
  }
};
