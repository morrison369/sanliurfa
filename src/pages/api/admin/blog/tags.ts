/**
 * Admin Blog Tags API
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getTags, createTag } from '../../../../lib/blog/db';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-tags-unauthorized',
        instance: '/api/admin/blog/tags',
      });
    }

    const tags = await getTags();
    
    return apiResponse({ tags }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Etiketler Alınamadı',
      detail: safeErrorDetail(error, 'Etiketler alınamadı'),
      type: '/problems/admin-blog-tags-get-failed',
      instance: '/api/admin/blog/tags',
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
        type: '/problems/admin-blog-tags-unauthorized',
        instance: '/api/admin/blog/tags',
      });
    }

    const body = await request.json();
    
    if (!body.slug || !body.name) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Slug ve isim zorunludur',
        type: '/problems/admin-blog-tags-validation',
        instance: '/api/admin/blog/tags',
      });
    }

    if (typeof body.name !== 'string' || body.name.length > 200) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'İsim 200 karakterden uzun olamaz', type: '/problems/admin-blog-tags-validation', instance: '/api/admin/blog/tags' });
    if (typeof body.slug !== 'string' || body.slug.length > 100) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Slug 100 karakterden uzun olamaz', type: '/problems/admin-blog-tags-validation', instance: '/api/admin/blog/tags' });
    if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 500)) {
      return problemJson({
        status: 422,
        title: 'Çok Uzun',
        detail: 'Açıklama 500 karakteri aşamaz',
        type: '/problems/admin-blog-tags-validation',
        instance: '/api/admin/blog/tags',
      });
    }

    if (body.color !== undefined && body.color !== null && (typeof body.color !== 'string' || body.color.length > 50)) {
      return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Renk 50 karakterden uzun olamaz', type: '/problems/admin-blog-tags-validation', instance: '/api/admin/blog/tags' });
    }

    const tag = await createTag({
      slug: body.slug,
      name: body.name,
      description: body.description,
      color: body.color,
    });

    return apiResponse({ success: true, tag }, HttpStatus.CREATED);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Etiket Oluşturulamadı',
      detail: safeErrorDetail(error, 'Etiket oluşturulamadı'),
      type: '/problems/admin-blog-tags-create-failed',
      instance: '/api/admin/blog/tags',
    });
  }
};
