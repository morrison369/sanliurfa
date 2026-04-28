import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { recordSwipe, type SwipeDirection } from '../../../lib/social/matchmaking-db';
import { getSocialFeatureConfig } from '../../../lib/social/match-features';
import { getOrCreateConversation } from '../../../lib/message/messages';
import { auditSiteChange } from '../../../lib/site-content';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
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
    const targetUserId = typeof body?.targetUserId === 'string' ? body.targetUserId : null;
    const direction = body?.direction as SwipeDirection;
    const auditCtx = buildSocialAuditContext({ request }, auth.user);
    const guardResponse = await enforceSocialAction(
      { request },
      auth.user,
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

    return apiResponse({ success: true, ...result, conversationId }, HttpStatus.OK);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : '';
    const isKnownBusinessError =
      rawMessage.includes('Günlük kaydırma limitine ulaştınız') ||
      rawMessage.includes('Kullanıcı kendisini eşleştiremez');

    if (isKnownBusinessError) {
      const authRetry = await requireAuth(request).catch(() => null);
      if (authRetry?.user) {
        await auditSiteChange(
          'social.swipe',
          'social_abuse',
          {
            userId: authRetry.user.id,
            actorEmail: authRetry.user.email || null,
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            userAgent: request.headers.get('user-agent') || null,
          },
          { reason: 'limit_or_invalid_swipe', message: rawMessage },
        );
      }
    }

    return problemJson({
      status: 400,
      title: 'Swipe Kaydedilemedi',
      detail: isKnownBusinessError ? rawMessage : safeErrorDetail(error, 'Swipe kaydedilemedi'),
      type: '/problems/social-swipe-failed',
      instance: '/api/social/swipe',
    });
  }
};
