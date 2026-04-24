// API: Event create (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { createAdminEvent } from '../../../lib/admin/events-admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/events-create-unauthorized',
        instance: '/api/events/create',
      });
    }

    const formData = await request.formData();
    
    const title = formData.get('title')?.toString();
    const description = formData.get('description')?.toString();
    const location = formData.get('location')?.toString();
    const startDate = formData.get('start_date')?.toString();
    const endDate = formData.get('end_date')?.toString();
    const category = formData.get('category')?.toString();
    const image = formData.get('image')?.toString();
    const isFeatured = formData.get('is_featured')?.toString();
    const status = formData.get('status')?.toString() || 'draft';

    if (!title || !description || !location || !startDate || !category) {
      return redirect('/admin/events/add?error=missing_fields');
    }

    await createAdminEvent({
      title,
      description,
      location,
      startDate,
      endDate: endDate || null,
      category,
      image: image || null,
      isFeatured: isFeatured || null,
      status,
      userId: locals.user?.id || null,
    });

    return redirect('/admin/events?success=created');
  } catch (err) {
    logger.error('Event create error:', err);
    return redirect('/admin/events/add?error=server_error');
  }
};
