import type { APIRoute } from 'astro';
import { insert, queryOne } from '../../../lib/postgres';
import { deleteCachePattern } from '../../../lib/cache';

function slugifyTurkish(value: string): string {
  const map: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'c',
    Ğ: 'g',
    İ: 'i',
    I: 'i',
    Ö: 'o',
    Ş: 's',
    Ü: 'u',
  };

  return value
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (char) => map[char] || char)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createUniqueSlug(name: string): Promise<string> {
  const base = slugifyTurkish(name) || `mekan-${Date.now()}`;
  const existing = await queryOne('SELECT id FROM places WHERE slug = $1', [base]);
  if (!existing) {
    return base;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    if (!locals.isAdmin) {
      return new Response(JSON.stringify({ error: 'Yetkisiz işlem' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const category = formData.get('category')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const address = formData.get('address')?.toString().trim();

    if (!name || !category || !description || !address) {
      return redirect('/admin/places/add?error=missing_fields');
    }

    const priceRange = Number.parseInt(formData.get('price_range')?.toString() || '2', 10);
    const statusValue = formData.get('status')?.toString() || 'pending';
    const status = ['active', 'pending', 'inactive'].includes(statusValue) ? statusValue : 'pending';
    const latitude = formData.get('latitude')?.toString();
    const longitude = formData.get('longitude')?.toString();
    const amenities = formData.getAll('amenities').map(String).filter(Boolean);
    const tags = (formData.get('tags')?.toString() || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const openingHours: Record<string, string> = {};
    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
      const hours = formData.get(`opening_hours_${day}`)?.toString().trim();
      if (hours) {
        openingHours[day] = hours;
      }
    }

    const slug = await createUniqueSlug(name);
    await insert('places', {
      slug,
      name,
      category,
      description,
      short_description: formData.get('short_description')?.toString().trim() || null,
      address,
      phone: formData.get('phone')?.toString().trim() || null,
      email: formData.get('email')?.toString().trim() || null,
      website: formData.get('website')?.toString().trim() || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      price_range: Number.isFinite(priceRange) ? priceRange : 2,
      status,
      is_featured: formData.get('is_featured') === 'on',
      is_verified: formData.get('is_verified') === 'on',
      amenities,
      tags,
      opening_hours: openingHours,
      created_by: locals.user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await deleteCachePattern('places:list*');

    return redirect('/admin/places?success=place_created');
  } catch (error) {
    console.error('Admin place create error:', error);
    return redirect('/admin/places/add?error=server_error');
  }
};
