/**
 * Admin Blog Categories API
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getCategories, createCategory } from '../../../../lib/blog/db';
import { problemJson } from '../../../../lib/api';

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
    
    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Kategori Listesi Alınamadı',
      detail: error instanceof Error ? error.message : 'Kategoriler alınamadı',
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

    const category = await createCategory({
      slug: body.slug,
      name: body.name,
      description: body.description,
      color: body.color,
      icon: body.icon,
      parent_id: body.parent_id,
      sort_order: body.sort_order || 0,
      is_active: body.is_active !== false,
    });

    return new Response(JSON.stringify({ success: true, category }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Kategori Oluşturulamadı',
      detail: error instanceof Error ? error.message : 'Kategori oluşturulamadı',
      type: '/problems/admin-blog-categories-create-failed',
      instance: '/api/admin/blog/categories',
    });
  }
};
