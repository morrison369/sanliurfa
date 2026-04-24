// API: Event update (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../../lib/logging';
import { problemJson } from '../../../../lib/api';
import { updateAdminEvent } from '../../../../lib/admin/events-admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/events-update-unauthorized',
        instance: `/api/events/${id}/update`,
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
      return redirect(`/admin/events/edit/${id}?error=missing_fields`);
    }

    await updateAdminEvent(id || '', {
      title,
      description,
      location,
      startDate,
      endDate: endDate || null,
      category,
      image: image || null,
      isFeatured: isFeatured || null,
      status,
    });

    return redirect('/admin/events?success=updated');
  } catch (err) {
    logger.error('Event update error:', err);
    return redirect(`/admin/events/edit/${params.id}?error=server_error`);
  }
};
