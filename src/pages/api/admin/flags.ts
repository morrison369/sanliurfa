import type { APIRoute } from 'astro';
import { listFlags, updateFlag, deleteFlag, createFlag, getFlagStats } from '../../../lib/feature-flags/feature-flags';
import { problemJson } from '../../../lib/api';

// GET: List all flags (admin only)
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.isAdmin) {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  const [flags, stats] = await Promise.all([listFlags(), getFlagStats()]);
  return new Response(
    JSON.stringify({ flags, stats }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// POST: Create flag (admin only)
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  try {
    const { key, name, type, value } = await request.json();
    if (!key || !name || !type) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'key, name, type zorunludur',
        type: '/problems/admin-flags-validation',
        instance: '/api/admin/flags',
      });
    }
    const flag = await createFlag(key, name, type, value ?? false);
    return new Response(JSON.stringify({ success: true, flag }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Invalid request',
      type: '/problems/admin-flags-invalid-request',
      instance: '/api/admin/flags',
    });
  }
};

// PUT: Update flag (admin only)
export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  try {
    const { key, ...updates } = await request.json();
    const updated = await updateFlag(key, updates);
    if (!updated) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Flag not found',
        type: '/problems/admin-flags-not-found',
        instance: '/api/admin/flags',
      });
    }
    return new Response(JSON.stringify({ success: true, flag: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Invalid request',
      type: '/problems/admin-flags-invalid-request',
      instance: '/api/admin/flags',
    });
  }
};

// DELETE: Delete flag (admin only)
export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return problemJson({
      status: 403,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-flags-unauthorized',
      instance: '/api/admin/flags',
    });
  }
  try {
    const { key } = await request.json();
    const deleted = await deleteFlag(key);
    return new Response(JSON.stringify({ success: deleted }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Invalid request',
      type: '/problems/admin-flags-invalid-request',
      instance: '/api/admin/flags',
    });
  }
};
