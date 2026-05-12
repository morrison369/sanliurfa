/**
 * GET /api/admin/site?model=districts&limit=20
 * Generic model query endpoint for admin components (e.g. PharmacyManager)
 */
import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail, safeIntParam } from '../../../lib/api';

const ALLOWED_MODELS: Record<string, string> = {
  districts: 'SELECT id, name, slug FROM districts ORDER BY name',
  categories: 'SELECT id, name, slug, icon FROM categories WHERE is_active = true ORDER BY sort_order, name',
  neighborhoods: 'SELECT id, name, slug, district_id FROM neighborhoods ORDER BY name',
};

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site',
    });
  }

  const model = url.searchParams.get('model') || '';
  const limit = safeIntParam(url.searchParams.get('limit'), 100, 1, 200);

  const sql = ALLOWED_MODELS[model];
  if (!sql) {
    return problemJson({
      status: 400,
      title: 'Geçersiz Model',
      detail: `Model "${model}" desteklenmiyor. Geçerli modeller: ${Object.keys(ALLOWED_MODELS).join(', ')}`,
      type: '/problems/admin-site-invalid-model',
      instance: '/api/admin/site',
    });
  }

  try {
    const result = await query(`${sql} LIMIT $1`, [limit]);
    return apiResponse({ success: true, data: result.rows, count: result.rows.length }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Veri Alınamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-site-query-failed',
      instance: '/api/admin/site',
    });
  }
};
