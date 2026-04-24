import type { APIRoute } from 'astro';
import {
  deleteMediaAsset,
  listMediaAssets,
  upsertMediaAsset,
} from '../../../../../lib/site-platform';

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

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const bucket = String(url.searchParams.get('bucket') || '').trim();
  const limitRaw = Number(url.searchParams.get('limit') || 24);
  const offsetRaw = Number(url.searchParams.get('offset') || 0);

  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 24;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  try {
    const rows = await listMediaAssets(bucket || undefined);
    const items = rows.slice(offset, offset + limit);

    return json({
      success: true,
      items,
      total: rows.length,
      limit,
      offset,
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'media list failed',
      },
      500,
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Gecersiz JSON' }, 400);
  }

  const assetKey = String(body?.assetKey || '').trim();
  const url = String(body?.url || '').trim();
  const alt = body?.alt != null ? String(body.alt).trim() : null;
  const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};

  if (!assetKey) return json({ error: 'assetKey zorunlu' }, 400);
  if (!url || !/^https?:\/\//i.test(url)) return json({ error: 'url gecersiz' }, 400);

  try {
    const item = await upsertMediaAsset(
      {
        asset_key: assetKey,
        url,
        alt,
        mime_type: body?.mimeType ? String(body.mimeType).trim() : null,
        width: Number.isFinite(Number(body?.width)) ? Number(body.width) : null,
        height: Number.isFinite(Number(body?.height)) ? Number(body.height) : null,
        metadata,
      },
      auditCtx(request, locals),
    );

    return json({ success: true, item });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'media update failed',
      },
      500,
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Gecersiz JSON' }, 400);
  }

  const assetKey = String(body?.assetKey || '').trim();
  if (!assetKey) return json({ error: 'assetKey zorunlu' }, 400);

  try {
    await deleteMediaAsset(assetKey, auditCtx(request, locals));

    return json({ success: true, assetKey });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'media delete failed',
      },
      500,
    );
  }
};
