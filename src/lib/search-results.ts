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
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
      return nestedData as Record<string, unknown>;
    }
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
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
  };
}

export function extractPlaceResults(payload: unknown): SearchPlace[] {
  const data = resolveEnvelopeData(payload);
  const results = Array.isArray(data.results) ? data.results : [];
  return results as SearchPlace[];
}

export function extractUserResults(payload: unknown): SearchUser[] {
  const data = resolveEnvelopeData(payload);
  const users = Array.isArray(data.data) ? data.data : Array.isArray(data.results) ? data.results : [];
  return users as SearchUser[];
}

export function extractCollectionResults(payload: unknown, query: string): SearchCollection[] {
  const data = resolveEnvelopeData(payload);
  const collections = Array.isArray(data.data)
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
  const data = resolveEnvelopeData(payload);
  if (typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }

  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim().length > 0) return error;
    if (error && typeof error === 'object') {
      const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
  }

  return fallback;
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

function renderPlaces(places: SearchPlace[]): string {
  if (places.length === 0) return '';

  return `
    <div>
      <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Mekan sonuçları (${places.length})</h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        ${places
          .map(
            (place) => `
              <a href="/yerler/${escapeHtml(place.id)}" class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:bg-gray-800">
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
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderUsers(users: SearchUser[]): string {
  if (users.length === 0) return '';

  return `
    <div>
      <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Kullanıcı sonuçları (${users.length})</h3>
      <div class="space-y-2">
        ${users
          .map(
            (user) => `
              <a href="/kullanici/${escapeHtml(user.id)}" class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:bg-gray-800">
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
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderCollections(collections: SearchCollection[]): string {
  if (collections.length === 0) return '';

  return `
    <div>
      <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Koleksiyon sonuçları (${collections.length})</h3>
      <div class="space-y-2">
        ${collections
          .map(
            (collection) => `
              <a href="/koleksiyonlar/${escapeHtml(collection.id)}" class="rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:bg-gray-800">
                <p class="font-medium text-gray-900 dark:text-white">${escapeHtml(collection.name)}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(collection.description || '')}</p>
              </a>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

export function renderSearchResults(state: SearchResultsState): string {
  const sections = [renderPlaces(state.places), renderUsers(state.users), renderCollections(state.collections)]
    .filter(Boolean)
    .join('');

  let body = '';
  if (state.query.trim().length < 2) {
    body = '<p class="text-center text-gray-600 dark:text-gray-400">En az 2 karakter girin.</p>';
  } else if (state.isLoading) {
    body = '<p class="text-center text-gray-600 dark:text-gray-400">Arama yapılıyor...</p>';
  } else if (state.error) {
    body = `<p class="text-center text-red-600 dark:text-red-400">${escapeHtml(state.error)}</p>`;
  } else if (!state.hasSearched) {
    body = '<p class="text-center text-gray-600 dark:text-gray-400">Aramaya başlamak için yazın.</p>';
  } else if (!sections) {
    body = '<p class="text-center text-gray-600 dark:text-gray-400">Sonuç bulunamadı.</p>';
  } else {
    body = `<div class="space-y-8">${sections}</div>`;
  }

  return `<div class="space-y-6">${renderSearchInput(state.query)}${body}</div>`;
}
