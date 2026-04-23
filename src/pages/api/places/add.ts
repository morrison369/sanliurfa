import type { APIRoute } from 'astro';
import { insert, queryOne } from '../../../lib/postgres';
import { deleteCachePattern } from '../../../lib/cache';
import { saveFile } from '../../../lib/file-storage';
import { evaluatePlaceQuality, normalizePlaceImages, parseGalleryImageUrls } from '../../../lib/place-quality';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
    const providerImageUrl = formData.get('provider_image_url')?.toString().trim();
    const coverImage = formData.get('cover_image');
    const galleryFiles = formData.getAll('gallery').filter((item) => item instanceof File && item.size > 0) as File[];
    const galleryImageUrls = parseGalleryImageUrls(formData.get('gallery_images_urls'));
    const amenities = formData.getAll('amenities').map(String).filter(Boolean);
    const tags = (formData.get('tags')?.toString() || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const shortDescription = formData.get('short_description')?.toString().trim() || null;
    const phone = formData.get('phone')?.toString().trim() || null;

    const openingHours: Record<string, string> = {};
    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
      const hours = formData.get(`opening_hours_${day}`)?.toString().trim();
      if (hours) {
        openingHours[day] = hours;
      }
    }

    const slug = await createUniqueSlug(name);
    const imageFile = coverImage instanceof File && coverImage.size > 0 ? coverImage : null;

    if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
      return redirect('/admin/places/add?error=image_too_large');
    }

    if (imageFile && !ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return redirect('/admin/places/add?error=invalid_image_type');
    }
    for (const galleryFile of galleryFiles) {
      if (galleryFile.size > MAX_IMAGE_SIZE) {
        return redirect('/admin/places/add?error=image_too_large');
      }
      if (!ALLOWED_IMAGE_TYPES.has(galleryFile.type)) {
        return redirect('/admin/places/add?error=invalid_image_type');
      }
    }

    let imagePath = providerImageUrl || null;
    if (imageFile) {
      const savedImage = await saveFile(imageFile, 'places', slug);
      imagePath = savedImage.filePath;
    }

    const uploadedGalleryPaths: string[] = [];
    for (let index = 0; index < galleryFiles.length; index += 1) {
      const galleryFile = galleryFiles[index];
      const savedImage = await saveFile(galleryFile, 'places', `${slug}-gallery-${index + 1}`);
      uploadedGalleryPaths.push(savedImage.filePath);
    }

    const normalizedImages = normalizePlaceImages(
      [...uploadedGalleryPaths, ...galleryImageUrls],
      imagePath,
    );

    const quality = evaluatePlaceQuality({
      name,
      category,
      description,
      shortDescription,
      address,
      phone,
      latitude,
      longitude,
      imageUrl: normalizedImages[0] || imagePath,
      images: normalizedImages,
      status,
    });

    if (status === 'active' && !quality.isPublishable) {
      return redirect(
        `/admin/places/add?error=quality_threshold&missing=${encodeURIComponent(
          quality.missingFields.join(','),
        )}`,
      );
    }

    await insert('places', {
      slug,
      name,
      category,
      description,
      short_description: shortDescription,
      address,
      phone,
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
      image_url: normalizedImages[0] || null,
      images: normalizedImages,
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
