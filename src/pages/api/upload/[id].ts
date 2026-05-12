import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { unlink } from 'fs/promises';
import { join, resolve as resolvePath, sep as pathSep } from 'path';
import { logger } from '../../../lib/logging';
import { resolveContentImage } from '../../../lib/content-images';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';

function normalizePlacePhotoUrls(photo: { file_path?: string } | null, placeSlug?: string | null) {
  const image_url = resolveContentImage({
    category: 'places',
    slug: placeSlug ?? null,
    explicit: photo?.file_path ?? null,
    placeholder: '/images/placeholder-place.jpg',
  });
  const thumbnail_url = resolveContentImage({
    category: 'places',
    slug: placeSlug ?? null,
    explicit: photo?.file_path ?? null,
    placeholder: '/images/placeholder-place.jpg',
    thumb: true,
  });
  return { image_url, thumbnail_url };
}

// Delete photo
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/upload-unauthorized',
        instance: '/api/upload/{id}',
      });
    }

    const { id } = context.params;
    if (!id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Fotoğraf kimliği eksik',
        type: '/problems/upload-id-required',
        instance: '/api/upload/{id}',
      });
    }

    // Get photo info
    const photoResult = await query(
      `SELECT pp.*, p.slug as place_slug
       FROM place_photos pp
       LEFT JOIN places p ON p.id = pp.place_id
       WHERE pp.id = $1`,
      [id]
    );

    if (photoResult.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Fotoğraf Bulunamadı',
        detail: 'İstenen fotoğraf kaydı bulunamadı',
        type: '/problems/upload-photo-not-found',
        instance: '/api/upload/{id}',
      });
    }

    const photo = photoResult.rows[0];

    // Yetki kontrolü: admin > vendor (sahip olduğu mekan) > diğer (yasak)
    if (auth.user.role === 'admin') {
      // admin tüm fotoğrafları silebilir
    } else if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [photo.place_id, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return problemJson({
          status: 403,
          title: 'Forbidden',
          detail: 'Bu fotoğrafı silme yetkiniz yok',
          type: '/problems/upload-forbidden',
          instance: '/api/upload/{id}',
        });
      }
    } else {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Sadece mekan sahibi veya admin fotoğraf silebilir',
        type: '/problems/upload-forbidden',
        instance: '/api/upload/{id}',
      });
    }

    // Delete record
    await query('DELETE FROM place_photos WHERE id = $1', [id]);

    // Try to delete physical file (don't fail if file doesn't exist).
    // Path traversal koruması: photo.file_path DB'den geliyor — `/uploads/...` ile başlamalı.
    // Eski/poison record'lar için absolute path resolve sonrası `public/uploads/` prefix'i doğrula.
    try {
      const publicUploadsRoot = resolvePath(join(process.cwd(), 'public', 'uploads'));
      const resolvedPath = resolvePath(join(process.cwd(), 'public', photo.file_path));
      if (resolvedPath.startsWith(publicUploadsRoot + pathSep)) {
        await unlink(resolvedPath);
      } else {
        logger.warn('Photo unlink rejected — path outside uploads', { photoId: id, filePath: photo.file_path });
      }
    } catch (e) {
      // File might not exist, ignore
    }

    return apiResponse({
      success: true,
      message: 'Photo deleted'
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Delete photo error:', error);
    return problemJson({
      status: 500,
      title: 'Fotoğraf Silinemedi',
      detail: safeErrorDetail(error, 'server_error'),
      type: '/problems/upload-delete-failed',
      instance: '/api/upload/{id}',
    });
  }
};

// Update photo (caption, primary status)
export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/upload-unauthorized',
        instance: '/api/upload/{id}',
      });
    }

    const { id } = context.params;
    if (!id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Fotoğraf kimliği eksik',
        type: '/problems/upload-id-required',
        instance: '/api/upload/{id}',
      });
    }
    const body = await context.request.json();

    // Get photo info
    const photoResult = await query(
      `SELECT pp.*, p.slug as place_slug
       FROM place_photos pp
       LEFT JOIN places p ON p.id = pp.place_id
       WHERE pp.id = $1`,
      [id]
    );

    if (photoResult.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Fotoğraf Bulunamadı',
        detail: 'İstenen fotoğraf kaydı bulunamadı',
        type: '/problems/upload-photo-not-found',
        instance: '/api/upload/{id}',
      });
    }

    const photo = photoResult.rows[0];

    // Yetki kontrolü: admin > vendor (sahip olduğu mekan) > diğer (yasak)
    if (auth.user.role === 'admin') {
      // admin tüm fotoğrafları güncelleyebilir
    } else if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [photo.place_id, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return problemJson({
          status: 403,
          title: 'Forbidden',
          detail: 'Bu fotoğrafı güncelleme yetkiniz yok',
          type: '/problems/upload-forbidden',
          instance: '/api/upload/{id}',
        });
      }
    } else {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Sadece mekan sahibi veya admin fotoğraf güncelleyebilir',
        type: '/problems/upload-forbidden',
        instance: '/api/upload/{id}',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (body.caption !== undefined) {
      updates.push(`caption = $${paramIndex}`);
      params.push(body.caption);
      paramIndex++;
    }

    if (body.isPrimary !== undefined) {
      updates.push(`is_featured = $${paramIndex}`);
      params.push(body.isPrimary);
      paramIndex++;

      // If setting as featured, unset others
      if (body.isPrimary) {
        await query(
          'UPDATE place_photos SET is_featured = false WHERE place_id = $1 AND id != $2',
          [photo.place_id, id]
        );

        // Update place cover image
        const normalized = normalizePlacePhotoUrls(photo, photo.place_slug);
        await query(
          'UPDATE places SET thumbnail_url = $1, updated_at = NOW() WHERE id = $2',
          [normalized.thumbnail_url || normalized.image_url, photo.place_id]
        );
      }
    }

    if (updates.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Güncellenecek alan bulunamadı',
        type: '/problems/upload-update-no-fields',
        instance: '/api/upload/{id}',
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE place_photos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const updatedPhoto = result.rows[0];
    const normalizedUpdated = normalizePlacePhotoUrls(updatedPhoto, photo.place_slug);

    return apiResponse({
      success: true,
      photo: {
        ...updatedPhoto,
        url: normalizedUpdated.image_url,
        thumbnail_url: normalizedUpdated.thumbnail_url,
        image_url: normalizedUpdated.image_url,
      }
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Update photo error:', error);
    return problemJson({
      status: 500,
      title: 'Fotoğraf Güncellenemedi',
      detail: safeErrorDetail(error, 'server_error'),
      type: '/problems/upload-update-failed',
      instance: '/api/upload/{id}',
    });
  }
};
