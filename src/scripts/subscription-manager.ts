import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractSubscription,
  extractSubscriptionMessage,
  renderSubscriptionManager,
  type ActiveSubscription,
} from '../lib/subscription-manager';

type SubscriptionRoot = HTMLElement & { dataset: DOMStringMap };

function readSubscription(root: SubscriptionRoot): ActiveSubscription | null {
  const raw = root.dataset.subscriptionJson;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ActiveSubscription;
  } catch {
    return null;
  }
}

function writeSubscription(root: SubscriptionRoot, subscription: ActiveSubscription | null) {
  if (!subscription) {
    delete root.dataset.subscriptionJson;
    return;
  }

  root.dataset.subscriptionJson = JSON.stringify(subscription);
}

function setError(root: SubscriptionRoot, message: string | null) {
  if (message) {
    root.dataset.error = message;
  } else {
    delete root.dataset.error;
  }
}

function setNotice(
  root: SubscriptionRoot,
  message: string | null,
  tone: 'success' | 'error' | null,
) {
  if (message && tone) {
    root.dataset.notice = message;
    root.dataset.noticeTone = tone;
    return;
  }

  delete root.dataset.notice;
  delete root.dataset.noticeTone;
}

async function fetchSubscription(root: SubscriptionRoot) {
  const response = await fetch('/api/user/subscription');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractSubscriptionMessage(payload, 'Abonelik bilgisi alınamadı'));
  }

  const subscription = extractSubscription(payload);
  writeSubscription(root, subscription);
  setError(root, null);
}

async function cancelSubscription(root: SubscriptionRoot) {
  const confirmed = window.confirm('Aboneliğinizi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
  if (!confirmed) return;

  root.dataset.cancelling = 'true';
  await renderSubscriptionRoot(root);

  try {
    const response = await fetch('/api/subscriptions/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(extractSubscriptionMessage(payload, 'Abonelik iptal edilemedi'));
    }

    setNotice(
      root,
      extractSubscriptionMessage(payload, 'Aboneliğiniz başarıyla iptal edildi.'),
      'success',
    );
    await fetchSubscription(root);
  } catch (error) {
    setNotice(root, error instanceof Error ? error.message : 'İptal işlemi başarısız', 'error');
  } finally {
    delete root.dataset.cancelling;
    await renderSubscriptionRoot(root);
  }
}

function bindActions(root: SubscriptionRoot, content: HTMLElement) {
  const cancelButton = content.querySelector<HTMLElement>('[data-subscription-cancel]');
  if (!cancelButton) return;

  cancelButton.addEventListener('click', () => {
    if (root.dataset.cancelling === 'true') return;
    void cancelSubscription(root);
  });
}

async function renderSubscriptionRoot(root: SubscriptionRoot) {
  const loading = root.querySelector<HTMLElement>('[data-subscription-loading]');
  const content = root.querySelector<HTMLElement>('[data-subscription-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.subscriptionJson && !root.dataset.error) {
      await fetchSubscription(root);
    }

    setElementHtml(
      content,
      renderSubscriptionManager({
        subscription: readSubscription(root),
        error: root.dataset.error || null,
        cancelling: root.dataset.cancelling === 'true',
        notice: root.dataset.notice || null,
        noticeTone:
          root.dataset.noticeTone === 'success' || root.dataset.noticeTone === 'error'
            ? root.dataset.noticeTone
            : null,
      }),
    );
    bindActions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Abonelik bilgisi alınamadı');
    setElementHtml(
      content,
      renderSubscriptionManager({
        subscription: null,
        error: root.dataset.error || null,
        cancelling: false,
        notice: root.dataset.notice || null,
        noticeTone:
          root.dataset.noticeTone === 'success' || root.dataset.noticeTone === 'error'
            ? root.dataset.noticeTone
            : null,
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initSubscriptionManager() {
  const roots = Array.from(document.querySelectorAll<SubscriptionRoot>('[data-subscription-manager]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderSubscriptionRoot(root);
  }
}
