// API: Çıkış yap (PostgreSQL)
import type { APIRoute } from 'astro';
import { signOut } from '../../../lib/auth';
import { logger } from '../../../lib/logging';
import { problemJson, safeErrorDetail } from '../../../lib/api';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get('auth-token')?.value;
    
    if (token) {
      await signOut(token);
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
    logger.error('Logout error:', err);
    return problemJson({
      status: 500,
      title: 'Çıkış Yapılamadı',
      detail: safeErrorDetail(err, 'Çıkış işlemi sırasında bir hata oluştu'),
      type: '/problems/auth-logout-failed',
      instance: '/api/auth/logout',
    });
  }
};

// GET method for simple logout
export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const token = cookies.get('auth-token')?.value;
    if (token) {
      await signOut(token);
    }
    cookies.delete('auth-token', { path: '/' });
    return redirect('/?logout=success');
  } catch {
    return redirect('/?logout=error');
  }
};
