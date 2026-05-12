// API: Historical site create (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { createAdminHistoricalSite } from '../../../lib/admin/historical-sites-admin';
import { invalidateHistoricalSite } from '../../../lib/cache/invalidation';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/historical-sites-create-unauthorized',
        instance: '/api/historical-sites/create',
      });
    }

    const formData = await request.formData();
    
    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString();
    const shortDescription = formData.get('short_description')?.toString();
    const location = formData.get('location')?.toString();
    const period = formData.get('period')?.toString();
    const entryFee = formData.get('entry_fee')?.toString();
    const openingHours = formData.get('opening_hours')?.toString();
    const latitude = formData.get('latitude')?.toString();
    const longitude = formData.get('longitude')?.toString();
    const images = formData.get('images')?.toString();
    const isUnesco = formData.get('is_unesco')?.toString();
    const isFeatured = formData.get('is_featured')?.toString();
    const status = formData.get('status')?.toString() || 'draft';

    if (!name || !description || !location) {
      return redirect('/admin/historical-sites/add?error=missing_fields');
    }

    await createAdminHistoricalSite({
      name,
      description,
      shortDescription: shortDescription || null,
      location,
      period: period || null,
      entryFee: entryFee || null,
      openingHours: openingHours || null,
      latitude: latitude || null,
      longitude: longitude || null,
      images: images || null,
      isUnesco: isUnesco || null,
      isFeatured: isFeatured || null,
      status,
    });

    // Cache invalidation: yeni tarihi yer list + homepage featured cache'lerini etkiler
    await invalidateHistoricalSite(null);

    return redirect('/admin/historical-sites?success=created');
  } catch (err) {
    logger.error('Historical site create error:', err);
    return redirect('/admin/historical-sites/add?error=server_error');
  }
};
