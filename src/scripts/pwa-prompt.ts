import { setElementClassName } from '../lib/admin-dom';
import {
  buildPwaPromptClassName,
  extractVapidKey,
  shouldShowPwaPrompt,
} from '../lib/pwa-prompt';
import {
  isInstalledApp,
  requestNotificationPermission,
  setupInstallPrompt,
  subscribeToPush,
} from '../lib/pwa';

type PromptEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};

type PwaPromptRoot = HTMLElement & {
  dataset: DOMStringMap;
};

function updatePrompt(root: PwaPromptRoot, showPrompt: boolean, installed: boolean) {
  setElementClassName(root, buildPwaPromptClassName(shouldShowPwaPrompt(showPrompt, installed)));
}

async function subscribeAfterInstall() {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;

  try {
    const response = await fetch('/api/notifications/vapid-key');
    if (!response.ok) return;

    const payload = await response.json();
    const vapidKey = extractVapidKey(payload);
    if (vapidKey) {
      await subscribeToPush(vapidKey);
    }
  } catch (error) {
    console.warn('[PWA] Push subscription failed', error);
  }
}

export function initPwaPrompt() {
  const root = document.querySelector<PwaPromptRoot>('[data-pwa-prompt]');
  if (!root || root.dataset.initialized === 'true') {
    return;
  }

  root.dataset.initialized = 'true';

  let installed = isInstalledApp();
  let showPrompt = false;
  let deferredPrompt: PromptEvent | null = null;

  const installButton = root.querySelector<HTMLButtonElement>('[data-pwa-prompt-install]');
  const dismissButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-pwa-prompt-dismiss]'),
  );

  const render = () => updatePrompt(root, showPrompt, installed);

  setupInstallPrompt(
    (prompt) => {
      deferredPrompt = prompt as PromptEvent;
      showPrompt = true;
      render();
    },
    () => {
      deferredPrompt = null;
      showPrompt = false;
      installed = true;
      render();
    },
  );

  installButton?.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt?.();
    const { outcome } = (await deferredPrompt.userChoice) ?? { outcome: 'dismissed' };

    if (outcome === 'accepted') {
      deferredPrompt = null;
      showPrompt = false;
      render();
      window.setTimeout(() => {
        void subscribeAfterInstall();
      }, 1000);
    }
  });

  for (const button of dismissButtons) {
    button.addEventListener('click', () => {
      showPrompt = false;
      render();
    });
  }

  render();
}
