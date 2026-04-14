import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { unlink } from 'fs/promises';
import { join } from 'path';

// Delete photo
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;

    // Get photo info
    const photoResult = await query(
      'SELECT * FROM place_photos WHERE id = $1',
      [id]
    );

    if (photoResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const photo = photoResult.rows[0];

    // Yetki kontrolu
    if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [photo.place_id, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Soft delete
    await query(
      'UPDATE place_photos SET is_active = false, deleted_at = NOW() WHERE id = $1',
      [id]
    );

    // Try to delete physical file (don't fail if file doesn't exist)
    try {
      const filePath = join(process.cwd(), 'public', photo.url);
      await unlink(filePath);
    } catch (e) {
      // File might not exist, ignore
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Photo deleted'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Update photo (caption, primary status)
export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    // Get photo info
    const photoResult = await query(
      'SELECT * FROM place_photos WHERE id = $1',
      [id]
    );

    if (photoResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const photo = photoResult.rows[0];

    // Yetki kontrolu
    if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [photo.place_id, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.caption !== undefined) {
      updates.push(`caption = $${paramIndex}`);
      params.push(body.caption);
      paramIndex++;
    }

    if (body.isPrimary !== undefined) {
      updates.push(`is_primary = $${paramIndex}`);
      params.push(body.isPrimary);
      paramIndex++;

      // If setting as primary, unset others
      if (body.isPrimary) {
        await query(
          'UPDATE place_photos SET is_primary = false WHERE place_id = $1 AND id != $2',
          [photo.place_id, id]
        );

        // Update place cover image
        await query(
          'UPDATE places SET image_url = $1, updated_at = NOW() WHERE id = $2',
          [photo.url, photo.place_id]
        );
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE place_photos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return new Response(JSON.stringify({
      success: true,
      photo: result.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update photo error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
