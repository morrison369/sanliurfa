// API: Event create (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { createAdminEvent } from '../../../lib/admin/events-admin';
import { invalidateEvent } from '../../../lib/cache/invalidation';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    if (locals.user?.role !== 'admin') {
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

    const VALID_EVENT_STATUSES = new Set(['draft', 'published', 'cancelled']);
    if (!VALID_EVENT_STATUSES.has(status)) {
      return redirect('/admin/events/add?error=invalid_status');
    }

    if (title.length > 200) return redirect('/admin/events/add?error=title_too_long');
    if (description.length > 5000) return redirect('/admin/events/add?error=description_too_long');
    if (location.length > 500) return redirect('/admin/events/add?error=location_too_long');

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

    // Cache invalidation: yeni etkinlik events:* + homepage featured cache'lerini etkiler
    await invalidateEvent(null);

    return redirect('/admin/events?success=created');
  } catch (err) {
    logger.error('Event create error:', err);
    return redirect('/admin/events/add?error=server_error');
  }
};
