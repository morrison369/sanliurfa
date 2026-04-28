// search module - consolidated
// Import specific modules as needed to avoid naming conflicts

// Example usage:
// import { getSearchSuggestions } from '@/lib/search/search-suggestions';
// import { searchPlaces } from '@/lib/search/search-engine';
// import { esClient } from '@/lib/search/elasticsearch';

// Re-export non-conflicting items only
export * from './search-history';

// Individual exports with aliasing to avoid conflicts
export type { SearchFilters, SearchResult as CombinedSearchResult } from './search';
export { search as performSearch } from './search';

export type { SearchDocument, QueryIntent } from './search-intelligence';
export { 
  SearchIndex, 
  RankingEngine, 
  QueryAnalyzer,
  rankSearchResults,
  getPersonalizedRecommendations
} from './search-intelligence';

export type { SearchQuery, SearchResult as ElasticsearchResult } from './elasticsearch';
export { esClient } from './elasticsearch';

export {
  getSearchSuggestions,
  getGlobalSuggestions,
  getPersonalizedSuggestions
} from './search-suggestions';

export {
  searchPlaces,
  searchReviews
} from './search-engine';
