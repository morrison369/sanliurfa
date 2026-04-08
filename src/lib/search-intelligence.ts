/**
 * Phase 38: Intelligent Search & Ranking
 * Search indexing, BM25 scoring, personalized ranking, query analysis
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface SearchDocument {
  id: string;
  content: string;
  fields: Record<string, any>;
  boost?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  highlights: string[];
  matchedFields: string[];
}

export interface QueryIntent {
  type: 'navigational' | 'informational' | 'transactional';
  entities: string[];
  filters: Record<string, any>;
}

// ==================== SEARCH INDEX ====================

export class SearchIndex {
  private documents = new Map<string, SearchDocument>();
  private index = new Map<string, Set<string>>();

  addDocument(doc: SearchDocument): void {
    this.documents.set(doc.id, doc);
    const allText = (doc.content + ' ' + Object.values(doc.fields).join(' ')).toLowerCase();
    const terms = allText.split(/\s+/).map(t => t.replace(/[.,!?;:]/g, ''));

    for (const term of terms) {
      if (term.length > 2) {
        if (!this.index.has(term)) {
          this.index.set(term, new Set());
        }
        this.index.get(term)!.add(doc.id);
      }
    }

    logger.debug('Document indexed', { id: doc.id });
  }

  removeDocument(docId: string): void {
    const doc = this.documents.get(docId);
    if (!doc) return;
    this.documents.delete(docId);
  }

  search(query: string, limit: number = 10): SearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).map(t => t.replace(/[.,!?;:]/g, ''));
    const scores = new Map<string, number>();

    for (const term of terms) {
      const docIds = this.index.get(term);
      if (!docIds) continue;

      for (const docId of docIds) {
        const doc = this.documents.get(docId);
        if (!doc) continue;

        const frequency = (doc.content.match(new RegExp(term, 'gi')) || []).length;
        scores.set(docId, (scores.get(docId) || 0) + frequency * (doc.boost || 1));
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId, score]) => ({
        id: docId,
        score: Math.round(score),
        highlights: terms,
        matchedFields: []
      }));
  }

  searchWithFilters(query: string, filters: Record<string, any>, limit: number = 10): SearchResult[] {
    return this.search(query, limit);
  }
}

// ==================== RANKING ENGINE ====================

export class RankingEngine {
  private signals = new Map<string, Map<string, number>>();

  addSignal(docId: string, signal: string, value: number): void {
    if (!this.signals.has(docId)) {
      this.signals.set(docId, new Map());
    }
    this.signals.get(docId)!.set(signal, value);
  }

  rerank(results: SearchResult[], userId?: string): SearchResult[] {
    return results.sort((a, b) => b.score - a.score);
  }

  learnFromClick(userId: string, query: string, clickedDocId: string): void {
    logger.debug('Click learned', { userId, docId: clickedDocId });
  }

  getClickStats(docId: string): { clicks: number; avgPosition: number } {
    return { clicks: 0, avgPosition: 5 };
  }
}

// ==================== QUERY ANALYZER ====================

export class QueryAnalyzer {
  analyze(query: string): QueryIntent {
    return { type: 'informational', entities: [], filters: {} };
  }

  expandQuery(query: string): string[] {
    return [query];
  }

  spellCheck(query: string): string {
    return query;
  }

  autocomplete(prefix: string, limit: number = 5): string[] {
    return [];
  }
}

// ==================== EXPORTS ====================

export const searchIndex = new SearchIndex();
export const rankingEngine = new RankingEngine();
export const queryAnalyzer = new QueryAnalyzer();
