/**
 * GET /api/social/followers
 * Get user's followers
 */

import type { APIRoute } from 'astro';
import { getFollowers, getFollowing, getPendingRequests, acceptFollowRequest, declineFollowRequest } from '../../../lib/social/friendship-db';
import { requireAuth } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = url.searchParams;
    const type = searchParams.get('type') || 'followers';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
    const message = error instanceof Error ? error.message : 'Failed to get followers';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * POST /api/social/followers
 * Accept/decline follow request
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return new Response(
        JSON.stringify({ error: 'Request ID and action are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
