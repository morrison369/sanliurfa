#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'backend-frontend-improvement-report.json');
const outMd = path.join(docsDir, 'backend-frontend-improvement-report.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

const metrics = readJsonSafe('quality-metrics.json');
const dashboard = readJsonSafe('docs/release-readiness-dashboard.json');
const layout = read('src/layouts/Layout.astro');
const footer = read('src/components/Footer.astro');
const internalBacklinks = read('src/components/seo/InternalBacklinks.astro');
const adminIndex = read('src/pages/admin/index.astro');
const adminOperationsSummary = read('src/pages/api/admin/operations/summary.ts');
const adminPerformanceRecommendations = read('src/pages/api/admin/performance/recommendations.ts');
const apiDebug = readJsonSafe('docs/api-debug-envelope-report.json');
const dbRegistry = readJsonSafe('docs/db-registry-classification-report.json');

const checks = [
  {
    area: 'backend',
    name: 'API/OpenAPI parity',
    ok: metrics?.openapi?.documentedPaths === metrics?.openapi?.fileRoutes &&
      metrics?.openapi?.currentMissingInSpec === 0,
    detail: `${metrics?.openapi?.documentedPaths ?? 0}/${metrics?.openapi?.fileRoutes ?? 0} route documented`,
  },
  {
    area: 'backend',
    name: 'DB retirement safe observation',
    ok: metrics?.dbP0QuarantinePlan?.automaticDropAllowed === false &&
      metrics?.dbObservationCadence?.stableEnoughForAction === false,
    detail: `${metrics?.dbObservationCadence?.snapshotCount ?? 0}/${metrics?.dbObservationCadence?.observationDays ?? 0} snapshots; automatic drop disabled`,
  },
  {
    area: 'backend',
    name: 'Redis local idle/runtime split',
    ok: ['ok', 'idle'].includes(metrics?.redisRuntimeHealth?.status),
    detail: `redis=${metrics?.redisRuntimeHealth?.status ?? 'not-run'}`,
  },
  {
    area: 'backend',
    name: 'Content draft admin approval',
    ok: metrics?.contentAgentDrafts?.autoPublish === false &&
      metrics?.contentAgentDrafts?.pending >= 0,
    detail: `pending=${metrics?.contentAgentDrafts?.pending ?? 0}; autopublish=${metrics?.contentAgentDrafts?.autoPublish ? 'yes' : 'no'}`,
  },
  {
    area: 'backend',
    name: 'Google Maps local-storage draft pipeline',
    ok: metrics?.gmapsScraperReadiness?.localStorageOnly === true &&
      metrics?.gmapsDiscoveryDrafts?.autoPublish === false,
    detail: `candidates=${metrics?.gmapsDiscoveryDrafts?.candidateCount ?? 0}; local-storage=${metrics?.gmapsScraperReadiness?.localStorageOnly ? 'yes' : 'no'}`,
  },
  {
    area: 'backend',
    name: 'PageSpeed quota management tracked separately',
    ok: metrics?.pagespeedQuotaManagement?.quotaManagementCompleted === true &&
      metrics?.pagespeedQuotaManagement?.liveStatus === metrics?.pagespeedLiveCheck?.status,
    detail: `quota-management=${metrics?.pagespeedQuotaManagement?.status ?? 'not-run'}; live=${metrics?.pagespeedLiveCheck?.status ?? 'not-run'}`,
  },
  {
    area: 'backend',
    name: 'API debug envelope standard',
    ok: apiDebug?.status === 'ok',
    detail: `requestId/debug checks=${apiDebug?.summary?.passed ?? 0}/${apiDebug?.summary?.total ?? 0}`,
  },
  {
    area: 'backend',
    name: 'DB registry classification visibility',
    ok: dbRegistry?.automaticDbDropAllowed === false && dbRegistry?.summary?.tableCount > 0,
    detail: `${dbRegistry?.summary?.unclassifiedCount ?? 0} unclassified; auto-drop=${dbRegistry?.automaticDbDropAllowed ? 'yes' : 'no'}`,
  },
  {
    area: 'backend',
    name: 'Admin DB recommendations are review-only',
    ok: adminPerformanceRecommendations.includes('Do not drop automatically') &&
      !adminPerformanceRecommendations.includes('DROP INDEX IF EXISTS ${unusedIndexes'),
    detail: 'unused/zero-scan index önerileri otomatik DROP SQL üretmez',
  },
  {
    area: 'frontend',
    name: 'Editorial transparency retained without global block',
    ok: !layout.includes('<EditorialTransparencyBar') &&
      layout.includes('datePublished') &&
      layout.includes('dateModified') &&
      layout.includes('NewsMediaOrganization') &&
      layout.includes('publishingPrinciples') &&
      footer.includes('/kunye') &&
      footer.includes('/yayin-politikasi') &&
      footer.includes('/iletisim'),
    detail: 'global transparency card removed; publisher schema and policy links remain available',
  },
  {
    area: 'frontend',
    name: 'Internal backlink UX enriched',
    ok: internalBacklinks.includes('clusterLabels') &&
      internalBacklinks.includes('konu yakınlığına göre seçilir'),
    detail: 'cluster labels and explanatory note present',
  },
  {
    area: 'frontend',
    name: 'Admin operations center coverage',
    ok: dashboard?.contentAgentDrafts &&
      dashboard?.gmapsDiscoveryDrafts &&
      dashboard?.pagespeedQuotaManagement &&
      exists('src/pages/admin/release-readiness.astro'),
    detail: `decision=${dashboard?.decision ?? 'not-run'}; content=${dashboard?.contentAgentDrafts?.status ?? 'not-run'}; gmaps=${dashboard?.gmapsDiscoveryDrafts?.status ?? 'not-run'}`,
  },
  {
    area: 'frontend',
    name: 'Local storage media budget',
    ok: metrics?.localUploadParity?.quotaStatus === 'ok' &&
      metrics?.localUploadParity?.missingReferencedFileCount === 0,
    detail: `${metrics?.localUploadParity?.uploadFileCount ?? 0} uploads; used=${metrics?.localUploadParity?.usedPercent ?? 0}%`,
  },
  {
    area: 'frontend',
    name: 'Admin publishing center UX',
    ok: adminIndex.includes('Yayın Kontrol Merkezi') &&
      adminIndex.includes('Blog Yönet') &&
      adminIndex.includes('Mekanlar') &&
      adminIndex.includes('Yorum Moderasyon') &&
      adminIndex.includes('İçerik Ajanları') &&
      adminIndex.includes('Medya Sağlığı') &&
      adminIndex.includes('/api/admin/operations/summary') &&
      adminOperationsSummary.includes('AUTO-DROP OFF') &&
      adminOperationsSummary.includes('3P COOKIE'),
    detail: 'project content, places, moderation, agents, media and safe ops cards visible',
  },
];

const failed = checks.filter((check) => !check.ok);
const backendOk = checks.filter((check) => check.area === 'backend' && check.ok).length;
const frontendOk = checks.filter((check) => check.area === 'frontend' && check.ok).length;
const backendTotal = checks.filter((check) => check.area === 'backend').length;
const frontendTotal = checks.filter((check) => check.area === 'frontend').length;
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'ok' : 'review',
  summary: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    backend: { passed: backendOk, total: backendTotal },
    frontend: { passed: frontendOk, total: frontendTotal },
  },
  checks,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Backend / Frontend Improvement Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Backend: ${backendOk}/${backendTotal}`,
    `- Frontend: ${frontendOk}/${frontendTotal}`,
    '',
    '| Area | Check | Status | Detail |',
    '|---|---|---|---|',
    ...checks.map((check) => `| ${check.area} | ${check.name} | ${check.ok ? 'ok' : 'review'} | ${check.detail} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `backend-frontend-improvement-report: ${report.status.toUpperCase()} backend=${backendOk}/${backendTotal} frontend=${frontendOk}/${frontendTotal}`,
);
process.exit(report.status === 'ok' ? 0 : 1);
