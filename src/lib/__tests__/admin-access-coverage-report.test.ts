import { describe, expect, it } from 'vitest';
import {
  buildAdminAccessCoverageMarkdown,
  createAdminAccessCoverageReport,
} from '../admin-access-coverage-report';

describe('admin access coverage report helpers', () => {
  it('creates a full coverage report from route count and drift list', () => {
    const report = createAdminAccessCoverageReport({
      generatedAt: '2026-04-16T20:50:28.839Z',
      routeFiles: 40,
      driftedFiles: [],
    });

    expect(report).toEqual({
      generatedAt: '2026-04-16T20:50:28.839Z',
      routeFiles: 40,
      wrapperFiles: 40,
      driftCount: 0,
      coveragePercent: 100,
      driftedFiles: [],
    });
  });

  it('renders markdown with first drift file and list entries', () => {
    const markdown = buildAdminAccessCoverageMarkdown({
      generatedAt: '2026-04-16T20:50:28.839Z',
      routeFiles: 40,
      wrapperFiles: 38,
      driftCount: 2,
      coveragePercent: 95,
      driftedFiles: [
        'src/pages/api/admin/example.ts',
        'src/pages/api/admin/second.ts',
      ],
    });

    expect(markdown).toContain('# Admin Access Coverage');
    expect(markdown).toContain('- Coverage: %95');
    expect(markdown).toContain('- First drift file: src/pages/api/admin/example.ts');
    expect(markdown).toContain('- src/pages/api/admin/second.ts');
  });
});
