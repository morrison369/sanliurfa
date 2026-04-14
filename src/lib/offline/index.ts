/**
 * Offline Support Module
 * Service Worker helpers, background sync, and cache management
 */

// Cache names
export const CACHE_NAMES = {
  STATIC: 'sanliurfa-static-v1',
  DYNAMIC: 'sanliurfa-dynamic-v1',
  IMAGES: 'sanliurfa-images-v1',
  API: 'sanliurfa-api-v1',
};

// Memory fallback when IndexedDB is not available
const memoryStore: Map<string, any> = new Map();

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
}

/**
 * Check if app is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Register offline/online event listeners
 */
export function registerConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Queue action for background sync
 */
export async function queueForSync(
  item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>
): Promise<void> {
  const queueItem: SyncQueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0,
  };

  const queue = JSON.parse(localStorage.getItem('sync-queue') || '[]');
  queue.push(queueItem);
  localStorage.setItem('sync-queue', JSON.stringify(queue));

  // Register for background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await (registration as any).sync.register('sync-data');
    } catch (e) {
      console.log('Background sync registration failed');
    }
  }
}

/**
 * Get pending sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return JSON.parse(localStorage.getItem('sync-queue') || '[]');
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  const queue = JSON.parse(localStorage.getItem('sync-queue') || '[]');
  const filtered = queue.filter((item: SyncQueueItem) => item.id !== id);
  localStorage.setItem('sync-queue', JSON.stringify(filtered));
}

/**
 * Process sync queue
 */
export async function processSyncQueue(
  onSuccess?: (item: SyncQueueItem) => void,
  onError?: (item: SyncQueueItem, error: any) => void
): Promise<{ processed: number; failed: number }> {
  const queue = await getSyncQueue();
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.retries >= 3) {
      failed++;
      onError?.(item, new Error('Max retries exceeded'));
      continue;
    }

    try {
      const response = await fetch(item.endpoint, {
        method: item.type === 'create' ? 'POST' : item.type === 'update' ? 'PUT' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: item.data ? JSON.stringify(item.data) : undefined,
      });

      if (response.ok) {
        await removeFromSyncQueue(item.id);
        processed++;
        onSuccess?.(item);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // Update retry count
      const current = JSON.parse(localStorage.getItem('sync-queue') || '[]');
      const updated = current.map((i: SyncQueueItem) =>
        i.id === item.id ? { ...i, retries: i.retries + 1 } : i
      );
      localStorage.setItem('sync-queue', JSON.stringify(updated));
      failed++;
      onError?.(item, error);
    }
  }

  return { processed, failed };
}

/**
 * Cache data for offline use
 */
export async function cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
  const item = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  localStorage.setItem(`cache-${key}`, JSON.stringify(item));
}

/**
 * Get cached data
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const item = localStorage.getItem(`cache-${key}`);
  if (!item) return null;

  const parsed = JSON.parse(item);
  if (Date.now() - parsed.timestamp > parsed.ttl) {
    localStorage.removeItem(`cache-${key}`);
    return null;
  }

  return parsed.data as T;
}

/**
 * Cache page for offline viewing
 */
export async function cachePageForOffline(url: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch(url);
    const html = await response.text();
    localStorage.setItem(`page-${url}`, html);
  } catch (error) {
    console.error('Failed to cache page:', error);
  }
}

/**
 * Get offline page
 */
export async function getOfflinePage(url: string): Promise<string | null> {
  return localStorage.getItem(`page-${url}`);
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  // Clear localStorage items
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('cache-') || key.startsWith('page-') || key === 'sync-queue') {
      localStorage.removeItem(key);
    }
  });

  // Clear caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

/**
 * Get offline storage stats
 */
export async function getOfflineStats(): Promise<{
  queueSize: number;
  cachedItems: number;
  offlinePages: number;
}> {
  const queue = JSON.parse(localStorage.getItem('sync-queue') || '[]');

  let cachedItems = 0;
  let offlinePages = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('cache-')) cachedItems++;
    if (key?.startsWith('page-')) offlinePages++;
  }

  return { queueSize: queue.length, cachedItems, offlinePages };
}

/**
 * Service Worker registration helper
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('Uygulamanın yeni bir versiyonu mevcut. Şimdi güncellemek ister misiniz?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('SW registration failed:', error);
    return null;
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  const isPersisted = await navigator.storage.persisted();
  if (isPersisted) {
    return true;
  }

  return await navigator.storage.persist();
}

/**
 * Get storage usage
 */
export async function getStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 1;

  return {
    usage,
    quota,
    percentUsed: Math.round((usage / quota) * 100),
  };
}

/**
 * Offline-aware fetch wrapper
 */
export async function offlineFetch<T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string
): Promise<T> {
  // Try network first
  if (isOnline()) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();

      // Cache successful response
      if (cacheKey) {
        await cacheData(cacheKey, data);
      }

      return data;
    } catch (error) {
      // Fall through to cache
    }
  }

  // Try cache
  if (cacheKey) {
    const cached = await getCachedData<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  throw new Error('Offline and no cached data available');
}

/**
 * Network status hook helper
 */
export function createNetworkStatus() {
  let status = {
    online: isOnline(),
    type: 'unknown' as ConnectionType,
    effectiveType: '4g' as EffectiveConnectionType,
  };

  const listeners = new Set<(status: typeof status) => void>();

  const update = () => {
    const connection = (navigator as any).connection;
    status = {
      online: isOnline(),
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || '4g',
    };
    listeners.forEach(fn => fn(status));
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', update);
    }
  }

  return {
    get status() { return status; },
    subscribe(fn: (status: typeof status) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// Types for connection API
type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'mixed' | 'none' | 'other' | 'unknown' | 'wifi' | 'wimax';
type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g';
