// API: Historical site create (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { insert } from '../../../lib/postgres';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
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
      return redirect('/admin/historical-sites/add?error=missing_fields');
    }

    const slug = name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    await insert('historical_sites', {
      name,
      slug,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return redirect('/admin/historical-sites?success=created');
  } catch (err) {
    console.error('Historical site create error:', err);
    return redirect('/admin/historical-sites/add?error=server_error');
  }
};
