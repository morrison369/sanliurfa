// @ts-nocheck
/**
 * Mobile App Authentication API
 * JWT-based auth with refresh tokens
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { generateId } from '../../../lib/utils';

const JWT_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000;

// In-memory refresh token store
const refreshTokens: Map<string, { userId: string; expires: number }> = new Map();

// Simple JWT implementation for mobile
function generateToken(payload: any, expiresIn: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  const signature = btoa('mock-signature');
  return `${header}.${body}.${signature}`;
}

// POST: Login
export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password, deviceId } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email ve şifre zorunludur' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find user (mock for now)
    const user = {
      id: 'user_123',
      email,
      name: 'Test User',
      role: 'user',
      is_verified: true,
    };

    // Generate tokens
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    }, JWT_EXPIRY);

    const refreshToken = generateToken({
      userId: user.id,
      deviceId: deviceId || 'unknown',
    }, '30d');

    refreshTokens.set(refreshToken, {
      userId: user.id,
      expires: Date.now() + REFRESH_TOKEN_EXPIRY,
    });

    return new Response(
      JSON.stringify({
        success: true,
        accessToken,
        refreshToken,
        user,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Mobile login error:', error);
    return new Response(
      JSON.stringify({ error: 'Giriş yapılırken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT: Refresh token
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Refresh token required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = refreshTokens.get(refreshToken);
    if (!tokenData || tokenData.expires < Date.now()) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired refresh token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = {
      id: tokenData.userId,
      email: 'user@example.com',
      name: 'Test User',
      role: 'user',
    };

    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    }, JWT_EXPIRY);

    return new Response(
      JSON.stringify({
        success: true,
        accessToken,
        user,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Token refresh failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Logout
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { refreshToken } = await request.json();
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }
    return new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Logout failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
