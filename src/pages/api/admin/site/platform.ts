import type { APIRoute } from 'astro';
import { getSitePlatformSummary } from '../../../../lib/site-platform';
import { problemJson } from '../../../../lib/api';

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
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
    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Platform Özeti Alınamadı',
      detail: error instanceof Error ? error.message : 'unknown',
      type: '/problems/admin-site-platform-read-failed',
      instance: '/api/admin/site/platform',
    });
  }
};
