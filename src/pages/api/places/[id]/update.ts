// API: Place update (PostgreSQL)
import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../../lib/postgres';
import { deleteCachePattern } from '../../../../lib/cache';
import { saveFile } from '../../../../lib/file-storage';
import { evaluatePlaceQuality, normalizePlaceImages, parseGalleryImageUrls } from '../../../../lib/place-quality';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  try {
    const { id } = params;

    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Yetkisiz işlem' }),
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
    const providerImageUrl = formData.get('provider_image_url')?.toString().trim();
    const galleryFiles = formData.getAll('gallery').filter((item) => item instanceof File && item.size > 0) as File[];
    const galleryImageUrls = parseGalleryImageUrls(formData.get('gallery_images_urls'));
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

    for (const galleryFile of galleryFiles) {
      if (galleryFile.size > MAX_IMAGE_SIZE) {
        return redirect(`/admin/places/edit/${id}?error=image_too_large`);
      }
      if (!ALLOWED_IMAGE_TYPES.has(galleryFile.type)) {
        return redirect(`/admin/places/edit/${id}?error=invalid_image_type`);
      }
    }

    const existingPlace = await queryOne<{ image_url?: string | null; images?: unknown; slug?: string }>(
      'SELECT image_url, images, slug FROM places WHERE id = $1',
      [id],
    );
    const existingImages = normalizePlaceImages(existingPlace?.images, existingPlace?.image_url || null);

    const uploadedGalleryPaths: string[] = [];
    for (let index = 0; index < galleryFiles.length; index += 1) {
      const galleryFile = galleryFiles[index];
      const savedImage = await saveFile(
        galleryFile,
        'places',
        `${existingPlace?.slug || String(id || 'place')}-gallery-${Date.now()}-${index + 1}`,
      );
      uploadedGalleryPaths.push(savedImage.filePath);
    }

    const normalizedImages = normalizePlaceImages(
      [
        ...existingImages,
        ...uploadedGalleryPaths,
        ...galleryImageUrls,
      ],
      providerImageUrl || existingPlace?.image_url || null,
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
      imageUrl: normalizedImages[0] || null,
      images: normalizedImages,
      status,
    });

    if (status === 'active' && !quality.isPublishable) {
      return redirect(
        `/admin/places/edit/${id}?error=quality_threshold&missing=${encodeURIComponent(
          quality.missingFields.join(','),
        )}`,
      );
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
      image_url: normalizedImages[0] || null,
      images: normalizedImages,
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
