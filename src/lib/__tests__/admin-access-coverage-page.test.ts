import { describe, expect, it } from 'vitest';
import {
  buildCoverageAlertClass,
  buildCoverageDriftFilesHtml,
  buildCoverageSummaryText,
} from '../admin-access-coverage-page';

describe('admin access coverage page helpers', () => {
  it('builds blocked alert classes when drift exists', () => {
    const alert = buildCoverageAlertClass('healthy', 2, 'src/pages/api/admin/example.ts');

    expect(alert.className).toContain('border-red-200');
    expect(alert.text).toContain('example.ts');
  });

  it('builds healthy summary text', () => {
    expect(buildCoverageSummaryText('healthy', 100, 0)).toBe('Durum: healthy. Coverage %100. Drift: 0.');
  });

  it('builds drift files html with empty and filled states', () => {
    expect(buildCoverageDriftFilesHtml([])).toContain('Drift yok.');
    expect(buildCoverageDriftFilesHtml(['src/pages/api/admin/foo.ts'])).toContain('foo.ts');
  });
});
