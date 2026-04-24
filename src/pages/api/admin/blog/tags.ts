/**
 * Admin Blog Tags API
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getTags, createTag } from '../../../../lib/blog/db';
import { problemJson } from '../../../../lib/api';

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
    
    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Etiketler Alınamadı',
      detail: error instanceof Error ? error.message : 'Etiketler alınamadı',
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

    const tag = await createTag({
      slug: body.slug,
      name: body.name,
      description: body.description,
      color: body.color,
    });

    return new Response(JSON.stringify({ success: true, tag }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Etiket Oluşturulamadı',
      detail: error instanceof Error ? error.message : 'Etiket oluşturulamadı',
      type: '/problems/admin-blog-tags-create-failed',
      instance: '/api/admin/blog/tags',
    });
  }
};
