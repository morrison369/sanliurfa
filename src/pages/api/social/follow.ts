/**
 * POST /api/social/follow
 * Follow a user
 */

import type { APIRoute } from 'astro';
import { followUser, unfollowUser } from '../../../lib/social/friendship-db';
import { requireAuth } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (!auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const body = await request.json();
    const { userId, action = 'follow' } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'unfollow') {
      const result = await unfollowUser(auth.user.id, userId);
      return new Response(
        JSON.stringify({ success: result }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const friendship = await followUser(auth.user.id, userId);
    return new Response(
      JSON.stringify({ success: true, friendship }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to follow user';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
