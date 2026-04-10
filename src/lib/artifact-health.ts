import { buildArtifactHealth, classifyOverallOpsStatus, type AdminStatusLevel } from './admin-status';
import { getPerformanceOptimizationSummary } from './admin-dashboard';
import { getNightlyOpsSummary } from './nightly-ops-summary';
import { getReleaseGateSummary } from './release-gate-summary';

export type ArtifactHealthEntry = ReturnType<typeof buildArtifactHealth>;

export type ArtifactHealthSnapshot = {
  releaseGate: ArtifactHealthEntry;
  nightlyRegression: ArtifactHealthEntry;
  nightlyE2E: ArtifactHealthEntry;
  performanceOps?: ArtifactHealthEntry;
};

export type RuntimeArtifactHealthSnapshot = Pick<
  ArtifactHealthSnapshot,
  'releaseGate' | 'nightlyRegression' | 'nightlyE2E'
>;

export type AdminArtifactHealthSnapshot = Required<ArtifactHealthSnapshot>;

export type ArtifactHealthSummary = {
  overall: AdminStatusLevel;
  healthyCount: number;
  degradedCount: number;
  blockedCount: number;
  total: number;
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

export async function getAdminArtifactHealthSnapshot(): Promise<AdminArtifactHealthSnapshot> {
  const performanceOptimization = await getPerformanceOptimizationSummary();
  const snapshot = await getArtifactHealthSnapshot({
    includePerformanceOps: true,
    performanceOpsGeneratedAt: performanceOptimization?.generatedAt ?? null
  });

  return {
    releaseGate: snapshot.releaseGate,
    nightlyRegression: snapshot.nightlyRegression,
    nightlyE2E: snapshot.nightlyE2E,
    performanceOps: snapshot.performanceOps ?? buildArtifactHealth({
      kind: 'performanceOps',
      available: false,
      generatedAt: null
    })
  };
}

export function summarizeArtifactHealth(snapshot: ArtifactHealthSnapshot): ArtifactHealthSummary {
  const entries = Object.values(snapshot).filter((entry): entry is ArtifactHealthEntry => Boolean(entry));
  const levels = entries.map((entry) => entry.status);

  return {
    overall: classifyOverallOpsStatus(levels),
    healthyCount: entries.filter((entry) => entry.status === 'healthy').length,
    degradedCount: entries.filter((entry) => entry.status === 'degraded').length,
    blockedCount: entries.filter((entry) => entry.status === 'blocked').length,
    total: entries.length
  };
}
