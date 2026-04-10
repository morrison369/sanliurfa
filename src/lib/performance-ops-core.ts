import { logger } from './logging';

export interface CacheStrategy {
  key: string;
  ttl: number;
  pattern?: string;
  invalidateOn?: string[];
}

export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  places_list: {
    key: 'sanliurfa:places:list',
    ttl: 600,
    invalidateOn: ['create_place', 'update_place', 'delete_place']
  },
  places_detail: {
    key: 'sanliurfa:places:{id}',
    ttl: 600,
    invalidateOn: ['update_place']
  },
  places_by_category: {
    key: 'sanliurfa:places:category:{category}',
    ttl: 600,
    invalidateOn: ['create_place', 'update_place', 'delete_place']
  },
  reviews_list: {
    key: 'sanliurfa:reviews:place:{placeId}',
    ttl: 300,
    invalidateOn: ['create_review', 'update_review', 'delete_review']
  },
  reviews_trending: {
    key: 'sanliurfa:reviews:trending',
    ttl: 300,
    invalidateOn: ['create_review']
  },
  user_favorites: {
    key: 'sanliurfa:favorites:{userId}',
    ttl: 300,
    invalidateOn: ['add_favorite', 'remove_favorite']
  },
  user_reviews: {
    key: 'sanliurfa:reviews:user:{userId}',
    ttl: 300,
    invalidateOn: ['create_review', 'update_review']
  },
  search_results: {
    key: 'sanliurfa:search:{query}:{page}',
    ttl: 3600,
    invalidateOn: ['create_place', 'update_place', 'delete_place']
  },
  stats_daily: {
    key: 'sanliurfa:stats:daily',
    ttl: 3600,
    invalidateOn: []
  },
  trending_places: {
    key: 'sanliurfa:trending:places',
    ttl: 3600,
    invalidateOn: []
  },
  categories: {
    key: 'sanliurfa:categories',
    ttl: 86400,
    invalidateOn: []
  },
  districts: {
    key: 'sanliurfa:districts',
    ttl: 86400,
    invalidateOn: []
  }
};

export async function suggestIndexes(): Promise<string[]> {
  const commonIndexes = [
    { table: 'places', column: 'category_id' },
    { table: 'places', column: 'district_id' },
    { table: 'reviews', column: 'place_id' },
    { table: 'reviews', column: 'user_id' },
    { table: 'reviews', column: 'created_at' },
    { table: 'favorites', column: 'user_id' },
    { table: 'places', columns: ['latitude', 'longitude'] },
    { table: 'reviews', columns: ['place_id', 'created_at'] }
  ];

  return commonIndexes.map((idx) => `CREATE INDEX idx_${idx.table}_${idx.column || idx.columns?.join('_')} ON ${idx.table}(${idx.column || idx.columns?.join(', ')})`);
}

export interface QueryPerformanceMetric {
  query: string;
  duration: number;
  rows: number;
  cached: boolean;
}

const queryMetrics: QueryPerformanceMetric[] = [];

export function recordQueryMetric(metric: QueryPerformanceMetric): void {
  queryMetrics.push(metric);

  if (queryMetrics.length > 1000) {
    queryMetrics.shift();
  }

  if (metric.duration > 1000) {
    logger.warn('Slow query detected', { duration: metric.duration, rows: metric.rows });
  }
}

export function getQueryMetrics(): QueryPerformanceMetric[] {
  return queryMetrics;
}

export function getSlowQueries(threshold: number = 1000): QueryPerformanceMetric[] {
  return queryMetrics.filter((metric) => metric.duration > threshold);
}
