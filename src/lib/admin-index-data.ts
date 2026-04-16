import type { AdminAccessCoverage } from './admin-access-coverage';
import type { AdminArtifactHealthSnapshot } from './artifact-health';
import { buildAdminIndexRiskCards, buildAdminIndexToolCards } from './admin-index';
import {
  buildAdminIndexRiskCardViews,
  buildAdminIndexToolCardViews,
  type AdminIndexRiskCardView,
  type AdminIndexToolCardView,
} from './admin-index-view';
import { buildArtifactHealth, classifyNightlyStatus, classifyReleaseGateStatus } from './admin-status';
import type { ReleaseGateSummary } from './release-gate-summary';
import type { NightlyOpsSummary } from './nightly-ops-summary';

export type AdminIndexStats = {
  places: number;
  users: number;
  reviews: number;
  messages: number;
  pending: number;
};

export type AdminIndexData = {
  stats: AdminIndexStats;
  riskCardViews: AdminIndexRiskCardView[];
  toolCardViews: AdminIndexToolCardView[];
};

type AdminIndexDataDeps = {
  countQuery: (sql: string) => Promise<{ rows: Array<{ count?: string }> }>;
  getAccessCoverage: () => Promise<AdminAccessCoverage>;
  getArtifactHealth: () => Promise<AdminArtifactHealthSnapshot>;
  getReleaseGate: () => Promise<ReleaseGateSummary>;
  getNightly: () => Promise<{ regression: NightlyOpsSummary; e2e: NightlyOpsSummary }>;
};

const defaultDeps: AdminIndexDataDeps = {
  countQuery: async (sql) => {
    const { query } = await import('./postgres');
    return query(sql);
  },
  getAccessCoverage: async () => {
    const { getAdminAccessCoverage } = await import('./admin-access-coverage');
    return getAdminAccessCoverage();
  },
  getArtifactHealth: async () => {
    const { getAdminArtifactHealthSnapshot } = await import('./artifact-health');
    return getAdminArtifactHealthSnapshot();
  },
  getReleaseGate: async () => {
    const { getReleaseGateSummary } = await import('./release-gate-summary');
    return getReleaseGateSummary();
  },
  getNightly: async () => {
    const { getNightlyOpsSummary } = await import('./nightly-ops-summary');
    return getNightlyOpsSummary();
  },
};

function parseCount(result: { rows: Array<{ count?: string }> }): number {
  return Number.parseInt(result.rows[0]?.count || '0', 10);
}

export async function getAdminIndexData(
  deps: Partial<AdminIndexDataDeps> = {}
): Promise<AdminIndexData> {
  const resolvedDeps = { ...defaultDeps, ...deps };

  const [
    placesCount,
    usersCount,
    reviewsCount,
    messagesCount,
    pendingPlaces,
    adminAccessCoverage,
    artifactHealth,
    releaseGate,
    nightly,
  ] = await Promise.all([
    resolvedDeps.countQuery('SELECT COUNT(*) FROM places'),
    resolvedDeps.countQuery('SELECT COUNT(*) FROM users'),
    resolvedDeps.countQuery('SELECT COUNT(*) FROM reviews'),
    resolvedDeps.countQuery("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'"),
    resolvedDeps.countQuery("SELECT COUNT(*) FROM places WHERE status = 'pending'"),
    resolvedDeps.getAccessCoverage(),
    resolvedDeps.getArtifactHealth(),
    resolvedDeps.getReleaseGate(),
    resolvedDeps.getNightly(),
  ]);

  const stats: AdminIndexStats = {
    places: parseCount(placesCount),
    users: parseCount(usersCount),
    reviews: parseCount(reviewsCount),
    messages: parseCount(messagesCount),
    pending: parseCount(pendingPlaces),
  };

  const accessCoverageArtifact = buildArtifactHealth({
    kind: 'adminAccessCoverage',
    available: adminAccessCoverage.available,
    generatedAt: adminAccessCoverage.generatedAt,
  });

  const { summarizeArtifactHealth } = await import('./artifact-health');
  const artifactHealthSummary = summarizeArtifactHealth(artifactHealth);
  const releaseGateStatus = classifyReleaseGateStatus(releaseGate);
  const nightlyRegressionStatus = classifyNightlyStatus(nightly.regression);

  const riskCardViews = buildAdminIndexRiskCardViews(
    buildAdminIndexRiskCards({
      releaseGate,
      releaseGateStatus,
      nightlyRegression: nightly.regression,
      nightlyRegressionStatus,
      adminAccessCoverage,
      accessCoverageStatus: accessCoverageArtifact.status,
      artifactHealthSummary,
      artifactHealth,
    })
  );

  const toolCardViews = buildAdminIndexToolCardViews(
    buildAdminIndexToolCards({
      pending: stats.pending,
      messages: stats.messages,
    })
  );

  return {
    stats,
    riskCardViews,
    toolCardViews,
  };
}
