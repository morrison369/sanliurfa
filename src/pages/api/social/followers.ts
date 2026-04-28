/**
 * GET /api/social/followers
 * Get user's followers
 */

import type { APIRoute } from 'astro';
import { getFollowers, getFollowing, getPendingRequests, acceptFollowRequest, declineFollowRequest } from '../../../lib/social/friendship-db';
import { requireAuth } from '../../../lib/auth';
import { problemJson, safeIntParam, safeErrorDetail } from '../../../lib/api';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/social-followers-unauthorized',
        instance: '/api/social/followers',
      });
    }

    const searchParams = url.searchParams;
    const type = searchParams.get('type') || 'followers';
    const limit = safeIntParam(searchParams.get('limit'), 50, 0, 1_000_000);
    const offset = safeIntParam(searchParams.get('offset'), 0, 0, 1_000_000);

    if (type === 'pending') {
      const requests = await getPendingRequests(auth.user.id);
      return new Response(
        JSON.stringify({ requests }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'following') {
      const following = await getFollowing(auth.user.id, limit, offset);
      return new Response(
        JSON.stringify({ following }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const followers = await getFollowers(auth.user.id, limit, offset);
    return new Response(
      JSON.stringify({ followers }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Takip Listesi Alınamadı',
      detail: safeErrorDetail(error, 'Takip listesi alınamadı'),
      type: '/problems/social-followers-fetch-failed',
      instance: '/api/social/followers',
    });
  }
};

/**
 * POST /api/social/followers
 * Accept/decline follow request
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/social-followers-unauthorized',
        instance: '/api/social/followers',
      });
    }

    const body = await request.json();
    const { requestId, action } = body;

    const VALID_FOLLOW_ACTIONS = new Set(['accept', 'decline']);
    if (!requestId || typeof requestId !== 'string' || !action || typeof action !== 'string' || !VALID_FOLLOW_ACTIONS.has(action)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'requestId ve geçerli action (accept/decline) zorunludur',
        type: '/problems/social-followers-validation',
        instance: '/api/social/followers',
      });
    }

    if (action === 'accept') {
      const friendship = await acceptFollowRequest(requestId, auth.user.id);
      return new Response(
        JSON.stringify({ success: true, friendship }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'decline') {
      await declineFollowRequest(requestId, auth.user.id);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return problemJson({
      status: 400,
      title: 'Geçersiz Aksiyon',
      detail: 'action değeri accept veya decline olmalıdır',
      type: '/problems/social-followers-invalid-action',
      instance: '/api/social/followers',
    });
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'İstek İşlenemedi',
      detail: safeErrorDetail(error, 'İstek işlenemedi'),
      type: '/problems/social-followers-process-failed',
      instance: '/api/social/followers',
    });
  }
};
