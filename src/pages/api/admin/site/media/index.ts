import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail, safeIntParam } from '../../../../../lib/api';
import {
  deleteMediaAsset,
  listMediaAssets,
  upsertMediaAsset,
} from '../../../../../lib/site-platform';

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

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const bucket = String(url.searchParams.get('bucket') || '').trim();
  const limit = safeIntParam(url.searchParams.get('limit'), 24, 1, 100);
  const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

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
        error: safeErrorDetail(error, 'media list failed'),
      },
      500,
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
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
  if (assetKey.length > 200) return json({ error: 'assetKey 200 karakterden uzun olamaz' }, 400);
  if (url.length > 500) return json({ error: 'url 500 karakterden uzun olamaz' }, 400);
  if (alt !== undefined && alt !== null && (typeof alt !== 'string' || alt.length > 500)) return json({ error: 'alt 500 karakterden uzun olamaz' }, 400);
  if (body.mimeType !== undefined && body.mimeType !== null && (typeof body.mimeType !== 'string' || body.mimeType.length > 100)) return json({ error: 'mimeType 100 karakterden uzun olamaz' }, 400);
  if (JSON.stringify(metadata).length > 5000) return json({ error: 'metadata 5000 karakteri aşamaz' }, 400);

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
        error: safeErrorDetail(error, 'media update failed'),
      },
      500,
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
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
        error: safeErrorDetail(error, 'media delete failed'),
      },
      500,
    );
  }
};
