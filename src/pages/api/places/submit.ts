// API: Public place submission (PostgreSQL)
import type { APIRoute } from 'astro';
import { insert } from '../../../lib/postgres';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    
    // Extract form data
    const name = formData.get('name')?.toString();
    const category = formData.get('category')?.toString();
    const address = formData.get('address')?.toString();
    const phone = formData.get('phone')?.toString();
    const description = formData.get('description')?.toString();
    const openingHours = formData.get('opening_hours')?.toString();
    const website = formData.get('website')?.toString();
    const submitterName = formData.get('submitter_name')?.toString();
    const submitterEmail = formData.get('submitter_email')?.toString();

    // Validation
    if (!name || !category || !address || !phone || !description || !submitterName || !submitterEmail) {
      return redirect('/places/ekle?error=missing_fields');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submitterEmail)) {
      return redirect('/places/ekle?error=invalid_email');
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    // Insert place with pending status
    await insert('places', {
      slug,
      name,
      category,
      address,
      phone,
      description,
      opening_hours: openingHours ? { general: openingHours } : null,
      website,
      status: 'pending',
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // TODO: Send notification email to admin
    // TODO: Handle image upload

    return redirect('/places/ekle?success=true');
  } catch (err) {
    console.error('Place submission error:', err);
    return redirect('/places/ekle?error=server_error');
  }
};
