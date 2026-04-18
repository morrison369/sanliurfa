import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createSearchResultsState,
  extractCollectionResults,
  extractPlaceResults,
  extractSearchResultsMessage,
  extractUserResults,
  renderSearchResults,
  type SearchResultsState,
} from '../lib/search-results';
import {
  readStoredJsonArray,
  readStoredString,
  writeStoredJsonArray,
  writeStoredString,
} from './shared/persisted-ui-state';

type SearchResultsRoot = HTMLElement & { dataset: DOMStringMap };

const states = new WeakMap<SearchResultsRoot, SearchResultsState>();
const SEARCH_RESULTS_STORAGE_KEY = 'sanliurfa:search-results:query';
const SEARCH_RESULTS_RECENT_KEY = 'sanliurfa:search-results:recent-queries';
const SEARCH_RESULTS_DEBOUNCE_MS = 250;

function readStoredQuery(): string {
  return readStoredString(SEARCH_RESULTS_STORAGE_KEY);
}

function writeStoredQuery(query: string) {
  writeStoredString(SEARCH_RESULTS_STORAGE_KEY, query.trim());
}

function readRecentQueries(): string[] {
  return readStoredJsonArray(SEARCH_RESULTS_RECENT_KEY);
}

function writeRecentQueries(queries: string[]) {
  writeStoredJsonArray(SEARCH_RESULTS_RECENT_KEY, queries, 5);
}

function rememberRecentQuery(query: string) {
  const normalized = query.trim();
  if (normalized.length < 2) return readRecentQueries();
  const deduped = [normalized, ...readRecentQueries().filter((item) => item !== normalized)];
  writeRecentQueries(deduped);
  return deduped.slice(0, 5);
}

function readInitialQuery(root: SearchResultsRoot): string {
  const datasetQuery = (root.dataset.query || '').trim();
  if (datasetQuery) return datasetQuery;

  try {
    const current = new URL(window.location.href);
    const urlQuery = current.searchParams.get('q')?.trim();
    if (urlQuery) return urlQuery;
  } catch {
    // no-op
  }

  return readStoredQuery();
}

function getState(root: SearchResultsRoot): SearchResultsState {
  const existing = states.get(root);
  if (existing) return existing;
  const next = createSearchResultsState(readInitialQuery(root));
  next.recentQueries = readRecentQueries();
  states.set(root, next);
  return next;
}

async function fetchJson(input: string) {
  const response = await fetch(input);
  const payload = await response.json();
  return { response, payload };
}

function updateUrl(query: string) {
  try {
    const current = new URL(window.location.href);
    if (query.trim()) {
      current.searchParams.set('q', query.trim());
    } else {
      current.searchParams.delete('q');
    }
    window.history.replaceState({}, '', `${current.pathname}${current.search}`);
  } catch {
    // no-op
  }
}

async function performSearch(root: SearchResultsRoot) {
  const state = getState(root);
  const query = state.query.trim();
  state.activeResultIndex = -1;

  if (query.length < 2) {
    state.hasSearched = false;
    state.error = null;
    state.places = [];
    state.users = [];
    state.collections = [];
    state.recentQueries = readRecentQueries();
    writeStoredQuery(state.query);
    updateUrl(state.query);
    await renderRoot(root);
    return;
  }

  state.isLoading = true;
  state.hasSearched = true;
  state.error = null;
  await renderRoot(root);

  try {
    const [placesResult, usersResult, collectionsResult] = await Promise.all([
      fetchJson(`/api/search?q=${encodeURIComponent(query)}&limit=50`),
      fetchJson(`/api/users/search?q=${encodeURIComponent(query)}&limit=50`),
      fetchJson('/api/collections?public=true&limit=50'),
    ]);

    if (!placesResult.response.ok) {
      throw new Error(extractSearchResultsMessage(placesResult.payload, 'Arama başarısız oldu'));
    }
    if (!usersResult.response.ok) {
      throw new Error(extractSearchResultsMessage(usersResult.payload, 'Kullanıcı araması başarısız oldu'));
    }
    if (!collectionsResult.response.ok) {
      throw new Error(
        extractSearchResultsMessage(collectionsResult.payload, 'Koleksiyon araması başarısız oldu'),
      );
    }

    state.places = extractPlaceResults(placesResult.payload);
    state.users = extractUserResults(usersResult.payload);
    state.collections = extractCollectionResults(collectionsResult.payload, query);
    state.recentQueries = rememberRecentQuery(query);
    writeStoredQuery(query);
    updateUrl(query);
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Arama başarısız oldu';
    state.places = [];
    state.users = [];
    state.collections = [];
  } finally {
    state.isLoading = false;
    await renderRoot(root);
  }
}

function getResultLinks(content: HTMLElement) {
  return Array.from(content.querySelectorAll<HTMLAnchorElement>('[data-search-results-item]'));
}

function navigateToResult(link: HTMLAnchorElement) {
  const href = link.getAttribute?.('href') || link.href;
  if (!href) return;

  try {
    if (typeof window.location.assign === 'function') {
      window.location.assign(href);
      return;
    }
  } catch {
    // no-op
  }

  try {
    window.location.href = href;
  } catch {
    // no-op
  }
}

function bindActions(root: SearchResultsRoot, content: HTMLElement) {
  const state = getState(root);
  const input = content.querySelector<HTMLInputElement>('[data-search-results-input]');
  const clearButton = content.querySelector<HTMLElement>('[data-search-results-clear]');
  const retryButton = content.querySelector<HTMLElement>('[data-search-results-retry]');
  const recentButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-search-results-recent-query]'));

  let debounce: ReturnType<typeof setTimeout> | undefined;
  if (input) {
    input.addEventListener('input', () => {
      state.query = input.value;
      state.error = null;
      state.activeResultIndex = -1;
      writeStoredQuery(state.query);
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void performSearch(root);
      }, SEARCH_RESULTS_DEBOUNCE_MS);
    });

    input.addEventListener('keydown', (event: KeyboardEvent) => {
      const links = getResultLinks(content);
      if (links.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.activeResultIndex = Math.min(links.length - 1, state.activeResultIndex + 1);
        void renderRoot(root);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.activeResultIndex = Math.max(-1, state.activeResultIndex - 1);
        void renderRoot(root);
        return;
      }

      if (event.key === 'Enter' && state.activeResultIndex >= 0) {
        event.preventDefault();
        const target = links[state.activeResultIndex];
        if (target) navigateToResult(target);
      }
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      state.query = '';
      state.error = null;
      state.hasSearched = false;
      state.places = [];
      state.users = [];
      state.collections = [];
      state.activeResultIndex = -1;
      state.recentQueries = readRecentQueries();
      writeStoredQuery('');
      updateUrl('');
      void renderRoot(root);
    });
  }

  if (retryButton) {
    retryButton.addEventListener('click', () => {
      state.error = null;
      void performSearch(root);
    });
  }

  for (const button of recentButtons) {
    button.addEventListener('click', () => {
      const query = (button.dataset.searchResultsRecentQuery || '').trim();
      if (query.length < 2) return;
      state.query = query;
      state.error = null;
      state.activeResultIndex = -1;
      writeStoredQuery(query);
      void performSearch(root);
    });
  }
}

async function renderRoot(root: SearchResultsRoot) {
  const loading = root.querySelector<HTMLElement>('[data-search-results-loading]');
  const content = root.querySelector<HTMLElement>('[data-search-results-content]');
  if (!loading || !content) return;

  const state = getState(root);
  setElementHtml(content, renderSearchResults(state));
  bindActions(root, content);
  setElementClassName(loading, 'hidden');
  setElementClassName(content, '');
}

export function initSearchResults() {
  const roots = Array.from(document.querySelectorAll<SearchResultsRoot>('[data-search-results]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderRoot(root);
    const initialQuery = readInitialQuery(root).trim();
    if (initialQuery.length >= 2) {
      void performSearch(root);
    }
  }
}
