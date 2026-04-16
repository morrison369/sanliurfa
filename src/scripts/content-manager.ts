import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  defaultContentManagerForm,
  extractContentManagerItems,
  extractContentManagerMessage,
  renderContentManager,
  type ContentManagerFormData,
  type ContentManagerState,
} from '../lib/content-manager-ui';

type ContentManagerRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: ContentManagerRoot): ContentManagerState {
  return {
    items: [],
    loading: false,
    showForm: root.dataset.showForm === 'true',
    saving: root.dataset.saving === 'true',
    error: root.dataset.error || null,
    form: {
      title: root.dataset.formTitle || '',
      description: root.dataset.formDescription || '',
      content: root.dataset.formContent || '',
      category: root.dataset.formCategory || '',
      content_type: root.dataset.formContentType || 'article',
    },
  };
}

function writeForm(root: ContentManagerRoot, form: ContentManagerFormData) {
  root.dataset.formTitle = form.title;
  root.dataset.formDescription = form.description;
  root.dataset.formContent = form.content;
  root.dataset.formCategory = form.category;
  root.dataset.formContentType = form.content_type;
}

function setError(root: ContentManagerRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchContentItems() {
  const response = await fetch('/api/content');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(extractContentManagerMessage(payload, 'İçerikler alınırken hata oluştu'));
  }
  return extractContentManagerItems(payload);
}

async function renderRoot(root: ContentManagerRoot) {
  const loading = root.querySelector<HTMLElement>('[data-content-manager-loading]');
  const content = root.querySelector<HTMLElement>('[data-content-manager-content]');
  if (!loading || !content) return;

  try {
    const items = await fetchContentItems();
    const state = readState(root);
    state.items = items;
    setElementHtml(content, renderContentManager(state));
    bindActions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'İçerikler alınırken hata oluştu');
    const state = readState(root);
    setElementHtml(content, renderContentManager(state));
    bindActions(root, content);
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

function syncFormState(root: ContentManagerRoot, content: HTMLElement) {
  const form = readState(root).form;
  content.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-content-field]').forEach((field) => {
    field.addEventListener('input', () => {
      const nextForm = { ...readState(root).form };
      const key = field.dataset.contentField as keyof ContentManagerFormData;
      nextForm[key] = field.value;
      writeForm(root, nextForm);
    });
  });
}

async function createContent(root: ContentManagerRoot) {
  const state = readState(root);
  root.dataset.saving = 'true';
  await renderRoot(root);

  try {
    const response = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.form),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractContentManagerMessage(payload, 'İçerik oluşturulamadı'));
    }

    root.dataset.showForm = 'false';
    delete root.dataset.saving;
    writeForm(root, defaultContentManagerForm());
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'İçerik oluşturulamadı');
    delete root.dataset.saving;
  } finally {
    await renderRoot(root);
  }
}

async function publishContent(root: ContentManagerRoot, contentId: string) {
  try {
    const response = await fetch(`/api/content/${contentId}/publish`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractContentManagerMessage(payload, 'İçerik yayınlanamadı'));
    }
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'İçerik yayınlanamadı');
  } finally {
    await renderRoot(root);
  }
}

function bindActions(root: ContentManagerRoot, content: HTMLElement) {
  content.querySelector<HTMLElement>('[data-content-manager-open-form]')?.addEventListener('click', () => {
    root.dataset.showForm = 'true';
    writeForm(root, defaultContentManagerForm());
    void renderRoot(root);
  });

  content.querySelector<HTMLElement>('[data-content-manager-cancel]')?.addEventListener('click', () => {
    root.dataset.showForm = 'false';
    writeForm(root, defaultContentManagerForm());
    void renderRoot(root);
  });

  content.querySelector<HTMLFormElement>('[data-content-manager-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void createContent(root);
  });

  content.querySelectorAll<HTMLElement>('[data-content-manager-publish]').forEach((button) => {
    button.addEventListener('click', () => {
      const contentId = button.dataset.contentManagerPublish;
      if (!contentId) return;
      void publishContent(root, contentId);
    });
  });

  syncFormState(root, content);
}

export function initContentManager() {
  const roots = Array.from(document.querySelectorAll<ContentManagerRoot>('[data-content-manager]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.showForm = 'false';
    writeForm(root, defaultContentManagerForm());
    void renderRoot(root);
  }
}
