import { describe, expect, it } from 'vitest';

import {
  extractOlapDimensions,
  extractOlapResults,
  renderOlapExplorer,
  toggleSelection,
} from '../olap-explorer';

describe('olap explorer helpers', () => {
  it('extracts dimensions and measures', () => {
    const data = extractOlapDimensions({
      success: true,
      data: {
        dimensions: [{ name: 'city', label: 'Şehir', levels: ['city'] }],
        measures: [{ name: 'views', label: 'Görüntülenme', type: 'sum' }],
      },
    });

    expect(data.dimensions[0]?.name).toBe('city');
    expect(data.measures[0]?.name).toBe('views');
  });

  it('extracts rows and cached flag', () => {
    const data = extractOlapResults({
      success: true,
      data: {
        rows: [{ city: 'Şanlıurfa', views: 120 }],
        cached: true,
      },
    });

    expect(data.rows).toHaveLength(1);
    expect(data.cached).toBe(true);
  });

  it('toggles selection and renders html', () => {
    expect(toggleSelection(['city'], 'day')).toEqual(['city', 'day']);
    expect(toggleSelection(['city', 'day'], 'city')).toEqual(['day']);

    const html = renderOlapExplorer({
      dimensions: [{ name: 'city', label: 'Şehir', levels: ['city'] }],
      measures: [{ name: 'views', label: 'Görüntülenme', type: 'sum' }],
      selectedDimensions: ['city'],
      selectedMeasures: ['views'],
      rows: [{ city: 'Şanlıurfa', views: 120.456 }],
      cached: true,
      loading: false,
      error: null,
    });

    expect(html).toContain('Boyutlar');
    expect(html).toContain('Şehir');
    expect(html).toContain('120.46');
    expect(html).toContain('cache');
  });
});
