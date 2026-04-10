import { buildArtifactHealth } from './admin-status';
import { getNightlyOpsSummary } from './nightly-ops-summary';
import { getReleaseGateSummary } from './release-gate-summary';

export type ArtifactHealthSnapshot = {
  releaseGate: ReturnType<typeof buildArtifactHealth>;
  nightlyRegression: ReturnType<typeof buildArtifactHealth>;
  nightlyE2E: ReturnType<typeof buildArtifactHealth>;
  performanceOps?: ReturnType<typeof buildArtifactHealth>;
};

export async function getArtifactHealthSnapshot(options?: {
  includePerformanceOps?: boolean;
  performanceOpsGeneratedAt?: string | null;
}): Promise<ArtifactHealthSnapshot> {
  const [releaseGate, nightly] = await Promise.all([
    getReleaseGateSummary(),
    getNightlyOpsSummary()
  ]);

  const snapshot: ArtifactHealthSnapshot = {
    releaseGate: buildArtifactHealth({
      kind: 'releaseGate',
      available: releaseGate.available,
      generatedAt: releaseGate.generatedAt
    }),
    nightlyRegression: buildArtifactHealth({
      kind: 'nightlyRegression',
      available: nightly.regression.available,
      generatedAt: nightly.regression.generatedAt
    }),
    nightlyE2E: buildArtifactHealth({
      kind: 'nightlyE2E',
      available: nightly.e2e.available,
      generatedAt: nightly.e2e.generatedAt
    })
  };

  if (options?.includePerformanceOps) {
    snapshot.performanceOps = buildArtifactHealth({
      kind: 'performanceOps',
      available: Boolean(options.performanceOpsGeneratedAt),
      generatedAt: options.performanceOpsGeneratedAt ?? null
    });
  }

  return snapshot;
}
