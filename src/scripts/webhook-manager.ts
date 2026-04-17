import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createWebhookManagerState,
  extractWebhookManagerData,
  renderWebhookManager,
  type WebhookManagerState,
} from '../lib/webhook-manager';

type WebhookManagerRoot = HTMLElement & { dataset: DOMStringMap };

type ApiPayload = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
};

function readState(root: WebhookManagerRoot): WebhookManagerState {
  const raw = root.dataset.state;
  if (!raw) return createWebhookManagerState();

  try {
    return JSON.parse(raw) as WebhookManagerState;
  } catch {
    return createWebhookManagerState();
  }
}

function writeState(root: WebhookManagerRoot, state: WebhookManagerState) {
  root.dataset.state = JSON.stringify(state);
}

function setLoading(root: WebhookManagerRoot, loading: boolean) {
  root.dataset.loading = loading ? 'true' : 'false';
}

function readLoading(root: WebhookManagerRoot): boolean {
  return root.dataset.loading === 'true';
}

function setFlash(root: WebhookManagerRoot, message: string | null) {
  if (message) root.dataset.flash = message;
  else delete root.dataset.flash;
}

function readFlash(root: WebhookManagerRoot): string | null {
  return root.dataset.flash || null;
}

function isSuccess(payload: ApiPayload): boolean {
  return payload.success === true;
}

function getMessage(payload: ApiPayload, fallback: string): string {
  if (typeof payload.message === 'string' && payload.message) return payload.message;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  return fallback;
}

function renderRoot(root: WebhookManagerRoot) {
  const loading = root.querySelector<HTMLElement>('[data-webhook-manager-loading]');
  const content = root.querySelector<HTMLElement>('[data-webhook-manager-content]');
  if (!loading || !content) return;

  const state = readState(root);
  const flash = readFlash(root);
  const renderState = {
    ...state,
    error: flash || state.error,
  };

  if (state.loading && !state.webhooks.length) {
    setElementClassName(loading, 'flex items-center justify-center py-12 text-sm text-slate-500');
    setElementClassName(content, 'hidden');
    return;
  }

  setElementHtml(content, renderWebhookManager(renderState));
  setElementClassName(loading, 'hidden');
  setElementClassName(content, '');
  bindInteractions(root, content);
}

async function readJson(response: Response): Promise<ApiPayload> {
  try {
    return (await response.json()) as ApiPayload;
  } catch {
    return {};
  }
}

async function fetchWebhooks(root: WebhookManagerRoot) {
  const state = readState(root);
  writeState(root, { ...state, loading: true, error: null });
  setFlash(root, null);
  renderRoot(root);

  const response = await fetch('/api/webhooks', { credentials: 'same-origin' });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getMessage(payload, 'Webhookler yuklenemedi'));
  }

  const webhooks = extractWebhookManagerData(payload);
  writeState(root, {
    ...readState(root),
    webhooks,
    loading: false,
    error: null,
  });
  setFlash(root, null);
  renderRoot(root);
}

async function submitCreate(root: WebhookManagerRoot) {
  const state = readState(root);
  const event = state.form.event.trim();
  const url = state.form.url.trim();
  const secret = state.form.secret.trim();

  if (!event || !url) {
    writeState(root, { ...state, error: 'Olay turu ve URL zorunludur.' });
    renderRoot(root);
    return;
  }

  setLoading(root, true);
  const response = await fetch('/api/webhooks', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event, url, secret: secret || undefined }),
  });
  const payload = await readJson(response);
  setLoading(root, false);

  if (!response.ok || !isSuccess(payload)) {
    throw new Error(getMessage(payload, 'Webhook olusturulamadi'));
  }

  writeState(root, {
    ...readState(root),
    showForm: false,
    form: { event: '', url: '', secret: '' },
    error: null,
  });
  setFlash(root, getMessage(payload, 'Webhook olusturuldu'));
  await fetchWebhooks(root);
}

async function deleteWebhook(root: WebhookManagerRoot, webhookId: string) {
  setLoading(root, true);
  const response = await fetch(`/api/webhooks/${webhookId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  const payload = await readJson(response);
  setLoading(root, false);

  if (!response.ok || !isSuccess(payload)) {
    throw new Error(getMessage(payload, 'Webhook silinemedi'));
  }

  setFlash(root, getMessage(payload, 'Webhook silindi'));
  await fetchWebhooks(root);
}

async function testWebhook(root: WebhookManagerRoot, webhookId: string) {
  setLoading(root, true);
  const response = await fetch('/api/webhooks/test', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webhookId }),
  });
  const payload = await readJson(response);
  setLoading(root, false);

  if (!response.ok || !isSuccess(payload)) {
    throw new Error(getMessage(payload, 'Webhook testi gonderilemedi'));
  }

  setFlash(root, getMessage(payload, 'Test olayi gonderildi'));
  renderRoot(root);
}

async function copyWebhookId(root: WebhookManagerRoot, webhookId: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(webhookId);
    setFlash(root, 'Webhook ID kopyalandi');
  } else {
    setFlash(root, webhookId);
  }
  renderRoot(root);
}

function bindInteractions(root: WebhookManagerRoot, content: HTMLElement) {
  const toggle = content.querySelector<HTMLElement>('[data-webhook-toggle]');
  toggle?.addEventListener('click', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      showForm: !state.showForm,
      error: null,
    });
    setFlash(root, null);
    renderRoot(root);
  });

  const form = content.querySelector<HTMLFormElement>('[data-webhook-form]');
  const eventField = content.querySelector<HTMLSelectElement>('[data-webhook-event]');
  const urlField = content.querySelector<HTMLInputElement>('[data-webhook-url]');
  const secretField = content.querySelector<HTMLInputElement>('[data-webhook-secret]');
  const cancel = content.querySelector<HTMLElement>('[data-webhook-cancel]');

  eventField?.addEventListener('change', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      form: {
        ...state.form,
        event: eventField.value,
      },
    });
  });

  urlField?.addEventListener('input', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      form: {
        ...state.form,
        url: urlField.value,
      },
    });
  });

  secretField?.addEventListener('input', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      form: {
        ...state.form,
        secret: secretField.value,
      },
    });
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (readLoading(root)) return;
    void submitCreate(root).catch((error: unknown) => {
      const state = readState(root);
      writeState(root, {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Webhook olusturulamadi',
      });
      renderRoot(root);
    });
  });

  cancel?.addEventListener('click', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      showForm: false,
      error: null,
      form: { event: '', url: '', secret: '' },
    });
    setFlash(root, null);
    renderRoot(root);
  });

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-webhook-test]'))) {
    button.addEventListener('click', () => {
      if (readLoading(root)) return;
      const webhookId = button.dataset.webhookTest;
      if (!webhookId) return;
      void testWebhook(root, webhookId).catch((error: unknown) => {
        const state = readState(root);
        writeState(root, {
          ...state,
          error: error instanceof Error ? error.message : 'Webhook testi gonderilemedi',
        });
        renderRoot(root);
      });
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-webhook-copy]'))) {
    button.addEventListener('click', () => {
      const webhookId = button.dataset.webhookCopy;
      if (!webhookId) return;
      void copyWebhookId(root, webhookId);
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-webhook-delete]'))) {
    button.addEventListener('click', () => {
      if (readLoading(root)) return;
      const webhookId = button.dataset.webhookDelete;
      if (!webhookId) return;
      void deleteWebhook(root, webhookId).catch((error: unknown) => {
        const state = readState(root);
        writeState(root, {
          ...state,
          error: error instanceof Error ? error.message : 'Webhook silinemedi',
        });
        renderRoot(root);
      });
    });
  }
}

export function initWebhookManager() {
  const roots = Array.from(document.querySelectorAll<WebhookManagerRoot>('[data-webhook-manager]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    writeState(root, createWebhookManagerState());
    renderRoot(root);
    void fetchWebhooks(root).then(() => renderRoot(root)).catch((error: unknown) => {
      const state = readState(root);
      writeState(root, {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Webhookler yuklenemedi',
      });
      renderRoot(root);
    });
  }
}
