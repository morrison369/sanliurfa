import type { APIRoute } from 'astro';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

function readJsonReport(relativePath: string) {
  const absolutePath = join(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) return null;
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/media-health',
    });
  }

  try {
    const buildArtifacts = readJsonReport('docs/build-artifact-report.json');
    const uploadParity = readJsonReport('docs/local-upload-parity-report.json');
    const uploadClassification = readJsonReport('docs/local-upload-candidate-classification.json');
    const uploadArchiveCandidates = readJsonReport('docs/local-upload-archive-candidates.json');
    const quality = readJsonReport('quality-metrics.json');
    const freshness = readJsonReport('docs/release-artifact-freshness.json');
    const unitSkips = readJsonReport('docs/unit-skip-report.json');
    const uploadOptimization = readJsonReport('docs/local-upload-optimization-report.json');
    const staticOptimization = readJsonReport('docs/static-image-optimization-report.json');

    return apiResponse(
      {
        success: true,
        data: {
          distClient: buildArtifacts?.distClient ?? null,
          publicUploads: buildArtifacts?.publicUploads ?? null,
          publicImages: buildArtifacts?.publicImages ?? null,
          uploadParity: uploadParity
            ? {
                status: uploadParity.status ?? 'unknown',
                summary: uploadParity.summary ?? null,
                quota: uploadParity.quota ?? null,
                ownershipModel: uploadParity.ownershipModel ?? [],
                topUnreferencedCandidates: uploadParity.unreferencedCandidates?.slice?.(0, 10) ?? [],
              }
            : null,
          uploadClassification: uploadClassification
            ? {
                status: uploadClassification.status ?? 'unknown',
                policy: uploadClassification.policy ?? null,
                summary: uploadClassification.summary ?? null,
              }
            : null,
          uploadArchiveCandidates: uploadArchiveCandidates
            ? {
                status: uploadArchiveCandidates.status ?? 'unknown',
                policy: uploadArchiveCandidates.policy ?? null,
                summary: uploadArchiveCandidates.summary ?? null,
                topCandidates: uploadArchiveCandidates.candidates?.slice?.(0, 10) ?? [],
              }
            : null,
          qualityRefresh: quality
            ? {
                status: quality.qualityReportsRefresh?.status ?? 'unknown',
                generatedAt: quality.qualityReportsRefresh?.generatedAt ?? null,
                lintOk: quality.blockerGates?.lintOk ?? false,
                typecheckOk: quality.blockerGates?.typecheckOk ?? false,
                openapiOk: quality.blockerGates?.openapiOk ?? false,
              }
            : null,
          freshness: freshness
            ? {
                status: freshness.status ?? 'unknown',
                generatedAt: freshness.generatedAt ?? null,
                staleOrMissingCount: Array.isArray(freshness.results)
                  ? freshness.results.filter((item: { status?: string }) => item.status !== 'fresh').length
                  : null,
              }
            : null,
          unitSkips: unitSkips
            ? {
                status: unitSkips.status ?? 'unknown',
                observedUnitSkips: unitSkips.observedUnitSkips ?? null,
                summary: unitSkips.summary ?? null,
              }
            : null,
          uploadOptimization,
          staticOptimization,
          storageModel: 'local-filesystem',
          generatedAt: new Date().toISOString(),
        },
      },
      HttpStatus.OK,
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Media Health Okunamadı',
      detail: safeErrorDetail(error, 'unknown'),
      type: '/problems/admin-media-health-read-failed',
      instance: '/api/admin/site/media-health',
    });
  }
};
