import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getMatchProfile, upsertMatchProfile } from '../../../lib/social/matchmaking-db';
import { problemJson } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/social-match-profile-unauthorized',
        instance: '/api/social/match-profile',
      });
    }

    const profile = await getMatchProfile(auth.user.id);
    return new Response(
      JSON.stringify({
        success: true,
        data: profile || { bio: '', photos: [], is_discoverable: true },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Profil Alınamadı',
      detail: error instanceof Error ? error.message : 'failed_to_get_match_profile',
      type: '/problems/social-match-profile-fetch-failed',
      instance: '/api/social/match-profile',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/social-match-profile-unauthorized',
        instance: '/api/social/match-profile',
      });
    }

    const body = await request.json();
    const photos = Array.isArray(body?.photos) ? body.photos.map((p: any) => String(p)) : [];

    if (photos.length > 4) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Fotoğraf Sayısı',
        detail: 'En fazla 4 fotoğraf ekleyebilirsiniz',
        type: '/problems/social-match-profile-photos-limit',
        instance: '/api/social/match-profile',
      });
    }

    const profile = await upsertMatchProfile(auth.user.id, {
      bio: body?.bio?.toString?.() || '',
      photos,
      isDiscoverable: body?.isDiscoverable !== false,
    });

    return new Response(JSON.stringify({ success: true, data: profile }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Profil Kaydedilemedi',
      detail: error instanceof Error ? error.message : 'failed_to_save_match_profile',
      type: '/problems/social-match-profile-save-failed',
      instance: '/api/social/match-profile',
    });
  }
};
