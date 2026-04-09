/**
 * Service Worker - PWA ve Push Notifications
 * Offline destek, cache, push notifications
 */

const CACHE_VERSION = '2026-04-10';
const CACHE_NAME = `sanliurfa-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Install event - static assets'i cache'e ekle
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cache oluşturuluyor');
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.warn("Service Worker: Bazi assets cache'e eklenemedi");
      });
    })
  );
  self.skipWaiting();
});

// Activate event - eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('sanliurfa-') && cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // API istekleri - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            return response;
          }
          return caches.match(request).catch(() => {
            return new Response(
              JSON.stringify({ error: 'Offline - veri yüklenemedi' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
        .catch(() => {
          return caches.match(request).catch(() => {
            return new Response(
              JSON.stringify({ error: 'Offline - veri yüklenemedi' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Statik dosyalar - cache first
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request).then((response) => {
        if (response.status === 404) {
          return caches.match('/offline.html');
        }
        // HTML sayfalarını cache'e ekle
        if (request.headers.get('accept')?.includes('text/html')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match('/offline.html');
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Service Worker: Push bildirimi verisi yok');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Yeni bildirim',
      icon: data.icon || '/icon-192.png',
      badge: '/badge-72.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [
        { action: 'open', title: 'Aç' },
        { action: 'close', title: 'Kapat' }
      ],
      data: {
        url: data.url || '/',
        ...data
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Şanlıurfa.com', options)
    );
  } catch (error) {
    console.error('Service Worker: Push notification hata:', error);
    event.waitUntil(
      self.registration.showNotification('Şanlıurfa.com Bildirimi', {
        body: event.data.text(),
        icon: '/icon-192.png'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Mevcut tab'ı kontrol et
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Yeni tab aç
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync - çevrimdışında yapılan işlemleri senkronize et
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  } else if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncComments() {
  try {
    const db = await openDatabase();
    const comments = await db.getAll('pending-comments');

    for (const comment of comments) {
      const response = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });

      if (response.ok) {
        await db.delete('pending-comments', comment.id);
      }
    }
  } catch (error) {
    console.error('Yorum senkronizasyonu başarısız:', error);
  }
}

async function syncFavorites() {
  try {
    const db = await openDatabase();
    const pending = await db.getAll('pending-favorites');

    for (const item of pending) {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (response.ok) {
        await db.delete('pending-favorites', item.id);
      }
    }
  } catch (error) {
    console.error('Favori senkronizasyonu başarısız:', error);
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sanliurfa-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      resolve({
        getAll: (store) => new Promise((r) => {
          const tx = db.transaction(store, 'readonly');
          const result = [];
          tx.objectStore(store).openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              result.push(cursor.value);
              cursor.continue();
            } else {
              r(result);
            }
          };
        }),
        delete: (store, key) => new Promise((r) => {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).delete(key);
          tx.oncomplete = () => r();
        })
      });
    };
  });
}
