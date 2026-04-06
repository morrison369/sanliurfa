// API: Event update (Admin only) (PostgreSQL)
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
      return redirect(`/admin/events/edit/${id}?error=missing_fields`);
    }

    await update('events', id, {
      title,
      description,
      location,
      start_date: startDate,
      end_date: endDate || null,
      category,
      image_url: image,
      is_featured: isFeatured,
      status,
      updated_at: new Date().toISOString(),
    });

    return redirect('/admin/events?success=updated');
  } catch (err) {
    console.error('Event update error:', err);
    return redirect(`/admin/events/edit/${params.id}?error=server_error`);
  }
};
