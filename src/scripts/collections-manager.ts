import { setElementHtml } from '../lib/admin-dom';
import {
  extractApiError,
  extractCollections,
  extractCreatedCollection,
  renderCollectionsManager,
  type CollectionsManagerState,
} from '../lib/collections-manager';

type CollectionsRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: CollectionsRoot): CollectionsManagerState {
  try {
    return {
      collections: JSON.parse(root.dataset.collections || '[]'),
      isLoading: root.dataset.isLoading === 'true',
      isCreating: root.dataset.isCreating === 'true',
      error: root.dataset.error || null,
      form: JSON.parse(
        root.dataset.form ||
          JSON.stringify({
            name: '',
            description: '',
            icon: '📍',
            is_public: false,
          })
      ),
    };
  } catch {
    return {
      collections: [],
      isLoading: true,
      isCreating: false,
      error: null,
      form: {
        name: '',
        description: '',
        icon: '📍',
        is_public: false,
      },
    };
  }
}

function writeState(root: CollectionsRoot, state: Partial<CollectionsManagerState>) {
  if (state.collections) root.dataset.collections = JSON.stringify(state.collections);
  if (typeof state.isLoading === 'boolean') root.dataset.isLoading = String(state.isLoading);
  if (typeof state.isCreating === 'boolean') root.dataset.isCreating = String(state.isCreating);
  if (state.error) root.dataset.error = state.error;
  if (state.error === null) delete root.dataset.error;
  if (state.form) root.dataset.form = JSON.stringify(state.form);
}

async function loadCollections(root: CollectionsRoot) {
  writeState(root, { isLoading: true });
  renderRoot(root);

  try {
    const response = await fetch(`/api/collections?userId=${root.dataset.userId}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(extractApiError(payload, 'Koleksiyonlar yüklenemedi'));
    }

    writeState(root, {
      collections: extractCollections(payload),
      error: null,
    });
  } catch (error) {
    writeState(root, {
      collections: [],
      error: error instanceof Error ? error.message : 'Koleksiyonlar yüklenemedi',
    });
  } finally {
    writeState(root, { isLoading: false });
    renderRoot(root);
  }
}

async function createCollection(root: CollectionsRoot, form: CollectionsManagerState['form']) {
  if (!form.name.trim()) {
    writeState(root, { error: 'Koleksiyon adı gereklidir' });
    renderRoot(root);
    return;
  }

  writeState(root, { isCreating: true, error: null, form });
  renderRoot(root);

  try {
    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        icon: form.icon,
        is_public: form.is_public,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(extractApiError(payload, 'Koleksiyon oluşturulamadı'));
    }

    const created = extractCreatedCollection(payload);
    const state = readState(root);
    writeState(root, {
      collections: created ? [created, ...state.collections] : state.collections,
      form: { name: '', description: '', icon: '📍', is_public: false },
      error: null,
    });
  } catch (error) {
    writeState(root, {
      error: error instanceof Error ? error.message : 'Koleksiyon oluşturulurken bir hata oluştu',
      form,
    });
  } finally {
    writeState(root, { isCreating: false });
    renderRoot(root);
  }
}

async function deleteCollection(root: CollectionsRoot, collectionId: string, name: string) {
  if (!window.confirm(`"${name}" koleksiyonunu silmek istediğinize emin misiniz?`)) return;

  try {
    const response = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(extractApiError(payload, 'Koleksiyon silinemedi'));
    }

    writeState(root, {
      collections: readState(root).collections.filter((collection) => collection.id !== collectionId),
      error: null,
    });
  } catch (error) {
    writeState(root, {
      error: error instanceof Error ? error.message : 'Koleksiyon silinirken bir hata oluştu',
    });
  } finally {
    renderRoot(root);
  }
}

function bindActions(root: CollectionsRoot, content: HTMLElement) {
  const form = content.querySelector<HTMLFormElement>('[data-collections-create-form]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    void createCollection(root, {
      name: String(formData.get('name') || ''),
      description: String(formData.get('description') || ''),
      icon: String(formData.get('icon') || '📍'),
      is_public: formData.get('is_public') === 'on',
    });
  });

  content.querySelectorAll<HTMLElement>('[data-collection-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const collectionId = button.dataset.collectionDelete;
      const name = button.dataset.collectionName || 'Koleksiyon';
      if (!collectionId) return;
      void deleteCollection(root, collectionId, name);
    });
  });
}

function renderRoot(root: CollectionsRoot) {
  const content = root.querySelector<HTMLElement>('[data-collections-manager-content]');
  if (!content) return;
  setElementHtml(content, renderCollectionsManager(readState(root)));
  bindActions(root, content);
}

export function initCollectionsManager() {
  const roots = Array.from(document.querySelectorAll<CollectionsRoot>('[data-collections-manager]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.collections = '[]';
    root.dataset.isLoading = 'true';
    root.dataset.isCreating = 'false';
    root.dataset.form = JSON.stringify({
      name: '',
      description: '',
      icon: '📍',
      is_public: false,
    });
    renderRoot(root);
    void loadCollections(root);
  }
}
