// API: Place update (PostgreSQL)
import type { APIRoute } from 'astro';
import { update } from '../../../../lib/postgres';
import { problemJson, safeIntParam } from '../../../../lib/api';
import { deleteCachePattern } from '../../../../lib/cache';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  try {
    const { id } = params;
    if (!id) {
      return redirect('/admin?error=missing_place_id');
    }
    
    if (locals.user?.role !== 'admin') {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/places-update-unauthorized',
        instance: `/api/places/${id}/update`,
      });
    }

    const formData = await request.formData();
    
    const name = formData.get('name')?.toString();
    const category = formData.get('category')?.toString();
    const description = formData.get('description')?.toString();
    const address = formData.get('address')?.toString();
    const phone = formData.get('phone')?.toString();
    const email = formData.get('email')?.toString();
    const website = formData.get('website')?.toString();
    const priceRange = safeIntParam(formData.get('price_range')?.toString(), 2, 1, 5);
    const status = formData.get('status')?.toString();
    const isFeatured = formData.get('is_featured') === 'on';
    const isVerified = formData.get('is_verified') === 'on';
    const amenities = formData.getAll('amenities') as string[];
    const tags = formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) || [];

    const openingHours: Record<string, string> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      const hours = formData.get(`opening_hours_${day}`)?.toString();
      if (hours) openingHours[day] = hours;
    }

    if (!name || !category || !description || !address) {
      return redirect(`/admin/places/edit/${id}?error=missing_fields`);
    }

    const VALID_PLACE_STATUSES = new Set(['active', 'draft', 'pending', 'rejected', 'inactive']);
    if (status !== undefined && status !== null && (typeof status !== 'string' || !VALID_PLACE_STATUSES.has(status))) {
      return redirect(`/admin/places/edit/${id}?error=invalid_status`);
    }

    if (name.length > 200) return redirect(`/admin/places/edit/${id}?error=name_too_long`);
    if (description.length > 5000) return redirect(`/admin/places/edit/${id}?error=description_too_long`);
    if (address.length > 500) return redirect(`/admin/places/edit/${id}?error=address_too_long`);
    if (email !== undefined && email !== null && (typeof email !== 'string' || email.length > 254)) return redirect(`/admin/places/edit/${id}?error=email_too_long`);
    if (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.length > 30)) return redirect(`/admin/places/edit/${id}?error=phone_too_long`);
    if (website !== undefined && website !== null && (typeof website !== 'string' || website.length > 500)) return redirect(`/admin/places/edit/${id}?error=website_too_long`);
    if (amenities.length > 50) return redirect(`/admin/places/edit/${id}?error=too_many_amenities`);
    if (tags.length > 50) return redirect(`/admin/places/edit/${id}?error=too_many_tags`);

    await update('places', id, {
      name,
      category,
      description,
      address,
      phone,
      email,
      website,
      price_range: priceRange,
      status,
      is_featured: isFeatured,
      is_verified: isVerified,
      amenities,
      tags,
      opening_hours: openingHours,
      updated_at: new Date().toISOString(),
    });

    await deleteCachePattern('places:*').catch(() => null);

    return redirect('/admin?success=place_updated');
  } catch (err) {
    return redirect(`/admin/places/edit/${params.id}?error=server_error`);
  }
};
