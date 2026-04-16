import { setElementHtml } from '../lib/admin-dom';
import {
  extractHashtags,
  extractTaggedContent,
  renderHashtagExplorer,
  type HashtagExplorerState,
} from '../lib/hashtag-explorer';

type HashtagExplorerRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: HashtagExplorerRoot): HashtagExplorerState {
  try {
    return {
      hashtags: JSON.parse(root.dataset.hashtags || '[]'),
      selectedHashtag: root.dataset.selectedHashtag || null,
      taggedContent: JSON.parse(root.dataset.taggedContent || 'null'),
      isLoadingHashtags: root.dataset.isLoadingHashtags === 'true',
      isLoadingContent: root.dataset.isLoadingContent === 'true',
      error: root.dataset.error || null,
    };
  } catch {
    return {
      hashtags: [],
      selectedHashtag: root.dataset.selectedHashtag || null,
      taggedContent: null,
      isLoadingHashtags: true,
      isLoadingContent: false,
      error: null,
    };
  }
}

function writeState(root: HashtagExplorerRoot, state: Partial<HashtagExplorerState>) {
  if (state.hashtags) root.dataset.hashtags = JSON.stringify(state.hashtags);
  if (typeof state.selectedHashtag === 'string') root.dataset.selectedHashtag = state.selectedHashtag;
  if (state.selectedHashtag === null) delete root.dataset.selectedHashtag;
  if (state.taggedContent !== undefined) {
    root.dataset.taggedContent = JSON.stringify(state.taggedContent);
  }
  if (typeof state.isLoadingHashtags === 'boolean') {
    root.dataset.isLoadingHashtags = String(state.isLoadingHashtags);
  }
  if (typeof state.isLoadingContent === 'boolean') {
    root.dataset.isLoadingContent = String(state.isLoadingContent);
  }
  if (state.error) root.dataset.error = state.error;
  if (state.error === null) delete root.dataset.error;
}

async function loadHashtags(root: HashtagExplorerRoot) {
  const response = await fetch('/api/hashtags?limit=20&period=week');
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error('Trend konuları yüklenemedi');
  }

  writeState(root, { hashtags: extractHashtags(payload), isLoadingHashtags: false });
}

async function loadTaggedContent(root: HashtagExplorerRoot, slug: string) {
  writeState(root, { isLoadingContent: true, taggedContent: null });
  renderRoot(root);

  try {
    const response = await fetch(`/api/hashtags/${slug}?limit=20`);
    const payload = await response.json().catch(() => null);

    if (response.status === 404) {
      throw new Error('Hashtag bulunamadı');
    }

    if (!response.ok) {
      throw new Error('İçerik yüklenemedi');
    }

    writeState(root, {
      taggedContent: extractTaggedContent(payload),
      selectedHashtag: slug,
      error: null,
    });
    window.history.pushState(null, '', `/sosyal?tag=${slug}`);
  } catch (error) {
    writeState(root, {
      taggedContent: null,
      selectedHashtag: slug,
      error: error instanceof Error ? error.message : 'İçerik yüklenemedi',
    });
  } finally {
    writeState(root, { isLoadingContent: false });
    renderRoot(root);
  }
}

function bindActions(root: HashtagExplorerRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLElement>('[data-hashtag-select]').forEach((button) => {
    button.addEventListener('click', () => {
      const slug = button.dataset.hashtagSelect;
      if (!slug) return;
      void loadTaggedContent(root, slug);
    });
  });
}

function renderRoot(root: HashtagExplorerRoot) {
  const content = root.querySelector<HTMLElement>('[data-hashtag-explorer-content]');
  if (!content) return;
  setElementHtml(content, renderHashtagExplorer(readState(root)));
  bindActions(root, content);
}

export function initHashtagExplorer() {
  const roots = Array.from(document.querySelectorAll<HashtagExplorerRoot>('[data-hashtag-explorer]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.isLoadingHashtags = 'true';
    root.dataset.isLoadingContent = 'false';
    root.dataset.hashtags = '[]';
    root.dataset.taggedContent = 'null';
    root.dataset.selectedHashtag = root.dataset.initialSlug || '';

    void (async () => {
      try {
        await loadHashtags(root);
        renderRoot(root);
        if (root.dataset.initialSlug) {
          await loadTaggedContent(root, root.dataset.initialSlug);
        }
      } catch (error) {
        writeState(root, {
          isLoadingHashtags: false,
          error: error instanceof Error ? error.message : 'Trend konuları yüklenemedi',
        });
        renderRoot(root);
      }
    })();
  }
}
