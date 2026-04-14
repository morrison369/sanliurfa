import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { createToken } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'E-posta ve şifre gerekli' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find user
    const result = await query(
      'SELECT id, full_name, email, password_hash, role, status, avatar_url, points FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'E-posta veya şifre hatalı' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = result.rows[0];

    if (user.status === 'suspended' || user.status === 'deleted') {
      return new Response(JSON.stringify({ error: 'Hesap aktif değil' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return new Response(JSON.stringify({ error: 'E-posta veya şifre hatalı' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update last login
    await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

    // Create JWT token
    const token = createToken({ userId: user.id, email: user.email, role: user.role });

    // Set auth cookie
    context.cookies.set('auth-token', token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'strict',
      maxAge: 86400, // 24h
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatar: user.avatar_url,
        points: user.points || 0,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
