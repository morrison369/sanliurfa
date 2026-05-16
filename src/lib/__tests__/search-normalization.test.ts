import { describe, expect, it } from 'vitest';
import {
  canonicalizeSearchQuery,
  expandSearchQueryVariants,
  normalizeSearchQuery,
  normalizeTurkishSearchText,
} from '../search/search-normalization';
import { getCuratedPlaceFallbackBySlug, searchCuratedPlaceFallbacks } from '../../data/curated-place-fallbacks';

describe('search normalization helpers', () => {
  it('normalizeSearchQuery trims + lowercases Turkish text', () => {
    expect(normalizeSearchQuery('  Göbeklitepe  ')).toBe('göbeklitepe');
    expect(normalizeSearchQuery('Balıklıgöl   Rehberi')).toBe('balıklıgöl rehberi');
  });

  it('normalizeTurkishSearchText removes Turkish-specific character differences', () => {
    expect(normalizeTurkishSearchText('Balıklıgöl')).toBe('balikligol');
    expect(normalizeTurkishSearchText('ÇİĞER')).toBe('ciger');
  });

  it('canonicalizes known local landmark and food synonyms', () => {
    expect(canonicalizeSearchQuery('gobekli tepe')).toBe('göbeklitepe');
    expect(canonicalizeSearchQuery('CİGERCİLER')).toBe('ciğer');
  });

  it('expands query variants for common local intent aliases', () => {
    expect(expandSearchQueryVariants('balikli gol')).toContain('balıklıgöl');
    expect(expandSearchQueryVariants('sira gecesi')).toContain('sıra gecesi');
  });

  it('curated fallback search returns canonical landmark result', () => {
    const results = searchCuratedPlaceFallbacks('Göbeklitepe', 5);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('gobeklitepe');
    expect(results[0].href).toBe('/isletme/gobeklitepe');
  });

  it('fallback registry exposes detail-page payload by slug', () => {
    const place = getCuratedPlaceFallbackBySlug('balikligol');
    expect(place?.name).toBe('Balıklıgöl');
  });
});
