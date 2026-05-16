import type { APIRoute } from 'astro';
import { apiResponse, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { parseClassifiedImagePaths, saveClassifiedImagesFromForm } from '../../../lib/classified-images';
import {
  archiveUserClassified,
  incrementClassifiedContact,
  touchUserClassifiedForReview,
  updateUserClassified,
} from '../../../lib/classifieds';

function wantsJson(request: Request) {
  return request.headers.get('accept')?.includes('application/json');
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user?.id) {
    return apiResponse({ error: 'İlan yönetimi için giriş yapılmalı.' }, HttpStatus.UNAUTHORIZED);
  }

  const id = String(params.id || '').trim();
  if (!id) return apiResponse({ error: 'İlan id zorunlu.' }, HttpStatus.BAD_REQUEST);

  try {
    const form = await request.formData().catch(() => null);
    const action = String(form?.get('action') || new URL(request.url).searchParams.get('action') || '').trim();

    if (action === 'archive') {
      const item = await archiveUserClassified(locals.user.id, id);
      if (wantsJson(request)) return apiResponse({ success: true, item });
      return Response.redirect(new URL('/profil/ilanlar?durum=arsivlendi', request.url), 303);
    }

    if (action === 'review') {
      const item = await touchUserClassifiedForReview(locals.user.id, id);
      if (wantsJson(request)) return apiResponse({ success: true, item });
      return Response.redirect(new URL('/profil/ilanlar?durum=incelemede', request.url), 303);
    }

    if (action === 'contact') {
      await incrementClassifiedContact(id, locals.user.id);
      return apiResponse({ success: true });
    }

    if (action === 'update') {
      if (!form) return apiResponse({ error: 'Form verisi zorunlu.' }, HttpStatus.BAD_REQUEST);
      const uploadedImages = await saveClassifiedImagesFromForm(form);
      if (uploadedImages instanceof Response) return uploadedImages;
      const images = [...parseClassifiedImagePaths(form), ...uploadedImages];
      const item = await updateUserClassified(locals.user.id, id, {
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
      if (wantsJson(request)) return apiResponse({ success: true, item });
      return Response.redirect(new URL('/profil/ilanlar?durum=guncellendi', request.url), 303);
    }

    return apiResponse({ error: 'Geçersiz işlem.' }, HttpStatus.BAD_REQUEST);
  } catch (error) {
    const message = safeErrorDetail(error, 'İlan güncellenemedi');
    if (wantsJson(request)) return apiResponse({ success: false, error: message }, HttpStatus.BAD_REQUEST);
    return new Response(
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>İlan güncellenemedi</title></head><body><p>${message}</p><p><a href="/profil/ilanlar">İlanlarıma dön</a></p></body></html>`,
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
};

export const POST = PATCH;
