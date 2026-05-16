#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'release-readiness.json');
const outMd = path.join(root, 'docs', 'release-readiness.md');

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

const releaseArtifactFreshness = readJsonSafe('docs/release-artifact-freshness.json');
const releaseHandoffSummary = readJsonSafe('docs/release-handoff-summary.json');
const checks = [
  { name: 'OpenAPI P0 report', ok: exists('docs/openapi-p0-closure-report.json'), artifact: 'docs/openapi-p0-closure-report.json' },
  { name: 'OpenAPI baseline', ok: exists('docs/openapi-route-gap-baseline.json'), artifact: 'docs/openapi-route-gap-baseline.json' },
  { name: 'Release next actions report', ok: exists('docs/release-next-actions-report.json'), artifact: 'docs/release-next-actions-report.json' },
  { name: 'Release artifact freshness gate', ok: releaseArtifactFreshness?.status === 'passed', artifact: 'docs/release-artifact-freshness.json' },
  { name: 'Release handoff summary', ok: exists('docs/release-handoff-summary.json'), artifact: 'docs/release-handoff-summary.json' },
  { name: 'Script surface report', ok: exists('docs/script-surface-report.json'), artifact: 'docs/script-surface-report.json' },
  { name: 'Script canonical surface report', ok: exists('docs/script-canonical-surface-report.json'), artifact: 'docs/script-canonical-surface-report.json' },
  { name: 'Migration duplicate drift report', ok: exists('docs/migration-duplicate-drift-report.json'), artifact: 'docs/migration-duplicate-drift-report.json' },
  { name: 'Unit test report', ok: exists('docs/unit-test-report.json'), artifact: 'docs/unit-test-report.json' },
  { name: 'API contract group report', ok: exists('docs/api-contract-group-report.json'), artifact: 'docs/api-contract-group-report.json' },
  { name: 'API release gate report', ok: exists('docs/api-release-gate-report.json'), artifact: 'docs/api-release-gate-report.json' },
  { name: 'API debug envelope report', ok: exists('docs/api-debug-envelope-report.json'), artifact: 'docs/api-debug-envelope-report.json' },
  { name: 'E2E skip report', ok: exists('docs/e2e-skip-report.json'), artifact: 'docs/e2e-skip-report.json' },
  { name: 'E2E critical coverage report', ok: exists('docs/e2e-critical-coverage-report.json'), artifact: 'docs/e2e-critical-coverage-report.json' },
  { name: 'Build artifact report', ok: exists('docs/build-artifact-report.json'), artifact: 'docs/build-artifact-report.json' },
  { name: 'DB usage audit', ok: exists('docs/db-usage-audit.json'), artifact: 'docs/db-usage-audit.json' },
  { name: 'DB retirement observation report', ok: exists('docs/db-retirement-observation-report.json'), artifact: 'docs/db-retirement-observation-report.json' },
  { name: 'DB P0 quarantine plan', ok: exists('docs/db-p0-quarantine-plan.json'), artifact: 'docs/db-p0-quarantine-plan.json' },
  { name: 'DB observation cadence report', ok: exists('docs/db-observation-cadence-report.json'), artifact: 'docs/db-observation-cadence-report.json' },
  { name: 'DB observation calendar report', ok: exists('docs/db-observation-calendar-report.json'), artifact: 'docs/db-observation-calendar-report.json' },
  { name: 'DB manual decision readiness report', ok: exists('docs/db-manual-decision-readiness-report.json'), artifact: 'docs/db-manual-decision-readiness-report.json' },
  { name: 'DB registry classification report', ok: exists('docs/db-registry-classification-report.json'), artifact: 'docs/db-registry-classification-report.json' },
  { name: 'DB runtime hold plan', ok: exists('docs/db-runtime-hold-plan.json'), artifact: 'docs/db-runtime-hold-plan.json' },
  { name: 'SQL parameter safety gate', ok: exists('docs/sql-parameter-safety-gate.json'), artifact: 'docs/sql-parameter-safety-gate.json' },
  { name: 'DB prod version compare report', ok: exists('docs/db-prod-version-compare-report.json'), artifact: 'docs/db-prod-version-compare-report.json' },
  { name: 'DB index review plan', ok: exists('docs/db-index-review-plan.json'), artifact: 'docs/db-index-review-plan.json' },
  { name: 'DB advisory evidence bundle', ok: exists('docs/db-advisory-evidence-bundle.json'), artifact: 'docs/db-advisory-evidence-bundle.json' },
  { name: 'Zero-result search report', ok: exists('docs/search-zero-result-report.json'), artifact: 'docs/search-zero-result-report.json' },
  { name: 'Local upload parity report', ok: exists('docs/local-upload-parity-report.json'), artifact: 'docs/local-upload-parity-report.json' },
  { name: 'Local upload bucket quota report', ok: exists('docs/local-upload-bucket-quota-report.json'), artifact: 'docs/local-upload-bucket-quota-report.json' },
  { name: 'Local upload classification report', ok: exists('docs/local-upload-candidate-classification.json'), artifact: 'docs/local-upload-candidate-classification.json' },
  { name: 'Local upload archive candidates report', ok: exists('docs/local-upload-archive-candidates.json'), artifact: 'docs/local-upload-archive-candidates.json' },
  { name: 'Local media storage gate', ok: exists('docs/local-media-storage-gate.json'), artifact: 'docs/local-media-storage-gate.json' },
  { name: 'Media readiness report', ok: exists('docs/media-readiness-report.json'), artifact: 'docs/media-readiness-report.json' },
  { name: 'Static image integrity gate', ok: exists('docs/static-image-integrity-report.json'), artifact: 'docs/static-image-integrity-report.json' },
  { name: 'Admin strict role gate', ok: exists('docs/admin-strict-role-gate.json'), artifact: 'docs/admin-strict-role-gate.json' },
  { name: 'Redis runtime health report', ok: exists('docs/redis-runtime-health-report.json'), artifact: 'docs/redis-runtime-health-report.json' },
  { name: 'Warmup safety report', ok: exists('docs/warmup-safety-report.json'), artifact: 'docs/warmup-safety-report.json' },
  { name: 'Cron readiness report', ok: exists('docs/cron-readiness-report.json'), artifact: 'docs/cron-readiness-report.json' },
  { name: 'LLMS/Sitemap auto update gate', ok: exists('docs/llms-sitemap-auto-update-gate.json'), artifact: 'docs/llms-sitemap-auto-update-gate.json' },
  { name: 'Blog rich results report', ok: exists('docs/blog-draft-rich-results-report.json'), artifact: 'docs/blog-draft-rich-results-report.json' },
  { name: 'Blog duplicate risk gate', ok: exists('docs/blog-duplicate-risk-gate.json'), artifact: 'docs/blog-duplicate-risk-gate.json' },
  { name: 'Blog draft quality report', ok: exists('docs/blog-draft-quality-report.json'), artifact: 'docs/blog-draft-quality-report.json' },
  { name: 'Blog publish readiness report', ok: exists('docs/blog-publish-readiness-report.json'), artifact: 'docs/blog-publish-readiness-report.json' },
  { name: 'Blog admin publish queue report', ok: exists('docs/blog-admin-publish-queue-report.json'), artifact: 'docs/blog-admin-publish-queue-report.json' },
  { name: 'Publish all content drafts report', ok: exists('docs/publish-all-content-drafts-report.json'), artifact: 'docs/publish-all-content-drafts-report.json' },
  { name: 'PageSpeed API research report', ok: exists('docs/pagespeed-api-research-report.json'), artifact: 'docs/pagespeed-api-research-report.json' },
  { name: 'PageSpeed API-less Lighthouse report', ok: exists('docs/pagespeed-api-less-lighthouse-report.json'), artifact: 'docs/pagespeed-api-less-lighthouse-report.json' },
  { name: 'PageSpeed live check report', ok: exists('docs/pagespeed-live-check-report.json'), artifact: 'docs/pagespeed-live-check-report.json' },
  { name: 'PageSpeed quota management report', ok: exists('docs/pagespeed-quota-management-report.json'), artifact: 'docs/pagespeed-quota-management-report.json' },
  { name: 'Backend/frontend improvement report', ok: exists('docs/backend-frontend-improvement-report.json'), artifact: 'docs/backend-frontend-improvement-report.json' },
  { name: 'Unit skip report', ok: exists('docs/unit-skip-report.json'), artifact: 'docs/unit-skip-report.json' },
  { name: 'Image manifest', ok: exists('public/images/image-manifest.json'), artifact: 'public/images/image-manifest.json' },
  { name: 'DB-first doc', ok: exists('docs/DB_FIRST_SITE_MANAGEMENT.md'), artifact: 'docs/DB_FIRST_SITE_MANAGEMENT.md' },
  { name: 'Public acceptance doc', ok: exists('docs/MVP_PUBLIC_ACCEPTANCE.md'), artifact: 'docs/MVP_PUBLIC_ACCEPTANCE.md' },
  { name: 'Astro frontend stack doc', ok: exists('docs/ASTRO_SSR_FRONTEND_STACK.md'), artifact: 'docs/ASTRO_SSR_FRONTEND_STACK.md' },
  { name: 'Migration duplicate remediation plan', ok: exists('docs/MIGRATION_DUPLICATE_REMEDIATION.md'), artifact: 'docs/MIGRATION_DUPLICATE_REMEDIATION.md' },
];

const openapiP0 = readJsonSafe('docs/openapi-p0-closure-report.json');
const openapiMissing = Number(openapiP0?.totalMissing || 0);
const buildArtifactReport = readJsonSafe('docs/build-artifact-report.json');
const releaseNextActions = readJsonSafe('docs/release-next-actions-report.json');
const unitTestReport = readJsonSafe('docs/unit-test-report.json');
const apiContractGroupReport = readJsonSafe('docs/api-contract-group-report.json');
const apiReleaseGateReport = readJsonSafe('docs/api-release-gate-report.json');
const apiDebugEnvelope = readJsonSafe('docs/api-debug-envelope-report.json');
const e2eReport = readJsonSafe('docs/e2e-report.json');
const e2eSkipReport = readJsonSafe('docs/e2e-skip-report.json');
const e2eCriticalCoverage = readJsonSafe('docs/e2e-critical-coverage-report.json');
const dbUsageAudit = readJsonSafe('docs/db-usage-audit.json');
const dbRetirementObservation = readJsonSafe('docs/db-retirement-observation-report.json');
const dbP0QuarantinePlan = readJsonSafe('docs/db-p0-quarantine-plan.json');
const dbObservationCadence = readJsonSafe('docs/db-observation-cadence-report.json');
const dbObservationCalendar = readJsonSafe('docs/db-observation-calendar-report.json');
const dbManualDecisionReadiness = readJsonSafe('docs/db-manual-decision-readiness-report.json');
const dbRegistryClassification = readJsonSafe('docs/db-registry-classification-report.json');
const dbRuntimeHoldPlan = readJsonSafe('docs/db-runtime-hold-plan.json');
const sqlParameterSafety = readJsonSafe('docs/sql-parameter-safety-gate.json');
const dbProdVersionCompare = readJsonSafe('docs/db-prod-version-compare-report.json');
const dbIndexReviewPlan = readJsonSafe('docs/db-index-review-plan.json');
const dbAdvisoryEvidence = readJsonSafe('docs/db-advisory-evidence-bundle.json');
const searchZeroResultReport = readJsonSafe('docs/search-zero-result-report.json');
const localUploadParity = readJsonSafe('docs/local-upload-parity-report.json');
const localUploadBucketQuota = readJsonSafe('docs/local-upload-bucket-quota-report.json');
const localUploadClassification = readJsonSafe('docs/local-upload-candidate-classification.json');
const localUploadArchiveCandidates = readJsonSafe('docs/local-upload-archive-candidates.json');
const localMediaStorageGate = readJsonSafe('docs/local-media-storage-gate.json');
const mediaReadiness = readJsonSafe('docs/media-readiness-report.json');
const staticImageIntegrity = readJsonSafe('docs/static-image-integrity-report.json');
const adminStrictRoleGate = readJsonSafe('docs/admin-strict-role-gate.json');
const unitSkipReport = readJsonSafe('docs/unit-skip-report.json');
const redisRuntimeHealth = readJsonSafe('docs/redis-runtime-health-report.json');
const warmupSafety = readJsonSafe('docs/warmup-safety-report.json');
const cronReadiness = readJsonSafe('docs/cron-readiness-report.json');
const llmsSitemapAutoUpdate = readJsonSafe('docs/llms-sitemap-auto-update-gate.json');
const blogDuplicateRiskGate = readJsonSafe('docs/blog-duplicate-risk-gate.json');
const blogDraftRichResults = readJsonSafe('docs/blog-draft-rich-results-report.json');
const blogDraftQuality = readJsonSafe('docs/blog-draft-quality-report.json');
const blogPublishReadiness = readJsonSafe('docs/blog-publish-readiness-report.json');
const blogAdminPublishQueue = readJsonSafe('docs/blog-admin-publish-queue-report.json');
const publishAllContentDrafts = readJsonSafe('docs/publish-all-content-drafts-report.json');
const pagespeedApiResearch = readJsonSafe('docs/pagespeed-api-research-report.json');
const pagespeedApiLessLighthouse = readJsonSafe('docs/pagespeed-api-less-lighthouse-report.json');
const pagespeedLiveCheck = readJsonSafe('docs/pagespeed-live-check-report.json');
const pagespeedQuotaManagement = readJsonSafe('docs/pagespeed-quota-management-report.json');
const backendFrontendImprovements = readJsonSafe('docs/backend-frontend-improvement-report.json');
const migrationDuplicates = readJsonSafe('docs/migration-duplicate-report.json');
const migrationDuplicateBaseline = readJsonSafe('docs/migration-duplicate-baseline.json');
const migrationDuplicateDrift = readJsonSafe('docs/migration-duplicate-drift-report.json');
const scriptCanonicalSurface = readJsonSafe('docs/script-canonical-surface-report.json');
const duplicateNumbers = migrationDuplicates?.duplicateNumbers || {};
const duplicateSlugs = migrationDuplicates?.duplicateSlugs || {};
const migrationDuplicateNumberCount = Object.keys(duplicateNumbers).length;
const migrationDuplicateSlugCount = Object.keys(duplicateSlugs).length;
const advisories = [];
const notes = [];
const duplicateBaselineMatches =
  stableStringify(duplicateNumbers) === stableStringify(migrationDuplicateBaseline?.numberDuplicates || {}) &&
  stableStringify(duplicateSlugs) === stableStringify(migrationDuplicateBaseline?.slugDuplicates || {});

if (migrationDuplicateNumberCount > 0 || migrationDuplicateSlugCount > 0) {
  const duplicateDetail =
    `${migrationDuplicateNumberCount} duplicate number group(s), ` +
    `${migrationDuplicateSlugCount} duplicate slug group(s). ` +
    'Dosya rename prod schema_migrations versiyonlarını etkileyebileceği için docs/MIGRATION_DUPLICATE_REMEDIATION.md planıyla yönetilmeli.';

  if (duplicateBaselineMatches) {
    notes.push({
      name: 'Immutable migration duplicate baseline',
      severity: 'info',
      detail: `${duplicateDetail} Baseline ile birebir eşleşiyor; yeni regresyon yok.`,
      artifact: 'docs/migration-duplicate-report.json',
    });
  } else {
    advisories.push({
      name: 'Migration duplicate drift',
      severity: 'advisory',
      detail: `${duplicateDetail} Baseline dışı değişim var; remediation planı güncellenmeli.`,
      artifact: 'docs/migration-duplicate-report.json',
    });
  }
}

if (migrationDuplicateDrift?.status) {
  if (migrationDuplicateDrift.status !== 'ok') {
    advisories.push({
      name: 'Migration duplicate drift',
      severity: 'advisory',
      detail: `Migration duplicate baseline drift=${migrationDuplicateDrift.status}; yeni duplicate veya baseline dışı değişim incelenmeli.`,
      artifact: 'docs/migration-duplicate-drift-report.json',
    });
  } else {
    notes.push({
      name: 'Migration duplicate drift',
      severity: 'info',
      detail: `Duplicate baseline uyumlu; ${migrationDuplicateDrift?.summary?.duplicateNumberGroups ?? 0} number group, ${migrationDuplicateDrift?.summary?.duplicateSlugGroups ?? 0} slug group immutable baseline içinde.`,
      artifact: 'docs/migration-duplicate-drift-report.json',
    });
  }
}

if (scriptCanonicalSurface?.status) {
  notes.push({
    name: 'Script canonical surface',
    severity: scriptCanonicalSurface.status === 'ok' ? 'info' : 'advisory',
    detail: `${scriptCanonicalSurface?.summary?.canonicalCount ?? 0} canonical command, ${scriptCanonicalSurface?.summary?.missingCanonicalCount ?? 0} missing, ${scriptCanonicalSurface?.summary?.totalScripts ?? 0} total package scripts.`,
    artifact: 'docs/script-canonical-surface-report.json',
  });
}

if (blogDuplicateRiskGate?.status) {
  notes.push({
    name: 'Blog duplicate risk gate',
    severity: blogDuplicateRiskGate.status === 'ok' ? 'info' : 'advisory',
    detail: `${blogDuplicateRiskGate?.summary?.selectedDuplicateRisk ?? 0} selected duplicate-risk topic; ${blogDuplicateRiskGate?.summary?.skippedDuplicateRisk ?? 0} duplicate-risk topic skipped, auto-publish kapali.`,
    artifact: 'docs/blog-duplicate-risk-gate.json',
  });
}

if (buildArtifactReport?.status === 'ok') {
  if (buildArtifactReport?.distClient?.withinSoftBudget === false) {
    advisories.push({
      name: 'Build artifact size over soft budget',
      severity: 'advisory',
      detail: `dist/client toplam boyutu ${buildArtifactReport?.distClient?.totalMb ?? '?'} MB. 260 MB soft budget üzerinde.`,
      artifact: 'docs/build-artifact-report.json',
    });
  } else {
    notes.push({
      name: 'Build artifact budget snapshot',
      severity: 'info',
      detail: `dist/client ${buildArtifactReport?.distClient?.totalMb ?? '?'} MB, _astro budget ${buildArtifactReport?.astroAssets?.withinBudget ? 'uyumlu' : 'inceleme gerekli'}.`,
      artifact: 'docs/build-artifact-report.json',
    });
  }
}

if (releaseNextActions?.status) {
  notes.push({
    name: 'Release next actions',
    severity: releaseNextActions.status === 'ok' ? 'info' : 'advisory',
    detail: `${releaseNextActions?.summary?.actionCount ?? 0} aksiyon, ${releaseNextActions?.summary?.blockingActionCount ?? 0} kanıt/gözlem bekleyen madde.`,
    artifact: 'docs/release-next-actions-report.json',
  });
}

if (releaseArtifactFreshness?.status) {
  notes.push({
    name: 'Release artifact freshness',
    severity: releaseArtifactFreshness.status === 'passed' ? 'info' : 'advisory',
    detail: `${releaseArtifactFreshness.status}; stale/missing=${(releaseArtifactFreshness.results || []).filter((item) => item.status !== 'fresh').length}, max age=${releaseArtifactFreshness.maxAgeMinutes ?? 'unknown'} minutes.`,
    artifact: 'docs/release-artifact-freshness.json',
  });
}

if (releaseHandoffSummary?.generatedAt) {
  notes.push({
    name: 'Release handoff summary',
    severity: 'info',
    detail: `Generated at ${releaseHandoffSummary.generatedAt}; status=${releaseHandoffSummary.releaseStatus || 'unknown'}, local-storage=${releaseHandoffSummary.gates?.localMediaStorage || 'unknown'}, pagespeed-api-less=${releaseHandoffSummary.gates?.pagespeedApiLessLighthouse || 'unknown'}.`,
    artifact: 'docs/release-handoff-summary.json',
  });
}

if (unitTestReport?.status) {
  notes.push({
    name: 'Unit tests',
    severity: unitTestReport.status === 'passed' ? 'info' : 'advisory',
    detail: `${unitTestReport?.testFiles?.passed ?? 0}/${unitTestReport?.testFiles?.total ?? 0} test file, ${unitTestReport?.tests?.passed ?? 0}/${unitTestReport?.tests?.total ?? 0} test passed.`,
    artifact: 'docs/unit-test-report.json',
  });
}

if (apiContractGroupReport?.status) {
  notes.push({
    name: 'API contract groups',
    severity: apiContractGroupReport.status === 'passed' ? 'info' : 'advisory',
    detail: `${apiContractGroupReport?.groups?.length ?? 0} API contract group ${apiContractGroupReport.status}.`,
    artifact: 'docs/api-contract-group-report.json',
  });
}

if (apiContractGroupReport?.coverageGaps?.length) {
  notes.push({
    name: 'API contract coverage gaps',
    severity: 'info',
    detail: `${apiContractGroupReport.coverageGaps.length} coverage gap raporlandı: ${apiContractGroupReport.coverageGaps.map((item) => item.group).join(', ')}.`,
    artifact: 'docs/api-contract-group-report.json',
  });
}

if (apiReleaseGateReport?.status) {
  notes.push({
    name: 'API release gate report',
    severity: apiReleaseGateReport.status === 'passed' ? 'info' : 'advisory',
    detail: `${apiReleaseGateReport?.summary?.passedChecks ?? 0}/${apiReleaseGateReport?.summary?.totalChecks ?? 0} API release checks passed.`,
    artifact: 'docs/api-release-gate-report.json',
  });
}

if (apiDebugEnvelope?.status) {
  notes.push({
    name: 'API debug envelope',
    severity: apiDebugEnvelope.status === 'ok' ? 'info' : 'advisory',
    detail: `${apiDebugEnvelope?.summary?.passed ?? 0}/${apiDebugEnvelope?.summary?.total ?? 0} debug envelope check passed. RequestId, X-Request-ID and frontend fetch diagnostics are tracked.`,
    artifact: 'docs/api-debug-envelope-report.json',
  });
}

if (e2eReport?.status) {
  notes.push({
    name: 'E2E report',
    severity: e2eReport.status === 'passed' ? 'info' : 'advisory',
    detail: `${e2eReport.suite || 'unknown'} / ${e2eReport.project || 'unknown'}: ${e2eReport?.summary?.passed ?? 0}/${e2eReport?.summary?.testCount ?? 0} passed, ${e2eReport?.summary?.failed ?? 0} failed.`,
    artifact: 'docs/e2e-report.json',
  });
}

if (e2eSkipReport?.status) {
  notes.push({
    name: 'E2E skip report',
    severity: e2eSkipReport?.summary?.undocumentedCount > 0 ? 'advisory' : 'info',
    detail: `${e2eSkipReport?.summary?.declarationCount ?? 0} E2E skip declaration, ${e2eSkipReport?.summary?.undocumentedCount ?? 0} undocumented.`,
    artifact: 'docs/e2e-skip-report.json',
  });
}

if (e2eCriticalCoverage?.status) {
  notes.push({
    name: 'E2E critical coverage',
    severity: e2eCriticalCoverage.status === 'ok' ? 'info' : 'advisory',
    detail: `${e2eCriticalCoverage?.summary?.coveredCount ?? 0}/${e2eCriticalCoverage?.summary?.flowCount ?? 0} critical flow covered, ${e2eCriticalCoverage?.summary?.missingCount ?? 0} missing.`,
    artifact: 'docs/e2e-critical-coverage-report.json',
  });
}

if (dbUsageAudit?.status) {
  notes.push({
    name: 'DB usage audit',
    severity: dbUsageAudit.status === 'ok' ? 'info' : 'advisory',
    detail:
      dbUsageAudit.status === 'ok'
        ? `${dbUsageAudit?.summary?.tableCount ?? 0} tablo, ${dbUsageAudit?.summary?.unusedIndexCount ?? 0} reviewable unused-index adayı, ${dbUsageAudit?.summary?.protectedZeroScanIndexCount ?? 0} protected zero-scan index, ${dbUsageAudit?.summary?.speculativeCandidateCount ?? 0} speculative zero-row candidate raporlandı.`
        : `DB usage audit unavailable: ${dbUsageAudit?.detail || 'bilinmeyen hata'}`,
    artifact: 'docs/db-usage-audit.json',
  });
}

if (dbRetirementObservation?.status) {
  if ((dbRetirementObservation?.summary?.p0QuarantineCandidateCount ?? 0) > 0) {
    advisories.push({
      name: 'DB P0 retirement observation',
      severity: 'advisory',
      detail: `${dbRetirementObservation.summary.p0QuarantineCandidateCount} P0 quarantine candidate gözlem kuyruğunda. Runtime hold: ${dbRetirementObservation.summary.p0RuntimeHoldCount ?? 0}. Otomatik drop yok; owner/source/migration kanıtı ve production gözlemi gerekir.`,
      artifact: 'docs/db-retirement-observation-report.json',
    });
  }
  notes.push({
    name: 'DB retirement observation',
    severity: 'info',
    detail:
      dbRetirementObservation.status === 'observation_required'
        ? `P0 quarantine=${dbRetirementObservation?.summary?.p0QuarantineCandidateCount ?? 0}, runtime hold=${dbRetirementObservation?.summary?.p0RuntimeHoldCount ?? 0}, P1=${dbRetirementObservation?.summary?.p1ReviewCandidateCount ?? 0}, P2=${dbRetirementObservation?.summary?.p2UnusedIndexCandidateCount ?? 0}. Otomatik drop yok; en erken aksiyon ${dbRetirementObservation?.policy?.earliestActionAt ?? 'bilinmiyor'}.`
        : `DB retirement observation unavailable: ${dbRetirementObservation?.status}`,
    artifact: 'docs/db-retirement-observation-report.json',
  });
}

if (dbP0QuarantinePlan?.status) {
  notes.push({
    name: 'DB P0 quarantine plan',
    severity: dbP0QuarantinePlan.status === 'advisory' ? 'advisory' : 'info',
    detail: `${dbP0QuarantinePlan?.summary?.quarantineCandidateCount ?? 0} quarantine candidate, ${dbP0QuarantinePlan?.summary?.runtimeHoldCount ?? 0} runtime hold. Automatic drop/quarantine yok.`,
    artifact: 'docs/db-p0-quarantine-plan.json',
  });
}

if (dbObservationCadence?.status) {
  notes.push({
    name: 'DB observation cadence',
    severity: dbObservationCadence.status === 'stale' ? 'advisory' : 'info',
    detail: `${dbObservationCadence?.summary?.snapshotCount ?? 0}/${dbObservationCadence?.policy?.observationDays ?? 0} snapshot, ${dbObservationCadence?.summary?.missingDays ?? 0} eksik gün, status=${dbObservationCadence.status}.`,
    artifact: 'docs/db-observation-cadence-report.json',
  });
}

if (dbObservationCalendar?.status) {
  notes.push({
    name: 'DB observation calendar',
    severity: dbObservationCalendar.status === 'complete' ? 'info' : 'advisory',
    detail: `${dbObservationCalendar?.summary?.completeCount ?? 0}/${dbObservationCalendar?.policy?.observationDays ?? 0} observation day complete; next snapshot=${dbObservationCalendar?.summary?.nextSnapshotDueAt || 'unknown'}, earliest action=${dbObservationCalendar?.summary?.earliestActionAt || 'unknown'}, auto drop yok.`,
    artifact: 'docs/db-observation-calendar-report.json',
  });
}

if (dbManualDecisionReadiness?.status) {
  notes.push({
    name: 'DB manual decision readiness',
    severity: dbManualDecisionReadiness.status === 'manual_review_ready' ? 'advisory' : 'info',
    detail: `${dbManualDecisionReadiness?.summary?.readyForManualPrCount ?? 0} ready, ${dbManualDecisionReadiness?.summary?.waitingForEvidenceCount ?? 0} waiting, ${dbManualDecisionReadiness?.summary?.runtimeHoldCount ?? 0} runtime hold.`,
    artifact: 'docs/db-manual-decision-readiness-report.json',
  });
}

if (dbRegistryClassification?.status) {
  notes.push({
    name: 'DB registry classification',
    severity: 'advisory',
    detail: `${dbRegistryClassification?.summary?.unclassifiedCount ?? 0} unclassified table, ${dbRegistryClassification?.summary?.unusedIndexCount ?? 0} reviewable unused index, ${dbRegistryClassification?.summary?.protectedZeroScanIndexCount ?? 0} protected zero-scan index. Automatic DB drop disabled.`,
    artifact: 'docs/db-registry-classification-report.json',
  });
}

if (dbRuntimeHoldPlan?.status) {
  notes.push({
    name: 'DB runtime hold plan',
    severity: dbRuntimeHoldPlan.status === 'clear' ? 'info' : 'advisory',
    detail: `${dbRuntimeHoldPlan?.summary?.table ?? 'unknown'} ${dbRuntimeHoldPlan.status}; refs=${dbRuntimeHoldPlan?.summary?.runtimeReferenceCount ?? 0}, incompatible contracts=${dbRuntimeHoldPlan?.summary?.incompatibleContractCount ?? 0}, auto drop yok.`,
    artifact: 'docs/db-runtime-hold-plan.json',
  });
}

if (sqlParameterSafety?.status) {
  notes.push({
    name: 'SQL parameter safety',
    severity: sqlParameterSafety.status === 'ok' ? 'info' : 'blocker',
    detail: `${sqlParameterSafety?.summary?.findingCount ?? 0} unsafe SQL parameter pattern found.`,
    artifact: 'docs/sql-parameter-safety-gate.json',
  });
}

if (dbProdVersionCompare?.status) {
  notes.push({
    name: 'DB prod/current version compare',
    severity: dbProdVersionCompare.status === 'ok' ? 'info' : 'advisory',
    detail:
      dbProdVersionCompare.status === 'ok'
        ? `${dbProdVersionCompare?.database?.source ?? 'unknown'} ${dbProdVersionCompare?.database?.host ?? 'unknown'}/${dbProdVersionCompare?.database?.database ?? 'unknown'}: ${dbProdVersionCompare?.summary?.appliedSourceMatchCount ?? 0}/${dbProdVersionCompare?.summary?.sourceMigrationFileCount ?? 0} source migration matched, ${dbProdVersionCompare?.summary?.sourcePendingCount ?? 0} pending/unmatched, ${dbProdVersionCompare?.summary?.dbOnlyCount ?? 0} DB-only.`
        : `DB prod/current version compare unavailable: ${dbProdVersionCompare?.detail || 'bilinmeyen hata'}`,
    artifact: 'docs/db-prod-version-compare-report.json',
  });
}

if (dbIndexReviewPlan?.status) {
  notes.push({
    name: 'DB index review plan',
    severity: 'info',
    detail: `${dbIndexReviewPlan?.summary?.reviewableIndexCount ?? 0} reviewable index candidate, ${dbIndexReviewPlan?.summary?.highRiskCount ?? 0} high-risk keep/review. Automatic index drop disabled.`,
    artifact: 'docs/db-index-review-plan.json',
  });
}

if (dbAdvisoryEvidence?.status) {
  notes.push({
    name: 'DB advisory evidence bundle',
    severity: dbAdvisoryEvidence.status === 'manual_review_ready' ? 'advisory' : 'info',
    detail: `${dbAdvisoryEvidence?.summary?.p0QuarantineCandidateCount ?? 0} quarantine candidate, ${dbAdvisoryEvidence?.summary?.runtimeHoldCount ?? 0} runtime hold, observation ${dbAdvisoryEvidence?.summary?.observationSnapshots ?? 0}/${dbAdvisoryEvidence?.summary?.observationDaysRequired ?? 0}. Automatic DB/index drop disabled.`,
    artifact: 'docs/db-advisory-evidence-bundle.json',
  });
}

if (searchZeroResultReport?.status) {
  notes.push({
    name: 'Zero-result search report',
    severity: searchZeroResultReport.status === 'ok' ? 'info' : 'advisory',
    detail:
      searchZeroResultReport.status === 'ok'
        ? `${searchZeroResultReport?.summary?.unresolvedCount ?? 0} unresolved query / ${searchZeroResultReport?.summary?.unresolvedOccurrences ?? 0} occurrence.`
        : `Zero-result search report unavailable: ${searchZeroResultReport?.detail || 'bilinmeyen hata'}`,
    artifact: 'docs/search-zero-result-report.json',
  });
}

if (localUploadParity?.status) {
  notes.push({
    name: 'Local upload parity',
    severity: localUploadParity.status === 'ok' ? 'info' : 'advisory',
    detail:
      localUploadParity.status === 'ok'
        ? `${localUploadParity?.summary?.uploadFileCount ?? 0} upload dosyası, ${localUploadParity?.summary?.missingReferencedFileCount ?? 0} missing ref, ${localUploadParity?.summary?.unreferencedCandidateCount ?? 0} unreferenced candidate.`
        : `${localUploadParity?.summary?.missingReferencedFileCount ?? 0} missing upload reference incelenmeli; ${localUploadParity?.summary?.unreferencedCandidateCount ?? 0} unreferenced candidate raporlandı.`,
    artifact: 'docs/local-upload-parity-report.json',
  });
}

if (localUploadBucketQuota?.status) {
  const bucketSummary = `${localUploadBucketQuota?.summary?.bucketCount ?? 0} bucket, ${localUploadBucketQuota?.summary?.blockerCount ?? 0} blocker, ${localUploadBucketQuota?.summary?.reviewCount ?? 0} review, ${localUploadBucketQuota?.summary?.advisoryCount ?? 0} advisory.`;
  if (localUploadBucketQuota.status === 'blocked') {
    advisories.push({
      name: 'Local upload bucket quota blocked',
      severity: 'advisory',
      detail: `${bucketSummary} Local storage kuralı korunmalı; otomatik silme yok.`,
      artifact: 'docs/local-upload-bucket-quota-report.json',
    });
  } else {
    notes.push({
      name: 'Local upload bucket quota',
      severity: localUploadBucketQuota.status === 'ok' ? 'info' : 'advisory',
      detail: bucketSummary,
      artifact: 'docs/local-upload-bucket-quota-report.json',
    });
  }
}

if (localUploadClassification?.status) {
  notes.push({
    name: 'Local upload candidate classification',
    severity: 'info',
    detail: `${localUploadClassification?.summary?.total ?? 0} candidate: ${localUploadClassification?.summary?.observed ?? 0} observed, ${localUploadClassification?.summary?.archive_candidate ?? 0} archive candidate, ${localUploadClassification?.summary?.deletable_review ?? 0} delete-review. Otomatik silme yok.`,
    artifact: 'docs/local-upload-candidate-classification.json',
  });
}

if (localUploadArchiveCandidates?.status) {
  const deleteReview = localUploadArchiveCandidates?.summary?.deletableReview ?? 0;
  notes.push({
    name: 'Local upload archive candidates',
    severity: deleteReview > 0 ? 'advisory' : 'info',
    detail: `${localUploadArchiveCandidates?.summary?.total ?? 0} manual archive PR candidate, ${deleteReview} delete-review. Otomatik silme yok.`,
    artifact: 'docs/local-upload-archive-candidates.json',
  });
}

if (localMediaStorageGate?.status) {
  const localStorageOk =
    localMediaStorageGate.status === 'ok' &&
    localMediaStorageGate.localStorageOnly === true &&
    localMediaStorageGate.externalObjectStorageConfigured === false;
  notes.push({
    name: 'Local media storage gate',
    severity: localStorageOk ? 'info' : 'advisory',
    detail: `local-only=${localMediaStorageGate.localStorageOnly ? 'yes' : 'no'}, external-object-storage=${localMediaStorageGate.externalObjectStorageConfigured ? 'yes' : 'no'}, live checks=${(localMediaStorageGate.liveChecks || []).filter((item) => item.ok).length}/${localMediaStorageGate.liveChecks?.length ?? 0}, failed patterns=${localMediaStorageGate.failures?.length ?? 0}.`,
    artifact: 'docs/local-media-storage-gate.json',
  });
}

if (staticImageIntegrity?.status) {
  notes.push({
    name: 'Static image integrity gate',
    severity: staticImageIntegrity.status === 'pass' ? 'info' : 'advisory',
    detail: `${staticImageIntegrity?.summary?.scanned ?? 0} local public image checked; failed=${staticImageIntegrity?.summary?.failed ?? 0}, review=${staticImageIntegrity?.summary?.review ?? 0}. CDN/object-storage varsayımı yok.`,
    artifact: 'docs/static-image-integrity-report.json',
  });
}

if (mediaReadiness?.status) {
  notes.push({
    name: 'Media readiness',
    severity: mediaReadiness.status === 'ok' ? 'info' : 'advisory',
    detail: `${mediaReadiness?.summary?.passed ?? 0}/${mediaReadiness?.summary?.checks ?? 0} media checks passed; uploads=${mediaReadiness?.summary?.uploadFiles ?? 0}, public-images=${mediaReadiness?.summary?.publicImages ?? 0}, local-storage-only=${mediaReadiness?.policy?.localStorageOnly ? 'yes' : 'no'}.`,
    artifact: 'docs/media-readiness-report.json',
  });
}

if (adminStrictRoleGate?.status) {
  notes.push({
    name: 'Admin strict role gate',
    severity: adminStrictRoleGate.status === 'ok' ? 'info' : 'advisory',
    detail: `${adminStrictRoleGate?.summary?.ok ?? 0}/${adminStrictRoleGate?.summary?.checked ?? 0} high-impact admin endpoint strict role checks passed; review=${adminStrictRoleGate?.summary?.review ?? 0}.`,
    artifact: 'docs/admin-strict-role-gate.json',
  });
}

if (unitSkipReport?.status) {
  notes.push({
    name: 'Unit skip report',
    severity: unitSkipReport?.summary?.undocumentedCount > 0 ? 'advisory' : 'info',
    detail: `${unitSkipReport?.observedUnitSkips?.testFiles ?? 0} skipped test file, ${unitSkipReport?.observedUnitSkips?.tests ?? 0} skipped test, ${unitSkipReport?.summary?.undocumentedCount ?? 0} undocumented skip declaration.`,
    artifact: 'docs/unit-skip-report.json',
  });
}

if (redisRuntimeHealth?.status) {
  notes.push({
    name: 'Redis runtime health',
    severity: redisRuntimeHealth.status === 'ok' ? 'info' : 'advisory',
    detail: `${redisRuntimeHealth.status}; ${redisRuntimeHealth?.redis?.host ?? 'unknown'}:${redisRuntimeHealth?.redis?.port ?? '?'} ping=${redisRuntimeHealth?.redis?.pingOk ? 'ok' : 'fail'}. Fallback release blocker değil.`,
    artifact: 'docs/redis-runtime-health-report.json',
  });
}

if (warmupSafety?.status) {
  notes.push({
    name: 'Warmup safety',
    severity: warmupSafety.status === 'ok' ? 'info' : 'advisory',
    detail: `${warmupSafety.status}; warmup yeni port/dev server açmamalı ve sadece mevcut base URL fetch etmelidir.`,
    artifact: 'docs/warmup-safety-report.json',
  });
}

if (cronReadiness?.status) {
  notes.push({
    name: 'Cron readiness',
    severity: cronReadiness.status === 'ok' ? 'info' : 'advisory',
    detail: `${cronReadiness?.summary?.presentJobCount ?? 0}/${cronReadiness?.summary?.requiredJobCount ?? 0} managed cron job preview içinde mevcut.`,
    artifact: 'docs/cron-readiness-report.json',
  });
}

if (llmsSitemapAutoUpdate?.status) {
  notes.push({
    name: 'LLMS/Sitemap auto update',
    severity: llmsSitemapAutoUpdate.status === 'ok' ? 'info' : 'advisory',
    detail: `${llmsSitemapAutoUpdate?.summary?.ok ?? 0}/${llmsSitemapAutoUpdate?.summary?.checks ?? 0} auto-update check geçti. llms.txt, llms-full.txt, sitemap index, section sitemap, dynamic sitemap ve robots discovery izleniyor.`,
    artifact: 'docs/llms-sitemap-auto-update-gate.json',
  });
}

if (blogDraftRichResults?.status) {
  notes.push({
    name: 'Blog rich results',
    severity: blogDraftRichResults.status === 'ok' ? 'info' : 'advisory',
    detail: `${blogDraftRichResults?.summary?.ok ?? 0}/${blogDraftRichResults?.summary?.drafts ?? 0} blog draft rich results/schema parity check geçti; review=${blogDraftRichResults?.summary?.review ?? 0}.`,
    artifact: 'docs/blog-draft-rich-results-report.json',
  });
}

if (blogDraftQuality?.status) {
  notes.push({
    name: 'Blog draft quality',
    severity: blogDraftQuality.status === 'ok' ? 'info' : 'advisory',
    detail: `${blogDraftQuality?.summary?.ok ?? 0}/${blogDraftQuality?.summary?.drafts ?? 0} blog draft content quality/source safety check gecti; review=${blogDraftQuality?.summary?.review ?? 0}.`,
    artifact: 'docs/blog-draft-quality-report.json',
  });
}

if (blogPublishReadiness?.status) {
  const blogPublishReady = ['ready_for_admin_publish_review', 'published'].includes(
    blogPublishReadiness.status,
  );
  const blogPublishDetail =
    blogPublishReadiness.status === 'published'
      ? `${blogPublishReadiness?.summary?.publishedOrExisting ?? 0} blog draft prod ortamda published/existing; issues=${blogPublishReadiness?.issues?.length ?? 0}, autoPublish=false.`
      : `${blogPublishReadiness?.summary?.pendingBlogDrafts ?? 0} pending blog draft admin publish review icin hazir; issues=${blogPublishReadiness?.issues?.length ?? 0}, autoPublish=false.`;
  notes.push({
    name: 'Blog publish readiness',
    severity: blogPublishReady ? 'info' : 'advisory',
    detail: blogPublishDetail,
    artifact: 'docs/blog-publish-readiness-report.json',
  });
}

if (blogAdminPublishQueue?.status) {
  notes.push({
    name: 'Blog admin publish queue',
    severity: ['ready_for_admin_review', 'published'].includes(blogAdminPublishQueue.status) ? 'info' : 'advisory',
    detail: `${blogAdminPublishQueue?.summary?.draftCount ?? 0} blog draft admin review kuyrugunda; quality=${blogAdminPublishQueue?.summary?.qualityOk ?? 0}, rich=${blogAdminPublishQueue?.summary?.richResultsOk ?? 0}, autoPublish=false.`,
    artifact: 'docs/blog-admin-publish-queue-report.json',
  });
}

if (publishAllContentDrafts?.status) {
  notes.push({
    name: 'Publish all content drafts',
    severity: publishAllContentDrafts.status === 'ok' ? 'info' : 'advisory',
    detail: `${publishAllContentDrafts?.remainingDraftLike?.length ?? 0} draft-like content remains; city_content_drafts updated=${publishAllContentDrafts?.updates?.find?.((item) => item.table === 'city_content_drafts')?.updated ?? 0}, moderation auto-approved=${publishAllContentDrafts?.policy?.moderationQueuesAutoApproved ? 'yes' : 'no'}.`,
    artifact: 'docs/publish-all-content-drafts-report.json',
  });
}

if (pagespeedApiResearch?.status) {
  notes.push({
    name: 'PageSpeed API research',
    severity: pagespeedApiResearch.status === 'ok' ? 'info' : 'advisory',
    detail: `PageSpeed API service enabled=${pagespeedApiResearch?.service?.enabled ? 'yes' : 'no'}, local-storage policy=${pagespeedApiResearch?.usagePolicy?.localStorageRule ? 'documented' : 'missing'}.`,
    artifact: 'docs/pagespeed-api-research-report.json',
  });
}

if (pagespeedApiLessLighthouse?.status) {
  notes.push({
    name: 'PageSpeed API-less Lighthouse',
    severity: pagespeedApiLessLighthouse.status === 'failed' ? 'advisory' : 'info',
    detail: `${pagespeedApiLessLighthouse?.summary?.ok ?? 0}/${pagespeedApiLessLighthouse?.summary?.checks ?? 0} Lighthouse CLI check ok; API used=${pagespeedApiLessLighthouse.apiUsed ? 'yes' : 'no'}, status=${pagespeedApiLessLighthouse.status}, perf=${pagespeedApiLessLighthouse?.results?.[0]?.scores?.performance ?? 'n/a'}, best=${pagespeedApiLessLighthouse?.results?.[0]?.scores?.bestPractices ?? 'n/a'}, seo=${pagespeedApiLessLighthouse?.results?.[0]?.scores?.seo ?? 'n/a'}.`,
    artifact: 'docs/pagespeed-api-less-lighthouse-report.json',
  });
}

if (pagespeedLiveCheck?.status) {
  notes.push({
    name: 'PageSpeed live check',
    severity: pagespeedLiveCheck.status === 'ok' ? 'info' : 'advisory',
    detail: `${pagespeedLiveCheck?.summary?.ok ?? 0}/${pagespeedLiveCheck?.summary?.checks ?? 0} live checks ok; quota-limited=${pagespeedLiveCheck?.summary?.quotaLimited ?? 0}.`,
    artifact: 'docs/pagespeed-live-check-report.json',
  });
}

if (pagespeedQuotaManagement?.status) {
  notes.push({
    name: 'PageSpeed quota management',
    severity: pagespeedQuotaManagement.status === 'review' ? 'advisory' : 'info',
    detail: `Quota management marked=${pagespeedQuotaManagement.managementMarked ? 'yes' : 'no'}, completed=${pagespeedQuotaManagement.quotaManagementCompleted ? 'yes' : 'no'}, live status=${pagespeedQuotaManagement?.liveCheck?.status ?? 'unknown'}, quota-limited=${pagespeedQuotaManagement?.liveCheck?.quotaLimited ?? 0}.`,
    artifact: 'docs/pagespeed-quota-management-report.json',
  });
}

if (backendFrontendImprovements?.status) {
  notes.push({
    name: 'Backend/frontend improvements',
    severity: backendFrontendImprovements.status === 'ok' ? 'info' : 'advisory',
    detail: `${backendFrontendImprovements?.summary?.passed ?? 0}/${backendFrontendImprovements?.summary?.total ?? 0} improvement checks passed; backend=${backendFrontendImprovements?.summary?.backend?.passed ?? 0}/${backendFrontendImprovements?.summary?.backend?.total ?? 0}, frontend=${backendFrontendImprovements?.summary?.frontend?.passed ?? 0}/${backendFrontendImprovements?.summary?.frontend?.total ?? 0}.`,
    artifact: 'docs/backend-frontend-improvement-report.json',
  });
}

const failed = checks.filter((c) => !c.ok);
const status =
  failed.length > 0
    ? 'blocked'
    : openapiMissing === 0 && advisories.length === 0
      ? 'ready'
      : 'ready_with_advisories';

const report = {
  generatedAt: new Date().toISOString(),
  status,
  checks,
  openapi: {
    p0TotalMissing: openapiMissing,
  },
  migrationDuplicates: {
    duplicateNumberGroups: migrationDuplicateNumberCount,
    duplicateSlugGroups: migrationDuplicateSlugCount,
  },
  advisories,
  notes,
  summary:
    failed.length > 0
      ? `Eksik artefakt sayısı: ${failed.length}`
      : openapiMissing === 0 && advisories.length === 0
        ? notes.length > 0
          ? 'Tüm temel artefaktlar mevcut. Immutable migration duplicate baseline yeni regresyon içermiyor.'
          : 'Tüm temel artefaktlar mevcut ve OpenAPI P0 gap kapalı.'
        : 'Temel artefaktlar mevcut. Advisory maddeleri release notlarında takip edilmeli.',
};

fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

const lines = [];
lines.push('# Release Readiness');
lines.push('');
lines.push(`- Generated At: ${report.generatedAt}`);
lines.push(`- Status: ${report.status}`);
lines.push(`- OpenAPI P0 Total Missing: ${report.openapi.p0TotalMissing}`);
lines.push(`- Migration Duplicate Number Groups: ${report.migrationDuplicates.duplicateNumberGroups}`);
lines.push(`- Migration Duplicate Slug Groups: ${report.migrationDuplicates.duplicateSlugGroups}`);
lines.push('');
lines.push('## Checks');
lines.push('');
lines.push('| Check | Status | Artifact |');
lines.push('|---|---|---|');
for (const c of checks) {
  lines.push(`| ${c.name} | ${c.ok ? 'ok' : 'missing'} | \`${c.artifact}\` |`);
}
lines.push('');
if (advisories.length > 0) {
  lines.push('## Advisories');
  lines.push('');
  lines.push('| Advisory | Severity | Detail | Artifact |');
  lines.push('|---|---|---|---|');
  for (const advisory of advisories) {
    lines.push(`| ${advisory.name} | ${advisory.severity} | ${advisory.detail} | \`${advisory.artifact}\` |`);
  }
  lines.push('');
}
if (notes.length > 0) {
  lines.push('## Notes');
  lines.push('');
  lines.push('| Note | Severity | Detail | Artifact |');
  lines.push('|---|---|---|---|');
  for (const note of notes) {
    lines.push(`| ${note.name} | ${note.severity} | ${note.detail} | \`${note.artifact}\` |`);
  }
  lines.push('');
}
if (dbRetirementObservation?.actionQueue?.p0?.length) {
  lines.push('## DB P0 Advisory Detail');
  lines.push('');
  lines.push('| Table | Owner | Migration Source | Note |');
  lines.push('|---|---|---|---|');
  for (const item of dbRetirementObservation.actionQueue.p0.slice(0, 20)) {
    lines.push(
      `| ${item.table} | ${item.evidence?.owner || 'unclassified'} | ${(item.evidence?.migrationSources || []).join(', ') || 'unknown'} | ${item.evidence?.note || 'review required'} |`,
    );
  }
  lines.push('');
}
if (dbP0QuarantinePlan?.candidates?.length || dbP0QuarantinePlan?.runtimeHolds?.length) {
  lines.push('## DB P0 Quarantine Plan');
  lines.push('');
  lines.push('| Table | State | Owner | Required Action |');
  lines.push('|---|---|---|---|');
  for (const item of (dbP0QuarantinePlan.candidates || []).slice(0, 20)) {
    lines.push(`| ${item.table} | quarantine candidate | ${item.owner || 'unclassified'} | production observation + manual PR |`);
  }
  for (const item of (dbP0QuarantinePlan.runtimeHolds || []).slice(0, 20)) {
    lines.push(`| ${item.table} | runtime hold | ${item.owner || 'unclassified'} | runtime refs migrate/remove before action |`);
  }
  lines.push('');
}
if (e2eSkipReport?.items?.length) {
  lines.push('## E2E Conditional Skips');
  lines.push('');
  lines.push('| File | Line | Reason | Expression |');
  lines.push('|---|---:|---|---|');
  for (const item of e2eSkipReport.items.slice(0, 30)) {
    lines.push(`| \`${item.file}\` | ${item.line} | ${item.reason} | \`${String(item.expression || '').replaceAll('|', '\\|')}\` |`);
  }
  lines.push('');
}
lines.push(`Summary: ${report.summary}`);

fs.writeFileSync(outMd, lines.join('\n'), 'utf8');

console.log(`Release readiness written: ${outJson}`);
console.log(`Release readiness written: ${outMd}`);
