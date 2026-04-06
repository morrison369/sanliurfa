// API: Update user profile (PostgreSQL)
import type { APIRoute } from 'astro';
import { update } from '../../../lib/postgres';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  try {
    const user = locals.user;
    
    if (!user) {
      return redirect('/giris?redirect=/profil/ayarlar');
    }

    const formData = await request.formData();
    const fullName = formData.get('full_name')?.toString();
    const username = formData.get('username')?.toString();
    const bio = formData.get('bio')?.toString();

    await update('users', user.id, {
      full_name: fullName,
      username: username,
      bio: bio,
      updated_at: new Date().toISOString(),
    });

    return redirect('/profil/ayarlar?success=profile_updated');
  } catch (err) {
    console.error('Profile update error:', err);
    return redirect('/profil/ayarlar?error=update_failed');
  }
};
