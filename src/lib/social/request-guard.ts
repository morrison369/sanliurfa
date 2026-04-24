import type { APIContext } from 'astro';
import { auditSiteChange } from '../site-content';
import { enforceSocialRateLimit } from './abuse-policy';
import { problemJson } from '../api';

type SocialAction = 'swipe' | 'follow' | 'message_write' | 'message_read';

type AuthUser = {
  id: string;
  email?: string | null;
  role?: string | null;
};

export function buildSocialAuditContext(context: APIContext, user: AuthUser) {
  return {
    userId: user.id,
    actorEmail: user.email || null,
    ipAddress: context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: context.request.headers.get('user-agent') || null,
  };
}

export async function enforceSocialAction(
  context: APIContext,
  user: AuthUser,
  settingKey: string,
  action: SocialAction,
): Promise<Response | null> {
  const auditCtx = buildSocialAuditContext(context, user);
  const rate = await enforceSocialRateLimit(context.request, user.id, action, user.role || null);
  if (rate.allowed) return null;

  await auditSiteChange(settingKey, 'social_abuse', auditCtx, {
    reason: 'rate_limit_exceeded',
    tenantId: rate.tenantId,
    limit: rate.policy.limit,
    windowSeconds: rate.policy.windowSeconds,
    action,
  });

  return problemJson({
    status: 429,
    title: 'Rate Limit Aşıldı',
    detail: 'İstek limiti aşıldı, lütfen kısa süre sonra tekrar deneyin.',
    type: '/problems/social-rate-limit',
    instance: `/api/social/${action}`,
  });
}
