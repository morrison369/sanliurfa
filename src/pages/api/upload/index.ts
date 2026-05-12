import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { logger } from '../../../lib/logging';
import { resolveContentImage } from '../../../lib/content-images';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { deleteCachePattern } from '../../../lib/cache';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/upload-unauthorized',
        instance: '/api/upload',
      });
    }

    const formData = await context.request.formData();
    const file = formData.get('file') as File;
    const placeId = formData.get('placeId') as string;
    const type = formData.get('type') as string || 'gallery';

    if (!file) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Dosya yüklenmedi',
        type: '/problems/upload-file-missing',
        instance: '/api/upload',
      });
    }

    if (!placeId) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeId zorunludur',
        type: '/problems/upload-place-required',
        instance: '/api/upload',
      });
    }

    // Path traversal koruması: placeId path component oluşturuyor (uploads/places/<placeId>/),
    // bu nedenle UUID veya alfanümerik+tire formatında olmalı. Yoksa "../../etc" gibi inputlar
    // upload klasörünün dışına yazma denemesi yapabilir (auth katmanı zaten reddeder ama defense-in-depth).
    if (!/^[a-zA-Z0-9_-]+$/.test(placeId)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeId formatı geçersiz',
        type: '/problems/upload-place-invalid-format',
        instance: '/api/upload',
      });
    }

    // Yetki: admin > vendor (sahip olduğu mekan) > diğer (yasak)
    if (auth.user.role === 'admin') {
      // admin her mekana fotoğraf yükleyebilir
    } else if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [placeId, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return problemJson({
          status: 403,
          title: 'Forbidden',
          detail: 'Bu mekana yükleme yetkiniz yok',
          type: '/problems/upload-forbidden',
          instance: '/api/upload',
        });
      }
    } else {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Sadece mekan sahibi veya admin fotoğraf yükleyebilir',
        type: '/problems/upload-forbidden',
        instance: '/api/upload',
      });
    }

    // File validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Dosya Türü',
        detail: 'Sadece JPEG, PNG, WebP, GIF yüklenebilir',
        type: '/problems/upload-invalid-file-type',
        instance: '/api/upload',
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return problemJson({
        status: 400,
        title: 'Dosya Çok Büyük',
        detail: 'Maksimum dosya boyutu 10MB',
        type: '/problems/upload-file-too-large',
        instance: '/api/upload',
      });
    }

    // Generate unique filename — ext'i MIME type'tan derive et, file.name'den DEĞİL.
    // Aksi halde attacker `image/jpeg` MIME + `evil.html` adıyla yükleyip
    // sunucudan HTML/SVG/JS servis ettirebilir (stored XSS vektörü).
    const MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = MIME_TO_EXT[file.type] || 'jpg';
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}.${ext}`;
    const webpFilename = `${hash}.webp`;
    
    // Create upload directories
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'places', placeId);
    await mkdir(uploadDir, { recursive: true });

    // Save original file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalPath = join(uploadDir, filename);
    await writeFile(originalPath, buffer);

    // Generate URLs
    const baseUrl = '/uploads/places/' + placeId;
    const webpUrl = `${baseUrl}/${webpFilename}`;

    // Save to database
    const rawCaption = formData.get('caption');
    const caption = rawCaption ? String(rawCaption) : null;
    if (caption !== undefined && caption !== null && (typeof caption !== 'string' || caption.length > 500)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'caption 500 karakterden uzun olamaz',
        type: '/problems/upload-caption-too-long',
        instance: '/api/upload',
      });
    }
    const result = await query(
      `INSERT INTO place_photos (
        place_id, file_path, caption,
        file_size, mime_type, uploaded_by, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        placeId,
        webpUrl,
        caption,
        file.size,
        file.type,
        auth.user.id,
        type === 'cover'
      ]
    );

    const photo = result.rows[0];

    // If cover, update place image and invalidate place caches
    if (type === 'cover') {
      await query(
        'UPDATE places SET thumbnail_url = $1, updated_at = NOW() WHERE id = $2',
        [webpUrl, placeId]
      );
      await deleteCachePattern('places:*').catch(() => null);
    }

    const normalized = normalizePlacePhotoUrls(photo);

    return apiResponse({
      success: true,
      photo: {
        id: photo.id,
        url: normalized.image_url,
        thumbnailUrl: normalized.thumbnail_url,
        image_url: normalized.image_url,
        thumbnail_url: normalized.thumbnail_url,
        caption: photo.caption,
        is_featured: photo.is_featured,
      }
    }, HttpStatus.CREATED);

  } catch (error) {
    logger.error('Upload error:', error);
    return problemJson({
      status: 500,
      title: 'Yükleme Başarısız',
      detail: safeErrorDetail(error, 'upload_failed'),
      type: '/problems/upload-failed',
      instance: '/api/upload',
    });
  }
};

// List photos for a place
export const GET: APIRoute = async (context) => {
  try {
    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');

    if (!placeId) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeId zorunludur',
        type: '/problems/upload-place-required',
        instance: '/api/upload',
      });
    }

    const result = await query(
      `SELECT pp.id, pp.file_path, pp.caption,
              pp.is_featured, pp.created_at, pp.file_size,
              p.slug as place_slug
       FROM place_photos pp
       LEFT JOIN places p ON p.id = pp.place_id
       WHERE pp.place_id = $1
       ORDER BY pp.is_featured DESC, pp.created_at DESC`,
      [placeId]
    );

    const photos = result.rows.map((row) => {
      const normalized = normalizePlacePhotoUrls(row, row.place_slug);
      return {
        ...row,
        url: normalized.image_url,
        thumbnail_url: normalized.thumbnail_url,
        image_url: normalized.image_url,
      };
    });

    return apiResponse({
      success: true,
      photos
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('List photos error:', error);
    return problemJson({
      status: 500,
      title: 'Fotoğraflar Alınamadı',
      detail: safeErrorDetail(error, 'server_error'),
      type: '/problems/upload-list-failed',
      instance: '/api/upload',
    });
  }
};
