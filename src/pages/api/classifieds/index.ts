import type { APIRoute } from 'astro';
import { parseClassifiedImagePaths, saveClassifiedImagesFromForm } from '../../../lib/classified-images';
import { createClassifiedListing, listClassifieds } from '../../../lib/classifieds';
import { apiResponse, HttpStatus, safeErrorDetail } from '../../../lib/api';

function wantsJson(request: Request) {
  return request.headers.get('accept')?.includes('application/json');
}

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const items = await listClassifieds({
      q: url.searchParams.get('q'),
      categorySlug: url.searchParams.get('kategori'),
      district: url.searchParams.get('ilce'),
      includePendingForUserId: locals.user?.id ?? null,
      limit: Number(url.searchParams.get('limit') || 24),
      offset: Number(url.searchParams.get('offset') || 0),
    });
    return apiResponse({ success: true, items });
  } catch (error) {
    return apiResponse({ success: false, error: safeErrorDetail(error, 'İlanlar okunamadı') }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user?.id) {
    if (wantsJson(request)) return apiResponse({ error: 'Ücretsiz ilan eklemek için giriş yapılmalı.' }, HttpStatus.UNAUTHORIZED);
    return Response.redirect(new URL('/giris?redirect=/ilan-ekle', request.url), 303);
  }

  try {
    const form = await request.formData();
    const uploadedImages = await saveClassifiedImagesFromForm(form);
    if (uploadedImages instanceof Response) return uploadedImages;
    const images = [...parseClassifiedImagePaths(form), ...uploadedImages];

    const listing = await createClassifiedListing(locals.user.id, {
      title: String(form.get('title') || ''),
      categorySlug: String(form.get('categorySlug') || ''),
      description: String(form.get('description') || ''),
      price: String(form.get('price') || ''),
      district: String(form.get('district') || ''),
      neighborhood: String(form.get('neighborhood') || ''),
      address: String(form.get('address') || ''),
      phone: String(form.get('phone') || ''),
      condition: String(form.get('condition') || ''),
      images,
    });

    if (wantsJson(request)) return apiResponse({ success: true, item: listing }, HttpStatus.CREATED);
    return Response.redirect(new URL(`/ilanlar/${listing.slug}?durum=onay-bekliyor`, request.url), 303);
  } catch (error) {
    const message = safeErrorDetail(error, 'İlan kaydedilemedi');
    if (wantsJson(request)) return apiResponse({ success: false, error: message }, HttpStatus.BAD_REQUEST);
    return new Response(
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>İlan kaydedilemedi</title></head><body><p>${message}</p><p><a href="/ilan-ekle">Geri dön</a></p></body></html>`,
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
};
