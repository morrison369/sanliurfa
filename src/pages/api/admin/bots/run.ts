import type { APIRoute } from 'astro';
import { ADMIN_CRM_BOTS, buildBotFindings, getAdminCrmCounts } from '../../../../lib/admin/city-crm';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !locals.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
  }

  let body: { botKey?: string } = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400 });
  }

  const bot = ADMIN_CRM_BOTS.find((item) => item.key === body.botKey);
  if (!bot) {
    return new Response(JSON.stringify({ success: false, error: 'Bot bulunamadı' }), { status: 404 });
  }

  const counts = await getAdminCrmCounts();
  const finding = buildBotFindings(counts, bot);
  const suggestions = bot.checks.map((check, index) => ({
    id: `${bot.key}-${index + 1}`,
    title: check,
    description:
      finding.issues > 0
        ? `${bot.title} ${check.toLowerCase()} için ${finding.issues} potansiyel kayıt buldu. Uygulamadan önce listeyi inceleyin.`
        : `${check} kontrolünde kritik açık görünmüyor.`,
    action: 'review',
    requiresApproval: true,
  }));

  return new Response(
    JSON.stringify({
      success: true,
      bot: {
        key: bot.key,
        title: bot.title,
        risk: bot.risk,
        automatic: false,
        mode: 'manual-review-only',
      },
      result: {
        ...finding,
        ranAt: new Date().toISOString(),
        suggestions,
      },
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8' } },
  );
};

