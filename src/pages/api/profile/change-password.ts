// API: Change user password (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { changeAccountPassword } from '../../../lib/user/profile-settings';

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

    await changeAccountPassword(
      { id: user.id },
      {
        currentPassword,
        newPassword,
        confirmPassword,
      },
    );

    return redirect('/profil/ayarlar?success=password_changed');
  } catch (err) {
    logger.error('Password change error:', err);
    if (err instanceof Error && err.message.includes('Mevcut şifre')) {
      return redirect('/profil/ayarlar?error=wrong_password');
    }
    return redirect('/profil/ayarlar?error=update_failed');
  }
};
