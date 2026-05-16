#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outFile = path.join(root, 'docs', 'release-readiness-dashboard.json');
function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const checks = [
  'docs/FRONTEND_RELEASE_CHECKLIST.md',
  'docs/PAGE_TEMPLATE_SYSTEM.md',
  'docs/PERFORMANCE_BUDGET.md',
  'docs/SEO_TEMPLATE_STANDARD.md',
  'docs/SSR_PWA_RUNTIME_CHECKLIST.md',
  'docs/CONTENT_PIPELINE_STANDARD.md',
  'docs/ROUTE_OWNERSHIP.md',
  'scripts/ci/visual-regression-gate.mjs',
  'scripts/ci/page-template-system-gate.mjs',
  'scripts/ci/template-adoption-gate.mjs',
  'scripts/ci/seo-helper-adoption-gate.mjs',
  'scripts/ci/home-section-contract-gate.mjs',
  'scripts/ci/release-readiness-admin-gate.mjs',
  'src/pages/admin/release-readiness.astro',
];
const readiness = readJsonSafe('docs/release-readiness.json');
const releaseNextActions = readJsonSafe('docs/release-next-actions-report.json');
const quality = readJsonSafe('quality-metrics.json');
const freshness = readJsonSafe('docs/release-artifact-freshness.json');
const releaseHandoffSummary = readJsonSafe('docs/release-handoff-summary.json');
const uploadParity = readJsonSafe('docs/local-upload-parity-report.json');
const uploadArchiveCandidates = readJsonSafe('docs/local-upload-archive-candidates.json');
const localMediaStorageGate = readJsonSafe('docs/local-media-storage-gate.json');
const mediaReadiness = readJsonSafe('docs/media-readiness-report.json');
const adminStrictRoleGate = readJsonSafe('docs/admin-strict-role-gate.json');
const unitSkipReport = readJsonSafe('docs/unit-skip-report.json');
const e2eSkipReport = readJsonSafe('docs/e2e-skip-report.json');
const e2eCriticalCoverage = readJsonSafe('docs/e2e-critical-coverage-report.json');
const apiReleaseGateReport = readJsonSafe('docs/api-release-gate-report.json');
const apiDebugEnvelope = readJsonSafe('docs/api-debug-envelope-report.json');
const apiContractGroupReport = readJsonSafe('docs/api-contract-group-report.json');
const buildArtifactReport = readJsonSafe('docs/build-artifact-report.json');
const scriptCanonicalSurface = readJsonSafe('docs/script-canonical-surface-report.json');
const migrationDuplicateDrift = readJsonSafe('docs/migration-duplicate-drift-report.json');
const dbRetirementObservation = readJsonSafe('docs/db-retirement-observation-report.json');
const dbP0QuarantinePlan = readJsonSafe('docs/db-p0-quarantine-plan.json');
const dbObservationCadence = readJsonSafe('docs/db-observation-cadence-report.json');
const dbObservationCalendar = readJsonSafe('docs/db-observation-calendar-report.json');
const dbManualDecisionReadiness = readJsonSafe('docs/db-manual-decision-readiness-report.json');
const dbRegistryClassification = readJsonSafe('docs/db-registry-classification-report.json');
const dbRuntimeHoldPlan = readJsonSafe('docs/db-runtime-hold-plan.json');
const sqlParameterSafety = readJsonSafe('docs/sql-parameter-safety-gate.json');
const searchZeroResult = readJsonSafe('docs/search-zero-result-report.json');
const e2e = readJsonSafe('docs/e2e-report.json');
const localUploadBucketQuota = readJsonSafe('docs/local-upload-bucket-quota-report.json');
const redisRuntimeHealth = readJsonSafe('docs/redis-runtime-health-report.json');
const warmupSafety = readJsonSafe('docs/warmup-safety-report.json');
const cronReadiness = readJsonSafe('docs/cron-readiness-report.json');
const gmapsScraperReadiness = readJsonSafe('docs/gmaps-scraper-readiness-report.json');
const gmapsQueryPlan = readJsonSafe('docs/gmaps-query-plan-report.json');
const gmapsDiscoveryPlan = readJsonSafe('docs/gmaps-discovery-plan-report.json');
const gmapsDiscoveryDrafts = readJsonSafe('docs/gmaps-discovery-drafts-report.json');
const ollamaReadiness = readJsonSafe('docs/ollama-readiness-report.json');
const contentAgentDrafts = readJsonSafe('docs/content-agent-drafts-report.json');
const publishAllContentDrafts = readJsonSafe('docs/publish-all-content-drafts-report.json');
const llmsSitemapAutoUpdate = readJsonSafe('docs/llms-sitemap-auto-update-gate.json');
const blogDuplicateRiskGate = readJsonSafe('docs/blog-duplicate-risk-gate.json');
const blogDraftRichResults = readJsonSafe('docs/blog-draft-rich-results-report.json');
const pagespeedApiResearch = readJsonSafe('docs/pagespeed-api-research-report.json');
const pagespeedApiLessLighthouse = readJsonSafe('docs/pagespeed-api-less-lighthouse-report.json');
const pagespeedLiveCheck = readJsonSafe('docs/pagespeed-live-check-report.json');
const pagespeedQuotaManagement = readJsonSafe('docs/pagespeed-quota-management-report.json');
const backendFrontendImprovements = readJsonSafe('docs/backend-frontend-improvement-report.json');

const result = {
  generatedAt: new Date().toISOString(),
  ready: true,
  decision: 'READY',
  checks: checks.map((rel) => {
    const ok = fs.existsSync(path.join(root, rel));
    return { rel, ok };
  }),
  gateSummary: {
    releaseReadiness: readiness?.status ?? 'unknown',
    releaseNextActions: releaseNextActions?.status ?? 'not-run',
    artifactFreshness: freshness?.status ?? 'not-run',
    releaseHandoffSummary: releaseHandoffSummary?.releaseStatus ?? 'not-run',
    lintOk: quality?.blockerGates?.lintOk ?? false,
    typecheckOk: quality?.blockerGates?.typecheckOk ?? false,
    openapiOk: quality?.blockerGates?.openapiOk ?? false,
    localUploadMissingRefsOk: quality?.blockerGates?.localUploadMissingRefsOk ?? false,
    localUploadQuotaOk: quality?.blockerGates?.localUploadQuotaOk ?? false,
    e2eStatus: e2e?.status ?? 'not-run',
    e2eCriticalCoverage: e2eCriticalCoverage?.status ?? 'not-run',
    uploadStatus: uploadParity?.status ?? 'unknown',
    qualityRefresh: quality?.qualityReportsRefresh?.status ?? 'not-run',
    unitSkipsDocumentedOk: quality?.blockerGates?.unitSkipsDocumentedOk ?? false,
    uploadArchiveStatus: uploadArchiveCandidates?.status ?? 'not-run',
    uploadArchiveCandidates: uploadArchiveCandidates?.summary?.total ?? 0,
    uploadDeleteReviewCandidates: uploadArchiveCandidates?.summary?.deletableReview ?? 0,
    apiReleaseGate: apiReleaseGateReport?.status ?? 'not-run',
    apiDebugEnvelope: apiDebugEnvelope?.status ?? 'not-run',
    apiContractGroups: apiContractGroupReport?.status ?? 'not-run',
    buildArtifacts: buildArtifactReport?.status ?? 'not-run',
    scriptCanonicalSurface: scriptCanonicalSurface?.status ?? 'not-run',
    migrationDuplicateDrift: migrationDuplicateDrift?.status ?? 'not-run',
    dbRetirementP0: dbRetirementObservation?.summary?.p0QuarantineCandidateCount ?? dbRetirementObservation?.summary?.p0DropCandidateCount ?? 0,
    dbRetirementRuntimeHolds: dbRetirementObservation?.summary?.p0RuntimeHoldCount ?? 0,
    dbP0QuarantinePlan: dbP0QuarantinePlan?.status ?? 'not-run',
    dbObservationCadence: dbObservationCadence?.status ?? 'not-run',
    dbObservationCalendar: dbObservationCalendar?.status ?? 'not-run',
    dbManualDecisionReadiness: dbManualDecisionReadiness?.status ?? 'not-run',
    dbRegistryClassification: dbRegistryClassification?.status ?? 'not-run',
    dbRuntimeHoldPlan: dbRuntimeHoldPlan?.status ?? 'not-run',
    sqlParameterSafety: sqlParameterSafety?.status ?? 'not-run',
    localUploadBucketQuota: localUploadBucketQuota?.status ?? 'not-run',
    localMediaStorageGate: localMediaStorageGate?.status ?? 'not-run',
    mediaReadiness: mediaReadiness?.status ?? 'not-run',
    adminStrictRoleGate: adminStrictRoleGate?.status ?? 'not-run',
    localStorageModelOk: quality?.blockerGates?.localStorageModelOk ?? false,
    mediaReadinessOk: quality?.blockerGates?.mediaReadinessOk ?? false,
    adminStrictRoleOk: quality?.blockerGates?.adminStrictRoleOk ?? false,
    redisRuntimeHealth: redisRuntimeHealth?.status ?? 'not-run',
    warmupSafety: warmupSafety?.status ?? 'not-run',
    cronReadiness: cronReadiness?.status ?? 'not-run',
    gmapsScraperReadiness: gmapsScraperReadiness?.status ?? 'not-run',
    gmapsQueryPlan: gmapsQueryPlan?.status ?? 'not-run',
    gmapsDiscoveryPlan: gmapsDiscoveryPlan?.status ?? 'not-run',
    gmapsDiscoveryDrafts: gmapsDiscoveryDrafts?.status ?? 'not-run',
    ollamaReadiness: ollamaReadiness?.status ?? 'not-run',
    contentAgentDrafts: contentAgentDrafts?.status ?? 'not-run',
    publishAllContentDrafts: publishAllContentDrafts?.status ?? 'not-run',
    llmsSitemapAutoUpdate: llmsSitemapAutoUpdate?.status ?? 'not-run',
    blogDuplicateRiskGate: blogDuplicateRiskGate?.status ?? 'not-run',
    blogDraftRichResults: blogDraftRichResults?.status ?? 'not-run',
    pagespeedApiResearch: pagespeedApiResearch?.status ?? 'not-run',
    pagespeedApiLessLighthouse: pagespeedApiLessLighthouse?.status ?? 'not-run',
    pagespeedApiLessClassification:
      pagespeedApiLessLighthouse?.results?.[0]?.reviewClassification?.bestPractices?.classification ?? 'none',
    pagespeedApiLessExternalExpected:
      pagespeedApiLessLighthouse?.results?.[0]?.reviewClassification?.bestPractices?.classification ===
      'external_expected_review',
    pagespeedLiveCheck: pagespeedLiveCheck?.status ?? 'not-run',
    pagespeedQuotaManagement: pagespeedQuotaManagement?.status ?? 'not-run',
    backendFrontendImprovements: backendFrontendImprovements?.status ?? 'not-run',
    pagespeedQuotaLimited: pagespeedLiveCheck?.summary?.quotaLimited ?? 0,
    searchZeroUnresolved: searchZeroResult?.summary?.unresolvedCount ?? 0,
  },
  qualityRefresh: {
    status: quality?.qualityReportsRefresh?.status ?? 'not-run',
    generatedAt: quality?.qualityReportsRefresh?.generatedAt ?? null,
    lintOk: quality?.blockerGates?.lintOk ?? false,
    typecheckOk: quality?.blockerGates?.typecheckOk ?? false,
    openapiOk: quality?.blockerGates?.openapiOk ?? false,
  },
  releaseNextActions: releaseNextActions
    ? {
        status: releaseNextActions.status ?? 'unknown',
        actionCount: releaseNextActions?.summary?.actionCount ?? 0,
        blockingActionCount: releaseNextActions?.summary?.blockingActionCount ?? 0,
        waitingActionCount: releaseNextActions?.summary?.waitingActionCount ?? 0,
        actions: Array.isArray(releaseNextActions.actions) ? releaseNextActions.actions.slice(0, 8) : [],
      }
    : null,
  freshness: {
    status: freshness?.status ?? 'not-run',
    generatedAt: freshness?.generatedAt ?? null,
    staleOrMissingCount: Array.isArray(freshness?.results)
      ? freshness.results.filter((item) => item.status !== 'fresh').length
      : null,
  },
  releaseHandoffSummary: releaseHandoffSummary
    ? {
        generatedAt: releaseHandoffSummary.generatedAt ?? null,
        releaseStatus: releaseHandoffSummary.releaseStatus ?? 'unknown',
        localMediaStorage: releaseHandoffSummary?.gates?.localMediaStorage ?? 'unknown',
        pagespeedApiLessLighthouse: releaseHandoffSummary?.gates?.pagespeedApiLessLighthouse ?? 'unknown',
        artifactCount: releaseHandoffSummary?.artifacts?.length ?? 0,
        advisoryCount: releaseHandoffSummary?.advisories?.length ?? 0,
      }
    : null,
  uploadArchive: {
    status: uploadArchiveCandidates?.status ?? 'not-run',
    generatedAt: uploadArchiveCandidates?.generatedAt ?? null,
    total: uploadArchiveCandidates?.summary?.total ?? 0,
    archiveCandidate: uploadArchiveCandidates?.summary?.archiveCandidate ?? 0,
    deletableReview: uploadArchiveCandidates?.summary?.deletableReview ?? 0,
  },
  unitSkips: {
    status: unitSkipReport?.status ?? 'not-run',
    generatedAt: unitSkipReport?.generatedAt ?? null,
    observedSkippedFiles: unitSkipReport?.observedUnitSkips?.testFiles ?? 0,
    observedSkippedTests: unitSkipReport?.observedUnitSkips?.tests ?? 0,
    declarationCount: unitSkipReport?.summary?.declarationCount ?? 0,
    undocumentedCount: unitSkipReport?.summary?.undocumentedCount ?? 0,
  },
  e2eSkips: {
    status: e2eSkipReport?.status ?? 'not-run',
    generatedAt: e2eSkipReport?.generatedAt ?? null,
    declarationCount: e2eSkipReport?.summary?.declarationCount ?? 0,
    undocumentedCount: e2eSkipReport?.summary?.undocumentedCount ?? 0,
  },
  e2eCriticalCoverage: {
    status: e2eCriticalCoverage?.status ?? 'not-run',
    generatedAt: e2eCriticalCoverage?.generatedAt ?? null,
    flowCount: e2eCriticalCoverage?.summary?.flowCount ?? 0,
    coveredCount: e2eCriticalCoverage?.summary?.coveredCount ?? 0,
    missingCount: e2eCriticalCoverage?.summary?.missingCount ?? 0,
  },
  api: {
    releaseGate: apiReleaseGateReport
      ? {
          status: apiReleaseGateReport.status ?? 'unknown',
          passedChecks: apiReleaseGateReport?.summary?.passedChecks ?? 0,
          totalChecks: apiReleaseGateReport?.summary?.totalChecks ?? 0,
          failedChecks: apiReleaseGateReport?.summary?.failedChecks ?? 0,
        }
      : null,
    contractGroups: apiContractGroupReport
      ? {
          status: apiContractGroupReport.status ?? 'unknown',
          groupCount: apiContractGroupReport?.groups?.length ?? 0,
          coverageGapCount: apiContractGroupReport?.coverageGaps?.length ?? 0,
        }
      : null,
    debugEnvelope: apiDebugEnvelope
      ? {
          status: apiDebugEnvelope.status ?? 'unknown',
          passed: apiDebugEnvelope?.summary?.passed ?? 0,
          total: apiDebugEnvelope?.summary?.total ?? 0,
          failed: apiDebugEnvelope?.summary?.failed ?? 0,
        }
      : null,
  },
  buildArtifacts: buildArtifactReport
    ? {
        status: buildArtifactReport.status ?? 'unknown',
        distClientTotalMb: buildArtifactReport?.distClient?.totalMb ?? 0,
        distClientWithinSoftBudget: buildArtifactReport?.distClient?.withinSoftBudget ?? false,
        astroWithinBudget: buildArtifactReport?.astroAssets?.withinBudget ?? false,
      }
    : null,
  scriptCanonicalSurface: scriptCanonicalSurface
    ? {
        status: scriptCanonicalSurface.status ?? 'unknown',
        totalScripts: scriptCanonicalSurface?.summary?.totalScripts ?? 0,
        familyCount: scriptCanonicalSurface?.summary?.familyCount ?? 0,
        canonicalCount: scriptCanonicalSurface?.summary?.canonicalCount ?? 0,
        missingCanonicalCount: scriptCanonicalSurface?.summary?.missingCanonicalCount ?? 0,
      }
    : null,
  migrationDuplicateDrift: migrationDuplicateDrift
    ? {
        status: migrationDuplicateDrift.status ?? 'unknown',
        duplicateNumberGroups: migrationDuplicateDrift?.summary?.duplicateNumberGroups ?? 0,
        duplicateSlugGroups: migrationDuplicateDrift?.summary?.duplicateSlugGroups ?? 0,
        numberDrift: migrationDuplicateDrift?.summary?.numberDrift ?? false,
        slugDrift: migrationDuplicateDrift?.summary?.slugDrift ?? false,
      }
    : null,
  dbRetirement: dbRetirementObservation
    ? {
        status: dbRetirementObservation.status ?? 'unknown',
        p0DropCandidateCount: dbRetirementObservation?.summary?.p0DropCandidateCount ?? 0,
        p0QuarantineCandidateCount: dbRetirementObservation?.summary?.p0QuarantineCandidateCount ?? 0,
        p0RuntimeHoldCount: dbRetirementObservation?.summary?.p0RuntimeHoldCount ?? 0,
        p1ReviewCandidateCount: dbRetirementObservation?.summary?.p1ReviewCandidateCount ?? 0,
        p2UnusedIndexCandidateCount: dbRetirementObservation?.summary?.p2UnusedIndexCandidateCount ?? 0,
        automaticDropAllowed: dbRetirementObservation?.policy?.automaticDropAllowed ?? false,
      }
    : null,
  dbP0QuarantinePlan: dbP0QuarantinePlan
    ? {
        status: dbP0QuarantinePlan.status ?? 'unknown',
        quarantineCandidateCount: dbP0QuarantinePlan?.summary?.quarantineCandidateCount ?? 0,
        runtimeHoldCount: dbP0QuarantinePlan?.summary?.runtimeHoldCount ?? 0,
        earliestActionAt: dbP0QuarantinePlan?.policy?.earliestActionAt ?? null,
        automaticDropAllowed: dbP0QuarantinePlan?.policy?.automaticDropAllowed ?? false,
      }
    : null,
  dbObservationCadence: dbObservationCadence
    ? {
        status: dbObservationCadence.status ?? 'unknown',
        snapshotCount: dbObservationCadence?.summary?.snapshotCount ?? 0,
        observationDays: dbObservationCadence?.policy?.observationDays ?? 0,
        missingDays: dbObservationCadence?.summary?.missingDays ?? 0,
        stableEnoughForAction: dbObservationCadence?.summary?.stableEnoughForAction ?? false,
        earliestActionAt: dbObservationCadence?.summary?.earliestActionAt ?? null,
      }
    : null,
  dbObservationCalendar: dbObservationCalendar
    ? {
        status: dbObservationCalendar.status ?? 'unknown',
        completeCount: dbObservationCalendar?.summary?.completeCount ?? 0,
        observationDays: dbObservationCalendar?.policy?.observationDays ?? 0,
        missingOrPendingCount: dbObservationCalendar?.summary?.missingOrPendingCount ?? 0,
        nextSnapshotDueAt: dbObservationCalendar?.summary?.nextSnapshotDueAt ?? null,
        earliestActionAt: dbObservationCalendar?.summary?.earliestActionAt ?? null,
        actionWindowOpen: dbObservationCalendar?.summary?.actionWindowOpen === true,
        automaticDropAllowed: dbObservationCalendar?.policy?.automaticDropAllowed ?? false,
      }
    : null,
  dbManualDecisionReadiness: dbManualDecisionReadiness
    ? {
        status: dbManualDecisionReadiness.status ?? 'unknown',
        readyForManualPrCount: dbManualDecisionReadiness?.summary?.readyForManualPrCount ?? 0,
        waitingForEvidenceCount: dbManualDecisionReadiness?.summary?.waitingForEvidenceCount ?? 0,
        runtimeHoldCount: dbManualDecisionReadiness?.summary?.runtimeHoldCount ?? 0,
        actionWindowOpen: dbManualDecisionReadiness?.policy?.actionWindowOpen ?? false,
      }
    : null,
  dbRegistryClassification: dbRegistryClassification
    ? {
        status: dbRegistryClassification.status ?? 'unknown',
        tableCount: dbRegistryClassification?.summary?.tableCount ?? 0,
        unclassifiedCount: dbRegistryClassification?.summary?.unclassifiedCount ?? 0,
        unusedIndexCount: dbRegistryClassification?.summary?.unusedIndexCount ?? 0,
        automaticDbDropAllowed: dbRegistryClassification?.automaticDbDropAllowed ?? false,
      }
    : null,
  dbRuntimeHoldPlan: dbRuntimeHoldPlan
    ? {
        status: dbRuntimeHoldPlan.status ?? 'unknown',
        table: dbRuntimeHoldPlan?.summary?.table ?? 'unknown',
        runtimeReferenceCount: dbRuntimeHoldPlan?.summary?.runtimeReferenceCount ?? 0,
        incompatibleContractCount: dbRuntimeHoldPlan?.summary?.incompatibleContractCount ?? 0,
        automaticDropAllowed: dbRuntimeHoldPlan?.policy?.automaticDropAllowed ?? false,
      }
    : null,
  sqlParameterSafety: sqlParameterSafety
    ? {
        status: sqlParameterSafety.status ?? 'unknown',
        findingCount: sqlParameterSafety?.summary?.findingCount ?? 0,
      }
    : null,
  localUploadBucketQuota: localUploadBucketQuota
    ? {
        status: localUploadBucketQuota.status ?? 'unknown',
        bucketCount: localUploadBucketQuota?.summary?.bucketCount ?? 0,
        blockerCount: localUploadBucketQuota?.summary?.blockerCount ?? 0,
        reviewCount: localUploadBucketQuota?.summary?.reviewCount ?? 0,
        advisoryCount: localUploadBucketQuota?.summary?.advisoryCount ?? 0,
      }
    : null,
  localMediaStorageGate: localMediaStorageGate
    ? {
        status: localMediaStorageGate.status ?? 'unknown',
        localStorageOnly: localMediaStorageGate.localStorageOnly === true,
        externalObjectStorageConfigured: localMediaStorageGate.externalObjectStorageConfigured === true,
        liveChecks: localMediaStorageGate?.liveChecks?.length ?? 0,
        liveOk: (localMediaStorageGate?.liveChecks || []).filter((item) => item.ok).length,
        failedPatterns: localMediaStorageGate?.failures?.length ?? 0,
      }
    : null,
  mediaReadiness: mediaReadiness
    ? {
        status: mediaReadiness.status ?? 'unknown',
        checks: mediaReadiness?.summary?.checks ?? 0,
        passed: mediaReadiness?.summary?.passed ?? 0,
        failed: mediaReadiness?.summary?.failed ?? 0,
        uploadFiles: mediaReadiness?.summary?.uploadFiles ?? 0,
        publicImages: mediaReadiness?.summary?.publicImages ?? 0,
        localStorageOnly: mediaReadiness?.policy?.localStorageOnly === true,
        externalObjectStorageAllowed:
          mediaReadiness?.policy?.externalObjectStorageAllowed === true ||
          mediaReadiness?.policy?.cdnOrObjectStorageAllowed === true,
        automaticDeleteAllowed: mediaReadiness?.policy?.automaticDeleteAllowed === true,
      }
    : null,
  redisRuntimeHealth: redisRuntimeHealth
    ? {
        status: redisRuntimeHealth.status ?? 'unknown',
        host: redisRuntimeHealth?.redis?.host ?? 'unknown',
        port: redisRuntimeHealth?.redis?.port ?? 0,
        pingOk: redisRuntimeHealth?.redis?.pingOk ?? false,
        latencyMs: redisRuntimeHealth?.redis?.latencyMs ?? null,
        runtimeMode: redisRuntimeHealth.status === 'idle' ? 'optional-fail-open' : 'active',
        releaseBlocker: redisRuntimeHealth?.policy?.releaseBlocker === true,
        fallbackAllowed: redisRuntimeHealth?.policy?.fallbackAllowed === true,
      }
    : null,
  warmupSafety: warmupSafety
    ? {
        status: warmupSafety.status ?? 'unknown',
        reviewCount: Array.isArray(warmupSafety.checks)
          ? warmupSafety.checks.filter((item) => item.ok !== true).length
          : 0,
      }
    : null,
  cronReadiness: cronReadiness
    ? {
        status: cronReadiness.status ?? 'unknown',
        requiredJobCount: cronReadiness?.summary?.requiredJobCount ?? 0,
        presentJobCount: cronReadiness?.summary?.presentJobCount ?? 0,
        missingJobCount: cronReadiness?.summary?.missingJobCount ?? 0,
      }
    : null,
  gmapsScraperReadiness: gmapsScraperReadiness
    ? {
        status: gmapsScraperReadiness.status ?? 'unknown',
        binaryFound: gmapsScraperReadiness?.binary?.found ?? false,
        cliOk: gmapsScraperReadiness?.binary?.cliOk ?? false,
        binaryPath: gmapsScraperReadiness?.binary?.path ?? null,
        sharedHostingMode: gmapsScraperReadiness?.policy?.sharedHostingMode ?? false,
        localStorageOnly: gmapsScraperReadiness?.policy?.localStorageOnly ?? false,
      }
    : null,
  gmapsQueryPlan: gmapsQueryPlan
    ? {
        status: gmapsQueryPlan.status ?? 'unknown',
        source: gmapsQueryPlan.source ?? 'unknown',
        queryCount: gmapsQueryPlan.queryCount ?? 0,
        dbAvailable: gmapsQueryPlan.dbAvailable ?? false,
        outputFile: gmapsQueryPlan.outputFile ?? null,
      }
    : null,
  gmapsDiscoveryPlan: gmapsDiscoveryPlan
    ? {
        status: gmapsDiscoveryPlan.status ?? 'unknown',
        queryCount: gmapsDiscoveryPlan.queryCount ?? 0,
        sectionCount: gmapsDiscoveryPlan.sectionCount ?? 0,
        doesNotUpdatePlaces: gmapsDiscoveryPlan?.policy?.doesNotUpdatePlaces ?? false,
      }
    : null,
  gmapsDiscoveryDrafts: gmapsDiscoveryDrafts
    ? {
        status: gmapsDiscoveryDrafts.status ?? 'unknown',
        mode: gmapsDiscoveryDrafts.mode ?? 'unknown',
        candidateCount: gmapsDiscoveryDrafts.candidateCount ?? 0,
        existingDraftCount: gmapsDiscoveryDrafts.existingDraftCount ?? null,
        pendingDraftCount: gmapsDiscoveryDrafts.pendingDraftCount ?? null,
        insertedOrUpdatedCount: gmapsDiscoveryDrafts.insertedOrUpdatedCount ?? 0,
        autoPublish: gmapsDiscoveryDrafts?.policy?.autoPublish ?? true,
      }
    : null,
  ollamaReadiness: ollamaReadiness
    ? {
        status: ollamaReadiness.status ?? 'unknown',
        mode: ollamaReadiness.mode ?? 'unknown',
        apiKeyPresent: ollamaReadiness.apiKeyPresent ?? false,
        liveChecked: ollamaReadiness.liveChecked ?? false,
        liveOk: ollamaReadiness.liveOk ?? null,
        model: ollamaReadiness.model ?? 'unknown',
        fallbackModel: ollamaReadiness.fallbackModel ?? 'unknown',
      }
    : null,
  contentAgentDrafts: contentAgentDrafts
    ? {
        status: contentAgentDrafts.status ?? 'unknown',
        total: contentAgentDrafts?.summary?.total ?? 0,
        pending: contentAgentDrafts?.summary?.pending ?? 0,
        stalePendingCount: contentAgentDrafts?.summary?.stalePendingCount ?? 0,
        autoPublish: contentAgentDrafts?.policy?.autoPublish ?? true,
      }
    : null,
  publishAllContentDrafts: publishAllContentDrafts
    ? {
        status: publishAllContentDrafts.status ?? 'unknown',
        remainingDraftLike: publishAllContentDrafts?.remainingDraftLike?.length ?? 0,
        moderationPending: publishAllContentDrafts?.moderationPending?.length ?? 0,
        cityContentUpdated:
          publishAllContentDrafts?.updates?.find?.((item) => item.table === 'city_content_drafts')?.updated ?? 0,
        moderationQueuesAutoApproved:
          publishAllContentDrafts?.policy?.moderationQueuesAutoApproved === true,
      }
    : null,
  llmsSitemapAutoUpdate: llmsSitemapAutoUpdate
    ? {
        status: llmsSitemapAutoUpdate.status ?? 'unknown',
        checks: llmsSitemapAutoUpdate?.summary?.checks ?? 0,
        ok: llmsSitemapAutoUpdate?.summary?.ok ?? 0,
        failed: llmsSitemapAutoUpdate?.summary?.failed ?? 0,
      }
    : null,
  blogDraftRichResults: blogDraftRichResults
    ? {
        status: blogDraftRichResults.status ?? 'unknown',
        drafts: blogDraftRichResults?.summary?.drafts ?? 0,
        ok: blogDraftRichResults?.summary?.ok ?? 0,
        review: blogDraftRichResults?.summary?.review ?? 0,
      }
    : null,
  blogDuplicateRiskGate: blogDuplicateRiskGate
    ? {
        status: blogDuplicateRiskGate.status ?? 'unknown',
        selected: blogDuplicateRiskGate?.summary?.selected ?? 0,
        selectedDuplicateRisk: blogDuplicateRiskGate?.summary?.selectedDuplicateRisk ?? 0,
        skippedDuplicateRisk: blogDuplicateRiskGate?.summary?.skippedDuplicateRisk ?? 0,
        autoPublish: blogDuplicateRiskGate?.policy?.autoPublish ?? true,
      }
    : null,
  pagespeedApiResearch: pagespeedApiResearch
    ? {
        status: pagespeedApiResearch.status ?? 'unknown',
        enabled: pagespeedApiResearch?.service?.enabled ?? false,
      }
    : null,
  pagespeedApiLessLighthouse: pagespeedApiLessLighthouse
    ? {
        status: pagespeedApiLessLighthouse.status ?? 'unknown',
        checks: pagespeedApiLessLighthouse?.summary?.checks ?? 0,
        ok: pagespeedApiLessLighthouse?.summary?.ok ?? 0,
        review: pagespeedApiLessLighthouse?.summary?.review ?? 0,
        failed: pagespeedApiLessLighthouse?.summary?.failed ?? 0,
        apiUsed: pagespeedApiLessLighthouse.apiUsed === true,
        performance: pagespeedApiLessLighthouse?.results?.[0]?.scores?.performance ?? null,
        accessibility: pagespeedApiLessLighthouse?.results?.[0]?.scores?.accessibility ?? null,
        bestPractices: pagespeedApiLessLighthouse?.results?.[0]?.scores?.bestPractices ?? null,
        seo: pagespeedApiLessLighthouse?.results?.[0]?.scores?.seo ?? null,
        reviewClassification:
          pagespeedApiLessLighthouse?.results?.[0]?.reviewClassification?.bestPractices?.classification ?? null,
        externalExpectedReview:
          pagespeedApiLessLighthouse?.results?.[0]?.reviewClassification?.bestPractices?.classification ===
          'external_expected_review',
      }
    : null,
  adminStrictRoleGate: adminStrictRoleGate
    ? {
        status: adminStrictRoleGate.status ?? 'unknown',
        checked: adminStrictRoleGate?.summary?.checked ?? 0,
        ok: adminStrictRoleGate?.summary?.ok ?? 0,
        review: adminStrictRoleGate?.summary?.review ?? 0,
      }
    : null,
  pagespeedLiveCheck: pagespeedLiveCheck
    ? {
        status: pagespeedLiveCheck.status ?? 'unknown',
        checks: pagespeedLiveCheck?.summary?.checks ?? 0,
        ok: pagespeedLiveCheck?.summary?.ok ?? 0,
        review: pagespeedLiveCheck?.summary?.review ?? 0,
        quotaLimited: pagespeedLiveCheck?.summary?.quotaLimited ?? 0,
      }
    : null,
  pagespeedQuotaManagement: pagespeedQuotaManagement
    ? {
        status: pagespeedQuotaManagement.status ?? 'unknown',
        managementMarked: pagespeedQuotaManagement.managementMarked ?? false,
        quotaManagementCompleted: pagespeedQuotaManagement.quotaManagementCompleted ?? false,
        liveStatus: pagespeedQuotaManagement?.liveCheck?.status ?? 'unknown',
        quotaLimited: pagespeedQuotaManagement?.liveCheck?.quotaLimited ?? 0,
      }
    : null,
  backendFrontendImprovements: backendFrontendImprovements
    ? {
        status: backendFrontendImprovements.status ?? 'unknown',
        passed: backendFrontendImprovements?.summary?.passed ?? 0,
        total: backendFrontendImprovements?.summary?.total ?? 0,
        backendPassed: backendFrontendImprovements?.summary?.backend?.passed ?? 0,
        backendTotal: backendFrontendImprovements?.summary?.backend?.total ?? 0,
        frontendPassed: backendFrontendImprovements?.summary?.frontend?.passed ?? 0,
        frontendTotal: backendFrontendImprovements?.summary?.frontend?.total ?? 0,
      }
    : null,
  searchZeroResult: searchZeroResult
    ? {
        status: searchZeroResult.status ?? 'unknown',
        unresolvedCount: searchZeroResult?.summary?.unresolvedCount ?? 0,
        unresolvedOccurrences: searchZeroResult?.summary?.unresolvedOccurrences ?? 0,
      }
    : null,
  e2eFailures: Array.isArray(e2e?.failedTests) ? e2e.failedTests.slice(0, 10) : [],
};
const pagespeedApiLessExpectedExternal =
  result.pagespeedApiLessLighthouse?.externalExpectedReview === true;
const pagespeedLiveQuotaManaged =
  result.pagespeedLiveCheck?.status === 'review' &&
  result.pagespeedLiveCheck?.quotaLimited > 0 &&
  result.pagespeedQuotaManagement?.quotaManagementCompleted === true;
const releaseHandoffOnlyExpectedExternal =
  result.releaseHandoffSummary?.releaseStatus === 'ready_with_advisories' &&
  result.releaseHandoffSummary?.pagespeedApiLessLighthouse === 'review' &&
  pagespeedApiLessExpectedExternal;
const blockers = [
  !result.checks.every((c) => c.ok),
  result.gateSummary.releaseReadiness === 'blocked',
  result.releaseNextActions?.status === 'blocked',
  result.gateSummary.artifactFreshness === 'failed',
  !result.releaseHandoffSummary,
  result.gateSummary.lintOk === false,
  result.gateSummary.typecheckOk === false,
  result.gateSummary.openapiOk === false,
  result.gateSummary.localUploadMissingRefsOk === false,
  result.gateSummary.localUploadQuotaOk === false,
  result.gateSummary.uploadDeleteReviewCandidates > 0,
  result.gateSummary.unitSkipsDocumentedOk === false,
  result.api?.releaseGate?.status === 'failed',
  result.scriptCanonicalSurface?.status !== 'ok',
  result.migrationDuplicateDrift?.status !== 'ok',
  result.gateSummary.searchZeroUnresolved > 0,
  result.gateSummary.uploadStatus === 'blocked',
  result.localUploadBucketQuota?.status === 'blocked',
  result.localMediaStorageGate?.status && result.localMediaStorageGate.status !== 'ok',
  result.localMediaStorageGate?.externalObjectStorageConfigured === true,
  result.localMediaStorageGate?.localStorageOnly === false,
  result.mediaReadiness?.status && result.mediaReadiness.status !== 'ok',
  result.mediaReadiness?.localStorageOnly === false,
  result.mediaReadiness?.externalObjectStorageAllowed === true,
  result.mediaReadiness?.automaticDeleteAllowed === true,
  result.adminStrictRoleGate?.status && result.adminStrictRoleGate.status !== 'ok',
  result.warmupSafety?.status === 'review',
  result.cronReadiness?.status === 'blocked',
  result.gmapsScraperReadiness?.status === 'blocked',
  result.gmapsQueryPlan?.status === 'blocked',
  result.gmapsDiscoveryPlan?.status === 'blocked',
  result.gmapsDiscoveryDrafts?.status === 'blocked',
  result.ollamaReadiness?.status === 'blocked',
  result.contentAgentDrafts?.status === 'blocked',
  result.publishAllContentDrafts?.status && result.publishAllContentDrafts.status !== 'ok',
  result.publishAllContentDrafts?.remainingDraftLike > 0,
  result.llmsSitemapAutoUpdate?.status && result.llmsSitemapAutoUpdate.status !== 'ok',
  result.blogDraftRichResults?.status && result.blogDraftRichResults.status !== 'ok',
  result.blogDuplicateRiskGate?.status && result.blogDuplicateRiskGate.status !== 'ok',
  result.pagespeedApiResearch?.status && result.pagespeedApiResearch.status !== 'ok',
  result.pagespeedApiLessLighthouse?.status && result.pagespeedApiLessLighthouse.status === 'failed',
];
const advisories = [
  result.gateSummary.releaseReadiness === 'ready_with_advisories',
  result.releaseNextActions?.status === 'advisory',
  result.releaseHandoffSummary?.releaseStatus === 'ready_with_advisories',
  result.gateSummary.e2eStatus === 'not-run',
  result.e2eCriticalCoverage.status !== 'ok',
  result.gateSummary.uploadStatus === 'review',
  result.gateSummary.uploadArchiveCandidates > 0,
  result.gateSummary.dbRetirementP0 > 0,
  result.dbP0QuarantinePlan?.status === 'advisory',
  result.dbObservationCadence?.status === 'stale',
  result.dbManualDecisionReadiness?.status === 'manual_review_ready',
  result.localUploadBucketQuota?.status === 'review',
  result.localMediaStorageGate?.status && result.localMediaStorageGate.status !== 'ok',
  result.redisRuntimeHealth?.status === 'degraded',
  result.cronReadiness?.status !== 'ok',
  result.gmapsScraperReadiness?.status && result.gmapsScraperReadiness.status !== 'ok',
  result.gmapsQueryPlan?.status && result.gmapsQueryPlan.status !== 'ok',
  result.gmapsDiscoveryPlan?.status && result.gmapsDiscoveryPlan.status !== 'ok',
  result.gmapsDiscoveryDrafts?.status && result.gmapsDiscoveryDrafts.status !== 'ok',
  result.ollamaReadiness?.status && result.ollamaReadiness.status !== 'ok',
  result.contentAgentDrafts?.status === 'review',
  result.publishAllContentDrafts?.moderationPending > 0,
  result.blogDuplicateRiskGate?.status && result.blogDuplicateRiskGate.status !== 'ok',
  result.pagespeedLiveCheck?.status === 'review' && !pagespeedLiveQuotaManaged,
  result.pagespeedApiLessLighthouse?.status === 'review' && !pagespeedApiLessExpectedExternal,
  result.e2eSkips.undocumentedCount > 0,
];
result.advisoryReasons = [
  ...(result.gateSummary.releaseReadiness === 'ready_with_advisories'
    ? [{ code: 'release-readiness-advisory', detail: 'Release readiness raporu advisory maddeleri iceriyor.' }]
    : []),
  ...(result.releaseNextActions?.status === 'advisory'
    ? [{ code: 'release-next-actions-advisory', detail: `${result.releaseNextActions.blockingActionCount} aksiyon kanıt/gözlem bekliyor.` }]
    : []),
  ...(result.releaseHandoffSummary?.releaseStatus === 'ready_with_advisories' && !releaseHandoffOnlyExpectedExternal
    ? [{ code: 'release-handoff-advisory', detail: `Handoff status=${result.releaseHandoffSummary.releaseStatus}; local-storage=${result.releaseHandoffSummary.localMediaStorage}, pagespeed-api-less=${result.releaseHandoffSummary.pagespeedApiLessLighthouse}.` }]
    : []),
  ...(result.gateSummary.e2eStatus === 'not-run'
    ? [{ code: 'e2e-not-run', detail: 'E2E raporu henuz uretilmemis.' }]
    : []),
  ...(result.e2eCriticalCoverage.status !== 'ok'
    ? [{ code: 'e2e-critical-coverage-review', detail: `${result.e2eCriticalCoverage.coveredCount}/${result.e2eCriticalCoverage.flowCount} critical flow covered.` }]
    : []),
  ...(result.gateSummary.uploadStatus === 'review'
    ? [{ code: 'upload-review', detail: 'Local upload parity raporu review durumunda.' }]
    : []),
  ...(result.gateSummary.uploadArchiveCandidates > 0
    ? [{ code: 'upload-archive-candidates', detail: `${result.gateSummary.uploadArchiveCandidates} manuel archive PR adayi var.` }]
    : []),
  ...(result.gateSummary.dbRetirementP0 > 0
    ? [{ code: 'db-retirement-p0-observation', detail: `${result.gateSummary.dbRetirementP0} DB P0 quarantine adayi gozlem kuyruğunda; otomatik drop yok. Runtime hold: ${result.gateSummary.dbRetirementRuntimeHolds}.` }]
    : []),
  ...(result.dbP0QuarantinePlan?.status === 'advisory'
    ? [{ code: 'db-p0-quarantine-plan', detail: `${result.dbP0QuarantinePlan.quarantineCandidateCount} quarantine candidate; en erken aksiyon ${result.dbP0QuarantinePlan.earliestActionAt || 'bilinmiyor'}.` }]
    : []),
  ...(result.dbObservationCadence?.status === 'stale'
    ? [{ code: 'db-observation-cadence-stale', detail: `DB observation snapshot stale; ${result.dbObservationCadence.snapshotCount}/${result.dbObservationCadence.observationDays}.` }]
    : []),
  ...(result.dbManualDecisionReadiness?.status === 'manual_review_ready'
    ? [{ code: 'db-manual-decision-ready', detail: `${result.dbManualDecisionReadiness.readyForManualPrCount} DB candidate manuel PR review için hazır.` }]
    : []),
  ...(result.localUploadBucketQuota?.status === 'review'
    ? [{ code: 'upload-bucket-quota-review', detail: `${result.localUploadBucketQuota.reviewCount} bucket review, ${result.localUploadBucketQuota.advisoryCount} bucket advisory. Local storage; otomatik silme yok.` }]
    : []),
  ...(result.localMediaStorageGate?.status && result.localMediaStorageGate.status !== 'ok'
    ? [{ code: 'local-media-storage-review', detail: `Local media storage gate ${result.localMediaStorageGate.status}; local-only=${result.localMediaStorageGate.localStorageOnly ? 'yes' : 'no'}, external-object-storage=${result.localMediaStorageGate.externalObjectStorageConfigured ? 'yes' : 'no'}.` }]
    : []),
  ...(result.mediaReadiness?.status && result.mediaReadiness.status !== 'ok'
    ? [{ code: 'media-readiness-review', detail: `Media readiness ${result.mediaReadiness.status}; ${result.mediaReadiness.passed}/${result.mediaReadiness.checks} check passed, local-only=${result.mediaReadiness.localStorageOnly ? 'yes' : 'no'}.` }]
    : []),
  ...(result.adminStrictRoleGate?.status && result.adminStrictRoleGate.status !== 'ok'
    ? [{ code: 'admin-strict-role-review', detail: `Admin strict role gate ${result.adminStrictRoleGate.status}; review=${result.adminStrictRoleGate.review}.` }]
    : []),
  ...(result.redisRuntimeHealth?.status === 'degraded'
    ? [{ code: 'redis-runtime-degraded', detail: `Redis ping basarisiz: ${result.redisRuntimeHealth.host}:${result.redisRuntimeHealth.port}. Fallback var, blocker degil.` }]
    : []),
  ...(result.warmupSafety?.status === 'review'
    ? [{ code: 'warmup-safety-review', detail: `${result.warmupSafety.reviewCount} warmup safety item review durumunda.` }]
    : []),
  ...(result.cronReadiness?.status !== 'ok'
    ? [{ code: 'cron-readiness-review', detail: `${result.cronReadiness?.presentJobCount ?? 0}/${result.cronReadiness?.requiredJobCount ?? 0} managed cron job present.` }]
    : []),
  ...(result.gmapsScraperReadiness?.status && result.gmapsScraperReadiness.status !== 'ok'
    ? [{ code: 'gmaps-scraper-readiness', detail: `Google Maps scraper binary/CLI readiness review: ${result.gmapsScraperReadiness.binaryPath || 'missing'}.` }]
    : []),
  ...(result.gmapsQueryPlan?.status && result.gmapsQueryPlan.status !== 'ok'
    ? [{ code: 'gmaps-query-plan', detail: `Google Maps query plan review: ${result.gmapsQueryPlan.queryCount} query, source=${result.gmapsQueryPlan.source}.` }]
    : []),
  ...(result.gmapsDiscoveryPlan?.status && result.gmapsDiscoveryPlan.status !== 'ok'
    ? [{ code: 'gmaps-discovery-plan', detail: `Google Maps discovery plan review: ${result.gmapsDiscoveryPlan.queryCount} query.` }]
    : []),
  ...(result.gmapsDiscoveryDrafts?.status && result.gmapsDiscoveryDrafts.status !== 'ok'
    ? [{ code: 'gmaps-discovery-drafts', detail: `Google Maps discovery draft review: ${result.gmapsDiscoveryDrafts.candidateCount} candidate.` }]
    : []),
  ...(result.ollamaReadiness?.status && result.ollamaReadiness.status !== 'ok'
    ? [{ code: 'ollama-readiness', detail: `Ollama readiness review: mode=${result.ollamaReadiness.mode}, key=${result.ollamaReadiness.apiKeyPresent ? 'present' : 'missing'}.` }]
    : []),
  ...(result.contentAgentDrafts?.status === 'review'
    ? [{ code: 'content-agent-drafts-review', detail: `${result.contentAgentDrafts.stalePendingCount} stale pending content agent draft requires admin review.` }]
    : []),
  ...(result.publishAllContentDrafts?.status && result.publishAllContentDrafts.status !== 'ok'
    ? [{ code: 'publish-all-content-drafts-review', detail: `${result.publishAllContentDrafts.remainingDraftLike} draft-like content remains after publish-all.` }]
    : []),
  ...(result.blogDuplicateRiskGate?.status && result.blogDuplicateRiskGate.status !== 'ok'
    ? [{ code: 'blog-duplicate-risk', detail: `${result.blogDuplicateRiskGate.selectedDuplicateRisk} selected duplicate-risk topic; auto-publish=${result.blogDuplicateRiskGate.autoPublish ? 'yes' : 'no'}.` }]
    : []),
  ...(result.pagespeedLiveCheck?.status === 'review' && !pagespeedLiveQuotaManaged
    ? [{ code: 'pagespeed-live-review', detail: `${result.pagespeedLiveCheck.ok}/${result.pagespeedLiveCheck.checks} PageSpeed live check ok; quota-limited=${result.pagespeedLiveCheck.quotaLimited}.` }]
    : []),
  ...(result.pagespeedApiLessLighthouse?.status === 'review' && !pagespeedApiLessExpectedExternal
    ? [{ code: 'pagespeed-api-less-review', detail: `${result.pagespeedApiLessLighthouse.ok}/${result.pagespeedApiLessLighthouse.checks} Lighthouse CLI check ok; api=${result.pagespeedApiLessLighthouse.apiUsed ? 'yes' : 'no'}, perf=${result.pagespeedApiLessLighthouse.performance ?? 'n/a'}, classification=${result.pagespeedApiLessLighthouse.reviewClassification || 'none'}.` }]
    : []),
  ...(result.e2eSkips.undocumentedCount > 0
    ? [{ code: 'e2e-undocumented-skip', detail: `${result.e2eSkips.undocumentedCount} E2E skip aciklamasiz.` }]
    : []),
];
result.ready = !blockers.some(Boolean);
result.decision = !result.ready ? 'BLOCKED' : advisories.some(Boolean) ? 'ADVISORY' : 'READY';
fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(`release-readiness-dashboard: wrote ${path.relative(root, outFile)} decision=${result.decision}`);
