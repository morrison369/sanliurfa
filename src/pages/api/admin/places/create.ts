import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async (context) => {
  if (!context.locals.isAdmin) {
    return context.redirect('/giris?redirect=/admin');
  }

  try {
    const formData = await context.request.formData();

    const name = formData.get('name')?.toString().trim() || '';
    const categoryId = formData.get('category_id')?.toString() || null;
    const districtId = formData.get('district_id')?.toString() || null;
    const description = formData.get('description')?.toString().trim() || '';
    const shortDescription = formData.get('short_description')?.toString().trim() || null;
    const address = formData.get('address')?.toString().trim() || '';
    const phone = formData.get('phone')?.toString().trim() || null;
    const email = formData.get('email')?.toString().trim() || null;
    const website = formData.get('website')?.toString().trim() || null;
    const priceRange = formData.get('price_range')?.toString() || null;
    const status = formData.get('status')?.toString() || 'pending';
    const isFeatured = formData.get('is_featured') === 'on';
    const isVerified = formData.get('is_verified') === 'on';
    const latitude = formData.get('latitude')?.toString() || null;
    const longitude = formData.get('longitude')?.toString() || null;

    const tags = formData.get('tags')?.toString()
      .split(',').map(t => t.trim()).filter(Boolean) || [];

    if (!name || !address) {
      return context.redirect('/admin/places/add?error=missing_fields');
    }

    // Slug oluştur
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);
    const slugCheck = await query('SELECT id FROM places WHERE slug = $1', [baseSlug]);
    const slug = slugCheck.rows.length > 0
      ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
      : baseSlug;

    const result = await query(
      `INSERT INTO places (
        name, slug, category_id, district_id, description, short_description,
        address, phone, email, website, price_range, status,
        is_featured, is_verified, latitude, longitude, tags, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW())
      RETURNING id, slug`,
      [
        name, slug,
        categoryId ? parseInt(categoryId) : null,
        districtId ? parseInt(districtId) : null,
        description || null, shortDescription,
        address, phone, email, website, priceRange,
        status, isFeatured, isVerified,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        tags.length ? tags : null,
      ]
    );

    const newPlace = result.rows[0];
    return context.redirect(`/admin/places/edit/${newPlace.id}?success=created`);

  } catch (err) {
    logger.error('Admin create place error:', err);
    return context.redirect('/admin/places/add?error=server_error');
  }
};
