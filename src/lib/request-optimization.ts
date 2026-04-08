/**
 * Phase 6: Application-Level Optimization
 * Request deduplication, cursor-based pagination, response compression support
 */

import { logger } from './logging';

// ==================== REQUEST DEDUPLICATION ====================

/**
 * Request coalescing: Multiple identical concurrent requests return same cached result
 * Reduces duplicate database queries during high concurrency
 */
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  count: number;
}

const pendingRequests = new Map<string, PendingRequest<any>>();
const REQUEST_CACHE_TTL = 5000; // 5 seconds for deduplication

/**
 * Generate cache key from endpoint + parameters
 */
function getRequestKey(endpoint: string, params?: Record<string, any>): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${endpoint}:${paramStr}`;
}

/**
 * Coalesce duplicate requests: if same request is made within 5s, return existing promise
 * This reduces database load during cache misses and thundering herd scenarios
 */
export async function coalesceRequest<T>(
  endpoint: string,
  executor: () => Promise<T>,
  params?: Record<string, any>
): Promise<T> {
  const key = getRequestKey(endpoint, params);
  const existing = pendingRequests.get(key);

  // Return existing promise if available and fresh
  if (existing && Date.now() - existing.timestamp < REQUEST_CACHE_TTL) {
    existing.count++;
    return existing.promise;
  }

  // Create new request
  const promise = executor().then((result) => {
    // Clean up after successful completion
    pendingRequests.delete(key);
    return result;
  }).catch((error) => {
    // Clean up on error to allow retry
    pendingRequests.delete(key);
    throw error;
  });

  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
    count: 1
  });

  return promise;
}

/**
 * Get request coalescing stats (for monitoring)
 */
export function getCoalescingStats() {
  const stats = Array.from(pendingRequests.entries()).map(([key, { count, timestamp }]) => ({
    key,
    coalescedCount: count,
    age: Date.now() - timestamp
  }));

  return {
    totalPending: pendingRequests.size,
    coalescedRequests: stats.reduce((sum, s) => sum + (s.coalescedCount - 1), 0),
    details: stats
  };
}

// ==================== CURSOR-BASED PAGINATION ====================

export interface CursorPaginationOptions {
  limit: number;
  cursor?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  limit: number;
}

/**
 * Cursor-based pagination (keyset pagination)
 * More efficient than offset pagination for large datasets
 * Cursor is typically base64-encoded JSON of sort key values
 */
export function decodeCursor(cursor?: string): Record<string, any> | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (err) {
    logger.debug('Invalid cursor format', { cursor });
    return null;
  }
}

/**
 * Create cursor from row data
 * Encodes the sort key values that will be used in the next query
 */
export function encodeCursor(row: Record<string, any>, sortBy: string): string {
  const cursorData = {
    [sortBy]: row[sortBy],
    id: row.id // Use ID as tiebreaker for consistent ordering
  };

  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Build cursor-based WHERE clause for keyset pagination
 */
export function buildCursorWhereClause(
  cursor: Record<string, any> | null,
  sortBy: string = 'created_at',
  order: 'ASC' | 'DESC' = 'DESC'
): { whereClause: string; params: any[] } {
  if (!cursor) {
    return { whereClause: '', params: [] };
  }

  const operator = order === 'DESC' ? '<' : '>';
  const sortValue = cursor[sortBy];
  const idValue = cursor.id;

  // Keyset pagination: (sortKey, id) > (cursorValue, cursorId)
  // This avoids skipping rows and is more efficient than OFFSET
  const whereClause = `
    WHERE (${sortBy}, id) ${operator} ($1, $2)
  `.trim();

  return {
    whereClause,
    params: [sortValue, idValue]
  };
}

/**
 * Example: Cursor-based pagination for API endpoints
 */
export async function paginateWithCursor<T>(
  query: string,
  totalCount: number,
  rows: T[],
  options: CursorPaginationOptions
): Promise<CursorPaginationResult<T>> {
  const { limit, cursor, sortBy = 'created_at' } = options;

  // If we got more rows than requested, we have a next page
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  // Generate next cursor from last row
  let nextCursor: string | undefined;
  if (hasMore && data.length > 0) {
    const lastRow = data[data.length - 1] as any;
    nextCursor = encodeCursor(lastRow, sortBy);
  }

  return {
    data,
    nextCursor,
    hasMore,
    limit
  };
}

// ==================== RESPONSE COMPRESSION HELPERS ====================

/**
 * Determine which compression to use based on Accept-Encoding header
 */
export function selectCompression(acceptEncoding: string): 'gzip' | 'br' | 'deflate' | null {
  if (!acceptEncoding) return null;

  // Prefer Brotli if available (20-30% better than gzip)
  if (acceptEncoding.includes('br')) return 'br';
  if (acceptEncoding.includes('gzip')) return 'gzip';
  if (acceptEncoding.includes('deflate')) return 'deflate';

  return null;
}

/**
 * Phase 6: Calculate optimal batch size for streaming responses
 * Larger batches = more throughput, smaller = lower latency
 */
export function getOptimalBatchSize(dataSize: number, targetLatencyMs: number = 50): number {
  // For ~50ms target latency:
  // - Small data (< 1MB): batch size 100
  // - Medium data (1-10MB): batch size 500
  // - Large data (> 10MB): batch size 1000

  if (dataSize < 1024 * 1024) return 100;
  if (dataSize < 10 * 1024 * 1024) return 500;
  return 1000;
}

/**
 * Response payload size statistics
 */
interface CompressionStats {
  original: number;
  compressed: number;
  ratio: number;
  algorithm: string;
}

export function calculateCompressionStats(
  original: number,
  compressed: number,
  algorithm: string
): CompressionStats {
  return {
    original,
    compressed,
    ratio: Number(((compressed / original) * 100).toFixed(2)),
    algorithm
  };
}
