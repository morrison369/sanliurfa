import { extractEnvelopeMessage, resolveEnvelopeData, resolveNestedEnvelopeData } from '../shared/api-envelope';
import { renderEmptyState, renderErrorState, renderLoadingState } from '../shared/render-states';

export interface SearchPlace {
  id: string;
  name: string;
  category?: string;
  image_url?: string;
  rating?: number;
}

export interface SearchUser {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
}

export interface SearchCollection {
  id: string;
  name: string;
  description?: string;
}

export interface SearchResultsState {
  query: string;
  isLoading: boolean;
  hasSearched: boolean;
  error: string | null;
  places: SearchPlace[];
  users: SearchUser[];
  collections: SearchCollection[];
  recentQueries: string[];
  activeResultIndex: number;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createSearchResultsState(initialQuery = ''): SearchResultsState {
  return {
    query: initialQuery,
    isLoading: false,
    hasSearched: false,
    error: null,
    places: [],
    users: [],
    collections: [],
    recentQueries: [],
    activeResultIndex: -1,
  };
}

export function extractPlaceResults(payload: unknown): SearchPlace[] {
  const data = resolveNestedEnvelopeData(payload);
  const results = Array.isArray(data.results) ? data.results : [];
  return results as SearchPlace[];
}

export function extractUserResults(payload: unknown): SearchUser[] {
  const data = resolveNestedEnvelopeData(payload);
  const users = Array.isArray(data)
    ? data
    : Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.results)
        ? data.results
        : [];
  return users as SearchUser[];
}

export function extractCollectionResults(payload: unknown, query: string): SearchCollection[] {
  const data = resolveNestedEnvelopeData(payload);
  const collections = Array.isArray(data)
    ? (data as SearchCollection[])
    : Array.isArray(data.data)
      ? (data.data as SearchCollection[])
      : Array.isArray(data.results)
        ? (data.results as SearchCollection[])
      : [];

  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
  return collections.filter((collection) => {
    const name = collection.name?.toLocaleLowerCase('tr-TR') ?? '';
    const description = collection.description?.toLocaleLowerCase('tr-TR') ?? '';
    return name.includes(normalizedQuery) || description.includes(normalizedQuery);
  });
}

export function extractSearchResultsMessage(payload: unknown, fallback: string): string {
  return extractEnvelopeMessage(payload, fallback);
}

function renderSearchInput(query: string): string {
  return `
    <div class="mb-6">
      <input
        type="text"
        data-search-results-input
        value="${escapeHtml(query)}"
        placeholder="Mekan, kullanıcı ya da koleksiyon ara..."
        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      />
    </div>
  `;
}

function renderRecentSearches(state: SearchResultsState): string {
  if (state.query.trim().length > 0 || state.recentQueries.length === 0) return '';

  return `
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Son aramalar</p>
      <div class="mt-3 flex flex-wrap gap-2">
        ${state.recentQueries
          .map(
            (query) => `<button type="button" data-search-results-recent-query="${escapeHtml(query)}" class="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">${escapeHtml(query)}</button>`,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderSearchSummary(state: SearchResultsState): string {
  const total = state.places.length + state.users.length + state.collections.length;
  if (!state.hasSearched || state.isLoading || state.error || state.query.trim().length < 2) return '';

  return `
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <p class="text-sm text-gray-600 dark:text-gray-400">Arama özeti</p>
      <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">"${escapeHtml(state.query.trim())}" için ${total} sonuç bulundu</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        ${state.places.length} mekan, ${state.users.length} kullanıcı, ${state.collections.length} koleksiyon
      </p>
    </div>
  `;
}

function renderSearchActions(showClear = true, includeRetry = false): string {
  return `
    <div class="mt-4 flex flex-wrap justify-center gap-3">
      ${includeRetry ? '<button type="button" data-search-results-retry class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Tekrar dene</button>' : ''}
      ${showClear ? '<button type="button" data-search-results-clear class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Aramayı temizle</button>' : ''}
    </div>
  `;
}

function renderPlaces(places: SearchPlace[], activeResultIndex: number, startIndex: number): string {
  if (places.length === 0) return '';

  return `
    <div>
      <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Mekan sonuçları (${places.length})</h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        ${places
          .map((place, offset) => {
            const index = startIndex + offset;
            const activeClass = activeResultIndex === index ? 'ring-2 ring-blue-500' : '';

            return `
              <a href="/yerler/${escapeHtml(place.id)}" data-search-results-item data-search-results-index="${index}" class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:bg-gray-800 ${activeClass}">
                ${
                  place.image_url
                    ? `<img src="${escapeHtml(place.image_url)}" alt="${escapeHtml(place.name)}" class="mb-2 h-32 w-full rounded object-cover" />`
                    : ''
                }
                <p class="font-medium text-gray-900 dark:text-white">${escapeHtml(place.name)}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(place.category || '')}</p>
                ${
                  typeof place.rating === 'number'
                    ? `<p class="text-sm text-yellow-600">⭐ ${place.rating.toFixed(1)}</p>`
                    : ''
                }
              </a>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderUsers(users: SearchUser[], activeResultIndex: number, startIndex: number): string {
  if (users.length === 0) return '';

  return `
    <div>
      <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Kullanıcı sonuçları (${users.length})</h3>
      <div class="space-y-2">
        ${users
          .map((user, offset) => {
            const index = startIndex + offset;
            const activeClass = activeResultIndex === index ? 'ring-2 ring-blue-500' : '';

            return `
              <a href="/kullanici/${escapeHtml(user.id)}" data-search-results-item data-search-results-index="${index}" class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:bg-gray-800 ${activeClass}">
                ${
                  user.avatar_url
                    ? `<img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.full_name)}" class="h-10 w-10 rounded-full object-cover" />`
                    : `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-bold">${escapeHtml(user.full_name.charAt(0))}</div>`
                }
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">${escapeHtml(user.full_name)}</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">@${escapeHtml(user.username || 'kullanıcı')}</p>
                </div>
              </a>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderCollections(collections: SearchCollection[], activeResultIndex: number, startIndex: number): string {
  if (collections.length === 0) return '';

  return `
    <div>
      <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Koleksiyon sonuçları (${collections.length})</h3>
      <div class="space-y-2">
        ${collections
          .map((collection, offset) => {
            const index = startIndex + offset;
            const activeClass = activeResultIndex === index ? 'ring-2 ring-blue-500' : '';

            return `
              <a href="/koleksiyonlar/${escapeHtml(collection.id)}" data-search-results-item data-search-results-index="${index}" class="rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:bg-gray-800 ${activeClass}">
                <p class="font-medium text-gray-900 dark:text-white">${escapeHtml(collection.name)}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(collection.description || '')}</p>
              </a>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function renderSearchResults(state: SearchResultsState): string {
  const sections = [
    renderPlaces(state.places, state.activeResultIndex, 0),
    renderUsers(state.users, state.activeResultIndex, state.places.length),
    renderCollections(
      state.collections,
      state.activeResultIndex,
      state.places.length + state.users.length,
    ),
  ]
    .filter(Boolean)
    .join('');

  let body = '';
  if (state.query.trim().length < 2) {
    const remaining = Math.max(0, 2 - state.query.trim().length);
    body = `
      ${renderEmptyState(
        remaining > 0 ? `Aramaya başlamak için ${remaining} karakter daha girin.` : 'En az 2 karakter girin.',
        'text-center text-gray-600 dark:text-gray-400',
      )}
      ${state.query.trim().length > 0 ? renderSearchActions() : ''}
    `;
  } else if (state.isLoading) {
    body = renderLoadingState('Arama yapılıyor...', 'text-center text-gray-600 dark:text-gray-400');
  } else if (state.error) {
    body = `
      ${renderErrorState(state.error)}
      ${renderSearchActions(true, true)}
    `;
  } else if (!state.hasSearched) {
    body = renderEmptyState('Aramaya başlamak için yazın.', 'text-center text-gray-600 dark:text-gray-400');
  } else if (!sections) {
    body = `
      ${renderEmptyState('Sonuç bulunamadı.', 'text-center text-gray-600 dark:text-gray-400')}
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">Farklı bir anahtar kelime deneyebilir veya aramayı temizleyebilirsiniz.</p>
      ${renderSearchActions()}
    `;
  } else {
    body = `<div class="space-y-8">${renderSearchSummary(state)}${sections}</div>`;
  }

  return `<div class="space-y-6">${renderSearchInput(state.query)}${renderRecentSearches(state)}${body}</div>`;
}
