/**
 * Phase 20: Advanced Search & Discovery
 * Full-text search, faceting, autocomplete, relevance ranking, personalization
 */

import { logger } from './logging';

// ==================== FULL-TEXT SEARCH ====================

export interface SearchResult<T> {
  id: string;
  content: T;
  score: number;
  highlights: string[];
}

/**
 * Full-text search with relevance ranking
 */
export class FullTextSearchEngine<T extends Record<string, any>> {
  private index = new Map<string, Set<string>>(); // word -> document IDs
  private documents = new Map<string, T>();

  /**
   * Index document
   */
  indexDocument(id: string, doc: T): void {
    this.documents.set(id, doc);

    for (const [_, value] of Object.entries(doc)) {
      if (typeof value === 'string') {
        const words = this.tokenize(value);
        for (const word of words) {
          if (!this.index.has(word)) this.index.set(word, new Set());
          this.index.get(word)!.add(id);
        }
      }
    }
  }

  /**
   * Search documents
   */
  search(query: string, limit: number = 10): SearchResult<T>[] {
    const queryTokens = this.tokenize(query);
    const matches = new Map<string, number>();

    for (const token of queryTokens) {
      const docIds = this.index.get(token) || new Set();
      for (const docId of docIds) {
        matches.set(docId, (matches.get(docId) || 0) + 1);
      }
    }

    const results: SearchResult<T>[] = [];
    for (const [docId, score] of matches) {
      const doc = this.documents.get(docId);
      if (doc) {
        results.push({
          id: docId,
          content: doc,
          score,
          highlights: queryTokens
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  }
}

// ==================== AUTOCOMPLETE ====================

class TrieNode {
  children = new Map<string, TrieNode>();
  isTerminal = false;
  weight = 0;
}

/**
 * Autocomplete with trie data structure
 */
export class Autocomplete {
  private trie = new TrieNode();

  addTerm(term: string, weight: number = 1): void {
    let node = this.trie;
    for (const char of term.toLowerCase()) {
      if (!node.children.has(char)) node.children.set(char, new TrieNode());
      node = node.children.get(char)!;
      node.weight += weight;
    }
    node.isTerminal = true;
  }

  getSuggestions(prefix: string, limit: number = 5): string[] {
    let node = this.trie;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }

    const suggestions: Array<{term: string; weight: number}> = [];
    this.collectSuggestions(node, prefix, suggestions);
    return suggestions.sort((a, b) => b.weight - a.weight).slice(0, limit).map(s => s.term);
  }

  private collectSuggestions(node: TrieNode, prefix: string, suggestions: any[]): void {
    if (node.isTerminal) suggestions.push({term: prefix, weight: node.weight});
    for (const [char, child] of node.children) {
      this.collectSuggestions(child, prefix + char, suggestions);
    }
  }
}

export const autocomplete = new Autocomplete();
