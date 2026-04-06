// API: Kullanıcı kaydı (PostgreSQL)
import type { APIRoute } from 'astro';
import { signUp, signIn, createToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Tüm alanlar gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Şifre en az 6 karakter olmalıdır' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await signUp(email, password, fullName);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auto login after registration
    const loginResult = await signIn(email, password);
    if (loginResult.data?.token) {
      cookies.set('auth-token', loginResult.data.token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: data.user,
        message: 'Kayıt başarılı! Hoş geldiniz.' 
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Register error:', err);
    return new Response(
      JSON.stringify({ error: 'Kayıt işlemi sırasında bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
