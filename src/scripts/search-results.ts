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

type SearchResultsRoot = HTMLElement & { dataset: DOMStringMap };

const states = new WeakMap<SearchResultsRoot, SearchResultsState>();

function getState(root: SearchResultsRoot): SearchResultsState {
  const existing = states.get(root);
  if (existing) return existing;
  const next = createSearchResultsState(root.dataset.query || '');
  states.set(root, next);
  return next;
}

async function fetchJson(input: string) {
  const response = await fetch(input);
  const payload = await response.json();
  return { response, payload };
}

function updateUrl(query: string) {
  const current = new URL(window.location.href);
  if (query.trim()) {
    current.searchParams.set('q', query.trim());
  } else {
    current.searchParams.delete('q');
  }
  window.history.replaceState({}, '', `${current.pathname}${current.search}`);
}

async function performSearch(root: SearchResultsRoot) {
  const state = getState(root);
  const query = state.query.trim();

  if (query.length < 2) {
    state.hasSearched = false;
    state.error = null;
    state.places = [];
    state.users = [];
    state.collections = [];
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

function bindActions(root: SearchResultsRoot, content: HTMLElement) {
  const state = getState(root);
  const input = content.querySelector<HTMLInputElement>('[data-search-results-input]');
  if (!input) return;

  let debounce: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener('input', () => {
    state.query = input.value;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      void performSearch(root);
    }, 150);
  });
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
    const initialQuery = (root.dataset.query || '').trim();
    if (initialQuery.length >= 2) {
      void performSearch(root);
    }
  }
}
