/**
 * Phase 10: AI-Guided Query Optimization
 * Query plan analysis, performance prediction, optimization suggestions
 */

import { logger } from './logging';

// ==================== QUERY ANALYSIS ====================

export interface QueryPlan {
  query: string;
  estimatedCost: number;
  rowsEstimate: number;
  executionTime: number;
  seqScans: number;
  indexScans: number;
  joins: number;
  warnings: string[];
}

export interface QueryOptimization {
  query: string;
  currentPerformance: number;
  predictedPerformance: number;
  improvement: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  indexesToAdd?: string[];
  rewriteOption?: string;
}

/**
 * Analyze query patterns and suggest optimizations
 * Machine learning patterns: high seq scans, missing indexes, join order issues
 */
export class QueryOptimizer {
  private queryHistory = new Map<string, QueryPlan[]>();
  private optimizationCache = new Map<string, QueryOptimization>();
  private readonly maxHistorySize = 1000;

  /**
   * Record query execution
   */
  recordQuery(query: string, executionTime: number, estimatedRows: number = 0): void {
    const normalized = this.normalizeQuery(query);

    if (!this.queryHistory.has(normalized)) {
      this.queryHistory.set(normalized, []);
    }

    const history = this.queryHistory.get(normalized)!;
    history.push({
      query,
      estimatedCost: estimatedRows * 1000, // Simplified cost model
      rowsEstimate: estimatedRows,
      executionTime,
      seqScans: this.countSeqScans(query),
      indexScans: this.countIndexScans(query),
      joins: this.countJoins(query),
      warnings: []
    });

    // Keep only recent queries
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Clear optimization cache when query changes
    this.optimizationCache.delete(normalized);
  }

  /**
   * Analyze query and suggest optimizations
   */
  analyzeQuery(query: string): QueryOptimization | null {
    const normalized = this.normalizeQuery(query);

    // Check cache
    if (this.optimizationCache.has(normalized)) {
      return this.optimizationCache.get(normalized)!;
    }

    const history = this.queryHistory.get(normalized);
    if (!history || history.length === 0) {
      return null;
    }

    const avgExecution = history.reduce((sum, h) => sum + h.executionTime, 0) / history.length;
    const avgSeqScans = history.reduce((sum, h) => sum + h.seqScans, 0) / history.length;
    const avgJoins = history.reduce((sum, h) => sum + h.joins, 0) / history.length;

    const optimization: QueryOptimization = {
      query,
      currentPerformance: avgExecution,
      predictedPerformance: 0,
      improvement: 0,
      suggestion: '',
      priority: 'low',
      indexesToAdd: []
    };

    // Rule 1: High sequential scans
    if (avgSeqScans > 1 && avgExecution > 100) {
      optimization.suggestion = 'Add indexes on WHERE clause columns';
      optimization.predictedPerformance = avgExecution * 0.3; // 70% improvement
      optimization.improvement = 70;
      optimization.priority = 'high';
      optimization.indexesToAdd = this.suggestIndexes(query);
    }

    // Rule 2: Multiple joins
    if (avgJoins >= 3 && avgExecution > 150) {
      optimization.suggestion = 'Consider query rewrite or materialized view for frequently joined tables';
      optimization.predictedPerformance = avgExecution * 0.4;
      optimization.improvement = 60;
      optimization.priority = 'medium';
      optimization.rewriteOption = 'Consider breaking into multiple queries with caching';
    }

    // Rule 3: High estimated cost
    if (history[history.length - 1].estimatedCost > 1000000) {
      optimization.suggestion = 'Query touches large result set. Consider pagination or filtering.';
      optimization.predictedPerformance = avgExecution * 0.5;
      optimization.improvement = 50;
      optimization.priority = 'medium';
    }

    // Cache result
    this.optimizationCache.set(normalized, optimization);

    return optimization;
  }

  /**
   * Get slow queries for optimization
   */
  getSlowestQueries(limit: number = 10): Array<{ query: string; avgTime: number; count: number }> {
    const queries: Array<{ query: string; avgTime: number; count: number }> = [];

    for (const [query, history] of this.queryHistory) {
      if (history.length > 0) {
        const avgTime = history.reduce((sum, h) => sum + h.executionTime, 0) / history.length;
        queries.push({ query, avgTime, count: history.length });
      }
    }

    return queries
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  /**
   * Get optimization opportunities
   */
  getOptimizationOpportunities(
    minImprovement: number = 30
  ): QueryOptimization[] {
    const opportunities: QueryOptimization[] = [];

    for (const [query, history] of this.queryHistory) {
      if (history.length >= 5) {
        // Only analyze with sufficient data
        const opt = this.analyzeQuery(query);
        if (opt && opt.improvement >= minImprovement) {
          opportunities.push(opt);
        }
      }
    }

    return opportunities.sort((a, b) => b.improvement - a.improvement);
  }

  // ==================== HELPER METHODS ====================

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, 'N')
      .toLowerCase()
      .trim();
  }

  private countSeqScans(query: string): number {
    return (query.match(/seq scan/gi) || []).length;
  }

  private countIndexScans(query: string): number {
    return (query.match(/index scan/gi) || []).length;
  }

  private countJoins(query: string): number {
    return (query.match(/join/gi) || []).length;
  }

  private suggestIndexes(query: string): string[] {
    const suggestions: string[] = [];

    // Extract table and column names from WHERE clause
    const whereMatch = query.match(/WHERE\s+(.*?)(?:GROUP|ORDER|LIMIT|$)/i);
    if (whereMatch) {
      const where = whereMatch[1];

      // Simple heuristic: index on frequently filtered columns
      const columnMatches = where.match(/(\w+)\s*=/g) || [];
      for (const match of columnMatches) {
        const column = match.replace(/\s*=\s*/, '');
        if (column && !suggestions.includes(column)) {
          suggestions.push(`CREATE INDEX idx_${column} ON table(${column})`);
        }
      }
    }

    return suggestions.slice(0, 3); // Top 3 suggestions
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      trackedQueries: this.queryHistory.size,
      totalRecordings: Array.from(this.queryHistory.values()).reduce((sum, h) => sum + h.length, 0),
      cachedOptimizations: this.optimizationCache.size
    };
  }

  /**
   * Clear history (for testing or maintenance)
   */
  clear(): void {
    this.queryHistory.clear();
    this.optimizationCache.clear();
  }
}

// ==================== QUERY REWRITE ENGINE ====================

/**
 * Suggest query rewrites for common performance patterns
 */
export class QueryRewriter {
  /**
   * Detect N+1 queries and suggest bulk fetch
   */
  detectNPlusOne(queries: string[]): { pattern: string; suggestion: string } | null {
    const selectCount = queries.filter(q => q.trim().toUpperCase().startsWith('SELECT')).length;
    const groupedQueries = new Map<string, number>();

    for (const query of queries) {
      const normalized = query.replace(/\d+/g, 'N');
      groupedQueries.set(normalized, (groupedQueries.get(normalized) || 0) + 1);
    }

    // If same query pattern executed many times
    for (const [pattern, count] of groupedQueries) {
      if (count > 5) {
        return {
          pattern,
          suggestion: `N+1 pattern detected (${count} similar queries). Consider using JOIN or bulk fetch.`
        };
      }
    }

    return null;
  }

  /**
   * Suggest rewrite for LIMIT without ORDER BY
   */
  suggestOrderBy(query: string): string | null {
    if (
      query.toUpperCase().includes('LIMIT') &&
      !query.toUpperCase().includes('ORDER BY')
    ) {
      return 'Add ORDER BY clause for consistent pagination with LIMIT';
    }
    return null;
  }

  /**
   * Detect missing column filtering
   */
  detectSelectStar(query: string): string | null {
    if (query.includes('SELECT *') && query.toUpperCase().includes('WHERE')) {
      return 'SELECT * with WHERE clause. Specify columns to reduce bandwidth (Phase 3 optimization).';
    }
    return null;
  }

  /**
   * Suggest subquery rewrite to JOIN
   */
  suggestJoinRewrite(query: string): string | null {
    if (
      query.toUpperCase().includes('WHERE') &&
      query.toUpperCase().includes('IN (SELECT')
    ) {
      return 'IN (SELECT ...) subquery. Consider rewrite as JOIN for better performance.';
    }
    return null;
  }
}

// ==================== EXPORTS ====================

export const queryOptimizer = new QueryOptimizer();
export const queryRewriter = new QueryRewriter();
