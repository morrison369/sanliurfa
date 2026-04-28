# Content Delivery Optimization Guide

## Image Delivery Optimization

### Adaptive Image Formats

```astro
---
// src/components/AdaptiveImage.astro
interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
}

const { src, alt, width = 800, height, quality = 85, priority = false } = Astro.props;

// Detect browser support server-side
const acceptHeader = Astro.request.headers.get('accept') || '';
const supportsAvif = acceptHeader.includes('image/avif');
const supportsWebp = acceptHeader.includes('image/webp');

// Choose best format
const format = supportsAvif ? 'avif' : supportsWebp ? 'webp' : 'jpg';

// Generate srcset
const widths = [320, 640, 960, 1280, 1920];
const srcset = widths
  .map(w => `/${src}-${w}.${format} ${w}w`)
  .join(', ');
---

<picture>
  {supportsAvif && (
    <source 
      type="image/avif" 
      srcset={widths.map(w => `/${src}-${w}.avif ${w}w`).join(', ')}
      sizes="(max-width: 640px) 100vw, 800px"
    />
  )}
  <source 
    type="image/webp" 
    srcset={widths.map(w => `/${src}-${w}.webp ${w}w`).join(', ')}
    sizes="(max-width: 640px) 100vw, 800px"
  />
  <img 
    src={`/${src}-800.jpg`}
    srcset={srcset}
    sizes="(max-width: 640px) 100vw, 800px"
    alt={alt}
    width={width}
    height={height}
    loading={priority ? 'eager' : 'lazy'}
    decoding={priority ? 'sync' : 'async'}
    class="w-full h-auto"
  />
</picture>
```

### Blur Placeholder

```astro
---
// src/components/BlurImage.astro
interface Props {
  src: string;
  alt: string;
  placeholder: string; // Base64 encoded tiny image
}

const { src, alt, placeholder } = Astro.props;
---

<div class="relative overflow-hidden">
  <img 
    src={placeholder}
    alt=""
    class="absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-opacity duration-500"
    aria-hidden="true"
  />
  <img 
    src={src}
    alt={alt}
    class="relative w-full h-auto opacity-0 transition-opacity duration-500"
    onload="this.classList.remove('opacity-0'); this.previousElementSibling.classList.add('opacity-0')"
  />
</div>
```

---

## Font Optimization

### Font Subsetting

```css
/* Only load used characters */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

### Font Preloading Strategy

```astro
<!-- Critical fonts preload -->
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin />

<!-- Async font loading for non-critical -->
<link rel="preload" href="/fonts/inter-bold.woff2" as="font" type="font/woff2" crossorigin fetchpriority="low" />

<style is:inline>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-regular.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
  }
  
  /* System font fallback */
  :root {
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>
```

---

## Edge Caching Strategy

### Cloudflare Workers for Edge Rendering

```typescript
// workers/edge-render.ts
export interface Env {
  CACHE: Cache;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    
    // Check cache first
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }
    
    // Fetch from origin
    response = await fetch(request);
    
    // Clone for cache
    const responseToCache = response.clone();
    
    // Cache based on content type
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      // Cache HTML for 1 minute (stale-while-revalidate)
      responseToCache.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    } else if (contentType.includes('image/')) {
      // Cache images for 1 year
      responseToCache.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    ctx.waitUntil(cache.put(cacheKey, responseToCache));
    
    return response;
  },
};
```

### Smart Cache Purging

```typescript
// src/lib/cache-purge.ts
export async function purgeCache(pattern: string): Promise<void> {
  // Purge Cloudflare cache
  await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [pattern],
    }),
  });
  
  // Purge Redis cache
  const redis = await getRedisClient();
  const keys = await redis.keys(`*${pattern}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## Static Asset Optimization

### Brotli & Gzip Precompression

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import compress from 'astro-compress';

export default defineConfig({
  integrations: [
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: true,
      Logger: 1,
    }),
  ],
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Manual chunking
          manualChunks: {
            'vendor': ['react', 'react-dom'],
            'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          },
        },
      },
    },
  },
});
```

### Resource Hinting

```astro
<!-- Preload critical resources -->
<link rel="preload" href="/css/critical.css" as="style" />
<link rel="preload" href="/js/app.js" as="script" />

<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/places" />
<link rel="prefetch" href="/blog" />

<!-- Preconnect to third-party domains -->
<link rel="preconnect" href="https://cdn.sanity.io" />
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
```

---

## Streaming & Progressive Enhancement

### Progressive HTML Streaming

```astro
---
// src/pages/streaming.astro
import { Suspense } from 'react';
import { Placeholder } from '../components/Placeholder';
import { HeavyComponent } from '../components/HeavyComponent';
---

<html>
  <head><title>Streaming Example</title></head>
  <body>
    <!-- Critical content renders immediately -->
    <header>...</header>
    
    <!-- Deferred content streams in -->
    <Suspense fallback={<Placeholder />}>
      <HeavyComponent server:defer />
    </Suspense>
  </body>
</html>
```

### Intersection Observer for Lazy Loading

```typescript
// src/lib/lazy-load.ts
export function setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01,
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}
```

---

## Service Worker for Offline

```typescript
// public/sw.js
const CACHE_NAME = 'sanliurfa-v1';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
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

// Fetch - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // API calls - network only with timeout
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }
  
  // Static assets - cache first
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        // Update cache in background
        fetch(request).then((newResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, newResponse);
          });
        });
        return response;
      }
      
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline');
      }
    })
  );
});
```

---

## Performance Budgets

### Build-time Enforcement

```javascript
// scripts/check-performance-budget.js
import fs from 'fs';
import path from 'path';
import gzipSize from 'gzip-size';

const BUDGETS = {
  'js': { max: 300 * 1024, gzip: 100 * 1024 },
  'css': { max: 50 * 1024, gzip: 15 * 1024 },
  'img': { max: 500 * 1024 },
  'total': { max: 2 * 1024 * 1024, gzip: 500 * 1024 },
};

async function checkBudgets() {
  const distDir = './dist/client';
  const files = await fs.promises.readdir(distDir, { recursive: true });
  
  let totalSize = 0;
  let totalGzip = 0;
  let failed = false;
  
  for (const file of files) {
    const ext = path.extname(file).slice(1);
    if (!BUDGETS[ext]) continue;
    
    const content = await fs.promises.readFile(path.join(distDir, file));
    const size = content.length;
    const gzipped = await gzipSize(content);
    
    totalSize += size;
    totalGzip += gzipped;
    
    const budget = BUDGETS[ext];
    if (size > budget.max) {
      console.error(`❌ ${file}: ${(size/1024).toFixed(1)}KB exceeds limit of ${(budget.max/1024).toFixed(1)}KB`);
      failed = true;
    }
  }
  
  // Check total budget
  if (totalSize > BUDGETS.total.max) {
    console.error(`❌ Total size: ${(totalSize/1024/1024).toFixed(2)}MB exceeds limit of ${(BUDGETS.total.max/1024/1024).toFixed(2)}MB`);
    failed = true;
  }
  
  if (failed) {
    process.exit(1);
  }
  
  console.log(`✅ All budgets passed. Total: ${(totalGzip/1024).toFixed(1)}KB (gzipped)`);
}

checkBudgets();
```

---

## Monitoring Web Vitals

```typescript
// src/lib/vitals.ts
import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body);
  } else {
    fetch('/api/vitals', {
      method: 'POST',
      body,
      keepalive: true,
    });
  }
}

export function initVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}
```
