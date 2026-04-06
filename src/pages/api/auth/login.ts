// API: Kullanıcı girişi (PostgreSQL)
import type { APIRoute } from 'astro';
import { signIn, createToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'E-posta ve şifre gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await signIn(email, password);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Set auth cookie (middleware auth-token bekliyor)
    if (data.token) {
      cookies.set('auth-token', data.token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: data.user,
        message: 'Giriş başarılı' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ error: 'Giriş işlemi sırasında bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
