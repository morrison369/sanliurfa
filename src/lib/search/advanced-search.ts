/**
 * Advanced search with Elasticsearch-like functionality
 * In-memory implementation (replace with Elasticsearch/OpenSearch in production)
 */

import { generateId } from '../utils';
import { logger } from '../logging';

// Search document
export interface SearchDocument {
  id: string;
  type: 'place' | 'blog' | 'event' | 'user';
  title: string;
  description?: string;
  content?: string;
  tags?: string[];
  category?: string;
  location?: {
    lat: number;
    lon: number;
  };
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

// Search query
export interface SearchQuery {
  q?: string;
  type?: string;
  category?: string;
  tags?: string[];
  location?: {
    lat: number;
    lon: number;
    radius: number; // in km
  };
  rating?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    from?: string;
    to?: string;
  };
  sort?: 'relevance' | 'rating' | 'distance' | 'date' | 'popularity';
  page?: number;
  pageSize?: number;
}

// Search result
export interface SearchResult {
  documents: SearchDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: Record<string, FacetResult>;
  suggestions?: string[];
}

// Facet result
export interface FacetResult {
  field: string;
  buckets: Array<{
    value: string;
    count: number;
  }>;
}

// In-memory document store
const documentStore: Map<string, SearchDocument> = new Map();
const indexStore: Map<string, Set<string>> = new Map();

/**
 * Initialize search index
 */
export function initSearch(): void {
  logger.info('[Search] Advanced search initialized');
}

/**
 * Index a document
 */
export async function indexDocument(document: Omit<SearchDocument, 'updatedAt'>): Promise<void> {
  const fullDoc = {
    ...document,
    updatedAt: new Date().toISOString(),
  } as SearchDocument;

  // Store document
  documentStore.set(document.id, fullDoc);

  // Update indexes
  updateIndexes(fullDoc);
}

/**
 * Update indexes for a document
 */
function updateIndexes(doc: SearchDocument): void {
  // Type index
  addToIndex('type', doc.type, doc.id);

  // Category index
  if (doc.category) {
    addToIndex('category', doc.category, doc.id);
  }

  // Tag indexes
  if (doc.tags) {
    for (const tag of doc.tags) {
      addToIndex('tag', tag.toLowerCase(), doc.id);
    }
  }

  // Text index (title + description + content)
  const text = `${doc.title} ${doc.description || ''} ${doc.content || ''}`.toLowerCase();
  const tokens = tokenize(text);
  for (const token of tokens) {
    addToIndex('text', token, doc.id);
  }
}

/**
 * Add document ID to index
 */
function addToIndex(indexName: string, key: string, docId: string): void {
  const indexKey = `${indexName}:${key}`;
  let docSet = indexStore.get(indexKey);
  if (!docSet) {
    docSet = new Set();
    indexStore.set(indexKey, docSet);
  }
  docSet.add(docId);
}

/**
 * Remove document from index
 */
function removeFromIndexes(doc: SearchDocument): void {
  for (const [key, docSet] of indexStore) {
    docSet.delete(doc.id);
    if (docSet.size === 0) {
      indexStore.delete(key);
    }
  }
}

/**
 * Tokenize text for search
 */
function tokenize(text: string): string[] {
  // Simple tokenization - split on non-alphanumeric
  // In production, use a proper tokenizer with Turkish support
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
    .filter(token => !isStopWord(token));
}

/**
 * Turkish stop words
 */
function isStopWord(token: string): boolean {
  const stopWords = new Set([
    'bir', 've', 'bu', 'da', 'de', 'için', 'ile', 'mi', 'ama', 'çünkü',
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
  ]);
  return stopWords.has(token);
}

/**
 * Calculate relevance score
 */
function calculateRelevance(doc: SearchDocument, query: string, tokens: string[]): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const text = `${doc.title} ${doc.description || ''}`.toLowerCase();

  // Exact match in title (highest score)
  if (doc.title.toLowerCase().includes(queryLower)) {
    score += 10;
  }

  // Token matches
  for (const token of tokens) {
    if (text.includes(token)) {
      score += 1;
    }
  }

  // Boost by rating
  if (doc.rating) {
    score += doc.rating * 0.5;
  }

  // Boost by review count
  if (doc.reviewCount) {
    score += Math.min(doc.reviewCount / 100, 2);
  }

  // Boost by recency
  const age = Date.now() - new Date(doc.createdAt).getTime();
  const ageInDays = age / (1000 * 60 * 60 * 24);
  if (ageInDays < 30) {
    score += 1;
  }

  return score;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Search documents
 */
export async function search(query: SearchQuery): Promise<SearchResult> {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  let candidates: SearchDocument[] = [];

  // Get candidates based on filters
  if (query.type) {
    const typeIndex = indexStore.get(`type:${query.type}`);
    if (typeIndex) {
      candidates = Array.from(typeIndex).map(id => documentStore.get(id)!).filter(Boolean);
    }
  } else {
    candidates = Array.from(documentStore.values());
  }

  // Apply category filter
  if (query.category) {
    const categoryIndex = indexStore.get(`category:${query.category}`);
    if (categoryIndex) {
      const categoryIds = new Set(categoryIndex);
      candidates = candidates.filter(doc => categoryIds.has(doc.id));
    }
  }

  // Apply tag filters
  if (query.tags && query.tags.length > 0) {
    for (const tag of query.tags) {
      const tagIndex = indexStore.get(`tag:${tag.toLowerCase()}`);
      if (tagIndex) {
        const tagIds = new Set(tagIndex);
        candidates = candidates.filter(doc => tagIds.has(doc.id));
      }
    }
  }

  // Apply text search
  let tokens: string[] = [];
  if (query.q) {
    tokens = tokenize(query.q);
    if (tokens.length > 0) {
      const textMatches = new Set<string>();
      for (const token of tokens) {
        const textIndex = indexStore.get(`text:${token}`);
        if (textIndex) {
          textIndex.forEach(id => textMatches.add(id));
        }
      }
      candidates = candidates.filter(doc => textMatches.has(doc.id));
    }
  }

  // Apply rating filter
  if (query.rating) {
    candidates = candidates.filter(doc => {
      if (!doc.rating) return false;
      if (query.rating!.min !== undefined && doc.rating < query.rating!.min) return false;
      if (query.rating!.max !== undefined && doc.rating > query.rating!.max) return false;
      return true;
    });
  }

  // Apply date range filter
  if (query.dateRange) {
    candidates = candidates.filter(doc => {
      const docDate = new Date(doc.createdAt);
      if (query.dateRange!.from && docDate < new Date(query.dateRange!.from)) return false;
      if (query.dateRange!.to && docDate > new Date(query.dateRange!.to)) return false;
      return true;
    });
  }

  // Apply location filter
  if (query.location && query.location.lat && query.location.lon) {
    candidates = candidates.filter(doc => {
      if (!doc.location) return false;
      const distance = calculateDistance(
        query.location!.lat,
        query.location!.lon,
        doc.location.lat,
        doc.location.lon
      );
      return distance <= query.location!.radius;
    });
  }

  // Calculate scores and sort
  let scoredDocs = candidates.map(doc => ({
    doc,
    score: query.q ? calculateRelevance(doc, query.q, tokens) : 1,
    distance: query.location && doc.location
      ? calculateDistance(query.location.lat, query.location.lon, doc.location.lat, doc.location.lon)
      : undefined,
  }));

  // Sort
  switch (query.sort) {
    case 'rating':
      scoredDocs.sort((a, b) => (b.doc.rating || 0) - (a.doc.rating || 0));
      break;
    case 'distance':
      scoredDocs.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      break;
    case 'date':
      scoredDocs.sort((a, b) => new Date(b.doc.createdAt).getTime() - new Date(a.doc.createdAt).getTime());
      break;
    case 'popularity':
      scoredDocs.sort((a, b) => (b.doc.reviewCount || 0) - (a.doc.reviewCount || 0));
      break;
    case 'relevance':
    default:
      if (query.q) {
        scoredDocs.sort((a, b) => b.score - a.score);
      }
      break;
  }

  const total = scoredDocs.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const documents = scoredDocs.slice(start, start + pageSize).map(s => s.doc);

  // Generate facets
  const facets = generateFacets(candidates);

  // Generate suggestions
  const suggestions = query.q ? generateSuggestions(query.q) : [];

  return {
    documents,
    total,
    page,
    pageSize,
    totalPages,
    facets,
    suggestions,
  };
}

/**
 * Generate facets from results
 */
function generateFacets(docs: SearchDocument[]): Record<string, FacetResult> {
  const typeFacet: FacetResult = { field: 'type', buckets: [] };
  const categoryFacet: FacetResult = { field: 'category', buckets: [] };

  const typeCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const doc of docs) {
    typeCounts.set(doc.type, (typeCounts.get(doc.type) || 0) + 1);
    if (doc.category) {
      categoryCounts.set(doc.category, (categoryCounts.get(doc.category) || 0) + 1);
    }
  }

  typeFacet.buckets = Array.from(typeCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  categoryFacet.buckets = Array.from(categoryCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  return {
    type: typeFacet,
    category: categoryFacet,
  };
}

/**
 * Generate search suggestions
 */
function generateSuggestions(query: string): string[] {
  // In production, use actual suggestion logic
  // For now, return empty array
  return [];
}

/**
 * Get document by ID
 */
export async function getDocument(id: string): Promise<SearchDocument | null> {
  return documentStore.get(id) || null;
}

/**
 * Delete document from index
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const doc = documentStore.get(id);
  if (!doc) return false;

  removeFromIndexes(doc);
  documentStore.delete(id);
  return true;
}

/**
 * Get search suggestions/autocomplete
 */
export async function getSuggestions(
  prefix: string,
  type?: string,
  limit: number = 10
): Promise<string[]> {
  const prefixLower = prefix.toLowerCase();
  const suggestions: string[] = [];

  for (const doc of documentStore.values()) {
    if (type && doc.type !== type) continue;
    if (doc.title.toLowerCase().startsWith(prefixLower)) {
      suggestions.push(doc.title);
    }
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

/**
 * Get popular searches
 */
export async function getPopularSearches(limit: number = 10): Promise<string[]> {
  // In production, track and return actual popular searches
  return [
    'Balıklıgöl',
    'Göbeklitepe',
    'Harran',
    'Şanlıurfa yemekleri',
    'Tarihi yerler',
  ].slice(0, limit);
}

/**
 * Get search stats
 */
export function getSearchStats(): {
  totalDocuments: number;
  indexSize: number;
  types: Record<string, number>;
} {
  const types: Record<string, number> = {};
  for (const doc of documentStore.values()) {
    types[doc.type] = (types[doc.type] || 0) + 1;
  }

  return {
    totalDocuments: documentStore.size,
    indexSize: indexStore.size,
    types,
  };
}

// Initialize on module load
initSearch();

