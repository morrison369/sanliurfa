// API: Update user profile (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { updateProfileSettings } from '../../../lib/user/profile-settings';
import { invalidateUser } from '../../../lib/cache/invalidation';

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

    await updateProfileSettings(
      { id: user.id },
      {
        fullName: fullName ?? null,
        username: username ?? null,
        bio: bio ?? null,
      },
    );

    // Cache invalidation: profil güncellemesi user:profile/settings cache'lerini etkiler
    await invalidateUser(user.id);

    return redirect('/profil/ayarlar?success=profile_updated');
  } catch (err) {
    logger.error('Profile update error:', err);
    return redirect('/profil/ayarlar?error=update_failed');
  }
};
