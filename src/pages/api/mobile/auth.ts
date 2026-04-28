/**
 * Mobile App Authentication API
 * Real bcrypt password verification + HMAC-SHA256 JWT + Redis refresh tokens
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { comparePassword, createToken } from '../../../lib/auth';
import { setCache, getCache, deleteCache } from '../../../lib/cache';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

function refreshTokenKey(token: string) {
  return `mobile:refresh:${token}`;
}

// POST: Login
export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return problemJson({
        status: 400,
        title: 'Eksik Parametre',
        detail: 'Email ve şifre zorunludur',
        type: '/problems/mobile-auth-validation',
        instance: '/api/mobile/auth',
      });
    }

    const user = await queryOne(
      `SELECT id, email, full_name, role, password_hash, status, is_verified
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!user || user.status === 'deleted' || user.status === 'banned') {
      return problemJson({
        status: 401,
        title: 'Authentication Failed',
        detail: 'Geçersiz email veya şifre',
        type: '/problems/mobile-auth-failed',
        instance: '/api/mobile/auth',
      });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return problemJson({
        status: 401,
        title: 'Authentication Failed',
        detail: 'Geçersiz email veya şifre',
        type: '/problems/mobile-auth-failed',
        instance: '/api/mobile/auth',
      });
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
    return problemJson({
      status: 500,
      title: 'Mobile Login Error',
      detail: 'Giriş yapılırken bir hata oluştu',
      type: '/problems/mobile-login-failed',
      instance: '/api/mobile/auth',
    });
  }
};

// PUT: Refresh access token
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return problemJson({
        status: 400,
        title: 'Eksik Parametre',
        detail: 'Refresh token zorunludur',
        type: '/problems/mobile-refresh-validation',
        instance: '/api/mobile/auth',
      });
    }

    const data = await getCache<{ userId: string; email: string; role: string }>(
      refreshTokenKey(refreshToken)
    );
    if (!data) {
      return problemJson({
        status: 401,
        title: 'Invalid Refresh Token',
        detail: 'Geçersiz veya süresi dolmuş refresh token',
        type: '/problems/mobile-refresh-invalid',
        instance: '/api/mobile/auth',
      });
    }

    const user = await queryOne(
      `SELECT id, email, full_name, role, status, email_verified AS is_verified FROM users WHERE id = $1`,
      [data.userId]
    );

    if (!user || user.status === 'deleted' || user.status === 'banned') {
      await deleteCache(refreshTokenKey(refreshToken));
      return problemJson({
        status: 401,
        title: 'User Not Found',
        detail: 'Kullanıcı bulunamadı',
        type: '/problems/mobile-refresh-user-not-found',
        instance: '/api/mobile/auth',
      });
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
    return problemJson({
      status: 500,
      title: 'Token Refresh Error',
      detail: 'Token yenileme başarısız',
      type: '/problems/mobile-refresh-failed',
      instance: '/api/mobile/auth',
    });
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
    return problemJson({
      status: 500,
      title: 'Logout Error',
      detail: 'Çıkış yapılırken hata oluştu',
      type: '/problems/mobile-logout-failed',
      instance: '/api/mobile/auth',
    });
  }
};
