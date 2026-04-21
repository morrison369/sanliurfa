// API: Place update (PostgreSQL)
import type { APIRoute } from 'astro';
import { update } from '../../../../lib/postgres';
import { deleteCachePattern } from '../../../../lib/cache';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    
    const name = formData.get('name')?.toString();
    const category = formData.get('category')?.toString();
    const description = formData.get('description')?.toString();
    const shortDescription = formData.get('short_description')?.toString() || null;
    const address = formData.get('address')?.toString();
    const phone = formData.get('phone')?.toString();
    const email = formData.get('email')?.toString();
    const website = formData.get('website')?.toString();
    const priceRange = parseInt(formData.get('price_range')?.toString() || '2');
    const statusValue = formData.get('status')?.toString() || 'active';
    const status = ['active', 'pending', 'inactive'].includes(statusValue) ? statusValue : 'pending';
    const latitude = formData.get('latitude')?.toString();
    const longitude = formData.get('longitude')?.toString();
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

    await update('places', id, {
      name,
      category,
      description,
      short_description: shortDescription,
      address,
      phone,
      email,
      website,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      price_range: priceRange,
      status,
      is_featured: isFeatured,
      is_verified: isVerified,
      amenities,
      tags,
      opening_hours: openingHours,
      updated_at: new Date().toISOString(),
    });

    await deleteCachePattern('places:list*');

    return redirect('/admin/places?success=place_updated');
  } catch (err) {
    return redirect(`/admin/places/edit/${params.id}?error=server_error`);
  }
};
