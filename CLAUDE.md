# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Belge Haritası — Önce Buradan Bak

| Konu | Dosya | İçerik |
|------|-------|--------|
| **Genel rehber + günlük komutlar** | `CLAUDE.md` (bu dosya) | Stack, commands, architecture, conventions, prohibitions |
| **Güvenlik kuralları** | [`docs/SECURITY.md`](docs/SECURITY.md) | 53 HARD RULE + 43 static lock test |
| **Astro detayları** | [`docs/ASTRO_DETAILED.md`](docs/ASTRO_DETAILED.md) | Framework patterns, directives, server islands, SEO |
| **Production / Deploy** | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | PM2, CWP, lifecycle, admin integrations |
| **Operations runbook** | `DEPLOY-OPS-RUNBOOK.md` | SSH/deploy/rollback/health komutları |
| **DB schema audit** | `DB-INDEX-AUDIT.md` | 18 missing index, Tier 1 öneriler |

> **Önemli**: Bir konuda derin bilgi gerekiyorsa `docs/` altındaki dosyaları aç. Bu dosyayı kısa tutmaya özen göster.

---

## Project Overview

**Şanlıurfa.com** — Astro 6.3 + React 19 + TypeScript şehir rehberi platformu. PostgreSQL (raw `pg`), Redis cache/session/rate-limit, bcrypt+JWT auth, SSE real-time, Stripe subscriptions, gamification. ~280 lib modules, ~180 components, ~70 pages.

## Commands

```bash
npm run dev              # Astro dev server (port from .env, default 4321)
npm run build            # Production build (~11s)
npm run preview          # Preview production build
npm run lint             # ESLint (src --ext .ts,.tsx,.astro)
npm run lint:fix         # ESLint auto-fix
npm run test:unit        # Vitest
npm run test:unit:watch  # Vitest watch mode
npm run test:e2e         # Playwright
npm run test             # Unit + E2E
npm run db:migrate       # Run pending migrations
npm run db:migrate:status # Show migration status
npm run db:seed          # Load SQL seed files
npm run type-check       # astro check
npm run lint:ci          # Full CI: astro check + lint + images + validation
```

Single test file: `npx vitest run src/lib/__tests__/specific.test.ts`

### TEST.md — Manuel Test Senaryoları
- **Her kod değişikliğinin SON adımı**: `TEST.md` dosyasını güncelle.
- Format: özellik başlıklarına göre gruplandırılmış madde madde manuel test senaryoları (golden path + edge case). Kümülatif.
- **Otomatik test yazma serbest**: Vitest unit/regression + security static lock testleri (`security-*.test.ts`).

### Test Helper Kullanımı
```typescript
import { createApiContext, parseJson } from '@/lib/__tests__/helpers';
const ctx = createApiContext({ method: 'POST', body: { name: 'test' }, locals: { user: testUtils.mockUser() } });
const resp = await POST(ctx);
const data = await parseJson(resp);

import { renderAstroComponent } from '@/lib/__tests__/helpers';
const html = await renderAstroComponent(MyPage, { request: new Request('http://localhost/test'), locals: { user: testUtils.mockUser() } });
```

---

## Architecture

### Stack
- **Framework**: Astro 6.3 SSR (`output: 'server'`) with file-based routing
- **UI**: React 19 (client:load/idle/visible — Islands architecture)
- **DB**: PostgreSQL via `pg` library (direct pool, NOT an ORM)
- **Cache/Sessions/Rate-limit**: Redis with `sanliurfa:` namespace prefix
- **Auth**: bcrypt (12 rounds) + JWT + Redis sessions (24h sliding window)
- **Real-time**: Server-Sent Events (SSE) via ReadableStream
- **Payments**: Stripe (checkout sessions, webhooks HMAC-SHA256)
- **File Storage**: Local disk only (`public/uploads/`) — NO cloud storage
- **Styling**: Tailwind CSS 4.3 + `@tailwindcss/vite` (CSS-first config, JS config silindi). Custom palette `urfa-{50-950}` (bakır/altın) + `isot-{50-950}` (kırmızı) + `sand-{50-300}`. Tema "Harran Scripts" — Cormorant Garamond + Jost; obsidiyen bg `#0D0A08`, bakır vurgu `#CE8E38`. CSS vars: `src/styles/global.css` `:root`/`.dark` bloğu.

### Key Directories
- `src/pages/` — File-based routing: `.astro` pages + `api/` REST endpoints
- `src/pages/api/` — All API endpoints return `{ success, data?, error? }` JSON
- `src/lib/` — Core utilities and business logic (~280 modules)
- `src/components/` — Astro (.astro) static, React (.tsx) interactive
- `src/middleware.ts` — Auth, CORS, rate limiting, security headers
- `src/migrations/` — Database migration files
- `src/lib/__tests__/` — Vitest test suites

### Path Alias
`@/*` maps to `src/*` (tsconfig.json)

---

## Astro Framework Patterns (özet — detay: [`docs/ASTRO_DETAILED.md`](docs/ASTRO_DETAILED.md))

### SSR Mode
`output: 'server'` — tüm sayfa runtime render. `getStaticPaths()` ignore edilir, `Astro.params` + DB query kullan. `Astro.locals` request-scoped, her request reset.

### API Routes
```typescript
export const GET: APIRoute = async ({ request, locals, params, cookies, url }) => { ... };
```
- `apiResponse()` / `apiError()` from `src/lib/api.ts` zorunlu — `X-Request-ID` + consistent shape.
- `locals.user` middleware'den gelir (auth-token cookie), client'a güvenme.

### React Islands
```astro
<Counter client:load />    <!-- Hemen hydrate -->
<Map client:idle />        <!-- Browser idle -->
<Gallery client:visible /> <!-- Viewport girişi -->
<Modal client:only="react" />
```
React props serializable olmalı — Date → ISO string.

### Server Islands (`server:defer`)
Yavaş DB sorgulu `.astro` componentleri için. Detay: `docs/ASTRO_DETAILED.md` "Server Islands" bölümü.

---

## Critical Conventions

### Database
- **Always parameterized**: `pool.query('SELECT * FROM places WHERE id = $1', [id])`
- **Table allowlist**: Yeni tablo → `ALLOWED_TABLES` in `src/lib/postgres.ts`
- **Migrations**: Timestamped `src/migrations/` + `npm run db:migrate`

### Redis Caching
- **Namespace zorunlu**: ALL keys `sanliurfa:` prefix (via `prefixKey()` in `src/lib/cache/cache.ts`)
- **Mutation = invalidate**: Her POST/PUT/DELETE ilgili cache'i `deleteCache()` / `deleteCachePattern()` ile siler
- Helper'lar: `getCache()`, `setCache(key, value, ttl)`, `deleteCache()`, `deleteCachePattern()`

### API Endpoints
- Response: `apiResponse(data, status, requestId)` + `apiError(code, message, status, details, requestId)`
- Her endpoint: `validateWithSchema()` + `recordRequest()` + `X-Request-ID`
- Admin endpoint: `locals.user.role !== 'admin'` veya `locals.isAdmin` → 403 (asla redirect)
- Auth: `locals.user` middleware'den

### File Uploads — LOCAL DISK ONLY
- **Use**: `saveFile(file, folder)` from `src/lib/file/file-storage.ts`
- Saves to `public/uploads/photos/<folder>/`
- **FORBIDDEN**: S3, GCS, Azure, Cloudinary
- Paths stored in `s3_files` table (legacy name)

### Admin Sayfaları — AdminLayout.astro Zorunlu
```astro
---
import AdminLayout from '@/layouts/AdminLayout.astro';
const user = Astro.locals.user;
if (!user || user.role !== 'admin') return Astro.redirect(`/giris?redirect=${Astro.url.pathname}`);
---
<AdminLayout title="...">
  <!-- içerik -->
</AdminLayout>
```
Auth-protected profil sayfaları `seo={{ noIndex: true }}` almalı.

### SSE (Real-time)
`ReadableStream` + `Cache-Control: no-cache` + `Connection: keep-alive`. Manager: `src/lib/realtime-sse.ts`.

### Gamification
- `checkCommonAchievements(userId)` from event hooks (`src/lib/gamification.ts`)
- `awardPoints(userId, amount, reason)` from `src/lib/loyalty-points.ts`
- `awardBadgeToUser(userId, badgeKey, reason)` from `src/lib/badges.ts`

### Validation
- `validateWithSchema(body, schema)` from `src/lib/validation.ts`
- Yeni schema → `commonSchemas` object
- User-facing text: `sanitize: true` (XSS)

### URL Helpers
- **Use `getPublicAppUrl()`** from `src/lib/public-app-url.ts` — `PUBLIC_APP_URL` → `SITE_URL` → `PUBLIC_SITE_URL` → fallback zinciri.

### Error Detail Sanitization
- **Use `safeErrorDetail(err, fallback)`** from `src/lib/api.ts` — production'da fallback, dev'de error.message.

### Internal API Token
- **Use `verifyInternalToken(request)`** from `src/lib/auth/internal-token.ts` — `/api/metrics`, `/api/emails/process`, `/api/webhooks/trigger`.
- `INTERNAL_API_TOKEN` env yoksa 401 (security-by-default).

### Vendor/Owner Yetki (3-yol switch zorunlu)
```ts
if (auth.user.role === 'admin') { /* tam erişim */ }
else if (auth.user.role === 'vendor') {
  const placeCheck = await query('SELECT id FROM places WHERE id = $1 AND owner_id = $2', [placeId, auth.user.id]);
  if (placeCheck.rows.length === 0) return 403;
} else { return 403; }
```
**ASLA** `if (role === 'vendor')` only check yazma — user/moderator'a açık bırakır (IDOR).

---

## SECURITY HARD RULES (özet)

**53 aktif kural** + **43 static lock test** — tam detay: [`docs/SECURITY.md`](docs/SECURITY.md).

### En sık ihlal edilen 10 kural (özet):

1. **#2 File Upload XSS** — `file.name.split('.').pop()` yasak, MIME→ext mapping zorunlu
2. **#9 Error Sanitization** — `safeErrorDetail()` kullan, raw `error.message` yasak
3. **#11 Vendor IDOR** — 3-yol switch (yukarıdaki pattern)
4. **#17 NaN Guard** — `parseInt(searchParams)` yasak, `safeIntParam()`/`safeFloatParam()`
5. **#18 Redis Namespace** — raw client yasak, `prefixKey()` zorunlu
6. **#23 Console Log** — `console.log/info/debug` yasak, `logger.*` kullan
7. **#26 Raw `<img>`** — `<Image>` from `@/components/Image.astro` zorunlu
8. **#33 SSRF** — `validateExternalUrl()` olmadan `fetch(db.url)` yasak
9. **#38 Math.random Security** — token/file/auth dosyalarında `crypto.randomBytes()` zorunlu
10. **#52 isAdmin Privilege** — `locals.isAdmin` = `admin || moderator` admin paneli erişimi içindir; yüksek-etki operasyonlarda `role !== 'admin'` explicit kontrol kullan

**Yeni HARD RULE eklerken**: numerik sıra koru, lock test yaz (`security-<antipattern>.test.ts`), `docs/SECURITY.md` "Static Regression Locks" listesi (#15) güncelle.

---

## SEO & Structured Data (özet)

- **`src/components/SEO.astro`** — title, OG, Twitter Card, robots
- **JSON-LD inline** — `<script type="application/ld+json" set:html={JSON.stringify({...})} is:inline />`
- **`src/components/Image.astro`** — Astro Picture wrapper (AVIF/WebP/lazy)
- **`public/llms.txt`** — AI crawler site haritası
- **`public/robots.txt`** — GPTBot, ClaudeBot, PerplexityBot, Google-Extended izinli

Sitemap: `src/pages/sitemap.xml.ts` (DB-populated SSR endpoint). `@astrojs/sitemap` paketi kaldırıldı.

Astro Actions form'lar: `src/actions/index.ts` — `login`, `register`, `submitContactRequest`, `submitPlaceReview`, vb.

Detay: [`docs/ASTRO_DETAILED.md`](docs/ASTRO_DETAILED.md) "SEO & Structured Data Architecture" bölümü.

---

## Image Pipeline (2026-05-13 olgunlaştı)

### Format Cascade (browser otomatik)
`/uploads/` paths için `src/components/Image.astro` runtime `<picture>` emit eder:
```html
<picture>
  <source srcset=".../foo.avif" type="image/avif">     <!-- ~50% smaller than JPG -->
  <source srcset=".../foo.webp" type="image/webp">     <!-- 95%+ browser support -->
  <img src=".../foo.webp">                              <!-- fallback + onerror /images/placeholder.jpg -->
</picture>
```

### File Generation Pipeline
- **JPG → WebP + AVIF**: `npm run images:webp:convert` (sharp, PROD=1 env)
- **WebP → AVIF**: `npm run images:avif:from-webp` (Pexels-backfilled için)
- **NULL refs cleanup**: `npm run images:cleanup:broken-refs` (filesystem check, NULL'a çevirir)
- **Pexels backfill**: `npm run images:backfill:pexels` (NULL → real image)

### Dizin Konvansiyonu
`/uploads/{type}/{slug}.{ext}` — `type` = places | historical | historical-sites | blog | blogs | events | recipes | avatars

### Sharp Settings (production)
- WebP: `quality: 82, effort: 5`
- AVIF: `quality: 60, effort: 4` (build time/quality balance)
- Resize: `1200x800 fit:cover` (backfill için)

---

## GSC API Auth (2026-05 SA Bug Workaround)

**Bağlam**: Google'ın confirmed bug'ı (Apr 23, 2026-) — yeni service account email'ler GSC'ye eklenince "email not found". Workaround: OAuth user flow.

### Auth Cascade (`scripts/lib/gsc-auth.mjs`)
1. `GSC_REFRESH_TOKEN` env (prod) — gcloud built-in OAuth client kullanır
2. Service Account (legacy, bug riski)
3. gcloud user (local dev)

### gcloud Built-in Client (public, SDK'da gömülü)
```
client_id: 764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com
client_secret: repo dışında tutulmalı; local `gcloud auth application-default login`
veya `GSC_REFRESH_TOKEN` env ile kullanılmalı
```

### Required for ADC user creds (zorunlu header)
Her GSC API çağrısında: `x-goog-user-project: sanliurfa-com-2026`

### Scripts
- `npm run gsc:sitemap:submit` / `:status`
- `npm run gsc:url:inspect`
- `npm run gsc:search:analytics`
- `npm run gsc:indexing:request` (general URL re-crawl)
- `npm run gsc:cron:daily` (cron'lu — sitemap + top queries + coverage)

---

## Silent-Fail Bug Pattern Uyarısı

`Promise.all([...queries])` içinde 1 query fail ederse TÜM array'ler boş fallback'e gider. Belirti: page render ediyor ama "0 sonuç", listing boş.

**Tespit:** PM2 logs'da `column "X" does not exist` / `relation "Y" does not exist` → page-level error
**Önleme:** Yeni query yazarken `\d table` (psql) ile actual schema doğrula
**2 örnek (2026-05-13 fix):**
- `mekanlar/index.astro`: `places.category_name` yok → JOIN categories
- `bugun-sanliurfada-ne-yapilir.astro`: `recipes.category` yok → field kaldır

---

## Strict Prohibitions

### Turkish Only — NO i18n
- Sadece Türkçe. Multi-language, hreflang, language selector, locale JSON dosyaları **YASAK**.
- HARD RULE #25: `astro:i18n` import + locale JSON + astro.config i18n block yasak.

### No Paid External Services
- **FORBIDDEN**: Cloudinary, Imgix, Shutterstock, Google Maps API, SendGrid, AWS SES, AWS S3, Mapbox
- **ALLOWED**: OpenStreetMap, nodemailer SMTP, local disk, sharp

### No Cloud File Storage
- **FORBIDDEN**: `aws-sdk`, `@google-cloud/storage`, `azure-storage`, `multer-s3`
- **REQUIRED**: Local disk via `src/lib/file/file-storage.ts`

---

## Production Lifecycle (özet — detay: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))

### Graceful Shutdown
- PM2 SIGTERM → DB pool + Redis client drain. Helper: `src/lib/lifecycle.ts`
- Yeni stateful resource: `registerShutdownHandler(async () => { ... })`
- `kill_timeout: 10000` zorunlu (graceful 8s + buffer)

### Web Vitals
- `web-vitals` library + `navigator.sendBeacon` → `/api/analytics/performance` → `client_performance_metrics` tablosu
- `PerformanceMonitor.tsx` Layout'ta

### PWA
- `public/sw.js`, `public/manifest.json`, `src/components/PWARegister.astro`
- VAPID push: `VAPID_PUBLIC_KEY` + `PUBLIC_VAPID_PUBLIC_KEY`

### Build & Deploy
- `npm run build` (~11s) → `dist/`
- PM2: `pm2 start ecosystem.config.cjs`
- Required env: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `INTERNAL_API_TOKEN`

### Admin-Yönetilen Entegrasyonlar
`/admin/integrations` — Resend, SMTP, GA, Stripe, Unsplash, Pexels, OAuth. DB'den okunur, env fallback. Detay: `docs/DEPLOYMENT.md` "Admin-Yönetilen Entegrasyonlar".

### Browser-side env
- React/client kod: `import.meta.env.PUBLIC_*` (asla `process.env` — HARD RULE #19)
- `PUBLIC_` prefix olmayan env sadece server-side görünür

### Commit Convention
Conventional Commits: `feat(scope):`, `fix(scope):`, `refactor(scope):` vb.

---

## TypeScript

- `tsconfig.json` extends `astro/tsconfigs/strict` + `strict: true` (noImplicitAny, strictNullChecks, vb. tümü aktif)
- JSX: `react-jsx`
- DB: raw `pg` pool in `src/lib/postgres.ts` (ORM yok, `drizzle-orm` 2026-04-25 cleanup'ta kaldırıldı)
- `astro check`: 0 errors / 0 warnings / ~14 hints

### Read Replica
`postgres.ts` exports `pool` (write) + `readReplicaPool` (read). Şu an aynı DB'ye gidiyor. Read-heavy endpoint'lerde `readReplicaPool` kullan (forward-compatible).
