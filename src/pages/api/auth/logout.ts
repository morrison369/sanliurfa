// API: Çıkış yap (PostgreSQL)
import type { APIRoute } from 'astro';
import { signOut } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get('auth-token')?.value;
    
    if (token) {
      signOut(token);
    }

    // Clear cookie
    cookies.delete('auth-token', { path: '/' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Çıkış başarılı' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Logout error:', err);
    return new Response(
      JSON.stringify({ error: 'Çıkış işlemi sırasında bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET method for simple logout
export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const token = cookies.get('auth-token')?.value;
    if (token) {
      signOut(token);
    }
    cookies.delete('auth-token', { path: '/' });
    return redirect('/?logout=success');
  } catch {
    return redirect('/?logout=error');
  }
};
