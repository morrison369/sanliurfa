import type { APIRoute } from 'astro';
import { getAdSenseAdminSummary } from '../../../../lib/admin/adsense-admin';
import { apiResponse, problemJson, safeErrorDetail } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-adsense-unauthorized',
      instance: '/api/admin/adsense/summary',
    });
  }

  try {
    const summary = await getAdSenseAdminSummary();
    return apiResponse(
      {
        success: true,
        generatedAt: new Date().toISOString(),
        summary,
      },
      200,
      request.headers.get('x-request-id') || undefined,
      { 'Cache-Control': 'no-store' },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'AdSense özeti üretilemedi',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-adsense-summary-failed',
      instance: '/api/admin/adsense/summary',
    });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-adsense-unauthorized',
      instance: '/api/admin/adsense/summary',
    });
  }

  try {
    const summary = await getAdSenseAdminSummary({ refreshSmoke: true });
    return apiResponse(
      {
        success: true,
        generatedAt: new Date().toISOString(),
        summary,
      },
      200,
      request.headers.get('x-request-id') || undefined,
      { 'Cache-Control': 'no-store' },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'AdSense smoke yenilenemedi',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-adsense-refresh-failed',
      instance: '/api/admin/adsense/summary',
    });
  }
};
