/**
 * POST /api/social/follow
 * Follow a user
 */

import type { APIRoute } from 'astro';
import { followUser, unfollowUser } from '../../../lib/social/friendship-db';
import { requireAuth } from '../../../lib/auth';
import { auditSiteChange } from '../../../lib/site-content';
import { problemJson } from '../../../lib/api';
import { publishSocialEvent } from '../../../lib/social/event-stream';
import { buildSocialAuditContext, enforceSocialAction } from '../../../lib/social/request-guard';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/social-follow-unauthorized',
        instance: '/api/social/follow',
      });
    }

    const auditCtx = buildSocialAuditContext({ request } as any, auth.user as any);
    const guardResponse = await enforceSocialAction(
      { request } as any,
      auth.user as any,
      'social.follow',
      'follow',
    );
    if (guardResponse) return guardResponse;

    const body = await request.json();
    const { userId, action = 'follow' } = body;

    if (!userId) {
      await auditSiteChange('social.follow', 'social_abuse', auditCtx, {
        reason: 'missing_user_id',
        action,
      });
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'userId zorunludur',
        type: '/problems/social-follow-validation',
        instance: '/api/social/follow',
      });
    }

    if (String(userId) === String(auth.user.id)) {
      await auditSiteChange('social.follow', 'social_abuse', auditCtx, {
        reason: 'self_follow',
        action,
      });
    }

    if (action === 'unfollow') {
      const result = await unfollowUser(auth.user.id, userId);
      if (result) {
        await publishSocialEvent({
          eventType: 'follow.removed',
          actorUserId: auth.user.id,
          targetUserId: String(userId),
          createdAt: new Date().toISOString(),
        });
      }
      return new Response(
        JSON.stringify({ success: result }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const friendship = await followUser(auth.user.id, userId);
    await publishSocialEvent({
      eventType: 'follow.created',
      actorUserId: auth.user.id,
      targetUserId: String(userId),
      createdAt: new Date().toISOString(),
      metadata: { pending: Boolean((friendship as any)?.status === 'pending') },
    });
    return new Response(
      JSON.stringify({ success: true, friendship }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to follow user';
    const auth = await requireAuth(request).catch(() => null);
    if (auth?.user) {
      await auditSiteChange(
        'social.follow',
        'social_abuse',
        {
          userId: auth.user.id,
          actorEmail: auth.user.email || null,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
          userAgent: request.headers.get('user-agent') || null,
        },
        { reason: 'follow_error', message },
      );
    }
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
