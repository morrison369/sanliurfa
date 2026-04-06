// API: Delete user account (PostgreSQL)
import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { signOut } from '../../../lib/auth';

export const POST: APIRoute = async ({ locals, redirect, cookies }) => {
  try {
    const user = locals.user;
    
    if (!user) {
      return redirect('/giris');
    }

    // Delete user and related data
    await query('DELETE FROM users WHERE id = $1', [user.id]);

    // Clear session
    const token = cookies.get('auth-token')?.value;
    if (token) signOut(token);
    
    cookies.delete('auth-token', { path: '/' });

    return redirect('/?account_deleted=true');
  } catch (err) {
    console.error('Account delete error:', err);
    return redirect('/profil/ayarlar?error=delete_failed');
  }
};
