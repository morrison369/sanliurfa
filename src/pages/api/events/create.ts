// API: Event create (Admin only) (PostgreSQL)
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
    
    const title = formData.get('title')?.toString();
    const description = formData.get('description')?.toString();
    const location = formData.get('location')?.toString();
    const startDate = formData.get('start_date')?.toString();
    const endDate = formData.get('end_date')?.toString();
    const category = formData.get('category')?.toString();
    const image = formData.get('image')?.toString();
    const isFeatured = formData.get('is_featured') === 'on';
    const status = formData.get('status')?.toString() || 'draft';

    if (!title || !description || !location || !startDate || !category) {
      return redirect('/admin/events/add?error=missing_fields');
    }

    const slug = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    await insert('events', {
      title,
      slug,
      description,
      location,
      start_date: startDate,
      end_date: endDate || null,
      category,
      image_url: image,
      is_featured: isFeatured,
      status,
      created_by: locals.user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return redirect('/admin/events?success=created');
  } catch (err) {
    console.error('Event create error:', err);
    return redirect('/admin/events/add?error=server_error');
  }
};
