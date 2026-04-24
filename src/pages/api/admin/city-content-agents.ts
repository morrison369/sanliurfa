import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth';
import { problemJson } from '../../../lib/api';
import {
  CITY_CONTENT_AGENTS,
  CityContentAgentError,
  approveCityContentDraft,
  isCityContentAgentKey,
  listCityContentDrafts,
  listCityContentJobs,
  listCityContentSources,
  rejectCityContentDraft,
  runCityContentAgent,
  type CityContentAgentKey,
} from '../../../lib/city-content-agents';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function requireAdmin(request: Request) {
  const auth = await requireRole(request, 'admin');
  if (auth instanceof Response) return auth;
  if (!auth.user) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-city-content-agents-unauthorized',
      instance: '/api/admin/city-content-agents',
    });
  }
  return auth;
}

export const GET: APIRoute = async ({ request, url }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const status = url.searchParams.get('status') || undefined;
    const [sources, jobs, drafts] = await Promise.all([
      listCityContentSources(),
      listCityContentJobs(30),
      listCityContentDrafts(status),
    ]);

    return json({
      success: true,
      agents: CITY_CONTENT_AGENTS,
      sources,
      jobs,
      drafts,
      policy: {
        autoPublish: false,
        language: 'tr',
        focusKeyword: 'Şanlıurfa',
        imagePriority: ['pexels', 'unsplash'],
        sourcePolicy: 'official_or_admin_approved_only',
      },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Şehir İçerik Ajanları Okunamadı',
      detail: error instanceof Error ? error.message : 'Ajan verileri alınamadı',
      type: '/problems/admin-city-content-agents-get-failed',
      instance: '/api/admin/city-content-agents',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return problemJson({
      status: 400,
      title: 'Geçersiz JSON',
      detail: 'İstek gövdesi JSON olmalı',
      type: '/problems/admin-city-content-agents-invalid-json',
      instance: '/api/admin/city-content-agents',
    });
  }

  try {
    const action = String(body?.action || 'run-agent');

    if (action === 'run-agent') {
      const agentKeyRaw = String(body?.agentKey || '');
      if (!isCityContentAgentKey(agentKeyRaw)) {
        return problemJson({
          status: 400,
          title: 'Geçersiz Ajan',
          detail: 'agentKey geçerli bir şehir içerik ajanı olmalı',
          type: '/problems/admin-city-content-agents-invalid-agent',
          instance: '/api/admin/city-content-agents',
          extensions: {
            allowedAgents: CITY_CONTENT_AGENTS.map((agent) => agent.key),
          },
        });
      }
      const agentKey = agentKeyRaw as CityContentAgentKey;
      const sourceKey = body?.sourceKey ? String(body.sourceKey) : null;
      const result = await runCityContentAgent({
        agentKey,
        sourceKey,
        userId: auth.user.id,
      });
      return json({ success: true, ...result }, 201);
    }

    if (action === 'approve-draft') {
      const draft = await approveCityContentDraft(String(body?.draftId || ''), auth.user.id);
      return json({ success: true, draft });
    }

    if (action === 'reject-draft') {
      const draft = await rejectCityContentDraft(String(body?.draftId || ''), body?.note ? String(body.note) : null);
      return json({ success: true, draft });
    }

    return problemJson({
      status: 400,
      title: 'Geçersiz Aksiyon',
      detail: 'action run-agent, approve-draft veya reject-draft olmalı',
      type: '/problems/admin-city-content-agents-invalid-action',
      instance: '/api/admin/city-content-agents',
    });
  } catch (error) {
    if (error instanceof CityContentAgentError) {
      return problemJson({
        status: error.status,
        title: 'Şehir İçerik Ajanı İşlemi Reddedildi',
        detail: error.message,
        type: `/problems/admin-city-content-agents-${error.code}`,
        instance: '/api/admin/city-content-agents',
      });
    }

    return problemJson({
      status: 500,
      title: 'Şehir İçerik Ajanı Çalıştırılamadı',
      detail: error instanceof Error ? error.message : 'Ajan işlemi başarısız oldu',
      type: '/problems/admin-city-content-agents-post-failed',
      instance: '/api/admin/city-content-agents',
    });
  }
};
