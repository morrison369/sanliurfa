import {
  fetchAdminModerationQueue,
  mutateAdminModerationQueue,
} from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  getModerationQueueItems,
  isModerationMutationSuccessful,
  normalizeModerationQueueStatus,
  renderModerationQueueManager,
  type ModerationQueueStatus,
} from '../lib/moderation-queue-manager';
import type { AdminModerationQueueListData } from '../types/admin-api';

type ModerationQueueRoot = HTMLElement & { dataset: DOMStringMap };

function readStatus(root: ModerationQueueRoot): ModerationQueueStatus {
  return normalizeModerationQueueStatus(root.dataset.status);
}

function writePayload(root: ModerationQueueRoot, payload: AdminModerationQueueListData | null) {
  if (!payload) {
    delete root.dataset.payload;
    return;
  }

  root.dataset.payload = JSON.stringify(payload);
}

function readPayload(root: ModerationQueueRoot): AdminModerationQueueListData | null {
  const raw = root.dataset.payload;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminModerationQueueListData;
  } catch {
    return null;
  }
}

function setError(root: ModerationQueueRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

function setActionInProgress(root: ModerationQueueRoot, queueItemId: string | null) {
  if (queueItemId) root.dataset.actionInProgress = queueItemId;
  else delete root.dataset.actionInProgress;
}

async function fetchQueue(root: ModerationQueueRoot) {
  const payload = await fetchAdminModerationQueue({ status: readStatus(root), limit: 20 });
  if (!payload.success) {
    throw new Error('Moderasyon kuyruğu alınırken hata oluştu');
  }

  writePayload(root, payload);
  setError(root, null);
}

async function mutateQueue(
  root: ModerationQueueRoot,
  body: { queueItemId: string; action: 'assign' | 'resolve'; resolution?: 'resolved' },
) {
  setActionInProgress(root, body.queueItemId);
  try {
    const result = await mutateAdminModerationQueue(body);
    if (!isModerationMutationSuccessful(result)) {
      throw new Error(result?.message || 'İşlem başarısız');
    }

    await fetchQueue(root);
  } finally {
    setActionInProgress(root, null);
  }
}

function bindInteractions(root: ModerationQueueRoot, content: HTMLElement) {
  const statusButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-moderation-queue-status]'));
  for (const button of statusButtons) {
    button.addEventListener('click', async () => {
      root.dataset.status = normalizeModerationQueueStatus(button.dataset.moderationQueueStatus);
      delete root.dataset.payload;
      delete root.dataset.error;
      await renderRoot(root);
    });
  }

  const assignButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-moderation-queue-assign]'));
  for (const button of assignButtons) {
    button.addEventListener('click', async () => {
      const queueItemId = button.dataset.moderationQueueAssign;
      if (!queueItemId) return;

      try {
        await mutateQueue(root, { queueItemId, action: 'assign' });
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
      }
      renderRoot(root);
    });
  }

  const resolveButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-moderation-queue-resolve]'));
  for (const button of resolveButtons) {
    button.addEventListener('click', async () => {
      const queueItemId = button.dataset.moderationQueueResolve;
      if (!queueItemId) return;

      try {
        await mutateQueue(root, { queueItemId, action: 'resolve', resolution: 'resolved' });
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
      }
      renderRoot(root);
    });
  }
}

async function renderRoot(root: ModerationQueueRoot) {
  const loading = root.querySelector<HTMLElement>('[data-moderation-queue-loading]');
  const content = root.querySelector<HTMLElement>('[data-moderation-queue-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'py-8 text-center text-gray-500');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.payload && !root.dataset.error) {
      await fetchQueue(root);
    }

    setElementHtml(
      content,
      renderModerationQueueManager({
        status: readStatus(root),
        items: getModerationQueueItems(readPayload(root)),
        error: root.dataset.error || null,
        actionInProgress: root.dataset.actionInProgress || null,
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
    setElementHtml(
      content,
      renderModerationQueueManager({
        status: readStatus(root),
        items: [],
        error: root.dataset.error || 'Bilinmeyen bir hata oluştu',
        actionInProgress: root.dataset.actionInProgress || null,
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initModerationQueueManager() {
  const roots = Array.from(
    document.querySelectorAll<ModerationQueueRoot>('[data-moderation-queue-manager]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.status) root.dataset.status = 'pending';
    void renderRoot(root);
  }
}
