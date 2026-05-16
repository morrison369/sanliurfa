import { describe, expect, it } from 'vitest';
import {
  buildResolvablePlaceKeys,
  getAutoResolvedZeroResultRows,
  normalizeSearchReportKey,
} from '../../../scripts/ci/search-zero-result-report-helpers.mjs';

describe('search-zero-result-report helpers', () => {
  it('normalizes Turkish queries into a stable comparison key', () => {
    expect(normalizeSearchReportKey('  Göbeklitepe  ')).toBe('gobeklitepe');
    expect(normalizeSearchReportKey('Balıklıgöl')).toBe('balikligol');
  });

  it('builds resolvable keys from db rows and content slugs', () => {
    const keys = buildResolvablePlaceKeys({
      placeRows: [{ slug: 'halfeti-tekne-turu', name: 'Halfeti Tekne Turu' }],
      contentPlaceSlugs: ['gobeklitepe'],
    });

    expect(keys.has('halfeti tekne turu')).toBe(true);
    expect(keys.has('halfeti-tekne-turu')).toBe(false);
    expect(keys.has('gobeklitepe')).toBe(true);
  });

  it('auto-resolves only place queries that are now searchable', () => {
    const keys = buildResolvablePlaceKeys({
      contentPlaceSlugs: ['gobeklitepe'],
    });

    const rows = getAutoResolvedZeroResultRows(
      [
        { id: '1', search_query: 'Göbeklitepe', search_type: 'places' },
        { id: '2', search_query: 'göbeklitepe', search_type: 'places' },
        { id: '3', search_query: 'Göbeklitepe', search_type: 'reviews' },
        { id: '4', search_query: 'Balıklıgöl', search_type: 'places' },
      ],
      keys,
    );

    expect(rows.map((row) => row.id)).toEqual(['1', '2']);
  });
});
