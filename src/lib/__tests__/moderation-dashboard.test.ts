import { describe, expect, it } from 'vitest';

import {
  createModerationDashboardState,
  extractModerationReports,
  extractModerationStats,
  normalizeModerationDashboardTab,
  renderModerationDashboard,
} from '../moderation-dashboard';

describe('moderation dashboard helpers', () => {
  it('extracts stats and reports', () => {
    const stats = extractModerationStats({
      stats: {
        pending_reports: 3,
        in_review_reports: 2,
        resolved_reports: 5,
        active_bans: 1,
        total_warnings: 4,
        queue_items: 2,
      },
    });
    const reports = extractModerationReports({
      data: [
        {
          id: 'rep-1',
          content_type: 'review',
          reason: 'Spam',
          description: 'Tekrarlayan icerik',
          status: 'pending',
          created_at: '2026-04-17T00:00:00.000Z',
          reported_user_id: 'user-2',
        },
      ],
    });

    expect(stats?.pending_reports).toBe(3);
    expect(reports[0]?.reason).toBe('Spam');
  });

  it('normalizes tab and renders reports', () => {
    expect(normalizeModerationDashboardTab('reports')).toBe('reports');
    expect(normalizeModerationDashboardTab('bad')).toBe('overview');

    const state = createModerationDashboardState();
    state.loading = false;
    state.selectedTab = 'reports';
    state.reportFilter = 'pending';
    state.reports = [
      {
        id: 'rep-1',
        content_type: 'review',
        reason: 'Spam',
        description: 'Tekrarlayan icerik',
        status: 'pending',
        created_at: '2026-04-17T00:00:00.000Z',
        reported_user_id: 'user-2',
      },
    ];

    const html = renderModerationDashboard(state);
    expect(html).toContain('Raporlar');
    expect(html).toContain('data-moderation-open-action="rep-1"');
    expect(html).toContain('Spam');
  });
});
