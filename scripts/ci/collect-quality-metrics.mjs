#!/usr/bin/env node
/* global console, process */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function readFile(path) {
  if (!path || !existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

function readJsonSafe(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readFirstExisting(paths) {
  for (const p of paths) {
    if (p && existsSync(p)) return readFileSync(p, 'utf8');
  }
  return '';
}

function countRegex(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function parseLint(text) {
  const totals = text.match(/✖\s+(\d+)\s+problems\s+\((\d+)\s+errors,\s+(\d+)\s+warnings\)/);
  if (totals) {
    return {
      problems: Number(totals[1]),
      errors: Number(totals[2]),
      warnings: Number(totals[3]),
    };
  }
  const fallback = text.match(/✖\s+(\d+)\s+problems/);
  return {
    problems: Number(fallback?.[1] || 0),
    errors: 0,
    warnings: 0,
  };
}

function parseTypecheck(text) {
  const errors = Number((text.match(/-\s+(\d+)\s+errors/) || [])[1] || 0);
  const warnings = Number((text.match(/-\s+(\d+)\s+warnings/) || [])[1] || 0);
  const hints = Number((text.match(/-\s+(\d+)\s+hints/) || [])[1] || 0);
  if (errors || warnings || hints) {
    return { errors, warnings, hints };
  }

  return {
    errors: countRegex(text, / - error ts\(| - error astro\(/g),
    warnings: countRegex(text, / - warning ts\(| - warning astro\(/g),
    hints: countRegex(text, / - hint ts\(| - hint astro\(/g),
  };
}

function parseOpenApiRouteSync(text, fallbackBaseline) {
  return {
    documentedPaths: Number((text.match(/documented paths:\s*(\d+)/i) || [])[1] || 0),
    fileRoutes: Number((text.match(/file routes:\s*(\d+)/i) || [])[1] || 0),
    currentMissingInSpec: Number((text.match(/missing in spec \(current\):\s*(\d+)/i) || [])[1] || 0),
    baselineMissingInSpec: Number(
      (text.match(/missing in spec \(baseline\):\s*(\d+)/i) || [])[1] || fallbackBaseline,
    ),
    newlyMissingVsBaseline: Number((text.match(/newly missing vs baseline:\s*(\d+)/i) || [])[1] || 0),
    resolvedVsBaseline: Number((text.match(/resolved vs baseline:\s*(\d+)/i) || [])[1] || 0),
  };
}

function openApiBaselineCount(path) {
  const raw = readJsonSafe(path);
  return Array.isArray(raw?.missingInSpec) ? raw.missingInSpec.length : 0;
}

const qualityCheck = readJsonSafe('docs/quality-check-report.json');
const lintArg = parseArg('lint');
const typeArg = parseArg('type');
const qualityCheckMissing = !qualityCheck && (!lintArg || !typeArg);
const lint = lintArg ? parseLint(readFile(lintArg)) : qualityCheck?.lint || { errors: 1, warnings: 0, problems: 1 };
const typecheck = typeArg
  ? parseTypecheck(readFile(typeArg))
  : qualityCheck?.typecheck || { errors: 1, warnings: 0, hints: 0 };

const apiLog = readFirstExisting([parseArg('api'), 'api-release-gate.log']);
const apiReleaseGateReport = readJsonSafe('docs/api-release-gate-report.json');
const apiDebugEnvelope = readJsonSafe('docs/api-debug-envelope-report.json');
const apiGatePassed =
  apiReleaseGateReport?.status === 'passed' ||
  /OK: critical OpenAPI checks passed/.test(apiLog) ||
  /status:\s*success/i.test(apiLog);

const openapiBaselinePath = parseArg('openapi') || 'docs/openapi-route-gap-baseline.json';
const qualityRefresh = readJsonSafe('docs/quality-reports-refresh.json');
const openapiRouteSync =
  qualityRefresh?.openapiRouteSync ||
  parseOpenApiRouteSync('', openApiBaselineCount(openapiBaselinePath));

const scriptSurface = readJsonSafe('docs/script-surface-report.json');
const scriptCanonicalSurface = readJsonSafe('docs/script-canonical-surface-report.json');
const buildArtifacts = readJsonSafe('docs/build-artifact-report.json');
const migrationDuplicateDrift = readJsonSafe('docs/migration-duplicate-drift-report.json');
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
const searchZeroResult = readJsonSafe('docs/search-zero-result-report.json');
const localUploadParity = readJsonSafe('docs/local-upload-parity-report.json');
const localUploadBucketQuota = readJsonSafe('docs/local-upload-bucket-quota-report.json');
const localUploadClassification = readJsonSafe('docs/local-upload-candidate-classification.json');
const localUploadArchiveCandidates = readJsonSafe('docs/local-upload-archive-candidates.json');
const localMediaStorageGate = readJsonSafe('docs/local-media-storage-gate.json');
const mediaReadiness = readJsonSafe('docs/media-readiness-report.json');
const unitTestReport = readJsonSafe('docs/unit-test-report.json');
const unitSkipReport = readJsonSafe('docs/unit-skip-report.json');
const e2eSkipReport = readJsonSafe('docs/e2e-skip-report.json');
const e2eCriticalCoverage = readJsonSafe('docs/e2e-critical-coverage-report.json');
const releaseReadiness = readJsonSafe('docs/release-readiness.json');
const releaseNextActions = readJsonSafe('docs/release-next-actions-report.json');
const e2eReport = readJsonSafe('docs/e2e-report.json');
const releaseArtifactFreshness = readJsonSafe('docs/release-artifact-freshness.json');
const redisRuntimeHealth = readJsonSafe('docs/redis-runtime-health-report.json');
const warmupSafety = readJsonSafe('docs/warmup-safety-report.json');
const cronReadiness = readJsonSafe('docs/cron-readiness-report.json');
const internalLinking = readJsonSafe('docs/internal-linking-report.json');
const llmsSitemapAutoUpdate = readJsonSafe('docs/llms-sitemap-auto-update-gate.json');
const gmapsScraperReadiness = readJsonSafe('docs/gmaps-scraper-readiness-report.json');
const gmapsQueryPlan = readJsonSafe('docs/gmaps-query-plan-report.json');
const gmapsDiscoveryPlan = readJsonSafe('docs/gmaps-discovery-plan-report.json');
const gmapsDiscoveryDrafts = readJsonSafe('docs/gmaps-discovery-drafts-report.json');
const ollamaReadiness = readJsonSafe('docs/ollama-readiness-report.json');
const blogKeywordResearch = readJsonSafe('docs/blog-keyword-research-report.json');
const blogDuplicateRiskGate = readJsonSafe('docs/blog-duplicate-risk-gate.json');
const blogDraftQuality = readJsonSafe('docs/blog-draft-quality-report.json');
const blogDraftRichResults = readJsonSafe('docs/blog-draft-rich-results-report.json');
const blogPublishReadiness = readJsonSafe('docs/blog-publish-readiness-report.json');
const blogAdminPublishQueue = readJsonSafe('docs/blog-admin-publish-queue-report.json');
const pagespeedApiLessLighthouse = readJsonSafe('docs/pagespeed-api-less-lighthouse-report.json');
const backendFrontendImprovements = readJsonSafe('docs/backend-frontend-improvement-report.json');
const socialUxReport = readJsonSafe('docs/social-ux-report.json');
const adminStrictRoleGate = readJsonSafe('docs/admin-strict-role-gate.json');
const blogDraftApply = readJsonSafe('docs/generated-blog-drafts/apply-summary.json');
const contentAgentDrafts = readJsonSafe('docs/content-agent-drafts-report.json');
const publishAllContentDrafts = readJsonSafe('docs/publish-all-content-drafts-report.json');

const metrics = {
  generatedAt: new Date().toISOString(),
  sourceMode: 'read-only',
  qualityReportsRefresh: qualityRefresh
    ? {
        status: qualityRefresh.status ?? 'unknown',
        generatedAt: qualityRefresh.generatedAt ?? null,
      }
    : null,
  qualityCheckReportPresent: !qualityCheckMissing,
  lint: {
    errors: lint.errors ?? 0,
    warnings: lint.warnings ?? 0,
    problems: lint.problems ?? 0,
  },
  typecheck: {
    errors: typecheck.errors ?? 0,
    warnings: typecheck.warnings ?? 0,
    hints: typecheck.hints ?? 0,
  },
  apiReleaseGate: {
    passed: apiGatePassed,
    status: apiReleaseGateReport?.status ?? (apiGatePassed ? 'passed' : 'not-run'),
    passedChecks: apiReleaseGateReport?.summary?.passedChecks ?? null,
    totalChecks: apiReleaseGateReport?.summary?.totalChecks ?? null,
  },
  blockerGates: {
    lintOk: (lint.errors ?? 0) === 0 && (lint.warnings ?? 0) === 0 && (lint.problems ?? 0) === 0,
    typecheckOk:
      (typecheck.errors ?? 0) === 0 &&
      (typecheck.warnings ?? 0) === 0 &&
      (typecheck.hints ?? 0) === 0,
    openapiOk:
      openapiRouteSync.currentMissingInSpec === 0 &&
      openapiRouteSync.newlyMissingVsBaseline === 0,
    apiReleaseGateOk: apiGatePassed,
    apiDebugEnvelopeOk: apiDebugEnvelope?.status === 'ok',
    scriptCanonicalSurfaceOk: scriptCanonicalSurface?.status === 'ok',
    migrationDuplicateDriftOk: migrationDuplicateDrift?.status === 'ok',
    buildArtifactsOk:
      buildArtifacts?.status === 'ok' &&
      buildArtifacts?.distClient?.withinSoftBudget !== false &&
      buildArtifacts?.astroAssets?.withinBudget !== false,
    localUploadMissingRefsOk: (localUploadParity?.summary?.missingReferencedFileCount ?? 0) === 0,
    localUploadQuotaOk: localUploadParity?.quota?.status !== 'blocker',
    localUploadArchiveOk: (localUploadArchiveCandidates?.summary?.deletableReview ?? 0) === 0,
    localUploadBucketQuotaOk: localUploadBucketQuota?.status !== 'blocked',
    unitSkipsDocumentedOk: (unitSkipReport?.summary?.undocumentedCount ?? 0) === 0,
    e2eCriticalCoverageOk: e2eCriticalCoverage?.status === 'ok',
    localStorageModelOk:
      localMediaStorageGate?.status === 'ok' &&
      localMediaStorageGate?.localStorageOnly === true &&
      localMediaStorageGate?.externalObjectStorageConfigured === false,
    mediaReadinessOk: mediaReadiness?.status === 'ok',
    adminStrictRoleOk: adminStrictRoleGate?.status === 'ok',
    warmupSafetyOk: warmupSafety?.status === 'ok',
    cronReadinessOk: cronReadiness?.status === 'ok',
    internalLinkingOk: internalLinking?.status === 'passed',
    llmsSitemapAutoUpdateOk: llmsSitemapAutoUpdate?.status === 'ok',
    gmapsScraperReadinessOk: gmapsScraperReadiness?.status === 'ok',
    gmapsQueryPlanOk: gmapsQueryPlan?.status === 'ok',
    gmapsDiscoveryPlanOk: gmapsDiscoveryPlan?.status === 'ok',
    gmapsDiscoveryDraftsOk: gmapsDiscoveryDrafts?.status === 'ok',
    ollamaReadinessOk: ollamaReadiness?.status === 'ok',
    blogKeywordResearchOk: blogKeywordResearch?.status === 'ok',
    blogDuplicateRiskOk: blogDuplicateRiskGate?.status === 'ok',
    blogDraftQualityOk: blogDraftQuality?.status === 'ok',
    blogDraftRichResultsOk: blogDraftRichResults?.status === 'ok',
    blogPublishReadinessOk: ['ready_for_admin_publish_review', 'published'].includes(
      blogPublishReadiness?.status,
    ),
    blogAdminPublishQueueOk: ['ready_for_admin_review', 'published'].includes(blogAdminPublishQueue?.status),
    dbAdvisoryEvidenceOk: ['observation_required', 'manual_review_ready'].includes(dbAdvisoryEvidence?.status),
    pagespeedApiLessLighthouseOk: ['ok', 'review'].includes(pagespeedApiLessLighthouse?.status),
    backendFrontendImprovementsOk: backendFrontendImprovements?.status === 'ok',
    socialUxReportOk: socialUxReport?.status === 'ok',
    blogDraftApplyOk:
      blogPublishReadiness?.status === 'published' ||
      ((blogDraftApply?.pendingBlogDrafts ?? 0) > 0 && blogDraftApply?.autoPublish === false),
    contentAgentDraftsOk: ['ok', 'review'].includes(contentAgentDrafts?.status),
    publishAllContentDraftsOk:
      publishAllContentDrafts?.status === 'ok' &&
      (publishAllContentDrafts?.remainingDraftLike?.length ?? 1) === 0,
    sqlParameterSafetyOk: sqlParameterSafety?.status === 'ok',
    releaseReadinessOk: ['ready', 'ready_with_advisories'].includes(releaseReadiness?.status),
    releaseNextActionsOk: releaseNextActions?.status !== 'blocked',
    releaseArtifactFreshnessOk: releaseArtifactFreshness?.status === 'passed',
  },
  unitTests: unitTestReport
    ? {
        status: unitTestReport.status ?? 'unknown',
        testFilesPassed: unitTestReport?.testFiles?.passed ?? 0,
        testFilesFailed: unitTestReport?.testFiles?.failed ?? 0,
        testFilesTotal: unitTestReport?.testFiles?.total ?? 0,
        testsPassed: unitTestReport?.tests?.passed ?? 0,
        testsFailed: unitTestReport?.tests?.failed ?? 0,
        testsTotal: unitTestReport?.tests?.total ?? 0,
      }
    : null,
  unitSkips: unitSkipReport
    ? {
        status: unitSkipReport.status ?? 'unknown',
        observedSkippedFiles: unitSkipReport?.observedUnitSkips?.testFiles ?? 0,
        observedSkippedTests: unitSkipReport?.observedUnitSkips?.tests ?? 0,
        declarationCount: unitSkipReport?.summary?.declarationCount ?? 0,
        undocumentedCount: unitSkipReport?.summary?.undocumentedCount ?? 0,
      }
    : null,
  e2e: e2eReport
    ? {
        status: e2eReport.status ?? 'unknown',
        suite: e2eReport.suite ?? 'unknown',
        project: e2eReport.project ?? 'unknown',
        passed: e2eReport?.summary?.passed ?? 0,
        failed: e2eReport?.summary?.failed ?? 0,
        skipped: e2eReport?.summary?.skipped ?? 0,
        testsTotal: e2eReport?.summary?.testCount ?? 0,
      }
    : null,
  e2eSkips: e2eSkipReport
    ? {
        status: e2eSkipReport.status ?? 'unknown',
        declarationCount: e2eSkipReport?.summary?.declarationCount ?? 0,
        undocumentedCount: e2eSkipReport?.summary?.undocumentedCount ?? 0,
      }
    : null,
  e2eCriticalCoverage: e2eCriticalCoverage
    ? {
        status: e2eCriticalCoverage.status ?? 'unknown',
        flowCount: e2eCriticalCoverage?.summary?.flowCount ?? 0,
        coveredCount: e2eCriticalCoverage?.summary?.coveredCount ?? 0,
        missingCount: e2eCriticalCoverage?.summary?.missingCount ?? 0,
      }
    : null,
  openapi: {
    documentedPaths: openapiRouteSync.documentedPaths ?? 0,
    fileRoutes: openapiRouteSync.fileRoutes ?? 0,
    missingInSpec: openapiRouteSync.currentMissingInSpec ?? 0,
    currentMissingInSpec: openapiRouteSync.currentMissingInSpec ?? 0,
    baselineMissingInSpec: openapiRouteSync.baselineMissingInSpec ?? 0,
    newlyMissingVsBaseline: openapiRouteSync.newlyMissingVsBaseline ?? 0,
    resolvedVsBaseline: openapiRouteSync.resolvedVsBaseline ?? 0,
  },
  scriptSurface: scriptSurface
    ? {
        totalScripts: scriptSurface.totalScripts ?? 0,
        familyCount: scriptSurface.familyCount ?? 0,
        topLevelCount: scriptSurface.topLevelCount ?? 0,
        exactCommandAliasCount: scriptSurface.exactCommandAliases?.length ?? 0,
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
  buildArtifacts: buildArtifacts
    ? {
        status: buildArtifacts.status ?? 'unknown',
        distClientTotalMb: buildArtifacts?.distClient?.totalMb ?? 0,
        distClientWithinSoftBudget: buildArtifacts?.distClient?.withinSoftBudget ?? false,
        astroWithinBudget: buildArtifacts?.astroAssets?.withinBudget ?? false,
        publicUploadsTotalMb: buildArtifacts?.publicUploads?.totalMb ?? 0,
        publicUploadsOversizedFileCount: buildArtifacts?.publicUploads?.oversizedFileCount ?? 0,
        publicImagesTotalMb: buildArtifacts?.publicImages?.totalMb ?? 0,
        publicImagesOversizedFileCount: buildArtifacts?.publicImages?.oversizedFileCount ?? 0,
      }
    : null,
  dbUsageAudit: dbUsageAudit
    ? {
        status: dbUsageAudit.status ?? 'unknown',
        tableCount: dbUsageAudit?.summary?.tableCount ?? 0,
        databaseSource: dbUsageAudit?.database?.source ?? 'unknown',
        zeroScanIndexCount: dbUsageAudit?.summary?.zeroScanIndexCount ?? dbUsageAudit?.summary?.unusedIndexCount ?? 0,
        protectedZeroScanIndexCount: dbUsageAudit?.summary?.protectedZeroScanIndexCount ?? 0,
        unusedIndexCount: dbUsageAudit?.summary?.unusedIndexCount ?? 0,
        speculativeCandidateCount: dbUsageAudit?.summary?.speculativeCandidateCount ?? 0,
      }
    : null,
  dbRetirementObservation: dbRetirementObservation
    ? {
        status: dbRetirementObservation.status ?? 'unknown',
        p0DropCandidateCount: dbRetirementObservation?.summary?.p0DropCandidateCount ?? 0,
        p0QuarantineCandidateCount: dbRetirementObservation?.summary?.p0QuarantineCandidateCount ?? 0,
        p0RuntimeHoldCount: dbRetirementObservation?.summary?.p0RuntimeHoldCount ?? 0,
        p1ReviewCandidateCount: dbRetirementObservation?.summary?.p1ReviewCandidateCount ?? 0,
        p2UnusedIndexCandidateCount: dbRetirementObservation?.summary?.p2UnusedIndexCandidateCount ?? 0,
      }
    : null,
  dbP0QuarantinePlan: dbP0QuarantinePlan
    ? {
        status: dbP0QuarantinePlan.status ?? 'unknown',
        quarantineCandidateCount: dbP0QuarantinePlan?.summary?.quarantineCandidateCount ?? 0,
        runtimeHoldCount: dbP0QuarantinePlan?.summary?.runtimeHoldCount ?? 0,
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
        automaticDropAllowed: dbObservationCalendar?.policy?.automaticDropAllowed ?? false,
      }
    : null,
  dbManualDecisionReadiness: dbManualDecisionReadiness
    ? {
        status: dbManualDecisionReadiness.status ?? 'unknown',
        readyForManualPrCount: dbManualDecisionReadiness?.summary?.readyForManualPrCount ?? 0,
        waitingForEvidenceCount: dbManualDecisionReadiness?.summary?.waitingForEvidenceCount ?? 0,
        runtimeHoldCount: dbManualDecisionReadiness?.summary?.runtimeHoldCount ?? 0,
      }
    : null,
  dbRegistryClassification: dbRegistryClassification
    ? {
        status: dbRegistryClassification.status ?? 'unknown',
        tableCount: dbRegistryClassification?.summary?.tableCount ?? 0,
        unclassifiedCount: dbRegistryClassification?.summary?.unclassifiedCount ?? 0,
        zeroScanIndexCount: dbRegistryClassification?.summary?.zeroScanIndexCount ?? dbRegistryClassification?.summary?.unusedIndexCount ?? 0,
        protectedZeroScanIndexCount: dbRegistryClassification?.summary?.protectedZeroScanIndexCount ?? 0,
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
  dbProdVersionCompare: dbProdVersionCompare
    ? {
        status: dbProdVersionCompare.status ?? 'unknown',
        databaseSource: dbProdVersionCompare?.database?.source ?? 'unknown',
        database: dbProdVersionCompare?.database?.database ?? 'unknown',
        sourceMigrationFileCount: dbProdVersionCompare?.summary?.sourceMigrationFileCount ?? 0,
        schemaMigrationCount: dbProdVersionCompare?.summary?.schemaMigrationCount ?? 0,
        appliedSourceMatchCount: dbProdVersionCompare?.summary?.appliedSourceMatchCount ?? 0,
        sourcePendingCount: dbProdVersionCompare?.summary?.sourcePendingCount ?? 0,
        dbOnlyCount: dbProdVersionCompare?.summary?.dbOnlyCount ?? 0,
      }
    : null,
  dbIndexReviewPlan: dbIndexReviewPlan
    ? {
        status: dbIndexReviewPlan.status ?? 'unknown',
        reviewableIndexCount: dbIndexReviewPlan?.summary?.reviewableIndexCount ?? 0,
        highRiskCount: dbIndexReviewPlan?.summary?.highRiskCount ?? 0,
        automaticIndexDropAllowed: dbIndexReviewPlan?.automaticIndexDropAllowed ?? false,
      }
    : null,
  dbAdvisoryEvidence: dbAdvisoryEvidence
    ? {
        status: dbAdvisoryEvidence.status ?? 'unknown',
        p0QuarantineCandidateCount: dbAdvisoryEvidence?.summary?.p0QuarantineCandidateCount ?? 0,
        runtimeHoldCount: dbAdvisoryEvidence?.summary?.runtimeHoldCount ?? 0,
        observationSnapshots: dbAdvisoryEvidence?.summary?.observationSnapshots ?? 0,
        observationDaysRequired: dbAdvisoryEvidence?.summary?.observationDaysRequired ?? 0,
        automaticDbDropAllowed: dbAdvisoryEvidence?.policy?.automaticDbDropAllowed ?? false,
      }
    : null,
  searchZeroResult: searchZeroResult
    ? {
        status: searchZeroResult.status ?? 'unknown',
        unresolvedCount: searchZeroResult?.summary?.unresolvedCount ?? 0,
        unresolvedOccurrences: searchZeroResult?.summary?.unresolvedOccurrences ?? 0,
      }
    : null,
  localUploadParity: localUploadParity
    ? {
        status: localUploadParity.status ?? 'unknown',
        uploadFileCount: localUploadParity?.summary?.uploadFileCount ?? 0,
        missingReferencedFileCount: localUploadParity?.summary?.missingReferencedFileCount ?? 0,
        unreferencedCandidateCount: localUploadParity?.summary?.unreferencedCandidateCount ?? 0,
        softLimitMb: localUploadParity?.quota?.softLimitMb ?? 0,
        usedPercent: localUploadParity?.quota?.usedPercent ?? 0,
        quotaStatus: localUploadParity?.quota?.status ?? 'unknown',
        withinSoftLimit: localUploadParity?.quota?.withinSoftLimit ?? true,
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
  localUploadClassification: localUploadClassification
    ? {
        status: localUploadClassification.status ?? 'unknown',
        total: localUploadClassification?.summary?.total ?? 0,
        observed: localUploadClassification?.summary?.observed ?? 0,
        archiveCandidate: localUploadClassification?.summary?.archive_candidate ?? 0,
        deletableReview: localUploadClassification?.summary?.deletable_review ?? 0,
        ageSource: localUploadClassification?.policy?.ageSource ?? 'unknown',
      }
    : null,
  localUploadArchiveCandidates: localUploadArchiveCandidates
    ? {
        status: localUploadArchiveCandidates.status ?? 'unknown',
        total: localUploadArchiveCandidates?.summary?.total ?? 0,
        archiveCandidate: localUploadArchiveCandidates?.summary?.archiveCandidate ?? 0,
        deletableReview: localUploadArchiveCandidates?.summary?.deletableReview ?? 0,
      }
    : null,
  releaseArtifactFreshness: releaseArtifactFreshness
    ? {
        status: releaseArtifactFreshness.status ?? 'unknown',
        maxAgeMinutes: releaseArtifactFreshness.maxAgeMinutes ?? 0,
        staleOrMissingCount: (releaseArtifactFreshness.results || []).filter((item) => item.status !== 'fresh').length,
      }
    : null,
  releaseNextActions: releaseNextActions
    ? {
        status: releaseNextActions.status ?? 'unknown',
        actionCount: releaseNextActions?.summary?.actionCount ?? 0,
        blockingActionCount: releaseNextActions?.summary?.blockingActionCount ?? 0,
        waitingActionCount: releaseNextActions?.summary?.waitingActionCount ?? 0,
      }
    : null,
  releaseReadiness: releaseReadiness
    ? {
        status: releaseReadiness.status ?? 'unknown',
        advisoryCount: releaseReadiness?.advisories?.length ?? 0,
        checkCount: releaseReadiness?.checks?.length ?? 0,
      }
    : null,
  socialUx: socialUxReport
    ? {
        status: socialUxReport.status ?? 'unknown',
        passed: socialUxReport?.summary?.passed ?? 0,
        failed: socialUxReport?.summary?.failed ?? 0,
        checkCount: socialUxReport?.summary?.checkCount ?? 0,
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
        localStorageOnly: gmapsScraperReadiness?.policy?.localStorageOnly ?? false,
        dockerRequired: gmapsScraperReadiness?.policy?.dockerRequired ?? true,
      }
    : null,
  gmapsQueryPlan: gmapsQueryPlan
    ? {
        status: gmapsQueryPlan.status ?? 'unknown',
        source: gmapsQueryPlan.source ?? 'unknown',
        queryCount: gmapsQueryPlan.queryCount ?? 0,
        dbAvailable: gmapsQueryPlan.dbAvailable ?? false,
        localStorageOnly: gmapsQueryPlan?.policy?.localStorageOnly ?? false,
      }
    : null,
  gmapsDiscoveryPlan: gmapsDiscoveryPlan
    ? {
        status: gmapsDiscoveryPlan.status ?? 'unknown',
        queryCount: gmapsDiscoveryPlan.queryCount ?? 0,
        sectionCount: gmapsDiscoveryPlan.sectionCount ?? 0,
        localStorageOnly: gmapsDiscoveryPlan?.policy?.localStorageOnly ?? false,
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
        updated: Array.isArray(publishAllContentDrafts.updates)
          ? Object.fromEntries(
              publishAllContentDrafts.updates.map((item) => [item.table, item.updated ?? 0]),
            )
          : {},
        moderationQueuesAutoApproved:
          publishAllContentDrafts?.policy?.moderationQueuesAutoApproved === true,
      }
    : null,
  blogKeywordResearch: blogKeywordResearch
    ? {
        status: blogKeywordResearch.status ?? 'unknown',
        selected: blogKeywordResearch?.summary?.selected ?? 0,
        duplicateRisk: blogKeywordResearch?.summary?.duplicateRisk ?? 0,
        coverageComplete: blogKeywordResearch?.summary?.coverageComplete ?? false,
        prodPublishedTotal: blogKeywordResearch?.prodBlogInventory?.total ?? 0,
        googleAdsReady: blogKeywordResearch?.googleAds?.ready ?? false,
        volumeFallback: blogKeywordResearch?.sourcePolicy?.volumeFallback ?? 'unknown',
      }
    : null,
  blogDraftApply: blogDraftApply
    ? {
        applied: blogDraftApply.applied ?? 0,
        pendingBlogDrafts:
          blogPublishReadiness?.status === 'published' ? 0 : blogDraftApply.pendingBlogDrafts ?? 0,
        autoPublish: blogDraftApply.autoPublish ?? true,
        supersededByPublishReadiness: blogPublishReadiness?.status === 'published',
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
  blogDraftQuality: blogDraftQuality
    ? {
        status: blogDraftQuality.status ?? 'unknown',
        drafts: blogDraftQuality?.summary?.drafts ?? 0,
        ok: blogDraftQuality?.summary?.ok ?? 0,
        review: blogDraftQuality?.summary?.review ?? 0,
      }
    : null,
  blogPublishReadiness: blogPublishReadiness
    ? {
        status: blogPublishReadiness.status ?? 'unknown',
        pendingBlogDrafts: blogPublishReadiness?.summary?.pendingBlogDrafts ?? 0,
        publishedOrExisting: blogPublishReadiness?.summary?.publishedOrExisting ?? 0,
        issues: blogPublishReadiness?.issues?.length ?? 0,
      }
    : null,
  blogAdminPublishQueue: blogAdminPublishQueue
    ? {
        status: blogAdminPublishQueue.status ?? 'unknown',
        draftCount: blogAdminPublishQueue?.summary?.draftCount ?? 0,
        qualityOk: blogAdminPublishQueue?.summary?.qualityOk ?? 0,
        richResultsOk: blogAdminPublishQueue?.summary?.richResultsOk ?? 0,
        issues: blogAdminPublishQueue?.issues?.length ?? 0,
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
        cdnOrObjectStorageAllowed: mediaReadiness?.policy?.cdnOrObjectStorageAllowed === true,
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
  blogDuplicateRiskGate: blogDuplicateRiskGate
    ? {
        status: blogDuplicateRiskGate.status ?? 'unknown',
        selected: blogDuplicateRiskGate?.summary?.selected ?? 0,
        selectedDuplicateRisk: blogDuplicateRiskGate?.summary?.selectedDuplicateRisk ?? 0,
        skippedDuplicateRisk: blogDuplicateRiskGate?.summary?.skippedDuplicateRisk ?? 0,
        autoPublish: blogDuplicateRiskGate?.policy?.autoPublish ?? true,
      }
    : null,
  pagespeedApiLessLighthouse: pagespeedApiLessLighthouse
    ? {
        status: pagespeedApiLessLighthouse.status ?? 'unknown',
        checks: pagespeedApiLessLighthouse?.summary?.checks ?? 0,
        ok: pagespeedApiLessLighthouse?.summary?.ok ?? 0,
        review: pagespeedApiLessLighthouse?.summary?.review ?? 0,
        failed: pagespeedApiLessLighthouse?.summary?.failed ?? 0,
        apiUsed: pagespeedApiLessLighthouse.apiUsed ?? true,
        performance: pagespeedApiLessLighthouse?.results?.[0]?.scores?.performance ?? null,
        bestPractices: pagespeedApiLessLighthouse?.results?.[0]?.scores?.bestPractices ?? null,
        seo: pagespeedApiLessLighthouse?.results?.[0]?.scores?.seo ?? null,
        reviewClassification: pagespeedApiLessLighthouse?.results?.[0]?.reviewClassification?.bestPractices?.classification ?? null,
        externalExpectedReview: pagespeedApiLessLighthouse?.results?.[0]?.reviewClassification?.bestPractices?.classification === 'external_expected_review',
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
  internalLinking: internalLinking
    ? {
        status: internalLinking.status ?? 'unknown',
        ruleCount: internalLinking.ruleCount ?? 0,
        uniqueUrlCount: internalLinking.uniqueUrlCount ?? 0,
        missingCriticalUrls: internalLinking.missingCriticalUrls?.length ?? 0,
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
};

writeFileSync('quality-metrics.json', `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');

const summary = [
  '## Quality Metrics',
  '',
  `- Source mode: ${metrics.sourceMode}`,
  `- Quality reports refresh: ${metrics.qualityReportsRefresh?.status ?? 'not-run'}`,
  `- Quality check report: ${metrics.qualityCheckReportPresent ? 'present' : 'missing'}`,
  `- Lint errors: ${metrics.lint.errors}`,
  `- Lint warnings: ${metrics.lint.warnings}`,
  `- Lint total problems: ${metrics.lint.problems}`,
  `- Type errors: ${metrics.typecheck.errors}`,
  `- Type warnings: ${metrics.typecheck.warnings}`,
  `- Type hints: ${metrics.typecheck.hints}`,
  `- OpenAPI documented paths: ${metrics.openapi.documentedPaths}`,
  `- OpenAPI file routes: ${metrics.openapi.fileRoutes}`,
  `- OpenAPI missingInSpec current: ${metrics.openapi.currentMissingInSpec}`,
  `- OpenAPI missingInSpec baseline: ${metrics.openapi.baselineMissingInSpec}`,
  `- OpenAPI newly missing vs baseline: ${metrics.openapi.newlyMissingVsBaseline}`,
  `- OpenAPI resolved vs baseline: ${metrics.openapi.resolvedVsBaseline}`,
  `- API release gate: ${metrics.apiReleaseGate.passed ? 'passed' : 'failed or not-run'}`,
  `- Blocker gates: lint=${metrics.blockerGates.lintOk ? 'ok' : 'fail'}, type=${metrics.blockerGates.typecheckOk ? 'ok' : 'fail'}, openapi=${metrics.blockerGates.openapiOk ? 'ok' : 'fail'}, script-canonical=${metrics.blockerGates.scriptCanonicalSurfaceOk ? 'ok' : 'fail'}, migration-drift=${metrics.blockerGates.migrationDuplicateDriftOk ? 'ok' : 'fail'}, upload-missing-refs=${metrics.blockerGates.localUploadMissingRefsOk ? 'ok' : 'fail'}, upload-quota=${metrics.blockerGates.localUploadQuotaOk ? 'ok' : 'blocker'}, upload-bucket-quota=${metrics.blockerGates.localUploadBucketQuotaOk ? 'ok' : 'blocker'}, upload-archive=${metrics.blockerGates.localUploadArchiveOk ? 'ok' : 'review'}, local-storage=${metrics.blockerGates.localStorageModelOk ? 'ok' : 'fail'}, media=${metrics.blockerGates.mediaReadinessOk ? 'ok' : 'review'}, admin-strict-role=${metrics.blockerGates.adminStrictRoleOk ? 'ok' : 'review'}, unit-skips=${metrics.blockerGates.unitSkipsDocumentedOk ? 'ok' : 'review'}, e2e-critical=${metrics.blockerGates.e2eCriticalCoverageOk ? 'ok' : 'review'}, warmup=${metrics.blockerGates.warmupSafetyOk ? 'ok' : 'review'}, cron=${metrics.blockerGates.cronReadinessOk ? 'ok' : 'review'}, internal-links=${metrics.blockerGates.internalLinkingOk ? 'ok' : 'review'}, llms-sitemap=${metrics.blockerGates.llmsSitemapAutoUpdateOk ? 'ok' : 'review'}, gmaps=${metrics.blockerGates.gmapsScraperReadinessOk ? 'ok' : 'review'}, gmaps-query=${metrics.blockerGates.gmapsQueryPlanOk ? 'ok' : 'review'}, gmaps-discovery=${metrics.blockerGates.gmapsDiscoveryPlanOk ? 'ok' : 'review'}, gmaps-drafts=${metrics.blockerGates.gmapsDiscoveryDraftsOk ? 'ok' : 'review'}, ollama=${metrics.blockerGates.ollamaReadinessOk ? 'ok' : 'review'}, blog-keywords=${metrics.blockerGates.blogKeywordResearchOk ? 'ok' : 'review'}, blog-duplicate=${metrics.blockerGates.blogDuplicateRiskOk ? 'ok' : 'review'}, blog-quality=${metrics.blockerGates.blogDraftQualityOk ? 'ok' : 'review'}, blog-drafts=${metrics.blockerGates.blogDraftApplyOk ? 'ok' : 'review'}, blog-publish=${metrics.blockerGates.blogPublishReadinessOk ? 'ok' : 'review'}, content-drafts=${metrics.blockerGates.contentAgentDraftsOk ? 'ok' : 'review'}, publish-all=${metrics.blockerGates.publishAllContentDraftsOk ? 'ok' : 'review'}, freshness=${metrics.blockerGates.releaseArtifactFreshnessOk ? 'ok' : 'not-run'}, readiness=${metrics.releaseReadiness?.status ?? 'not-run'}`,
  ...(metrics.unitTests
    ? [`- Unit tests: ${metrics.unitTests.status} (${metrics.unitTests.testFilesPassed}/${metrics.unitTests.testFilesTotal} files, ${metrics.unitTests.testsPassed}/${metrics.unitTests.testsTotal} tests)`]
    : []),
  ...(metrics.scriptCanonicalSurface
    ? [`- Script canonical surface: ${metrics.scriptCanonicalSurface.status} (${metrics.scriptCanonicalSurface.canonicalCount} canonical, ${metrics.scriptCanonicalSurface.missingCanonicalCount} missing, ${metrics.scriptCanonicalSurface.totalScripts} total scripts)`]
    : []),
  ...(metrics.migrationDuplicateDrift
    ? [`- Migration duplicate drift: ${metrics.migrationDuplicateDrift.status} (${metrics.migrationDuplicateDrift.duplicateNumberGroups} number groups, ${metrics.migrationDuplicateDrift.duplicateSlugGroups} slug groups, drift=${metrics.migrationDuplicateDrift.numberDrift || metrics.migrationDuplicateDrift.slugDrift ? 'yes' : 'no'})`]
    : []),
  ...(metrics.dbObservationCadence
    ? [`- DB observation cadence: ${metrics.dbObservationCadence.status} (${metrics.dbObservationCadence.snapshotCount}/${metrics.dbObservationCadence.observationDays} snapshots, ${metrics.dbObservationCadence.missingDays} missing days)`]
    : []),
  ...(metrics.dbObservationCalendar
    ? [`- DB observation calendar: ${metrics.dbObservationCalendar.status} (${metrics.dbObservationCalendar.completeCount}/${metrics.dbObservationCalendar.observationDays} days, next=${metrics.dbObservationCalendar.nextSnapshotDueAt ?? 'unknown'}, earliest=${metrics.dbObservationCalendar.earliestActionAt ?? 'unknown'}, auto-drop=${metrics.dbObservationCalendar.automaticDropAllowed ? 'yes' : 'no'})`]
    : []),
  ...(metrics.dbManualDecisionReadiness
    ? [`- DB manual decision readiness: ${metrics.dbManualDecisionReadiness.status} (${metrics.dbManualDecisionReadiness.readyForManualPrCount} ready, ${metrics.dbManualDecisionReadiness.waitingForEvidenceCount} waiting, ${metrics.dbManualDecisionReadiness.runtimeHoldCount} runtime hold)`]
    : []),
  ...(metrics.dbIndexReviewPlan
    ? [`- DB index review plan: ${metrics.dbIndexReviewPlan.status} (${metrics.dbIndexReviewPlan.reviewableIndexCount} reviewable, ${metrics.dbIndexReviewPlan.highRiskCount} high-risk, auto-drop=${metrics.dbIndexReviewPlan.automaticIndexDropAllowed ? 'yes' : 'no'})`]
    : []),
  ...(metrics.dbAdvisoryEvidence
    ? [`- DB advisory evidence: ${metrics.dbAdvisoryEvidence.status} (${metrics.dbAdvisoryEvidence.p0QuarantineCandidateCount} candidates, ${metrics.dbAdvisoryEvidence.runtimeHoldCount} runtime hold, observation=${metrics.dbAdvisoryEvidence.observationSnapshots}/${metrics.dbAdvisoryEvidence.observationDaysRequired}, auto-drop=${metrics.dbAdvisoryEvidence.automaticDbDropAllowed ? 'yes' : 'no'})`]
    : []),
  ...(metrics.dbRuntimeHoldPlan
    ? [`- DB runtime hold plan: ${metrics.dbRuntimeHoldPlan.status} (${metrics.dbRuntimeHoldPlan.table}, refs=${metrics.dbRuntimeHoldPlan.runtimeReferenceCount}, incompatible-contracts=${metrics.dbRuntimeHoldPlan.incompatibleContractCount}, auto-drop=${metrics.dbRuntimeHoldPlan.automaticDropAllowed ? 'yes' : 'no'})`]
    : []),
  ...(metrics.sqlParameterSafety
    ? [`- SQL parameter safety: ${metrics.sqlParameterSafety.status} (${metrics.sqlParameterSafety.findingCount} findings)`]
    : []),
  ...(metrics.e2e
    ? [`- E2E report: ${metrics.e2e.status} (${metrics.e2e.suite}/${metrics.e2e.project}, ${metrics.e2e.passed}/${metrics.e2e.testsTotal} passed, ${metrics.e2e.failed} failed)`]
    : []),
  ...(metrics.e2eSkips
    ? [`- E2E skip report: ${metrics.e2eSkips.status} (${metrics.e2eSkips.declarationCount} declarations, ${metrics.e2eSkips.undocumentedCount} undocumented)`]
    : []),
  ...(metrics.e2eCriticalCoverage
    ? [`- E2E critical coverage: ${metrics.e2eCriticalCoverage.status} (${metrics.e2eCriticalCoverage.coveredCount}/${metrics.e2eCriticalCoverage.flowCount} flows, ${metrics.e2eCriticalCoverage.missingCount} missing)`]
    : []),
  ...(metrics.localUploadClassification
    ? [`- Local upload classification: ${metrics.localUploadClassification.status} (${metrics.localUploadClassification.total} total, ${metrics.localUploadClassification.observed} observed, ${metrics.localUploadClassification.archiveCandidate} archive candidate, ${metrics.localUploadClassification.deletableReview} delete-review, age=${metrics.localUploadClassification.ageSource})`]
    : []),
  ...(metrics.localUploadArchiveCandidates
    ? [`- Local upload archive candidates: ${metrics.localUploadArchiveCandidates.status} (${metrics.localUploadArchiveCandidates.total} total, ${metrics.localUploadArchiveCandidates.archiveCandidate} archive, ${metrics.localUploadArchiveCandidates.deletableReview} delete-review)`]
    : []),
  ...(metrics.localUploadBucketQuota
    ? [`- Local upload bucket quota: ${metrics.localUploadBucketQuota.status} (${metrics.localUploadBucketQuota.bucketCount} buckets, ${metrics.localUploadBucketQuota.blockerCount} blockers, ${metrics.localUploadBucketQuota.reviewCount} review)`]
    : []),
  ...(metrics.localMediaStorageGate
    ? [`- Local media storage gate: ${metrics.localMediaStorageGate.status} (local-only=${metrics.localMediaStorageGate.localStorageOnly ? 'yes' : 'no'}, external-object-storage=${metrics.localMediaStorageGate.externalObjectStorageConfigured ? 'yes' : 'no'}, live=${metrics.localMediaStorageGate.liveOk}/${metrics.localMediaStorageGate.liveChecks}, failed-patterns=${metrics.localMediaStorageGate.failedPatterns})`]
    : []),
  ...(metrics.mediaReadiness
    ? [`- Media readiness: ${metrics.mediaReadiness.status} (${metrics.mediaReadiness.passed}/${metrics.mediaReadiness.checks}, uploads=${metrics.mediaReadiness.uploadFiles}, public-images=${metrics.mediaReadiness.publicImages}, local-only=${metrics.mediaReadiness.localStorageOnly ? 'yes' : 'no'})`]
    : []),
  ...(metrics.adminStrictRoleGate
    ? [`- Admin strict role gate: ${metrics.adminStrictRoleGate.status} (${metrics.adminStrictRoleGate.ok}/${metrics.adminStrictRoleGate.checked}, review=${metrics.adminStrictRoleGate.review})`]
    : []),
  ...(metrics.redisRuntimeHealth
    ? [`- Redis runtime health: ${metrics.redisRuntimeHealth.status} (${metrics.redisRuntimeHealth.host}:${metrics.redisRuntimeHealth.port}, ping=${metrics.redisRuntimeHealth.pingOk ? 'ok' : 'fail'}, mode=${metrics.redisRuntimeHealth.runtimeMode}, blocker=${metrics.redisRuntimeHealth.releaseBlocker ? 'yes' : 'no'})`]
    : []),
  ...(metrics.blogDuplicateRiskGate
    ? [`- Blog duplicate risk gate: ${metrics.blogDuplicateRiskGate.status} (selected=${metrics.blogDuplicateRiskGate.selected}, selected-duplicate=${metrics.blogDuplicateRiskGate.selectedDuplicateRisk}, skipped-duplicate=${metrics.blogDuplicateRiskGate.skippedDuplicateRisk}, auto-publish=${metrics.blogDuplicateRiskGate.autoPublish ? 'yes' : 'no'})`]
    : []),
  ...(metrics.warmupSafety
    ? [`- Warmup safety: ${metrics.warmupSafety.status} (${metrics.warmupSafety.reviewCount} review)`]
    : []),
  ...(metrics.cronReadiness
    ? [`- Cron readiness: ${metrics.cronReadiness.status} (${metrics.cronReadiness.presentJobCount}/${metrics.cronReadiness.requiredJobCount} jobs, ${metrics.cronReadiness.missingJobCount} missing)`]
    : []),
  ...(metrics.gmapsScraperReadiness
    ? [`- Google Maps scraper readiness: ${metrics.gmapsScraperReadiness.status} (binary=${metrics.gmapsScraperReadiness.binaryFound ? 'found' : 'missing'}, cli=${metrics.gmapsScraperReadiness.cliOk ? 'ok' : 'fail'}, local-storage=${metrics.gmapsScraperReadiness.localStorageOnly ? 'yes' : 'no'})`]
    : []),
  ...(metrics.gmapsQueryPlan
    ? [`- Google Maps query plan: ${metrics.gmapsQueryPlan.status} (${metrics.gmapsQueryPlan.queryCount} queries, source=${metrics.gmapsQueryPlan.source}, db=${metrics.gmapsQueryPlan.dbAvailable ? 'yes' : 'no'})`]
    : []),
  ...(metrics.gmapsDiscoveryPlan
    ? [`- Google Maps discovery plan: ${metrics.gmapsDiscoveryPlan.status} (${metrics.gmapsDiscoveryPlan.queryCount} queries, ${metrics.gmapsDiscoveryPlan.sectionCount} sections, update=${metrics.gmapsDiscoveryPlan.doesNotUpdatePlaces ? 'no' : 'yes'})`]
    : []),
  ...(metrics.gmapsDiscoveryDrafts
    ? [`- Google Maps discovery drafts: ${metrics.gmapsDiscoveryDrafts.status} (${metrics.gmapsDiscoveryDrafts.candidateCount} candidates, existing=${metrics.gmapsDiscoveryDrafts.existingDraftCount ?? 'unknown'}, pending=${metrics.gmapsDiscoveryDrafts.pendingDraftCount ?? 'unknown'}, mode=${metrics.gmapsDiscoveryDrafts.mode}, upsert=${metrics.gmapsDiscoveryDrafts.insertedOrUpdatedCount}, autopublish=${metrics.gmapsDiscoveryDrafts.autoPublish ? 'yes' : 'no'})`]
    : []),
  ...(metrics.ollamaReadiness
    ? [`- Ollama readiness: ${metrics.ollamaReadiness.status} (mode=${metrics.ollamaReadiness.mode}, key=${metrics.ollamaReadiness.apiKeyPresent ? 'present' : 'missing'}, live=${metrics.ollamaReadiness.liveChecked ? (metrics.ollamaReadiness.liveOk ? 'ok' : 'fail') : 'skipped'}, model=${metrics.ollamaReadiness.model})`]
    : []),
  ...(metrics.contentAgentDrafts
    ? [`- Content agent drafts: ${metrics.contentAgentDrafts.status} (${metrics.contentAgentDrafts.total} total, ${metrics.contentAgentDrafts.pending} pending, stale=${metrics.contentAgentDrafts.stalePendingCount}, autopublish=${metrics.contentAgentDrafts.autoPublish ? 'yes' : 'no'})`]
    : []),
  ...(metrics.publishAllContentDrafts
    ? [`- Publish all content drafts: ${metrics.publishAllContentDrafts.status} (remaining-draft-like=${metrics.publishAllContentDrafts.remainingDraftLike}, moderation-pending=${metrics.publishAllContentDrafts.moderationPending}, moderation-auto-approved=${metrics.publishAllContentDrafts.moderationQueuesAutoApproved ? 'yes' : 'no'})`]
    : []),
  ...(metrics.blogKeywordResearch
    ? [`- Blog keyword research: ${metrics.blogKeywordResearch.status} (${metrics.blogKeywordResearch.selected} selected, ${metrics.blogKeywordResearch.duplicateRisk} duplicate-risk skipped, coverage=${metrics.blogKeywordResearch.coverageComplete ? 'complete' : 'open'}, prod=${metrics.blogKeywordResearch.prodPublishedTotal}, volume=${metrics.blogKeywordResearch.volumeFallback})`]
    : []),
  ...(metrics.blogDraftApply
    ? [`- Blog Ollama drafts: applied=${metrics.blogDraftApply.applied}, pending=${metrics.blogDraftApply.pendingBlogDrafts}, autopublish=${metrics.blogDraftApply.autoPublish ? 'yes' : 'no'}${metrics.blogDraftApply.supersededByPublishReadiness ? ', published-report-supersedes-apply-summary=yes' : ''}`]
    : []),
  ...(metrics.blogDraftRichResults
    ? [`- Blog rich results: ${metrics.blogDraftRichResults.status} (${metrics.blogDraftRichResults.ok}/${metrics.blogDraftRichResults.drafts} ok, review=${metrics.blogDraftRichResults.review})`]
    : []),
  ...(metrics.blogDraftQuality
    ? [`- Blog draft quality: ${metrics.blogDraftQuality.status} (${metrics.blogDraftQuality.ok}/${metrics.blogDraftQuality.drafts} ok, review=${metrics.blogDraftQuality.review})`]
    : []),
  ...(metrics.blogPublishReadiness
    ? [`- Blog publish readiness: ${metrics.blogPublishReadiness.status} (${metrics.blogPublishReadiness.pendingBlogDrafts} pending, published/existing=${metrics.blogPublishReadiness.publishedOrExisting}, issues=${metrics.blogPublishReadiness.issues})`]
    : []),
  ...(metrics.blogAdminPublishQueue
    ? [`- Blog admin publish queue: ${metrics.blogAdminPublishQueue.status} (${metrics.blogAdminPublishQueue.draftCount} drafts, quality=${metrics.blogAdminPublishQueue.qualityOk}, rich=${metrics.blogAdminPublishQueue.richResultsOk}, issues=${metrics.blogAdminPublishQueue.issues})`]
    : []),
  ...(metrics.pagespeedApiLessLighthouse
    ? [`- PageSpeed API-less Lighthouse: ${metrics.pagespeedApiLessLighthouse.status} (${metrics.pagespeedApiLessLighthouse.ok}/${metrics.pagespeedApiLessLighthouse.checks} ok, review=${metrics.pagespeedApiLessLighthouse.review}, failed=${metrics.pagespeedApiLessLighthouse.failed}, api=${metrics.pagespeedApiLessLighthouse.apiUsed ? 'yes' : 'no'}, perf=${metrics.pagespeedApiLessLighthouse.performance ?? 'n/a'}, best=${metrics.pagespeedApiLessLighthouse.bestPractices ?? 'n/a'}, seo=${metrics.pagespeedApiLessLighthouse.seo ?? 'n/a'}, classification=${metrics.pagespeedApiLessLighthouse.reviewClassification ?? 'n/a'})`]
    : []),
  ...(metrics.backendFrontendImprovements
    ? [`- Backend/frontend improvements: ${metrics.backendFrontendImprovements.status} (${metrics.backendFrontendImprovements.passed}/${metrics.backendFrontendImprovements.total} checks, backend=${metrics.backendFrontendImprovements.backendPassed}/${metrics.backendFrontendImprovements.backendTotal}, frontend=${metrics.backendFrontendImprovements.frontendPassed}/${metrics.backendFrontendImprovements.frontendTotal})`]
    : []),
  ...(metrics.internalLinking
    ? [`- Internal linking: ${metrics.internalLinking.status} (${metrics.internalLinking.ruleCount} rules, ${metrics.internalLinking.uniqueUrlCount} URLs, missing critical=${metrics.internalLinking.missingCriticalUrls})`]
    : []),
  ...(metrics.llmsSitemapAutoUpdate
    ? [`- LLMS/Sitemap auto update: ${metrics.llmsSitemapAutoUpdate.status} (${metrics.llmsSitemapAutoUpdate.ok}/${metrics.llmsSitemapAutoUpdate.checks} checks, failed=${metrics.llmsSitemapAutoUpdate.failed})`]
    : []),
  ...(metrics.unitSkips
    ? [`- Unit skip report: ${metrics.unitSkips.status} (${metrics.unitSkips.observedSkippedFiles} skipped files, ${metrics.unitSkips.observedSkippedTests} skipped tests, ${metrics.unitSkips.undocumentedCount} undocumented declarations)`]
    : []),
  ...(metrics.releaseArtifactFreshness
    ? [`- Release artifact freshness: ${metrics.releaseArtifactFreshness.status} (${metrics.releaseArtifactFreshness.staleOrMissingCount} stale/missing, max age ${metrics.releaseArtifactFreshness.maxAgeMinutes} minutes)`]
    : []),
  ...(metrics.releaseNextActions
    ? [`- Release next actions: ${metrics.releaseNextActions.status} (${metrics.releaseNextActions.actionCount} actions, blocking=${metrics.releaseNextActions.blockingActionCount}, waiting=${metrics.releaseNextActions.waitingActionCount})`]
    : []),
  '',
];

console.log(summary.join('\n'));
