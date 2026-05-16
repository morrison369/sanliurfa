import {
  canonicalizeSearchQuery as canonicalizeSearchQueryInternal,
  expandSearchQueryVariants as expandSearchQueryVariantsInternal,
} from './search-synonyms';

export function normalizeSearchQuery(query: string): string {
  return query
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTurkishSearchText(query: string): string {
  return normalizeSearchQuery(query)
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c');
}

export const canonicalizeSearchQuery = canonicalizeSearchQueryInternal;
export const expandSearchQueryVariants = expandSearchQueryVariantsInternal;
