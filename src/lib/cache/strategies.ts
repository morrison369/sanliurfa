/**
 * Advanced Caching Strategies
 * Service Worker caching patterns and helpers
 */

// Cache names with versioning
const CACHE_VERSION = 'v1';
export const CACHE_NAMES = {
  STATIC: `static-${CACHE_VERSION}`,
  DYNAMIC: `dynamic-${CACHE_VERSION}`,
  IMAGES: `images-${CACHE_VERSION}`,
  API: `api-${CACHE_VERSION}`,
  PAGES: `pages-${CACHE_VERSION}`,
  FONT: `font-${CACHE_VERSION}`,
};

// Cache strategies
export type CacheStrategy = 
  | 'cache-first' 
  | 'network-first' 
  | 'stale-while-revalidate' 
  | 'network-only' 
  | 'cache-only';

interface CacheConfig {
  strategy: CacheStrategy;
  maxAge?: number;           // Max age in ms
  maxEntries?: number;       // Max number of entries
  cacheName?: string;        // Custom cache name
}

// Route patterns and their strategies
const routeStrategies: Array<{
  pattern: RegExp;
  config: CacheConfig;
}> = [
  // Static assets - Cache First
  {
    pattern: /\.(js|css|json)(\?|$)/,
    config: { 
      strategy: 'cache-first',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      cacheName: CACHE_NAMES.STATIC,
    },
  },
  // Images - Cache First with fallback
  {
    pattern: /\.(png|jpg|jpeg|gif|webp|svg|avif)(\?|$)/,
    config: { 
      strategy: 'cache-first',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxEntries: 100,
      cacheName: CACHE_NAMES.IMAGES,
    },
  },
  // Fonts - Cache First (long term)
  {
    pattern: /\.(woff2?|ttf|otf|eot)(\?|$)/,
    config: { 
      strategy: 'cache-first',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      cacheName: CACHE_NAMES.FONT,
    },
  },
  // API calls - Network First with cache fallback
  {
    pattern: /\/api\//,
    config: { 
      strategy: 'network-first',
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxEntries: 50,
      cacheName: CACHE_NAMES.API,
    },
  },
  // HTML pages - Stale While Revalidate
  {
    pattern: /\/$|\.html$/,
    config: { 
      strategy: 'stale-while-revalidate',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      maxEntries: 20,
      cacheName: CACHE_NAMES.PAGES,
    },
  },
];

/**
 * Get cache strategy for a URL
 */
export function getCacheStrategy(url: string): CacheConfig {
  for (const route of routeStrategies) {
    if (route.pattern.test(url)) {
      return route.config;
    }
  }
  // Default: Network First
  return { strategy: 'network-first', cacheName: CACHE_NAMES.DYNAMIC };
}

/**
 * Cache First strategy
 */
export async function cacheFirst(
  request: Request,
  cacheName: string,
  maxAge?: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Check max age
    if (maxAge) {
      const dateHeader = cached.headers.get('date');
      if (dateHeader) {
        const age = Date.now() - new Date(dateHeader).getTime();
        if (age < maxAge) {
          return cached;
        }
      } else {
        return cached;
      }
    } else {
      return cached;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Network First strategy
 */
export async function networkFirst(
  request: Request,
  cacheName: string,
  _maxAge?: number
): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate strategy
 */
export async function staleWhileRevalidate(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Return cached immediately if available
  const fetchPromise: Promise<Response> = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => new Response(null, { status: 503 }));

  if (cached) {
    fetchPromise.catch(() => {});
    return cached;
  }

  return fetchPromise;
}

/**
 * Network Only strategy
 */
export async function networkOnly(request: Request): Promise<Response> {
  return fetch(request);
}

/**
 * Cache Only strategy
 */
export async function cacheOnly(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  throw new Error('Resource not in cache');
}

/**
 * Apply cache strategy
 */
export async function applyCacheStrategy(
  request: Request,
  config: CacheConfig
): Promise<Response> {
  const { strategy, cacheName = CACHE_NAMES.DYNAMIC, maxAge } = config;

  switch (strategy) {
    case 'cache-first':
      return cacheFirst(request, cacheName, maxAge);
    case 'network-first':
      return networkFirst(request, cacheName, maxAge);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, cacheName);
    case 'network-only':
      return networkOnly(request);
    case 'cache-only':
      return cacheOnly(request, cacheName);
    default:
      return fetch(request);
  }
}

/**
 * Clean up old caches
 */
export async function cleanupCaches(currentVersion: string = CACHE_VERSION): Promise<void> {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.includes('sanliurfa') && !name.includes(currentVersion)
  );
  
  await Promise.all(oldCaches.map(name => caches.delete(name)));
}

/**
 * Limit cache entries
 */
export async function limitCacheEntries(
  cacheName: string,
  maxEntries: number
): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

/**
 * Precache resources
 */
export async function precache(
  urls: string[],
  cacheName: string = CACHE_NAMES.STATIC
): Promise<{ success: string[]; failed: string[] }> {
  const cache = await caches.open(cacheName);
  const success: string[] = [];
  const failed: string[] = [];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          success.push(url);
        } else {
          failed.push(url);
        }
      } catch (error) {
        failed.push(url);
      }
    })
  );

  return { success, failed };
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<
  Array<{ name: string; entries: number; size: number }>
> {
  const cacheNames = await caches.keys();
  const stats = await Promise.all(
    cacheNames.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      
      let size = 0;
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          size += blob.size;
        }
      }

      return {
        name,
        entries: keys.length,
        size: Math.round(size / 1024), // KB
      };
    })
  );

  return stats;
}

/**
 * Cache warming - preload important resources
 */
export async function warmCache(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.DYNAMIC);
  let loaded = 0;

  await Promise.all(
    urls.map(async (url) => {
      try {
        const cached = await cache.match(url);
        if (!cached) {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        }
      } catch (error) {
        // Ignore errors
      } finally {
        loaded++;
        onProgress?.(loaded, urls.length);
      }
    })
  );
}

/**
 * Smart image loading with cache
 */
export async function loadImageWithCache(
  src: string,
  options?: { width?: number; quality?: number }
): Promise<Blob> {
  const cacheKey = `${src}${options?.width ? `?w=${options.width}` : ''}`;
  const cache = await caches.open(CACHE_NAMES.IMAGES);
  
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached.blob();
  }

  // Add image optimization params
  const url = new URL(src, window.location.origin);
  if (options?.width) {
    url.searchParams.set('w', String(options.width));
  }
  if (options?.quality) {
    url.searchParams.set('q', String(options.quality));
  }

  const response = await fetch(url.toString());
  if (response.ok) {
    await cache.put(cacheKey, response.clone());
  }
  
  return response.blob();
}

/**
 * Service Worker message helpers
 */
export const SW_MESSAGES = {
  SKIP_WAITING: 'SKIP_WAITING',
  CACHE_URLS: 'CACHE_URLS',
  CLEAR_CACHE: 'CLEAR_CACHE',
  GET_STATS: 'GET_STATS',
};

/**
 * Send message to Service Worker
 */
export async function sendToSW<T = any>(message: any): Promise<T | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) {
    return null;
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    registration.active!.postMessage(message, [channel.port2]);
  });
}

/**
 * Request background cache
 */
export async function requestCache(urls: string[]): Promise<{ cached: string[] }> {
  return (await sendToSW({ type: SW_MESSAGES.CACHE_URLS, urls })) || { cached: [] };
}

/**
 * Clear specific cache
 */
export async function clearCache(cacheName?: string): Promise<boolean> {
  const result = await sendToSW({ type: SW_MESSAGES.CLEAR_CACHE, cacheName });
  return result?.success || false;
}

/**
 * Get Service Worker status
 */
export async function getSWStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  state?: string;
}> {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, registered: false };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  
  return {
    supported: true,
    registered: !!registration,
    ...(registration?.active?.state ? { state: registration.active.state } : {}),
  };
}

// Export for use in Service Worker
export const CACHE_STRATEGIES = {
  cacheFirst,
  networkFirst,
  staleWhileRevalidate,
  networkOnly,
  cacheOnly,
};

