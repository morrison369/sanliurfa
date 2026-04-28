/**
 * Mobile App API v2 - Current User
 */

import type { APIRoute } from 'astro';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/postgres';
import { apiResponse, problemJson, HttpStatus } from '../../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Bearer token gerekli',
        type: '/problems/v2-users-me-unauthorized',
        instance: '/api/v2/users/me',
      });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Geçersiz token',
        type: '/problems/v2-users-me-token-invalid',
        instance: '/api/v2/users/me',
      });
    }

    // Get user with stats
    const result = await query(`
      SELECT 
        u.id, u.name, u.email, u.avatar_url as avatar, u.created_at,
        (SELECT COUNT(*) FROM favorites WHERE user_id = u.id) as favorites_count,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id AND status = 'active') as reviews_count,
        (SELECT COUNT(*) FROM collections WHERE user_id = u.id) as collections_count
      FROM users u
      WHERE u.id = $1
    `, [user.userId]);

    if (result.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Kullanıcı bulunamadı',
        type: '/problems/v2-users-me-not-found',
        instance: '/api/v2/users/me',
      });
    }

    return apiResponse({
      success: true,
      data: result.rows[0]
    }, HttpStatus.OK);

  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Kullanıcı Bilgisi Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/v2-users-me-get-failed',
      instance: '/api/v2/users/me',
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Bearer token gerekli',
        type: '/problems/v2-users-me-unauthorized',
        instance: '/api/v2/users/me',
      });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Geçersiz token',
        type: '/problems/v2-users-me-token-invalid',
        instance: '/api/v2/users/me',
      });
    }

    const body: Record<string, unknown> = await request.json();
    const allowedFields = ['name', 'phone', 'avatar'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${values.length + 1}`);
        values.push(body[field] as string | number | null);
      }
    }

    if (updates.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Güncellenecek alan yok',
        type: '/problems/v2-users-me-no-fields',
        instance: '/api/v2/users/me',
      });
    }

    values.push(user.userId);
    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
      values
    );

    return apiResponse({ success: true }, HttpStatus.OK);

  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Kullanıcı Bilgisi Güncellenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/v2-users-me-update-failed',
      instance: '/api/v2/users/me',
    });
  }
};
