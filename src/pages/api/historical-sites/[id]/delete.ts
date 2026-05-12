// API: Historical site delete (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { apiResponse, problemJson, HttpStatus } from '../../../../lib/api';
import { deleteAdminHistoricalSite } from '../../../../lib/admin/historical-sites-admin';
import { invalidateHistoricalSite } from '../../../../lib/cache/invalidation';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/historical-sites-delete-unauthorized',
        instance: `/api/historical-sites/${id}/delete`,
      });
    }

    await deleteAdminHistoricalSite(id || '');

    // Cache invalidation: tarihi yer silme list + detail cache'lerini etkiler
    await invalidateHistoricalSite(id || null);

    return apiResponse({ success: true }, HttpStatus.OK);
  } catch (err) {
    return problemJson({
      status: 500,
      title: 'Tarihi Yer Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/historical-sites-delete-failed',
      instance: `/api/historical-sites/${params.id}/delete`,
    });
  }
};
