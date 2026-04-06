// API: Historical site update (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { update } from '../../../../lib/postgres';

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
    const description = formData.get('description')?.toString();
    const shortDescription = formData.get('short_description')?.toString();
    const location = formData.get('location')?.toString();
    const period = formData.get('period')?.toString();
    const entryFee = formData.get('entry_fee')?.toString();
    const openingHours = formData.get('opening_hours')?.toString();
    const latitude = parseFloat(formData.get('latitude')?.toString() || '0');
    const longitude = parseFloat(formData.get('longitude')?.toString() || '0');
    const images = formData.get('images')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [];
    const isUnesco = formData.get('is_unesco') === 'on';
    const isFeatured = formData.get('is_featured') === 'on';
    const status = formData.get('status')?.toString() || 'draft';

    if (!name || !description || !location) {
      return redirect(`/admin/historical-sites/edit/${id}?error=missing_fields`);
    }

    await update('historical_sites', id, {
      name,
      description,
      short_description: shortDescription,
      location,
      period,
      entry_fee: entryFee,
      opening_hours: openingHours,
      latitude,
      longitude,
      images,
      is_unesco: isUnesco,
      is_featured: isFeatured,
      status,
      updated_at: new Date().toISOString(),
    });

    return redirect('/admin/historical-sites?success=updated');
  } catch (err) {
    console.error('Historical site update error:', err);
    return redirect(`/admin/historical-sites/edit/${params.id}?error=server_error`);
  }
};
