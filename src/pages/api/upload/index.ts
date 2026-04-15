import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { logger } from '../../../lib/logging';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await context.request.formData();
    const file = formData.get('file') as File;
    const placeId = formData.get('placeId') as string;
    const type = formData.get('type') as string || 'gallery';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Yetki kontrolu
    if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [placeId, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // File validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: 'File too large. Maximum size: 10MB' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
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
    const originalUrl = `${baseUrl}/${filename}`;
    const webpUrl = `${baseUrl}/${webpFilename}`;

    // Save to database
    const result = await query(
      `INSERT INTO place_photos (
        place_id, url, thumbnail_url, caption, photo_type, 
        file_size, mime_type, width, height, uploaded_by, is_primary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        placeId,
        webpUrl,
        `${baseUrl}/thumb_${webpFilename}`,
        formData.get('caption') || null,
        type,
        file.size,
        file.type,
        null,
        null,
        auth.user.id,
        type === 'cover'
      ]
    );

    const photo = result.rows[0];

    // If cover, update place image
    if (type === 'cover') {
      await query(
        'UPDATE places SET image_url = $1, updated_at = NOW() WHERE id = $2',
        [webpUrl, placeId]
      );
    }

    return new Response(JSON.stringify({
      success: true,
      photo: {
        id: photo.id,
        url: webpUrl,
        thumbnailUrl: photo.thumbnail_url,
        type: photo.photo_type,
        caption: photo.caption,
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// List photos for a place
export const GET: APIRoute = async (context) => {
  try {
    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await query(
      `SELECT id, url, thumbnail_url, caption, photo_type, 
              is_primary, created_at, file_size
       FROM place_photos 
       WHERE place_id = $1 AND is_active = true
       ORDER BY is_primary DESC, created_at DESC`,
      [placeId]
    );

    return new Response(JSON.stringify({
      success: true,
      photos: result.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('List photos error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
