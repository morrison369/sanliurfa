import type { APIRoute } from 'astro';
import { getSitePlatformSummary } from '../../../../lib/site-platform';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/platform',
    });
  }

  try {
    const summary = await getSitePlatformSummary();
    return apiResponse({ success: true, ...summary }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Platform Özeti Alınamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-platform-read-failed',
      instance: '/api/admin/site/platform',
    });
  }
};
