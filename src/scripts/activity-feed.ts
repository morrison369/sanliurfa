import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createActivityFeedState,
  extractActivityFeedItems,
  renderActivityFeed,
  type ActivityFeedFilter,
  type ActivityFeedState,
} from '../lib/activity-feed-panel';

type ActivityFeedRoot = HTMLElement & { dataset: DOMStringMap };

type ActivityPayload = {
  success?: boolean;
  error?: string;
  message?: string;
  data?: unknown;
  count?: number;
};

const PAGE_SIZE = 20;

function readState(root: ActivityFeedRoot): ActivityFeedState {
  const raw = root.dataset.state;
  if (!raw) return createActivityFeedState();
  try {
    return JSON.parse(raw) as ActivityFeedState;
  } catch {
    return createActivityFeedState();
  }
}

function writeState(root: ActivityFeedRoot, state: ActivityFeedState) {
  root.dataset.state = JSON.stringify(state);
}

function getError(payload: ActivityPayload, fallback: string): string {
  if (typeof payload.message === 'string' && payload.message) return payload.message;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  return fallback;
}

function renderRoot(root: ActivityFeedRoot) {
  const loading = root.querySelector<HTMLElement>('[data-activity-feed-loading]');
  const content = root.querySelector<HTMLElement>('[data-activity-feed-content]');
  if (!loading || !content) return;

  const state = readState(root);
  if (state.loading && !state.items.length) {
    setElementClassName(loading, 'flex justify-center py-12');
    setElementClassName(content, 'hidden');
    return;
  }

  setElementHtml(content, renderActivityFeed(state));
  setElementClassName(loading, 'hidden');
  setElementClassName(content, '');
  bindInteractions(root, content);
}

async function readJson(response: Response): Promise<ActivityPayload> {
  try {
    return (await response.json()) as ActivityPayload;
  } catch {
    return {};
  }
}

async function fetchActivities(root: ActivityFeedRoot, reset = false) {
  const current = readState(root);
  const nextOffset = reset ? 0 : current.offset;
  writeState(root, {
    ...current,
    loading: reset ? true : current.loading,
    loadingMore: !reset && current.items.length > 0,
    error: null,
    offset: nextOffset,
    items: reset ? [] : current.items,
  });
  renderRoot(root);

  const response = await fetch(`/api/feed/activity?filter=${readState(root).filter}&limit=${PAGE_SIZE}&offset=${nextOffset}`, {
    credentials: 'same-origin',
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getError(payload, 'Etkinlik akışı yüklenemedi'));
  }

  const incoming = extractActivityFeedItems(payload);
  const state = readState(root);
  writeState(root, {
    ...state,
    items: reset ? incoming : [...state.items, ...incoming],
    loading: false,
    loadingMore: false,
    error: null,
    offset: nextOffset + incoming.length,
    hasMore: incoming.length >= PAGE_SIZE,
  });
  renderRoot(root);
}

function bindInteractions(root: ActivityFeedRoot, content: HTMLElement) {
  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-activity-filter]'))) {
    button.addEventListener('click', () => {
      const filter = button.dataset.activityFilter as ActivityFeedFilter | undefined;
      if (!filter) return;
      const state = readState(root);
      if (state.filter === filter) return;
      writeState(root, {
        ...state,
        filter,
        items: [],
        offset: 0,
        hasMore: true,
      });
      void fetchActivities(root, true).catch((error: unknown) => {
        const current = readState(root);
        writeState(root, {
          ...current,
          loading: false,
          loadingMore: false,
          error: error instanceof Error ? error.message : 'Etkinlik akışı yüklenemedi',
        });
        renderRoot(root);
      });
    });
  }

  const loadMore = content.querySelector<HTMLElement>('[data-activity-load-more]');
  loadMore?.addEventListener('click', () => {
    const state = readState(root);
    if (state.loadingMore || !state.hasMore) return;
    void fetchActivities(root, false).catch((error: unknown) => {
      const current = readState(root);
      writeState(root, {
        ...current,
        loading: false,
        loadingMore: false,
          error: error instanceof Error ? error.message : 'Daha fazla etkinlik yüklenemedi',
      });
      renderRoot(root);
    });
  });
}

export function initActivityFeed() {
  const roots = Array.from(document.querySelectorAll<ActivityFeedRoot>('[data-activity-feed]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    writeState(root, createActivityFeedState());
    renderRoot(root);
    void fetchActivities(root, true).catch((error: unknown) => {
      const state = readState(root);
      writeState(root, {
        ...state,
        loading: false,
        loadingMore: false,
        error: error instanceof Error ? error.message : 'Etkinlik akışı yüklenemedi',
      });
      renderRoot(root);
    });
  }
}
