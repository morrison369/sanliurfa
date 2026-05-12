# Deployment & Production Lifecycle

Bu dosya CLAUDE.md'den ayrılmıştır. PM2/CWP setup, graceful shutdown, monitoring, admin entegrasyonları.

## Production Lifecycle (Astro 6 SSR + PM2)

### Graceful Shutdown — `lib/lifecycle.ts`
- PM2 SIGTERM gönderdiğinde DB pool ve Redis client **drain edilmeli** — yoksa in-flight query abort, connection leak, restart süresi uzar, kullanıcı 502 alır.
- Pattern: `registerShutdownHandler(async () => { await pool.end(); })` — module-level call.
- `postgres.ts` ve `cache/cache.ts` zaten bağlandı. Yeni stateful resource (websocket pool, file handle, vs.) eklenirse aynı pattern uygula.
- 8s timeout (force-kill öncesi tampon). PM2 `kill_timeout: 10000` config'inde olmalı.
- Test ortamında (`NODE_ENV === 'test'`) skip — Vitest kendi cleanup yapar.

### Web Vitals RUM — `PerformanceMonitor.tsx`
- `web-vitals` library (Google official, ~3KB gzipped) ile CLS/INP/LCP/FCP/TTFB toplar.
- `navigator.sendBeacon` ile `/api/analytics/performance` endpoint'ine gönderir.
- `client_performance_metrics` tablosuna yazılır (TTFB/FCP/LCP dedicated column, CLS/INP JSONB).
- Layout.astro'da `<PerformanceMonitor client:only="react" />` zaten var.

### Hata Takibi — DB-only
- **`error_logs` tablosu**: tüm `logger.error(...)` çağrıları DB'ye yazılır
- Admin paneli `/admin/error-logs` üzerinden son hatalar görüntülenebilir
- Third-party hata takibi (Sentry vb.) **kullanılmaz** — DB yeterli, dış servis bağımlılığı YOK

### PWA — Service Worker + Manifest
- `public/sw.js`, `public/manifest.json`, `src/components/PWARegister.astro` aktif.
- SW register: `navigator.serviceWorker.register('/sw.js')` — Layout'tan otomatik.
- Push notifications: VAPID key (env: `VAPID_PUBLIC_KEY` + `PUBLIC_VAPID_PUBLIC_KEY` browser için).

### Build & Deploy
- Build: `npm run build` (~10-11s) → `dist/` (server entry + client assets).
- PM2 start: `pm2 start ecosystem.config.cjs` (CWP shared hosting).
- Required env: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `INTERNAL_API_TOKEN`.
- PM2 ecosystem.config: `kill_timeout: 10000` zorunlu (graceful shutdown 8s + buffer).

### Browser-side env (Astro PUBLIC_ prefix)
- Browser-side React/Astro client kodu `import.meta.env.PUBLIC_*` kullanır, **never `process.env`** (browser'da `process.env` undefined döner).
- `PUBLIC_` prefix olmayan env'ler sadece server-side görünür.
- Browser'a expose edilmesi gereken env: hem `XYZ` (server) hem `PUBLIC_XYZ` (client) tanımla; `astro.config.mjs` `env.schema`'da `context: 'client', access: 'public'` belirt.

### Admin-Yönetilen Entegrasyonlar
**`/admin/integrations` paneli** 6 servisi yönetir; tüm key'ler DB'den (`site_settings.integrations.*` veya `oauth_providers` tablosu) okunur, env fallback olur, sunucu restart gerektirmez:

| Servis | DB Konumu | Helper |
|--------|-----------|--------|
| Resend (E-posta Tier 1) | `site_settings.integrations.email` | `getResendConfig()` (inline `src/lib/email/index.ts`, 60s cache) |
| SMTP (E-posta Tier 2 fallback) | `site_settings.integrations.smtp` | `getSmtpConfig()` (inline `src/lib/email/index.ts`, 60s cache) |
| Google Analytics | `site_settings.integrations.analytics` | inline (`Layout.astro`) |
| Stripe (Ödeme) | `site_settings.integrations.payment` | `getStripeConfig()` (`src/lib/stripe/stripe-config.ts`, 60s cache + `invalidateStripeConfigCache()`) |
| Unsplash + Pexels | `site_settings.integrations.image_providers` | `getImageProvidersConfig()` (`src/lib/media/image-providers-config.ts`, 60s cache) |
| Google/Facebook/Twitter OAuth | `oauth_providers` tablosu (migration 107) | `OAUTH_PROVIDER_PRESETS` + `upsertOAuthProviderFromAdmin()` (`src/lib/oauth/oauth-providers-helper.ts`) |

**Email gönderim akışı (3-tier):** `sendEmail(data)` (`src/lib/email/index.ts`) önce **Resend** (Tier 1, DB → env), sonra **SMTP** (Tier 2, DB → env), son çare **dev log** (Tier 3) sırasını izler. Tier'lardan biri başarısız olursa otomatik bir sonrakine düşer. Return `{ success, error?, tier? }` — `tier` alanı hangi backend'in kullanıldığını söyler (`'resend' | 'smtp' | 'dev-log'`). `invalidateEmailConfigCache()` her iki cache'i (Resend + SMTP) temizler.

**Email rate limiting:** Per-recipient daily cap `integrations.email.daily_limit_per_recipient` (default 10). **0 = sınırsız** (transactional burst için). Spam/maliyet kontrolü için admin paneli üzerinden ayarlanabilir; tier-agnostic (Resend ya da SMTP, fark etmez aynı limit).

**`/api/health` integrations summary:** Yanıtın `integrations` alanı 5 servisin varlık durumunu (`'configured' | 'unconfigured'`) raporlar. Sadece DB+env varlığını probe eder, gerçek API'yi çağırmaz (real probe için `/api/admin/site/integrations/test`). Sonuç 30s in-process cache'lenir — load balancer / uptime monitor sürekli polling yaptığı için her health çağrısında 5 DB sorgusu çalıştırılmaz. SMTP "configured" sayılması için 3 alanın da (host + user + pass) set olması gerekir.

**"Test Et" akışı (`POST /api/admin/site/integrations/test`):** Admin yapılandırma sonrası her servisi probe edebilir. Section'lar: `email` (gerçek mail gönder + tier dön), `smtp` (`nodemailer.verify()`, mail göndermez), `analytics` (GA4 ID format `G-XXXXXXXXXX`), `payment` (Stripe `customers.list`), `image_providers` (Unsplash + Pexels arama probe), `oauth` (provider preset auth_url HEAD probe + DB config kontrolü). Her satırda inline StatusBadge sonuç gösterir; sayfa başında "Tümünü Test Et" master butonu paralel/sıralı tester.

**API response wrapping:** `apiResponse(data, status?)` (`src/lib/api.ts`) payload'u `{ data: ..., meta: { timestamp, ... } }` ile sarmalar. Test'lerde ve UI'da `response.data.field` (iki seviye) kullanın, doğrudan `response.field` değil — aksi halde silent display bug olur (her zaman `undefined`).

**Yeni 3rd-party servis eklerken pattern:**
1. Config helper: `getXyzConfig()` — DB → env fallback, 60s in-process cache
2. `invalidateXyzCache()` — admin save sonrası temizler
3. Admin endpoint section: GET masked değer döner, POST `****` içerikleri skip eder (mevcut korunur)
4. UI: section eklenir (`IntegrationsSettings.tsx`), `xxx_set` boolean + masked preview göster
5. Test Et endpoint'inde section ekle (`/admin/site/integrations/test`): network probe + UI'a "Test Et" butonu
6. Tüketim limiti / rate limit varsa numeric field olarak DB'ye kaydedilebilir (örnek: `daily_limit_per_recipient`); 0 = sınırsız konvansiyonu
7. Health endpoint summary'sine ekle (`/api/health` `integrations` field'ı, varlık probe — yapılandırıldı/yapılandırılmadı)
8. OpenAPI spec'e endpoint'i belge et (`/api/docs/openapi.json.ts`)

### Commit Convention
Conventional Commits: `feat(scope): description`, `fix(scope): description`, etc.
Branch naming: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`

---

## Deployment

- **Production**: CentOS Web Panel, PM2 process manager, Apache reverse proxy (port 4321)
- **Dev**: Local PostgreSQL + Redis (system services veya kullanıcı tercihi); Docker kullanılmaz
- **Required env vars**: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`
- **Node**: >=20.0.0
- See `DEPLOYMENT.md` and `CWP-DEPLOYMENT-GUIDE.md` for production setup

## TypeScript Configuration

tsconfig extends `astro/tsconfigs/strict` with **`strict: true`** (noImplicitAny, strictNullChecks, strictFunctionTypes, etc. — all active). JSX configured for React (`react-jsx`).

All DB access goes through the raw `pg` pool in `src/lib/postgres.ts` (not an ORM). The legacy `drizzle-orm` package and ~400 unused enterprise stub modules (advanced/, affiliate/, ai-moderation/, board/, policy/, compliance/, etc.) were removed in 2026-04-25 cleanup; current `astro check` is 0 errors / 0 warnings / ~105 hints.

### Read Replica
`postgres.ts` exports both `pool` (write) and `readReplicaPool` (read). Currently both point to the same database. Use `readReplicaPool` for SELECT-only queries in read-heavy endpoints to be forward-compatible when a replica is configured.
