/**
 * Admin Blog Categories API
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getCategories, createCategory } from '../../../../lib/blog/db';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-categories-unauthorized',
        instance: '/api/admin/blog/categories',
      });
    }

    const categories = await getCategories();
    
    return apiResponse({ categories }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Kategori Listesi Alınamadı',
      detail: safeErrorDetail(error, 'Kategoriler alınamadı'),
      type: '/problems/admin-blog-categories-get-failed',
      instance: '/api/admin/blog/categories',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-categories-unauthorized',
        instance: '/api/admin/blog/categories',
      });
    }

    const body = await request.json();
    
    if (!body.slug || !body.name) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Slug ve isim zorunludur',
        type: '/problems/admin-blog-categories-validation',
        instance: '/api/admin/blog/categories',
      });
    }

    if (typeof body.name !== 'string' || body.name.length > 200) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'İsim 200 karakterden uzun olamaz', type: '/problems/admin-blog-categories-validation', instance: '/api/admin/blog/categories' });
    if (typeof body.slug !== 'string' || body.slug.length > 100) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Slug 100 karakterden uzun olamaz', type: '/problems/admin-blog-categories-validation', instance: '/api/admin/blog/categories' });
    if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 500)) {
      return problemJson({
        status: 422,
        title: 'Çok Uzun',
        detail: 'Açıklama 500 karakteri aşamaz',
        type: '/problems/admin-blog-categories-validation',
        instance: '/api/admin/blog/categories',
      });
    }
    if (body.color !== undefined && body.color !== null && (typeof body.color !== 'string' || body.color.length > 50)) {
      return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'color 50 karakterden uzun olamaz', type: '/problems/admin-blog-categories-validation', instance: '/api/admin/blog/categories' });
    }
    if (body.icon !== undefined && body.icon !== null && (typeof body.icon !== 'string' || body.icon.length > 100)) {
      return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'icon 100 karakterden uzun olamaz', type: '/problems/admin-blog-categories-validation', instance: '/api/admin/blog/categories' });
    }
    const sortOrderRaw = Number(body.sort_order ?? 0);
    const sortOrder = Number.isFinite(sortOrderRaw) ? Math.floor(sortOrderRaw) : 0;

    const category = await createCategory({
      slug: body.slug,
      name: body.name,
      description: body.description,
      color: body.color,
      icon: body.icon,
      parent_id: body.parent_id,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
    });

    return apiResponse({ success: true, category }, HttpStatus.CREATED);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Kategori Oluşturulamadı',
      detail: safeErrorDetail(error, 'Kategori oluşturulamadı'),
      type: '/problems/admin-blog-categories-create-failed',
      instance: '/api/admin/blog/categories',
    });
  }
};
