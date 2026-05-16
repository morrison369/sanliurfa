import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { apiResponse, getRequestId, problemJson } from '../../../../lib/api';
import { getAdSenseAdminSummary } from '../../../../lib/admin/adsense-admin';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

function readJsonSafe<T = Record<string, unknown>>(relPath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), relPath), 'utf8')) as T;
  } catch {
    return null;
  }
}

function statusTone(status: unknown): 'ok' | 'advisory' | 'review' | 'blocked' {
  const value = String(status || '').toLowerCase();
  if (['ok', 'passed', 'ready', 'ready_with_advisories', 'managed_live_ok'].includes(value)) return 'ok';
  if (['advisory', 'observing', 'waiting', 'observation_required', 'managed_with_live_quota_review'].includes(value)) {
    return 'advisory';
  }
  if (['review', 'idle', 'expected_review', 'expected'].includes(value)) return 'review';
  return 'blocked';
}

function findAction(actions: any[], area: string) {
  return actions.find((item) => item?.area === area || item?.title?.toLowerCase?.().includes(area));
}

export const GET: APIRoute = async ({ locals, request }) => {
  const requestId = getRequestId(request);
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-operations-unauthorized',
      instance: '/api/admin/operations/summary',
      extensions: { requestId },
    });
  }

  const metrics = readJsonSafe<any>('quality-metrics.json');
  const readiness = readJsonSafe<any>('docs/release-readiness-dashboard.json');
  const nextActions = readJsonSafe<any>('docs/release-next-actions-report.json');
  const socialUx = readJsonSafe<any>('docs/social-ux-report.json');
  const dbUsage = readJsonSafe<any>('docs/db-usage-audit.json');
  const adsenseSummary = await getAdSenseAdminSummary();
  const actions = Array.isArray(nextActions?.actions) ? nextActions.actions : [];
  const dbAction = findAction(actions, 'database');
  const pagespeedAction = findAction(actions, 'pagespeed');
  const adsenseAction = findAction(actions, 'adsense');
  const storageAction = findAction(actions, 'storage');

  const cards = [
    {
      key: 'release',
      label: 'Release',
      status: readiness?.decision || metrics?.releaseReadiness?.status || 'unknown',
      tone: statusTone(readiness?.decision || metrics?.releaseReadiness?.status),
      metric: readiness?.decision || 'ADVISORY',
      detail: `${readiness?.releaseNextActions?.actionCount ?? nextActions?.summary?.actionCount ?? 0} aksiyon · ${readiness?.releaseNextActions?.blockingActionCount ?? nextActions?.summary?.blockingActionCount ?? 0} kanıt bekleyen`,
      command: 'npm run -s release:local:fast',
      nextDue: dbAction?.dueAfter || null,
      href: '/admin/release-readiness',
    },
    {
      key: 'database',
      label: 'Database',
      status: metrics?.dbObservationCadence?.status || 'unknown',
      tone: statusTone(metrics?.dbObservationCadence?.status),
      metric: `${metrics?.dbObservationCadence?.snapshotCount ?? 0}/${metrics?.dbObservationCadence?.observationDays ?? 14}`,
      detail: `${dbUsage?.summary?.tableCount ?? metrics?.dbUsageAudit?.tableCount ?? 0} tablo · ${dbUsage?.summary?.unusedIndexCount ?? metrics?.dbUsageAudit?.unusedIndexCount ?? 0} unused index`,
      command: dbAction?.command || 'npm run -s db:retirement:observe && npm run -s db:p0:quarantine:plan',
      nextDue: dbAction?.dueAfter || null,
      href: '/admin/monitoring',
    },
    {
      key: 'db-policy',
      label: 'DB Silme Politikası',
      status: 'observing',
      tone: 'advisory',
      metric: 'AUTO-DROP OFF',
      detail: 'Tablo/index silme yok; P0 ve unused index adayları 14 günlük gözlem + EXPLAIN kanıtı ister.',
      command: 'npm run -s db:index:review:plan',
      nextDue: dbAction?.dueAfter || null,
      href: '/admin/release-readiness',
    },
    {
      key: 'content',
      label: 'İçerik Taslakları',
      status: metrics?.contentAgentDrafts?.status || 'unknown',
      tone: statusTone(metrics?.contentAgentDrafts?.status),
      metric: String(metrics?.contentAgentDrafts?.pending ?? 0),
      detail: `Ollama/GMaps taslakları admin onayı bekler; autopublish kapalı`,
      command: 'npm run -s content:agents:drafts:report',
      nextDue: null,
      href: '/admin/content-agents',
    },
    {
      key: 'social',
      label: 'Sosyal UX',
      status: socialUx?.status || metrics?.socialUx?.status || 'unknown',
      tone: statusTone(socialUx?.status || metrics?.socialUx?.status),
      metric: `${socialUx?.summary?.passed ?? metrics?.socialUx?.passed ?? 0}/${socialUx?.summary?.checkCount ?? metrics?.socialUx?.checkCount ?? 0}`,
      detail: 'Profil, eşleşme, mesajlaşma ve güvenlik yüzeyi',
      command: 'npm run -s social:ux:report',
      nextDue: null,
      href: '/admin/social-risk',
    },
    {
      key: 'pagespeed',
      label: 'PageSpeed',
      status: metrics?.pagespeedQuotaManagement?.status || 'unknown',
      tone: statusTone(metrics?.pagespeedQuotaManagement?.status),
      metric: metrics?.pagespeedLiveCheck?.quotaLimited ? 'Kota' : 'OK',
      detail: `live=${metrics?.pagespeedLiveCheck?.status ?? 'not-run'} · quota=${metrics?.pagespeedLiveCheck?.quotaLimited ?? 0} · ${metrics?.pagespeedApiLessLighthouse?.reviewClassification ?? 'classification=n/a'}`,
      command: pagespeedAction?.command || 'npm run -s pagespeed:api-less',
      nextDue: pagespeedAction?.dueAfter || null,
      href: '/admin/release-readiness',
    },
    {
      key: 'adsense',
      label: 'AdSense',
      status: adsenseSummary.status,
      tone: adsenseSummary.tone,
      metric: `${adsenseSummary.manualSlotCount}/${adsenseSummary.totalSlotCount} SLOT`,
      detail: `${adsenseSummary.autoAdsEnabled ? 'Auto ads açık' : 'Auto ads kapalı'} · client ${adsenseSummary.client ? 'hazır' : 'eksik'} · ${adsenseSummary.emptySlotCount} boş slot`,
      command: adsenseAction?.command || 'npm run -s adsense:readiness:live',
      nextDue: adsenseAction?.dueAfter || null,
      href: '/admin/ads',
    },
    {
      key: 'media',
      label: 'Local Medya',
      status: metrics?.localUploadParity?.status || 'unknown',
      tone: statusTone(metrics?.localUploadParity?.status),
      metric: `%${metrics?.localUploadParity?.usedPercent ?? 0}`,
      detail: `${metrics?.mediaReadiness?.uploadFiles ?? metrics?.localUploadParity?.uploadFileCount ?? 0} upload · ${metrics?.mediaReadiness?.publicImages ?? 0} public image · CDN/object storage yok`,
      command: storageAction?.command || 'npm run -s media:readiness',
      nextDue: storageAction?.dueAfter || null,
      href: '#media-health',
    },
  ];

  return apiResponse(
    {
      success: true,
      requestId,
      generatedAt: new Date().toISOString(),
      cards,
      debug: {
        openapi: metrics?.openapi || null,
        blockerGates: metrics?.blockerGates || null,
        nextActions: nextActions?.actions || [],
      },
    },
    200,
    requestId,
    { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
  );
};
