/**
 * PWA Utilities
 * - Service Worker registration
 * - Push notification subscription
 * - Install prompt handling
 */

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

type InstallPromptEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isBrowser()) {
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[PWA] Service Worker registered', registration);
    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  try {
    if (!isBrowser()) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Send subscription to backend
    const endpoint = subscription.endpoint;
    const p256dh = arrayBufferToBase64(
      subscription.getKey ? subscription.getKey('p256dh') : null
    );
    const auth = arrayBufferToBase64(
      subscription.getKey ? subscription.getKey('auth') : null
    );

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, p256dh, auth })
    });

    console.log('[PWA] Push subscription successful');
    return { endpoint, p256dh, auth };
  } catch (error) {
    console.error('[PWA] Push subscription failed', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!isBrowser()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) return true;

    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    await subscription.unsubscribe();
    console.log('[PWA] Push unsubscription successful');
    return true;
  } catch (error) {
    console.error('[PWA] Push unsubscription failed', error);
    return false;
  }
}

/**
 * Check if user is subscribed to push
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!isBrowser()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    return false;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowser()) {
    return 'denied';
  }

  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[PWA] Notification permission request failed', error);
    return 'denied';
  }
}

/**
 * Handle install prompt
 */
export function setupInstallPrompt(
  onPromptReady: (prompt: Event) => void,
  onInstallSuccess: () => void
): () => Promise<void> {
  let deferredPrompt: InstallPromptEvent | null = null;

  if (!isBrowser()) {
    return async () => {};
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    console.log('[PWA] Install prompt ready');
    onPromptReady(e);
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    onInstallSuccess();
  });

  // Return function to show prompt
  return async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt?.();
      const { outcome } = (await deferredPrompt.userChoice) ?? { outcome: 'dismissed' };
      console.log(`[PWA] Install prompt response: ${outcome}`);
      deferredPrompt = null;
    }
  };
}

/**
 * Detect if running as installed app
 */
export function isInstalledApp(): boolean {
  if (!isBrowser()) {
    return false;
  }

  // Check if running in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  return false;
}

// Helper: VAPID key conversion
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
