import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { createToken, hashPassword, validatePasswordStrength } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { fullName, email, password } = body;

    if (!fullName || !email || !password) {
      return new Response(JSON.stringify({ error: 'Tüm alanlar gerekli' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Password strength check
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return new Response(JSON.stringify({ error: strength.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kayıtlı' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, full_name, email, role`,
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    // Create JWT token
    const token = createToken({ userId: user.id, email: user.email, role: user.role });

    // Set auth cookie
    context.cookies.set('auth-token', token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'strict',
      maxAge: 86400,
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
