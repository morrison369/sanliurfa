/**
 * Unit Tests — search/search-intelligence.ts singleton class managers + helpers (Phase 38)
 *
 * - SearchIndex (addDocument tokenize + search frequency scoring + boost + ReDoS escape)
 * - RankingEngine (addSignal + rerank score desc + learnFromClick)
 * - QueryAnalyzer (analyze default informational + spellCheck/expand/autocomplete stubs)
 * - rankSearchResults helper (signal boost + sort)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  searchIndex,
  rankingEngine,
  queryAnalyzer,
  rankSearchResults,
  recordSearchQuery,
  getPersonalizedRecommendations,
  type SearchResult,
} from '../search/search-intelligence';

describe('SearchIndex', () => {
  it('addDocument + search — term frequency scoring', () => {
    searchIndex.addDocument({
      id: `doc-${Date.now()}-1`,
      content: 'sanliurfa kebap kebap kebap',
      fields: {},
    });
    const results = searchIndex.search('kebap');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].score).toBeGreaterThanOrEqual(3); // 3 frequency
  });

  it('search — bilinmeyen term → boş array', () => {
    expect(searchIndex.search('totallyrandomxyz12345')).toEqual([]);
  });

  it('search — limit parameter', () => {
    for (let i = 0; i < 5; i++) {
      searchIndex.addDocument({
        id: `doc-limit-${Date.now()}-${i}`,
        content: 'common-search-term-xyz',
        fields: {},
      });
    }
    const results = searchIndex.search('common-search-term-xyz', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('search — boost field score arttırır', () => {
    const ID = `doc-boost-${Date.now()}`;
    searchIndex.addDocument({
      id: ID,
      content: 'unique-boosted-term',
      fields: {},
      boost: 5,
    });
    const results = searchIndex.search('unique-boosted-term');
    expect(results[0].id).toBe(ID);
    expect(results[0].score).toBeGreaterThanOrEqual(5);
  });

  it('search — fields içeriği index edilir', () => {
    const ID = `doc-fields-${Date.now()}`;
    searchIndex.addDocument({
      id: ID,
      content: '',
      fields: { title: 'unique-field-content-abc' },
    });
    const results = searchIndex.search('unique-field-content-abc');
    expect(results.some((r) => r.id === ID)).toBe(true);
  });

  it('search — punctuation strip (.,!?;:)', () => {
    searchIndex.addDocument({
      id: `doc-punct-${Date.now()}`,
      content: 'hello, world!',
      fields: {},
    });
    expect(searchIndex.search('hello').length).toBeGreaterThanOrEqual(1);
  });

  it('search — ReDoS pattern (.+)+ tehlikesiz işlenir', () => {
    searchIndex.addDocument({
      id: `doc-redos-${Date.now()}`,
      content: 'safe content',
      fields: {},
    });
    // Pattern escaped → catastrophic backtracking olmaz
    const start = Date.now();
    searchIndex.search('(.+)+ZZZ');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // 1s içinde döner
  });

  it('removeDocument — document index dışı kalır (smoke)', () => {
    const ID = `doc-del-${Date.now()}`;
    searchIndex.addDocument({ id: ID, content: 'temp-content', fields: {} });
    searchIndex.removeDocument(ID);
    expect(() => searchIndex.removeDocument('non-existent')).not.toThrow();
  });

  it('searchWithFilters — search delegate (filters şu an no-op)', () => {
    searchIndex.addDocument({ id: `doc-filter-${Date.now()}`, content: 'filterable', fields: {} });
    const results = searchIndex.searchWithFilters('filterable', { category: 'food' });
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('RankingEngine', () => {
  it('rerank — score desc sort', () => {
    const results: SearchResult[] = [
      { id: 'a', score: 5, highlights: [], matchedFields: [] },
      { id: 'b', score: 10, highlights: [], matchedFields: [] },
      { id: 'c', score: 3, highlights: [], matchedFields: [] },
    ];
    const reranked = rankingEngine.rerank(results);
    expect(reranked[0].id).toBe('b');
    expect(reranked[2].id).toBe('c');
  });

  it('addSignal — no throw + storage', () => {
    expect(() => rankingEngine.addSignal('doc-x', 'click_through', 0.8)).not.toThrow();
  });

  it('learnFromClick — no throw', () => {
    expect(() => rankingEngine.learnFromClick('u1', 'q1', 'd1')).not.toThrow();
  });

  it('getClickStats — default { clicks: 0, avgPosition: 5 }', () => {
    expect(rankingEngine.getClickStats('any')).toEqual({ clicks: 0, avgPosition: 5 });
  });
});

describe('QueryAnalyzer', () => {
  it('analyze — default informational + boş entities/filters', () => {
    expect(queryAnalyzer.analyze('any query')).toEqual({
      type: 'informational',
      entities: [],
      filters: {},
    });
  });

  it('expandQuery — array of single query (stub)', () => {
    expect(queryAnalyzer.expandQuery('test')).toEqual(['test']);
  });

  it('spellCheck — passthrough (stub)', () => {
    expect(queryAnalyzer.spellCheck('mispeled')).toBe('mispeled');
  });

  it('autocomplete — empty array (stub)', () => {
    expect(queryAnalyzer.autocomplete('san')).toEqual([]);
  });
});

describe('Helpers', () => {
  it('rankSearchResults — signals undefined → results passthrough', () => {
    const r: SearchResult[] = [{ id: 'a', score: 5, highlights: [], matchedFields: [] }];
    expect(rankSearchResults(r)).toBe(r);
  });

  it('rankSearchResults — signals score-a eklenir + desc sort', () => {
    const r: SearchResult[] = [
      { id: 'a', score: 5, highlights: [], matchedFields: [] },
      { id: 'b', score: 5, highlights: [], matchedFields: [] },
    ];
    const ranked = rankSearchResults(r, { a: 100, b: 0 });
    expect(ranked[0].id).toBe('a');
    expect(ranked[0].score).toBe(105);
  });

  it('recordSearchQuery — no throw', () => {
    expect(() => recordSearchQuery('test', 5)).not.toThrow();
  });

  it('getPersonalizedRecommendations — stub passthrough', () => {
    const r: SearchResult[] = [{ id: 'a', score: 5, highlights: [], matchedFields: [] }];
    expect(getPersonalizedRecommendations('u1', r)).toBe(r);
  });
});
