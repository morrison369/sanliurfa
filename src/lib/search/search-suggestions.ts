/**
 * Search Suggestions Library
 * Autocomplete and search suggestions
 */
import { query, queryOne, queryMany, insert, update } from '../postgres';
import { logger } from '../logger';
import { hasColumn, pickFirstExistingColumn } from './schema-compat';

export async function getSearchSuggestions(
  prefix: string,
  searchType: string = 'places',
  limit: number = 10
): Promise<string[]> {
  try {
    const autocompleteHasType = await hasColumn('autocomplete_index', 'search_type');
    const suggestions = await queryMany(`
      SELECT DISTINCT completion_text
      FROM autocomplete_index
      WHERE prefix ILIKE $1 ${autocompleteHasType ? 'AND search_type = $2' : ''}
      ORDER BY frequency DESC
      LIMIT $${autocompleteHasType ? 3 : 2}
    `, autocompleteHasType ? [`${prefix}%`, searchType, limit] : [`${prefix}%`, limit]);

    return suggestions.map((s: any) => s.completion_text);
  } catch (error) {
    logger.error('Failed to get suggestions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getGlobalSuggestions(query: string, limit: number = 5): Promise<any[]> {
  try {
    const suggestionTypeColumn = await pickFirstExistingColumn('search_suggestions', ['suggestion_type']);
    const suggestions = await queryMany(`
      SELECT
        suggestion_text,
        ${suggestionTypeColumn ?? `'general'`} AS suggestion_type,
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

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export async function getFuzzySuggestions(
  input: string,
  searchType: string = 'places',
  limit: number = 10,
): Promise<string[]> {
  try {
    const autocompleteHasType = await hasColumn('autocomplete_index', 'search_type');
    try {
      const trigramRows = await queryMany(
        `
        SELECT DISTINCT completion_text
        FROM autocomplete_index
        WHERE ${autocompleteHasType ? 'search_type = $1 AND ' : ''}
          AND similarity(completion_text, $2) > 0.20
        ORDER BY similarity(completion_text, $2) DESC, frequency DESC
        LIMIT $${autocompleteHasType ? 3 : 2}
        `,
        autocompleteHasType ? [searchType, input, limit] : [input, limit],
      );
      if (trigramRows.length > 0) {
        return trigramRows.map((r: any) => String(r.completion_text));
      }
    } catch {
      // pg_trgm extension absent or similarity unavailable -> fallback below
    }

    const rows = await queryMany(
      `
      SELECT DISTINCT completion_text, frequency
      FROM autocomplete_index
      ${autocompleteHasType ? 'WHERE search_type = $1' : ''}
      ORDER BY frequency DESC
      LIMIT ${autocompleteHasType ? '$2' : '$1'}
      `,
      autocompleteHasType ? [searchType, 300] : [300],
    );
    const q = input.toLocaleLowerCase('tr-TR').trim();
    const scored = rows
      .map((r: any) => {
        const text = String(r.completion_text || '');
        const t = text.toLocaleLowerCase('tr-TR');
        const distance = levenshtein(q, t.slice(0, Math.max(q.length, 1)));
        return { text, distance, frequency: Number(r.frequency || 0) };
      })
      .filter((x) => x.distance <= 2)
      .sort((a, b) => (a.distance === b.distance ? b.frequency - a.frequency : a.distance - b.distance))
      .slice(0, limit);
    return scored.map((s) => s.text);
  } catch (error) {
    logger.error('Failed to get fuzzy suggestions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPersonalizedSuggestions(
  userId: string | undefined,
  limit: number = 5
): Promise<any[]> {
  try {
    if (!userId) {
      return [];
    }

    const suggestionTypeColumn = await pickFirstExistingColumn('user_search_suggestions', ['suggestion_type']);
    const suggestions = await queryMany(`
      SELECT
        suggestion_text,
        ${suggestionTypeColumn ?? `'general'`} AS suggestion_type,
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
    const suggestionTypeColumn = await pickFirstExistingColumn('search_suggestions', ['suggestion_type']);
    if (!suggestionTypeColumn) {
      return;
    }

    const existing = await queryOne(
      `SELECT id FROM search_suggestions WHERE suggestion_text = $1 AND ${suggestionTypeColumn} = $2`,
      [suggestionText, suggestionType]
    );

    if (existing) {
      const searchQueryColumn = await pickFirstExistingColumn('search_history', ['query', 'search_query']);
      if (!searchQueryColumn) {
        return;
      }
      const result = await queryOne(
        `SELECT COUNT(*) as count FROM search_history WHERE ${searchQueryColumn} = $1`,
        [suggestionText]
      );
      await update('search_suggestions', { suggestion_text: suggestionText }, {
        search_count: parseInt(result?.count || '0', 10),
        last_searched_at: new Date()
      });
    } else {
      await insert('search_suggestions', {
        suggestion_text: suggestionText,
        [suggestionTypeColumn]: suggestionType,
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
    const autocompleteHasType = await hasColumn('autocomplete_index', 'search_type');
    const searchQueryColumn = await pickFirstExistingColumn('search_history', ['query', 'search_query']);
    const historyTypeColumn = await pickFirstExistingColumn('search_history', ['search_type']);

    // Generate prefixes for autocomplete
    for (let i = 1; i <= Math.min(searchText.length, 5); i++) {
      const prefix = searchText.substring(0, i);
      const existing = await queryOne(
        `SELECT id FROM autocomplete_index WHERE prefix = $1 AND completion_text = $2 ${autocompleteHasType ? 'AND search_type = $3' : ''}`,
        autocompleteHasType ? [prefix, searchText, searchType] : [prefix, searchText]
      );

      if (existing) {
        let frequency = 0;
        if (searchQueryColumn) {
          const historyWhere = historyTypeColumn
            ? `${searchQueryColumn} = $1 AND ${historyTypeColumn} = $2`
            : `${searchQueryColumn} = $1`;
          const historyParams = historyTypeColumn ? [searchText, searchType] : [searchText];
          const result = await queryOne<{ count?: string }>(
            `SELECT COUNT(*) as count FROM search_history WHERE ${historyWhere}`,
            historyParams
          );
          frequency = Number(result?.count || '0');
        }

        const updateSql = autocompleteHasType
          ? `
            UPDATE autocomplete_index
            SET frequency = $1, last_used_at = $2
            WHERE prefix = $3 AND completion_text = $4 AND search_type = $5
          `
          : `
            UPDATE autocomplete_index
            SET frequency = $1, last_used_at = $2
            WHERE prefix = $3 AND completion_text = $4
          `;
        await query(
          updateSql,
          autocompleteHasType
            ? [frequency, new Date(), prefix, searchText, searchType]
            : [frequency, new Date(), prefix, searchText]
        );
      } else {
        await insert('autocomplete_index', {
          prefix,
          completion_text: searchText,
          ...(autocompleteHasType ? { search_type: searchType } : {}),
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
    const zeroResultHasType = await hasColumn('zero_result_searches', 'search_type');
    const searchQueryColumn = await pickFirstExistingColumn('search_history', ['query', 'search_query']);
    const historyTypeColumn = await pickFirstExistingColumn('search_history', ['search_type']);
    const resultCountColumn = await pickFirstExistingColumn('search_history', ['results_count', 'result_count']);

    const existing = await queryOne(
      `SELECT id FROM zero_result_searches WHERE search_query = $1 ${zeroResultHasType ? 'AND search_type = $2' : ''}`,
      zeroResultHasType ? [searchQuery, searchType] : [searchQuery]
    );

    if (existing) {
      let occurrenceCount = 0;
      if (searchQueryColumn && resultCountColumn) {
        const historyWhere = historyTypeColumn
          ? `${searchQueryColumn} = $1 AND ${historyTypeColumn} = $2 AND ${resultCountColumn} = 0`
          : `${searchQueryColumn} = $1 AND ${resultCountColumn} = 0`;
        const historyParams = historyTypeColumn ? [searchQuery, searchType] : [searchQuery];
        const result = await queryOne<{ count?: string }>(
          `SELECT COUNT(*) as count FROM search_history WHERE ${historyWhere}`,
          historyParams
        );
        occurrenceCount = Number(result?.count || '0');
      }

      await update(
        'zero_result_searches',
        zeroResultHasType
          ? { search_query: searchQuery, search_type: searchType }
          : { search_query: searchQuery },
        {
          occurrence_count: occurrenceCount
        }
      );
    } else {
      await insert('zero_result_searches', {
        search_query: searchQuery,
        ...(zeroResultHasType ? { search_type: searchType } : {}),
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
    const zeroResultHasType = await hasColumn('zero_result_searches', 'search_type');
    const searches = await queryMany(`
      SELECT
        search_query,
        ${zeroResultHasType ? 'search_type' : `'places' AS search_type`},
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


