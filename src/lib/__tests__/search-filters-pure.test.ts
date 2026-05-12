/**
 * Unit Tests — search/filters.ts pure helpers
 *
 * - applySorting (rating/distance/newest/popular/relevance ORDER BY)
 * - distance NaN guard (lat/lng Number.isFinite)
 * - relevance ILIKE escape (single quote double-up)
 * - buildSearchQuery DEPRECATED throw (security lock — SQL injection)
 *
 * NOT: getFacetCounts/executeFacetedSearch/getAutocompleteSuggestions/saveSearchQuery DB-bağımlı.
 */

import { describe, it, expect } from 'vitest';
import { applySorting, buildSearchQuery, type SearchFilters } from '../search/filters';

describe('applySorting', () => {
  it('rating → ORDER BY rating DESC, review_count DESC', () => {
    const sql = applySorting('SELECT *', 'rating', {});
    expect(sql).toContain('ORDER BY rating DESC, review_count DESC');
  });

  it('newest → ORDER BY created_at DESC', () => {
    const sql = applySorting('SELECT *', 'newest', {});
    expect(sql).toContain('ORDER BY created_at DESC');
  });

  it('popular → ORDER BY view_count DESC, review_count DESC', () => {
    const sql = applySorting('SELECT *', 'popular', {});
    expect(sql).toContain('ORDER BY view_count DESC, review_count DESC');
  });

  it('distance — geçerli lat/lng → Haversine ORDER BY', () => {
    const filters: SearchFilters = { location: { lat: 37.16, lng: 38.8, radius: 5000 } };
    const sql = applySorting('SELECT *', 'distance', filters);
    expect(sql).toContain('6371000');
    expect(sql).toContain('cos(radians(37.16))');
  });

  it('distance — geçersiz lat → SQL passthrough (NaN guard)', () => {
    const filters: SearchFilters = { location: { lat: NaN, lng: 38.8, radius: 5000 } };
    const sql = applySorting('SELECT *', 'distance', filters);
    expect(sql).toBe('SELECT *'); // no ORDER BY appended
  });

  it('distance — location yoksa SQL passthrough', () => {
    const sql = applySorting('SELECT *', 'distance', {});
    expect(sql).toBe('SELECT *');
  });

  it('relevance — query varsa CASE WHEN ILIKE block', () => {
    const sql = applySorting('SELECT *', 'relevance', { query: 'kebap' });
    expect(sql).toContain('CASE');
    expect(sql).toContain('ILIKE');
    expect(sql).toContain('%kebap%');
  });

  it('relevance — query yoksa default rating sort', () => {
    const sql = applySorting('SELECT *', 'relevance', {});
    expect(sql).toContain('ORDER BY rating DESC, review_count DESC');
  });

  it("relevance — single quote escape ' → ''", () => {
    const sql = applySorting('SELECT *', 'relevance', { query: "O'Reilly" });
    expect(sql).toContain("O''Reilly"); // doubled
  });

  it('default sortBy → fallback rating sort', () => {
    const sql = applySorting('SELECT *', undefined, {});
    expect(sql).toContain('ORDER BY rating DESC');
  });
});

describe('buildSearchQuery (DEPRECATED security lock)', () => {
  it('throw — SQL injection vector kapatıldı', () => {
    expect(() => buildSearchQuery('places', {})).toThrow(/deprecated|disabled/i);
  });

  it('throw mesajı alternatif pattern referansı içerir', () => {
    expect(() => buildSearchQuery('places', {})).toThrow(/data-warehouse|allowlist/i);
  });
});
