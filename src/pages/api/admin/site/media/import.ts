import type { APIRoute } from 'astro';
import { upsertMediaAsset } from '../../../../../lib/site-platform';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
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

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: any;
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
    return json({ success: false, error: error instanceof Error ? error.message : 'import failed' }, 500);
  }
};
