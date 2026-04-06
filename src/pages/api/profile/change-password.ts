// API: Change user password (PostgreSQL)
import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../lib/postgres';
import { hashPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  try {
    const user = locals.user;
    
    if (!user) {
      return redirect('/giris?redirect=/profil/ayarlar');
    }

    const formData = await request.formData();
    const currentPassword = formData.get('current_password')?.toString();
    const newPassword = formData.get('new_password')?.toString();
    const confirmPassword = formData.get('confirm_password')?.toString();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return redirect('/profil/ayarlar?error=missing_fields');
    }

    if (newPassword !== confirmPassword) {
      return redirect('/profil/ayarlar?error=password_mismatch');
    }

    if (newPassword.length < 6) {
      return redirect('/profil/ayarlar?error=password_too_short');
    }

    // Verify current password
    const currentHash = hashPassword(currentPassword);
    const dbUser = await queryOne(
      'SELECT id FROM users WHERE id = $1 AND password_hash = $2',
      [user.id, currentHash]
    );

    if (!dbUser) {
      return redirect('/profil/ayarlar?error=wrong_password');
    }

    // Update password
    const newHash = hashPassword(newPassword);
    await update('users', user.id, {
      password_hash: newHash,
      updated_at: new Date().toISOString(),
    });

    return redirect('/profil/ayarlar?success=password_changed');
  } catch (err) {
    console.error('Password change error:', err);
    return redirect('/profil/ayarlar?error=update_failed');
  }
};
