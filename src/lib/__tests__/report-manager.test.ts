import { describe, expect, it } from 'vitest';

import {
  extractReportManagerMessage,
  extractReportManagerReports,
  renderReportManager,
} from '../report-manager';

describe('report manager helpers', () => {
  it('unwraps nested reports payload', () => {
    const reports = extractReportManagerReports({
      data: {
        success: true,
        data: [
          { id: 'r1', name: 'Test', format: 'csv', is_active: true },
        ],
      },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe('r1');
  });

  it('renders reports view with message', () => {
    const html = renderReportManager({
      tab: 'reports',
      reports: [{ id: 'r1', name: 'Test', format: 'csv', is_active: true }],
      selectedReportId: 'r1',
      loading: false,
      error: extractReportManagerMessage({ data: { message: 'Tamam' } }, 'Hata'),
      exportFormat: 'csv',
    });

    expect(html).toContain('Rapor listesi');
    expect(html).toContain('Test');
    expect(html).toContain('Tamam');
    expect(html).toContain('Raporu indir');
  });
});
