import type { APIRoute } from 'astro';
import { problemJson } from '../../../../lib/api';
import {
  issueExportToken,
  listExportTokens,
  revokeExportToken,
  revokeExportTokenById,
  type ExportResourceKey,
} from '../../../../lib/admin/export-tokens';
import { auditSiteChange } from '../../../../lib/site-content';

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

const ALLOWED_RESOURCES: ExportResourceKey[] = [
  'admin.social.events.export',
  'admin.places.lifecycle.export',
  'admin.reports.social-lifecycle',
];

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-export-token-unauthorized',
      instance: '/api/admin/exports/token',
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return problemJson({
      status: 400,
      title: 'Invalid JSON',
      detail: 'Geçerli JSON bekleniyor',
      type: '/problems/admin-export-token-invalid-json',
      instance: '/api/admin/exports/token',
    });
  }

  const resourceKey = String(body?.resourceKey || '').trim() as ExportResourceKey;
  if (!ALLOWED_RESOURCES.includes(resourceKey)) {
    return problemJson({
      status: 400,
      title: 'Geçersiz Resource',
      detail: 'resourceKey desteklenmiyor',
      type: '/problems/admin-export-token-resource-invalid',
      instance: '/api/admin/exports/token',
    });
  }

  const payload = typeof body?.payload === 'object' && body?.payload ? body.payload : {};
  const ttlSeconds = Number(body?.ttlSeconds || 300);
  const maxDownloads = Number(body?.maxDownloads || 1);
  const createdBy = locals?.user?.id ? String(locals.user.id) : null;
  const requestIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (locals as any)?.clientAddress ||
    null;
  const userAgent = request.headers.get('user-agent') || null;
  const bindIp = body?.bindIp !== false;
  const bindUserAgent = body?.bindUserAgent !== false;
  const replayProtection = body?.replayProtection !== false;
  const allowedIpCidrs = Array.isArray(body?.allowedIpCidrs)
    ? body.allowedIpCidrs.map((x: unknown) => String(x || '').trim()).filter(Boolean)
    : [];
  const allowedCountries = Array.isArray(body?.allowedCountries)
    ? body.allowedCountries.map((x: unknown) => String(x || '').trim().toUpperCase()).filter(Boolean)
    : [];

  const issued = await issueExportToken({
    resourceKey,
    payload,
    ttlSeconds,
    maxDownloads,
    createdBy,
    boundIp: bindIp ? requestIp : null,
    boundUserAgent: bindUserAgent ? userAgent : null,
    allowedIpCidrs,
    allowedCountries,
    replayProtection,
  });

  await auditSiteChange(
    'admin.export.token',
    'publish',
    {
      userId: createdBy,
      actorEmail: locals?.user?.email ? String(locals.user.email) : null,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    },
    {
      resourceKey,
      ttlSeconds: issued.ttlSeconds,
      maxDownloads: issued.maxDownloads,
      bindIp,
      bindUserAgent,
      replayProtection,
      allowedIpCidrs,
      allowedCountries,
      action: 'export_token_issued',
    },
  );

  return new Response(
    JSON.stringify({
      success: true,
      resourceKey,
      token: issued.token,
      expiresAt: issued.expiresAt,
      ttlSeconds: issued.ttlSeconds,
      maxDownloads: issued.maxDownloads,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
};

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-export-token-unauthorized',
      instance: '/api/admin/exports/token',
    });
  }

  const resourceKey = String(url.searchParams.get('resourceKey') || '').trim() as ExportResourceKey;
  const activeOnly = url.searchParams.get('activeOnly') === '1';
  const limit = Number(url.searchParams.get('limit') || 50);
  const tokens = await listExportTokens({
    resourceKey: ALLOWED_RESOURCES.includes(resourceKey) ? resourceKey : '',
    activeOnly,
    limit,
  });

  return new Response(
    JSON.stringify({ success: true, tokens }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-export-token-unauthorized',
      instance: '/api/admin/exports/token',
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return problemJson({
      status: 400,
      title: 'Invalid JSON',
      detail: 'Geçerli JSON bekleniyor',
      type: '/problems/admin-export-token-invalid-json',
      instance: '/api/admin/exports/token',
    });
  }

  const token = String(body?.token || '').trim();
  const tokenId = String(body?.tokenId || '').trim();
  const reason = String(body?.reason || '').trim() || null;
  if (!token && !tokenId) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'token veya tokenId zorunlu',
      type: '/problems/admin-export-token-token-required',
      instance: '/api/admin/exports/token',
    });
  }

  const revoked = tokenId
    ? await revokeExportTokenById({
        tokenId,
        revokedBy: locals?.user?.id ? String(locals.user.id) : null,
        reason,
      })
    : await revokeExportToken({
        token,
        revokedBy: locals?.user?.id ? String(locals.user.id) : null,
        reason,
      });
  if (!revoked.ok) {
    return problemJson({
      status: 404,
      title: 'Token Bulunamadı',
      detail: revoked.reason || 'token_not_found',
      type: '/problems/admin-export-token-not-found',
      instance: '/api/admin/exports/token',
    });
  }

  await auditSiteChange(
    'admin.export.token',
    'rollback',
    {
      userId: locals?.user?.id ? String(locals.user.id) : null,
      actorEmail: locals?.user?.email ? String(locals.user.email) : null,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    },
    {
      action: 'export_token_revoked',
      reason,
    },
  );

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};
