# 🎯 Profesyonel Öneriler

Bu doküman, Şanlıurfa.com projesi için uzman önerileri ve gelecek geliştirmeleri içerir.

---

## 🚀 Hemen Yapılması Önerilenler

### 1. **Core Web Vitals Optimizasyonu** ⚡
```typescript
// src/components/PerformanceOptimizer.astro
// Lazy loading için loading="lazy" ekle
<img src={src} alt={alt} loading="lazy" decoding="async" />

// Font optimizasyonu
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />

// Critical CSS inline
<style>{`/* critical css */`}</style>
```

**Hedefler:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### 2. **Helmet Security Headers** 🛡️
```typescript
// middleware.ts veya astro.config.mjs
defineConfig({
  vite: {
    plugins: [{
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
          res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
          next();
        });
      }
    }]
  }
});
```

### 3. **Image Optimization** 🖼️
```typescript
// Sharp entegrasyonunu aktif kullan
import { Image } from 'astro:assets';

<Image 
  src={image} 
  alt="Açıklama"
  widths={[200, 400, 800]}
  sizes="(max-width: 800px) 100vw, 800px"
  format="webp"
  quality={80}
/>
```

---

## 📊 Monitoring & Observability

### 4. **Sentry Integration** 🔍
```bash
npm install @sentry/node @sentry/astro
```

```typescript
// sentry.config.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

### 5. **Prometheus Metrics** 📈
```typescript
// src/lib/metrics.ts
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
```

### 6. **Health Check Dashboard** 💚
```typescript
// src/pages/api/health/detailed.ts
// Ekstra kontroller ekle
const checks = {
  database: await checkDatabase(),
  redis: await checkRedis(),
  externalAPIs: await checkExternalAPIs(),
  diskSpace: await checkDiskSpace(),
  memory: await checkMemory()
};
```

---

## 🔍 SEO & Analytics

### 7. **Structured Data Zenginleştirme** 🔎
```typescript
// src/components/SEO.astro (ekleme)
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((crumb, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": crumb.name,
    "item": crumb.url
  }))
};
```

### 8. **Google Analytics 4 + GTM** 📊
```typescript
// src/components/GoogleAnalytics.astro
<script type="text/partytown">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', {
    'send_page_view': true,
    'anonymize_ip': true
  });
</script>
```

### 9. **Internal Linking Automation** 🔗
```typescript
// src/lib/auto-linker.ts
// İçerikte geçen yer isimlerini otomatik linkle
export function autoLinkContent(content: string): string {
  const places = await getAllPlaces();
  places.forEach(place => {
    content = content.replace(
      new RegExp(`\\b${place.name}\\b`, 'g'),
      `<a href="/yerler/${place.slug}">${place.name}</a>`
    );
  });
  return content;
}
```

---

## 🛠️ Developer Experience (DX)

### 10. **Husky + lint-staged** 📝
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.astro": ["astro check"]
  }
}
```

### 11. **GitHub Actions Optimizasyonu** ⚙️
```yaml
# .github/workflows/ci-optimized.yml
name: Optimized CI

on:
  push:
    paths-ignore:
      - '**.md'
      - 'docs/**'
  
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      
      - name: Parallel tests
        run: |
          npm ci &
          npm run lint &
          wait
```

### 12. **Storybook Entegrasyonu** 📚
```bash
npx storybook@latest init
```

```typescript
// src/components/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/astro';
import Button from './Button.astro';

const meta: Meta<typeof Button> = {
  component: Button,
};
export default meta;

type Story = StoryObj<typeof Button>;
export const Primary: Story = {
  args: { variant: 'primary', label: 'Tıkla' }
};
```

---

## 🔐 Güvenlik İyileştirmeleri

### 13. **Rate Limiting Detaylandırma** ⏱️
```typescript
// src/lib/rate-limit.ts
const rateLimits = {
  public: { points: 100, duration: 60 },    // 100 req/min
  authenticated: { points: 300, duration: 60 }, // 300 req/min
  admin: { points: 1000, duration: 60 },    // 1000 req/min
  upload: { points: 10, duration: 60 },     // 10 upload/min
  search: { points: 60, duration: 60 }      // 60 search/min
};
```

### 14. **Input Validation Katmanı** ✅
```typescript
// src/lib/validation-schema.ts
import { z } from 'zod';

const placeSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  latitude: z.number().min(37).max(38),
  longitude: z.number().min(38).max(40),
  category: z.enum(['restaurant', 'cafe', 'museum', 'park'])
});
```

### 15. **Secrets Scanning** 🔍
```yaml
# .github/workflows/security.yml
- name: Secret Detection
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
```

---

## 📱 Mobil & PWA

### 16. **Advanced PWA Features** 📲
```typescript
// public/sw.ts
// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncReviews());
  }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});
```

### 17. **App Shell Architecture** 🏗️
```astro
<!-- src/layouts/AppShell.astro -->
<html>
  <head>
    <!-- Preload shell CSS -->
    <link rel="stylesheet" href="/shell.css">
  </head>
  <body>
    <!-- Skeleton loader -->
    <div id="shell">
      <header class="skeleton-header"></header>
      <main class="skeleton-content"></main>
    </div>
  </body>
</html>
```

---

## 🎨 UI/UX İyileştirmeleri

### 18. **View Transitions API** ✨
```astro
---
// src/layouts/Layout.astro
import { ViewTransitions } from 'astro:transitions';
---
<head>
  <ViewTransitions />
</head>
```

### 19. **Skeleton Loaders** 💀
```astro
<!-- src/components/SkeletonCard.astro -->
<div class="animate-pulse">
  <div class="h-48 bg-gray-200 rounded-lg mb-4"></div>
  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### 20. **Micro-interactions** 🎯
```css
/* src/styles/animations.css */
.btn-hover {
  @apply transition-all duration-200 ease-out;
}

.btn-hover:hover {
  @apply transform -translate-y-0.5 shadow-lg;
}

.btn-hover:active {
  @apply transform translate-y-0 scale-95;
}
```

---

## 🔧 Altyapı

### 21. **Redis Cache Stratejisi** 💾
```typescript
// Cache stratejileri
const cacheStrategies = {
  places: { ttl: 3600, tags: ['places'] },      // 1 saat
  userProfile: { ttl: 300, tags: ['user'] },    // 5 dakika
  searchResults: { ttl: 600, tags: ['search'] }, // 10 dakika
  analytics: { ttl: 86400, tags: ['analytics'] } // 24 saat
};
```

### 22. **Database Connection Pool Tuning** 🔧
```typescript
// PostgreSQL optimizasyon
const poolConfig = {
  max: process.env.NODE_ENV === 'production' ? 50 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Add these for better performance
  statement_timeout: 30000,
  query_timeout: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};
```

### 23. **Edge Functions (Vercel/Netlify)** 🌐
```typescript
// api/edge/search.ts
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Edge'de çalışan hızlı arama
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  return fetch(`https://api.sanliurfa.com/search?q=${query}`, {
    cf: { cacheTtl: 60, cacheEverything: true }
  });
}
```

---

## 📈 Growth & Marketing

### 24. **A/B Testing Framework** 🧪
```typescript
// src/lib/experiment.ts
export function getExperimentVariant(experimentId: string): string {
  const variants = ['control', 'variant-a', 'variant-b'];
  const userBucket = getUserBucket();
  return variants[userBucket % variants.length];
}

// Kullanım
const heroVariant = getExperimentVariant('hero-section');
{heroVariant === 'variant-a' ? <HeroA /> : <HeroB />}
```

### 25. **Referral System** 🎁
```typescript
// src/lib/referral.ts
export async function createReferralCode(userId: string) {
  const code = generateCode(8);
  await db.insert('referrals', {
    user_id: userId,
    code,
    created_at: new Date()
  });
  return code;
}

// Referral tracking
export async function trackReferral(code: string, newUserId: string) {
  const referrer = await db.find('referrals', { code });
  if (referrer) {
    await awardPoints(referrer.user_id, 100);
    await createNotification(referrer.user_id, 'Yeni referral!');
  }
}
```

---

## 🎯 Önceliklendirme

### 🔥 Kritik (Hemen Yapılmalı)
1. Core Web Vitals optimizasyonu
2. Helmet security headers
3. Sentry error tracking
4. Image optimization

### ⚡ Yüksek (1-2 Hafta)
5. Prometheus monitoring
6. Input validation katmanı
7. GitHub Actions optimizasyonu
8. Redis cache stratejisi

### 📊 Orta (1 Ay)
9. Storybook entegrasyonu
10. Advanced PWA features
11. A/B testing framework
12. Micro-interactions

### 🎨 Düşük (2-3 Ay)
13. Edge functions
14. Referral system
15. Internal linking automation
16. Analytics enrichment

---

## 💡 Genel Tavsiyeler

### Performans
- Lighthouse skorunu sürekli izle (hedef: 90+)
- Bundle analyzer kullan (`npm run analyze`)
- Critical CSS inline yap
- Font-display: swap kullan

### Güvenlik
- Düzenli güvenlik taraması yap (Snyk, Dependabot)
- Secrets rotation politikası oluştur
- WAF (Web Application Firewall) düşün

### SEO
- Core Web Vitals sürekli monitor et
- Structured data testlerini otomatikleştir
- Internal link yapısını güçlendir

### DX
- Pre-commit hooks zorunlu tut
- TypeScript strict mode açık tut
- Documentation-first yaklaşım benimse

---

*Son güncelleme: 11 Nisan 2026*
