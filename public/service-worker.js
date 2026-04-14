// Service Worker for caching and offline support
const CACHE_NAME = 'sanliurfa-v1';
const STATIC_ASSETS = [
  '/',
  '/mekanlar',
  '/etkinlikler',
  '/blog',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests
  if (url.pathname.startsWith('/api/')) return;

  // Skip admin routes
  if (url.pathname.startsWith('/admin/')) return;

  // Cache strategies
  // 1. Cache First for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 2. Network First for HTML pages
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 3. Stale While Revalidate for other assets
  event.respondWith(staleWhileRevalidate(request));
});

// Helper functions
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    cache.put(request, networkResponse.clone());
    return networkResponse;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncFormSubmissions());
  }
});

async function syncFormSubmissions() {
  // Implement form sync logic here
  console.log('[SW] Syncing form submissions...');
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'Yeni bir bildiriminiz var!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Şanlıurfa.com', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
