/**
 * Search Suggestions Library
 * Autocomplete and search suggestions
 */
import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';

export async function getSearchSuggestions(
  prefix: string,
  searchType: string = 'places',
  limit: number = 10
): Promise<string[]> {
  try {
    const suggestions = await queryMany(`
      SELECT DISTINCT completion_text
      FROM autocomplete_index
      WHERE prefix ILIKE $1 AND search_type = $2
      ORDER BY frequency DESC
      LIMIT $3
    `, [`${prefix}%`, searchType, limit]);

    return suggestions.map((s: any) => s.completion_text);
  } catch (error) {
    logger.error('Failed to get suggestions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getGlobalSuggestions(query: string, limit: number = 5): Promise<any[]> {
  try {
    const suggestions = await queryMany(`
      SELECT
        suggestion_text,
        suggestion_type,
        search_count
      FROM search_suggestions
      WHERE suggestion_text ILIKE $1
      ORDER BY search_count DESC
      LIMIT $2
    `, [`${query}%`, limit]);

    return suggestions;
  } catch (error) {
    logger.error('Failed to get global suggestions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPersonalizedSuggestions(
  userId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    const suggestions = await queryMany(`
      SELECT
        suggestion_text,
        suggestion_type,
        relevance_to_user
      FROM user_search_suggestions
      WHERE user_id = $1
      ORDER BY relevance_to_user DESC
      LIMIT $2
    `, [userId, limit]);

    return suggestions;
  } catch (error) {
    logger.error('Failed to get personalized suggestions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordSuggestionImpression(suggestionText: string, suggestionType: string): Promise<void> {
  try {
    const existing = await queryOne(
      'SELECT id FROM search_suggestions WHERE suggestion_text = $1 AND suggestion_type = $2',
      [suggestionText, suggestionType]
    );

    if (existing) {
      const result = await queryOne(
        'SELECT COUNT(*) as count FROM search_history WHERE search_query = $1',
        [suggestionText]
      );
      await update('search_suggestions', { suggestion_text: suggestionText }, {
        search_count: parseInt(result?.count || '0'),
        last_searched_at: new Date()
      });
    } else {
      await insert('search_suggestions', {
        suggestion_text: suggestionText,
        suggestion_type: suggestionType,
        search_count: 1,
        last_searched_at: new Date()
      });
    }
  } catch (error) {
    logger.error('Failed to record suggestion impression', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateAutocompleteIndex(searchText: string, searchType: string): Promise<void> {
  try {
    // Generate prefixes for autocomplete
    for (let i = 1; i <= Math.min(searchText.length, 5); i++) {
      const prefix = searchText.substring(0, i);
      const existing = await queryOne(
        'SELECT id FROM autocomplete_index WHERE prefix = $1 AND completion_text = $2 AND search_type = $3',
        [prefix, searchText, searchType]
      );

      if (existing) {
        await update('autocomplete_index', { prefix, completion_text: searchText, search_type: searchType }, {
          frequency: (await queryOne(
            'SELECT COUNT(*) as count FROM search_history WHERE search_query = $1 AND search_type = $2',
            [searchText, searchType]
          )).count || 0,
          last_used_at: new Date()
        });
      } else {
        await insert('autocomplete_index', {
          prefix,
          completion_text: searchText,
          search_type: searchType,
          frequency: 1,
          last_used_at: new Date()
        });
      }
    }
  } catch (error) {
    logger.error('Failed to update autocomplete index', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordZeroResultSearch(
  searchQuery: string,
  searchType: string,
  filters?: any
): Promise<void> {
  try {
    const existing = await queryOne(
      'SELECT id FROM zero_result_searches WHERE search_query = $1 AND search_type = $2',
      [searchQuery, searchType]
    );

    if (existing) {
      await update('zero_result_searches', { search_query: searchQuery, search_type: searchType }, {
        occurrence_count: (await queryOne(
          'SELECT COUNT(*) as count FROM search_history WHERE search_query = $1 AND search_type = $2 AND result_count = 0',
          [searchQuery, searchType]
        )).count || 0,
        updated_at: new Date()
      });
    } else {
      await insert('zero_result_searches', {
        search_query: searchQuery,
        search_type: searchType,
        filters: filters ? JSON.stringify(filters) : null,
        occurrence_count: 1
      });
    }

    logger.info('Zero result search recorded', { searchQuery, searchType });
  } catch (error) {
    logger.error('Failed to record zero result', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getZeroResultSearches(limit: number = 10): Promise<any[]> {
  try {
    const searches = await queryMany(`
      SELECT
        search_query,
        search_type,
        occurrence_count,
        is_resolved
      FROM zero_result_searches
      WHERE is_resolved = false
      ORDER BY occurrence_count DESC
      LIMIT $1
    `, [limit]);

    return searches;
  } catch (error) {
    logger.error('Failed to get zero result searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
