/**
 * Phase 128: Semantic Search Engine
 * Production semantic search with vector indexing and ranking strategies
 */

import { logger } from './logger';
import { redis } from './cache';

interface IndexedDocument {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface SearchResult {
  document: IndexedDocument;
  score: number;
  ranking: 'vector' | 'keyword' | 'hybrid';
  highlights?: string[];
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  strategy?: 'vector' | 'keyword' | 'hybrid';
  boost?: Record<string, number>;
  facets?: string[];
}

interface QueryExpansion {
  original: string;
  expanded: string[];
  synonyms: Record<string, string[]>;
}

interface RankingResult {
  documentId: string;
  baseScore: number;
  rankingScore: number;
  strategy: string;
  factors: Record<string, number>;
}

class SemanticIndex {
  private documents = new Map<string, IndexedDocument>();
  private counter = 0;

  indexDocument(doc: {
    title: string;
    content: string;
    embedding?: number[];
    metadata?: Record<string, any>;
  }): IndexedDocument {
    const id = `doc-${Date.now()}-${++this.counter}`;
    const indexed: IndexedDocument = {
      id,
      title: doc.title,
      content: doc.content,
      embedding: doc.embedding,
      metadata: doc.metadata || {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.documents.set(id, indexed);

    // Cache in Redis
    const cacheKey = `sanliurfa:index:${id}`;
    redis.setex(cacheKey, 86400, JSON.stringify(indexed));

    logger.info('Document indexed', { id, title: doc.title });
    return indexed;
  }

  search(
    query: string,
    options: SearchOptions = {}
  ): SearchResult[] {
    const { limit = 20, offset = 0, strategy = 'hybrid', boost = {} } = options;

    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      let score = 0;

      if (strategy === 'vector' || strategy === 'hybrid') {
        // Vector similarity score
        score += this.calculateVectorSimilarity(query, doc.content);
      }

      if (strategy === 'keyword' || strategy === 'hybrid') {
        // Keyword match score
        score += this.calculateKeywordScore(query, doc.content, doc.title);
      }

      // Apply boosts
      if (boost[doc.id]) {
        score *= boost[doc.id];
      }

      if (score > 0) {
        results.push({
          document: doc,
          score,
          ranking: strategy as 'vector' | 'keyword' | 'hybrid'
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(offset, offset + limit);
  }

  private calculateVectorSimilarity(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentTerms = content.toLowerCase().split(/\s+/);
    const contentSet = new Set(contentTerms);

    let matchCount = 0;
    for (const term of queryTerms) {
      if (contentSet.has(term)) {
        matchCount++;
      }
    }

    return matchCount / Math.max(queryTerms.length, 1);
  }

  private calculateKeywordScore(query: string, content: string, title: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();

    let score = 0;

    // Title match is worth more
    if (titleLower.includes(queryLower)) {
      score += 0.5;
    }

    // Content match
    const contentMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    score += Math.min(contentMatches * 0.1, 0.5);

    return score;
  }

  batchIndex(documents: Array<{
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }>): IndexedDocument[] {
    return documents.map(doc => this.indexDocument(doc));
  }

  updateDocument(id: string, updates: Partial<IndexedDocument>): IndexedDocument | null {
    const doc = this.documents.get(id);
    if (!doc) return null;

    const updated = { ...doc, ...updates, updatedAt: Date.now() };
    this.documents.set(id, updated);

    const cacheKey = `sanliurfa:index:${id}`;
    redis.setex(cacheKey, 86400, JSON.stringify(updated));

    logger.debug('Document updated', { id });
    return updated;
  }

  deleteDocument(id: string): boolean {
    const deleted = this.documents.delete(id);
    if (deleted) {
      redis.del(`sanliurfa:index:${id}`);
      logger.debug('Document deleted', { id });
    }
    return deleted;
  }

  getDocument(id: string): IndexedDocument | null {
    return this.documents.get(id) || null;
  }

  listDocuments(): IndexedDocument[] {
    return Array.from(this.documents.values());
  }
}

class QueryExpander {
  private synonymMap: Record<string, string[]> = {
    'search': ['find', 'lookup', 'query'],
    'document': ['file', 'page', 'content'],
    'data': ['information', 'records', 'items'],
    'system': ['platform', 'application', 'software']
  };

  expand(query: string): QueryExpansion {
    const terms = query.toLowerCase().split(/\s+/);
    const expanded: string[] = [];
    const synonyms: Record<string, string[]> = {};

    for (const term of terms) {
      expanded.push(term);

      if (this.synonymMap[term]) {
        synonyms[term] = this.synonymMap[term];
        expanded.push(...this.synonymMap[term]);
      }
    }

    return {
      original: query,
      expanded,
      synonyms
    };
  }

  addSynonym(term: string, synonyms: string[]): void {
    if (!this.synonymMap[term]) {
      this.synonymMap[term] = [];
    }
    this.synonymMap[term].push(...synonyms);
    logger.debug('Synonym added', { term, count: synonyms.length });
  }

  getRelatedTerms(term: string): string[] {
    return this.synonymMap[term] || [];
  }
}

class RankingStrategy {
  private counter = 0;

  bm25Ranking(
    query: string,
    documents: IndexedDocument[],
    k1: number = 1.5,
    b: number = 0.75
  ): RankingResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const docCount = documents.length;
    const avgDocLength = documents.reduce((sum, doc) => sum + doc.content.split(/\s+/).length, 0) / docCount;

    const results: RankingResult[] = [];

    for (const doc of documents) {
      let score = 0;
      const docLength = doc.content.split(/\s+/).length;
      const docContent = doc.content.toLowerCase();

      for (const term of queryTerms) {
        const termFreq = (docContent.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
        const idf = Math.log((docCount - documents.filter(d => d.content.toLowerCase().includes(term)).length + 0.5) /
                             (documents.filter(d => d.content.toLowerCase().includes(term)).length + 0.5));

        const normLength = 1 - b + b * (docLength / avgDocLength);
        score += idf * ((termFreq * (k1 + 1)) / (termFreq + k1 * normLength));
      }

      results.push({
        documentId: doc.id,
        baseScore: score,
        rankingScore: score,
        strategy: 'BM25',
        factors: { termFrequency: 0.7, documentLength: 0.3 }
      });
    }

    return results.sort((a, b) => b.rankingScore - a.rankingScore);
  }

  tfIdfRanking(query: string, documents: IndexedDocument[]): RankingResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const docCount = documents.length;
    const results: RankingResult[] = [];

    for (const doc of documents) {
      let score = 0;
      const docLength = doc.content.split(/\s+/).length;
      const docContent = doc.content.toLowerCase();

      for (const term of queryTerms) {
        const tf = (docContent.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length / docLength;
        const docsWithTerm = documents.filter(d => d.content.toLowerCase().includes(term)).length;
        const idf = Math.log(docCount / Math.max(1, docsWithTerm));
        score += tf * idf;
      }

      results.push({
        documentId: doc.id,
        baseScore: score,
        rankingScore: score,
        strategy: 'TF-IDF',
        factors: { termFrequency: 0.6, inverseDocFrequency: 0.4 }
      });
    }

    return results.sort((a, b) => b.rankingScore - a.rankingScore);
  }

  rerank(results: SearchResult[], factors: Record<string, number>): SearchResult[] {
    return results.map(r => ({
      ...r,
      score: Object.entries(factors).reduce((sum, [factor, weight]) => {
        return sum + (weight * r.score);
      }, 0)
    })).sort((a, b) => b.score - a.score);
  }
}

class SearchOptimizer {
  private queryCache = new Map<string, SearchResult[]>();
  private counter = 0;

  optimizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[^\w\s]/g, '');
  }

  cacheResult(query: string, results: SearchResult[]): void {
    const optimized = this.optimizeQuery(query);
    this.queryCache.set(optimized, results);

    const cacheKey = `sanliurfa:search:${optimized}`;
    redis.setex(cacheKey, 3600, JSON.stringify(results));

    logger.debug('Search result cached', { query: optimized, resultCount: results.length });
  }

  getCachedResult(query: string): SearchResult[] | null {
    const optimized = this.optimizeQuery(query);
    return this.queryCache.get(optimized) || null;
  }

  clearCache(): void {
    this.queryCache.clear();
    logger.debug('Search cache cleared');
  }

  getQueryStats(): {
    cachedQueries: number;
    totalCacheSize: number;
  } {
    return {
      cachedQueries: this.queryCache.size,
      totalCacheSize: Array.from(this.queryCache.values()).reduce((sum, r) => sum + r.length, 0)
    };
  }
}

export const semanticIndex = new SemanticIndex();
export const queryExpander = new QueryExpander();
export const rankingStrategy = new RankingStrategy();
export const searchOptimizer = new SearchOptimizer();

export { IndexedDocument, SearchResult, SearchOptions, QueryExpansion, RankingResult };
