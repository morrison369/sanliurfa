import type { APIRoute } from 'astro';
import { problemJson } from '../../../../../lib/api';
import { getSiteSetting } from '../../../../../lib/site-content';
import { triggerWebhook } from '../../../../../lib/webhooks/index';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-social-risk-webhook-test-unauthorized',
      instance: '/api/admin/social/risk/webhook-test',
    });
  }

  const webhook = await getSiteSetting('social.risk.webhook', {
    enabled: false,
    eventName: 'admin.social_risk.alert',
    userId: '',
    cooldownMinutes: 30,
  });

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // optional
  }

  const payload = {
    test: true,
    generatedAt: new Date().toISOString(),
    tenantId: String(body?.tenantId || 'default'),
    score: Number(body?.score || 80),
    zScore: Number(body?.zScore || 2.5),
    reason: 'manual_webhook_test',
  };
  const eventName = String(webhook.eventName || 'admin.social_risk.alert');

  await triggerWebhook(eventName, payload, webhook.userId ? String(webhook.userId) : undefined);

  return new Response(
    JSON.stringify({ success: true, eventName, payload }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};
