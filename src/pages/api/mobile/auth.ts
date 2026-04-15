/**
 * Mobile App Authentication API
 * Real bcrypt password verification + HMAC-SHA256 JWT + Redis refresh tokens
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { comparePassword, createToken } from '../../../lib/auth';
import { setCache, getCache, deleteCache } from '../../../lib/cache';
import { logger } from '../../../lib/logging';

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

function refreshTokenKey(token: string) {
  return `mobile:refresh:${token}`;
}

// POST: Login
export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email ve şifre zorunludur' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await queryOne(
      `SELECT id, email, full_name, role, password_hash, is_active, is_verified
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!user || !user.is_active) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz email veya şifre' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz email veya şifre' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = createToken({ userId: user.id, email: user.email, role: user.role });

    const { randomBytes } = await import('crypto');
    const refreshToken = randomBytes(32).toString('hex');
    await setCache(
      refreshTokenKey(refreshToken),
      { userId: user.id, email: user.email, role: user.role },
      REFRESH_TOKEN_TTL
    );

    return new Response(
      JSON.stringify({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          isVerified: user.is_verified,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Mobile login error:', error);
    return new Response(
      JSON.stringify({ error: 'Giriş yapılırken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT: Refresh access token
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Refresh token zorunludur' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await getCache<{ userId: string; email: string; role: string }>(
      refreshTokenKey(refreshToken)
    );
    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz veya süresi dolmuş refresh token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await queryOne(
      `SELECT id, email, full_name, role, is_active FROM users WHERE id = $1`,
      [data.userId]
    );

    if (!user || !user.is_active) {
      await deleteCache(refreshTokenKey(refreshToken));
      return new Response(
        JSON.stringify({ error: 'Kullanıcı bulunamadı' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = createToken({ userId: user.id, email: user.email, role: user.role });

    return new Response(
      JSON.stringify({
        success: true,
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: 'Token yenileme başarısız' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Logout (revoke refresh token)
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { refreshToken } = await request.json();
    if (refreshToken) {
      await deleteCache(refreshTokenKey(refreshToken));
    }
    return new Response(
      JSON.stringify({ success: true, message: 'Çıkış yapıldı' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Çıkış yapılırken hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
