import { describe, expect, it } from 'vitest';
import { renderAdminDashboardOverview } from '../admin-dashboard-overview';

describe('admin-dashboard-overview', () => {
  it('renders overview cards and period buttons', () => {
    const html = renderAdminDashboardOverview({
      period: 30,
      error: null,
      data: {
        overview: {
          users: { total: 10, new: 2, active: 8 },
          content: { places: 5, reviews: 20, comments: 4, newReviews: 2 },
          flags: { pending: 3, resolved: 9, total: 12 },
          moderation: { totalActions: 7, warnings: 2, suspensions: 1, bans: 0 },
          period: 30,
        },
        moderation: {
          queue: { pending: 3, inReview: 1 },
          flags: { highSeverity: 1 },
          actions: { suspensions: 1 },
        },
        integrations: {
          resend: { configured: true, source: 'env' },
          analytics: { configured: true, source: 'env' },
          summary: { configuredCount: 2, total: 2, fullyConfigured: true },
          verification: {
            resend: { status: 'healthy', message: 'ok', checkedAt: '2026-04-17T00:00:00.000Z' },
            analytics: { status: 'healthy', message: 'ok', checkedAt: '2026-04-17T00:00:00.000Z' },
            summary: { healthy: true, checkedAt: '2026-04-17T00:00:00.000Z' },
          },
        },
        statusSummary: {
          integrations: 'healthy',
          regression: 'healthy',
          e2e: 'healthy',
          releaseGate: 'healthy',
          overall: 'healthy',
        },
        adminAccessCoverage: {
          available: true,
          generatedAt: '2026-04-17T00:00:00.000Z',
          routeFiles: 40,
          wrapperFiles: 40,
          driftCount: 0,
          coveragePercent: 100,
          driftedFiles: [],
        },
        releaseGate: {
          available: true,
          generatedAt: '2026-04-17T00:00:00.000Z',
          finalStatus: 'passed',
          blockingFailedSteps: [],
          advisoryFailedSteps: [],
          failedStepCount: 0,
          adminAccessCoverage: {
            available: true,
            generatedAt: '2026-04-17T00:00:00.000Z',
            routeFiles: 40,
            wrapperFiles: 40,
            driftCount: 0,
            coveragePercent: 100,
            driftedFiles: [],
          },
        },
        nightly: {
          regression: {
            available: true,
            kind: 'regression',
            generatedAt: '2026-04-17T00:00:00.000Z',
            outcome: 'success',
            successRatePercent: 100,
            recentOutcomes: [],
            topFailures: [],
          },
          e2e: {
            available: true,
            kind: 'e2e',
            generatedAt: '2026-04-17T00:00:00.000Z',
            outcome: 'success',
            successRatePercent: 100,
            recentOutcomes: [],
            topFailures: [],
          },
        },
      } as any,
    });

    expect(html).toContain('Ops Durumu');
    expect(html).toContain('Kullanıcılar');
    expect(html).toContain('Admin Access Coverage');
    expect(html).toContain('data-admin-dashboard-period="30"');
  });

  it('renders error state', () => {
    const html = renderAdminDashboardOverview({
      period: 30,
      data: null,
      error: 'Veri alınamadı',
    });

    expect(html).toContain('Hata');
    expect(html).toContain('Veri alınamadı');
  });
});
