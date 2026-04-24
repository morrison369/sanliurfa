import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { recordSwipe, type SwipeDirection } from '../../../lib/social/matchmaking-db';
import { getSocialFeatureConfig } from '../../../lib/social/match-features';
import { getOrCreateConversation } from '../../../lib/message/messages';
import { auditSiteChange } from '../../../lib/site-content';
import { problemJson } from '../../../lib/api';
import { publishSocialEvent } from '../../../lib/social/event-stream';
import { buildSocialAuditContext, enforceSocialAction } from '../../../lib/social/request-guard';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/social-swipe-unauthorized',
        instance: '/api/social/swipe',
      });
    }

    const config = getSocialFeatureConfig();
    if (!config.tinderEnabled) {
      return problemJson({
        status: 503,
        title: 'Eşleşme Kapalı',
        detail: 'Eşleşme özelliği şu anda kapalı',
        type: '/problems/social-swipe-disabled',
        instance: '/api/social/swipe',
      });
    }

    const body = await request.json();
    const targetUserId = body?.targetUserId?.toString?.();
    const direction = body?.direction as SwipeDirection;
    const auditCtx = buildSocialAuditContext({ request } as any, auth.user as any);
    const guardResponse = await enforceSocialAction(
      { request } as any,
      auth.user as any,
      'social.swipe',
      'swipe',
    );
    if (guardResponse) return guardResponse;

    if (!targetUserId || !['left', 'right'].includes(direction)) {
      await auditSiteChange('social.swipe', 'social_abuse', auditCtx, {
        reason: 'invalid_payload',
        hasTargetUserId: Boolean(targetUserId),
        direction,
      });
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'targetUserId ve direction (left/right) zorunludur',
        type: '/problems/social-swipe-validation',
        instance: '/api/social/swipe',
      });
    }

    if (targetUserId === auth.user.id) {
      await auditSiteChange('social.swipe', 'social_abuse', auditCtx, {
        reason: 'self_swipe',
      });
    }

    const result = await recordSwipe(auth.user.id, targetUserId, direction);
    await publishSocialEvent({
      eventType: direction === 'right' ? 'swipe.right' : 'swipe.left',
      actorUserId: auth.user.id,
      targetUserId,
      createdAt: new Date().toISOString(),
      metadata: { isMatch: Boolean(result.isMatch) },
    });

    let conversationId: string | null = null;
    if (result.isMatch && config.autoConversationOnMatch) {
      const conversation = await getOrCreateConversation(auth.user.id, targetUserId);
      conversationId = conversation?.id || null;
      await publishSocialEvent({
        eventType: 'swipe.match',
        actorUserId: auth.user.id,
        targetUserId,
        conversationId,
        createdAt: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true, ...result, conversationId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save swipe';
    if (
      String(message).includes('Günlük kaydırma limitine ulaştınız') ||
      String(message).includes('Kullanıcı kendisini eşleştiremez')
    ) {
      const auth = await requireAuth(request).catch(() => null);
      if (auth?.user) {
        await auditSiteChange(
          'social.swipe',
          'social_abuse',
          {
            userId: auth.user.id,
            actorEmail: auth.user.email || null,
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            userAgent: request.headers.get('user-agent') || null,
          },
          { reason: 'limit_or_invalid_swipe', message: String(message) },
        );
      }
    }
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
