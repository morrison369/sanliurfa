# CLAUDE.md

Bu dosya, bu depoda çalışırken Claude Code için günlük uygulama rehberi sağlar.

## Proje Özeti

**Şanlıurfa.com**, Astro 6.1.7 ve TypeScript ile kurulmuş üretim seviyesi bir şehir rehberi web uygulamasıdır. React paketleri, izin verilen bir Astro entegrasyonu uyumluluk katmanı olarak kurulu kalır; ancak aktif UI runtime Astro + plain TypeScript'tir. bcrypt tabanlı kimlik doğrulama, Redis cache/session/rate-limit, PostgreSQL, kapsamlı gözlemlenebilirlik, API dokümantasyonu ve E2E test içeren full-stack bir yapıya sahiptir. Altyapı; strict TypeScript, SQL injection önleme ve performans izleme ile kurumsal düzeyde hazırlanmıştır.

## Source Of Truth ve Çalışma Modeli

Bu dosya yüksek sinyalli bir çalışma rehberidir; tek source of truth değildir. Operasyonel kararlar için önce şu dosyaları aç:

- `docs/ops/README.md` — ops dokümanları için giriş noktası
- `docs/ops/SOURCE_OF_TRUTH_MAP.md` — hangi kararın hangi dosyaya ait olduğunu gösterir
- `docs/architecture/ASTRO_RUNTIME_STATE.md` — migration kapanışı sonrası aktif Astro runtime durumu
- `docs/RELEASE_GATES.md` — release ve merge gate davranışı
- `docs/ops/BRANCH_PROTECTION.md` — zorunlu kontroller / branch protection parity
- `docs/ops/ARTIFACT_FRESHNESS_POLICY.md` — artefact freshness semantiği
- `docs/ops/ARTIFACT_RETENTION_POLICY.md` — retention ve cleanup kuralları
- `docs/ops/INTEGRATION_READINESS.md` — admin integration readiness davranışı
- `docs/ops/INCIDENT_RUNBOOK.md` — incident müdahale sırası
- `docs/ops/LEGACY_PHASE_SURFACE.md` ve `docs/SCRIPT_SURFACE_POLICY.md` — legacy phase ve script yüzeyi politikası
- `src/pages/api/openapi.json.ts` — güncel API kontratı kaynağı
- `src/types/generated-admin-api.ts` — OpenAPI'den üretilmiş admin API tipleri
- `src/types/admin-api.ts` — UI-facing admin tip katmanı

Uzun mimari notlar için `docs/architecture/README.md` dosyasını tercih et; bu dosyayı günlük yürütme kurallarına odaklı tut.

Framework yönü:

- Astro birincil framework'tür.
- Yeni sayfalar ve yeni UI yüzeylerinde varsayılan yaklaşım Astro-first olmalıdır.
- Deponun zaten Astro-only olduğunu varsayma; React kaldırma veya büyük migration işi önermeden önce `docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md` dosyasını kontrol et.
- Migration backlog kapalıdır. Yeni bir React UI yüzeyi veya hydration owner bilinçli olarak geri eklenirse ancak o zaman `docs/reports/astro-hydration-inventory.md` dosyasını `npm run astro:migration:inventory` ile yenile.
- Migration yeniden açılır ve `medium=0` ise, sonraki paneli seçmeden önce kalan `high` bucket'ı `npm run astro:migration:high-risk` ile sırala.
- Hydration zaten `0` ise React'in kaldırılması gerektiğini varsayma. Kullanıcı açıkça paket kaldırma istemedikçe `@astrojs/react` izin verilen production bağımlılığı olarak kalır.
- `npm run astro:react:audit` ve `npm run astro:react:classify` komutlarını yalnızca görünürlük için kullan; otomatik uninstall tetikleyicisi yapma.

## Hızlı Başlangıç Komutları

### Günlük Geliştirme
- `npm run dev` — Geliştirme sunucusunu başlat
- `npm run dev:1111` — Tercih edilen yerel strict-port geliştirme sunucusu
- `npm run dev:wsl` — WSL / dış host erişimi için geliştirme sunucusu
- `npm run build` — Production build
- `npm run lint` — TypeScript + Astro doğrulaması
- `npm run format` — Prettier (Astro dahil)

### Birincil Kalite Gate'leri
- `npm run typecheck:app` — Kanonik uygulama typecheck'i
- `npm run test:critical:blocking` — Blocking kontrat testleri
- `npm run test:critical:advisory` — Advisory kontrat testleri
- `npm run test:critical` — Tam kritik gate
- `npm run test:e2e:smoke` — Kanonik smoke suite

### Admin API Kontratı ve Tipler
- `npm run types:admin:generate` — Admin API tiplerini OpenAPI'den yeniden üret
- `npm run types:admin:drift:check` — Üretilmiş tipler bayatsa fail ver
- `npm run test:critical:advisory` — Admin kontratı ve OpenAPI kontrat kontrollerini içerir

### Release, Governance ve Ops
- `npm run release:gate` — Release gate özeti ve kararı
- `npm run branch:protection:drift:check` — Zorunlu kontroller / doküman parity doğrulaması
- `npm run ops:retention:apply` — Yerel artefact ve audit retention cleanup'ı
- `npm run astro:migration:inventory` — Güncel Astro hydration envanteri ve risk dağılımı
- `npm run astro:migration:high-risk` — Kalan yüksek riskli hydration yüzeyleri için sıralı feasibility raporu
- `npm run astro:react:audit` — Hydration sıfıra indikten sonra paket seviyesinde React yüzeyi görünürlüğü
- `npm run astro:react:classify` — Hydration sıfıra indikten sonra dosya seviyesinde React bakım sınıflandırması
- `npm run astro:react:guard` — Runtime-linked React UI yüzeyi geri dönerse fail veren guard
- `npm run phase:scripts:report` — Faz uyumluluk durumu
- `npm run phase:compat:cleanup` — Uyumluluk manifest cleanup durumu

### Veritabanı ve Servisler
- `npm run db:start` — PostgreSQL Docker container'ını başlat
- `npm run db:stop` — Veritabanını durdur
- `npm run db:reset` — Veritabanını sıfırla (volume'ları düşürür)
- `npm run db:psql` — Veritabanına psql shell aç
- `npm run db:logs` — Veritabanı loglarını görüntüle

### Genişletilmiş Test Komutları
- `npm run test:unit` — Tam Vitest unit suite
- `npm run test:unit:watch` — Vitest watch modu
- `npm run test:e2e` — Tam Playwright suite
- `npm run test:e2e:ui` — Playwright UI modu
- `npm run test` — Legacy geniş suite; birincil merge sinyali değildir

## Mimari

### Dizin Yapısı

```
src/
├── components/        # Astro UI bileşenleri
├── pages/            # Dosya tabanlı routing (Astro sayfaları + API route'ları)
│   ├── api/          # REST API endpoint'leri (health, auth, places, reviews, metrics, performance, docs, admin, loyalty, social, realtime, webhooks)
│   ├── admin/        # Admin yönetim sayfaları (users, moderation, loyalty, analytics)
│   ├── kullanıcı/    # Kullanıcı profilleri ve ayarlar
│   ├── sosyal/       # Sosyal özellikler (feed, hashtag explorer)
│   ├── canli-analitik/ # Gerçek zamanlı analitik paneli
│   └── [diğer sayfalar]
├── layouts/          # Sayfa şablonları
├── lib/              # Çekirdek yardımcılar (TypeScript strict)
│   ├── postgres.ts   # PostgreSQL pool, parametrik sorgular, table allowlist güvenliği
│   ├── auth.ts       # bcrypt hashleme, Redis session'lar, token yönetimi
│   ├── cache.ts      # Redis istemcisi, namespace prefix'leri (sanliurfa:), rate limit
│   ├── validation.ts # XSS sanitization ile schema tabanlı giriş doğrulama
│   ├── logging.ts    # Request ID takibi ile structured logging
│   ├── metrics.ts    # Request/query metrikleri, slow operation tespiti, performans istatistikleri
│   ├── api.ts        # Response formatlayıcılar, hata kodları, doğrulama yardımcıları
│   ├── env.ts        # Ortam değişkeni doğrulama
│   ├── realtime-sse.ts # Gerçek zamanlı özellikler için Server-Sent Events yöneticisi
│   ├── loyalty-points.ts # Sadakat puanı mantığı
│   ├── badges.ts     # Rozet yönetimi ve atama
│   ├── achievements.ts # Başarım takibi ve kilit açma
│   ├── gamification.ts # Oyunlaştırma event hook'ları
│   ├── social-features.ts # Hashtag, mention ve aktivite takibi
│   ├── business-analytics.ts # KPI ve performans metrikleri
│   ├── subscriptions.ts # Premium katman yönetimi
│   ├── feature-gating.ts # Paket bazlı özellik erişimi
│   └── [diğer yardımcılar]
├── middleware.ts     # Request auth, CORS, rate limit, security header'ları
├── types/            # TypeScript tip tanımları
├── content/          # Markdown/MDX içerik dosyaları
├── styles/           # Tailwind CSS
└── data/             # Statik veri
```

### Teknoloji Yığını

- **Framework**: Astro 6.1.7 (SSR, dosya tabanlı routing)
- **UI**: Astro bileşenleri + plain TypeScript tarayıcı yardımcıları
- **Styling**: Tailwind CSS 3.4 + Tailwind Forms
- **Veritabanı**: PostgreSQL (doğrudan `pg` kütüphanesi bağlantısı)
- **Cache/Session/Rate Limit**: Redis (`sanliurfa:*` namespace anahtarları)
- **Auth**: JWT + bcrypt (şifreler), Redis session'ları (24 saat TTL, kayan pencere)
- **Şifre Hashleme**: bcryptjs (12 tur), eski hash'ler için SHA-256 migration yolu
- **Giriş Doğrulama**: Sanitization ile schema tabanlı doğrulama
- **Gözlemlenebilirlik**: Structured logging, request ID takibi, metrik toplama, yavaş sorgu tespiti
- **Test**: Vitest (unit) + Playwright (E2E)
- **Kod Kalitesi**: TypeScript strict mode, Astro Check, Prettier, pre-commit linting

### Temel Mimari Kararlar

1. **Veritabanı Güvenliği**:
   - `pool.query($1, [$param])` sözdizimiyle kullanılan parametrik sorgular SQL injection'ı önler
   - `postgres.ts` içindeki table allowlist, tüm tablo referanslarını doğrular
   - Connection pool en az 2, en fazla 20 bağlantı ve 30 saniye idle timeout ile çalışır
   - Pool hatasında otomatik yeniden bağlanma yapılır

2. **Kimlik Doğrulama**:
   - **Şifre**: Veritabanında Bcrypt (12 tur) hash'leri tutulur. Eski SHA-256 hash'ler bir sonraki başarılı girişte otomatik olarak bcrypt'e taşınır
   - **Session'lar**: Bellek içi değil, Redis destekli JWT token'ları kullanılır. Anahtar biçimi: `sanliurfa:session:{token}`
   - **Akış**: Giriş → bcrypt doğrulama → token üretimi → Redis'te `SET session` (TTL 86400s) → cookie döndürme
   - **Doğrulama**: Middleware `auth-token` cookie'sini okur → Redis'ten `GET session` yapar → süreyi doğrular → `context.locals.user` ayarlar
   - **Kayan Pencere**: Her başarılı doğrulamada token TTL yenilenir; aktif kullanıcılar oturumunu korur

3. **Cache Stratejisi**:
   - **Redis Namespace Kullanımı**: Tüm anahtarlar, paylaşılan Redis üzerinde diğer projelerden ayrışması için `sanliurfa:` ile başlar
   - **Cache Kalıpları**:
     - Mekan listesi: `sanliurfa:places:list:{filter}` (5 dakika TTL)
     - Mekan detayı: `sanliurfa:places:{id}` (10 dakika TTL)
     - Yorumlar: `sanliurfa:reviews:{placeId}` (10 dakika TTL)
     - Kullanıcı favorileri: `sanliurfa:favorites:{userId}` (5 dakika TTL)
   - **Invalidation**: Mutation'larda (POST/PUT/DELETE) pattern silme uygulanır
   - **Metrikler**: Her endpoint için cache hit/miss izlenir ve `/api/metrics` altında toplanır

4. **Rate Limiting**:
   - **Mekanizma**: Sayaç ve TTL içeren `sanliurfa:ratelimit:{ip}` Redis anahtarı (15 dakikalık pencere)
   - **Limit**: IP başına 15 dakikada 100 istek
   - **Fallback**: Redis erişilemezse uyarı log'u ile in-memory map kullanılır (fail-open)
   - **IP Tespiti**: `x-forwarded-for` header'ındaki en sağdaki IP alınır; spoofing'i sınırlar

5. **Giriş Doğrulama**:
   - `src/lib/validation.ts` içinde `validateWithSchema()` ile schema tabanlı doğrulama yapılır
   - Şemalar `commonSchemas` içinde tanımlanır (login, register, review, place)
   - `sanitizeInput()` ile XSS sanitization uygulanır (HTML escape)
   - `{valid, errors, data}` yapısı döner
   - Doğrulama hatasında 422 `UNPROCESSABLE_ENTITY` döner

6. **Gözlemlenebilirlik**:
   - **Request Metrikleri**: Her endpoint `recordRequest(method, path, status, duration)` çağırır → toplu istatistik üretilir
   - **Sorgu Metrikleri**: Her DB sorgusu süre, satır sayısı ve yavaşlık tespiti ile kaydedilir
   - **Yavaşlık Tespiti**:
     - 100ms üzeri sorgular: debug log
     - 1000ms üzeri sorgular: stack trace ile warning log
     - 500ms üzeri istekler: yavaş olarak kaydedilir ve slow operations listesine eklenir
   - **Pool İzleme**: Veritabanı bağlantı kullanımı (active/idle/waiting) her 30 saniyede güncellenir
   - **Paneller**: `/api/metrics` (toplu), `/api/performance` (detaylı, admin-only)

7. **API Sözleşmeleri**:
   - Tüm endpoint'ler JSON döner: `{ success: boolean, data?: T, error?: string }`
   - Durum kodları: 200 (OK), 400 (bad input), 401 (auth required), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation failed), 429 (rate limited), 500 (server error)
   - Dağıtık izleme için tüm yanıtlarda `X-Request-ID` header'ı bulunur
   - Cache'lenen endpoint'lerde `X-Cache` header'ı (HIT/MISS) bulunur
   - `/api/docs` → Swagger UI, `/api/openapi.json` → OpenAPI 3.1 spec

8. **Bileşen Stratejisi**:
   - Sunucu tarafı render edilen içerik için Astro (`.astro`) kullanılır
   - Etkileşim, polling, mutation ve DOM güncellemeleri için plain TypeScript tarayıcı yardımcıları kullanılır
   - React entegrasyonu yalnızca uyumluluk seçeneği olarak korunur; varsayılan UI sahibi değildir

### Astro-Only Yönü

- Hedef yön Astro-first'tür; anlık React kaldırma değildir.
- `@astrojs/react`, açık paket kaldırma kararı yoksa kabul edilen production bağımlılığı olarak kalmalıdır.
- Bir framework migration batch'i planlamadan önce şunları oku:
  - `docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md`
  - `astro.config.mjs`
- Migration kuralı:
  - düşük etkileşimli widget'lar önce Astro + plain TypeScript'e taşınabilir
  - medium/high-state admin ve analytics panelleri tek tek değerlendirilmelidir
  - big-bang React removal önerme
  - hydration sıfıra indikten sonra audit raporlarını yalnızca görünürlük için kullan; otomatik removal işine çevirme

### Veritabanı

Connection pool ile PostgreSQL kullanılır. Temel tablolar:
- `users` — roller (user/admin/moderator) ve bcrypt şifre hash'leri ile hesaplar
- `places` — kategori, koordinat ve puan bilgisi içeren mekanlar
- `reviews` / `comments` — kullanıcı geri bildirimleri
- `favorites`, `blog_posts`, `events`, `historical_sites` — içerik yüzeyleri

Tüm sorgular parametrik ifadeler (`$1`, `$2` vb.) kullanır. Doğrudan erişim `npm run db:psql` ile yapılır.

### Kimlik Doğrulama ve Yetkilendirme

**Akış**:
1. E-posta + şifre ile `POST /api/auth/register` veya `POST /api/auth/login`
2. Kimlik bilgilerini `bcrypt.compare()` ile doğrula
3. JWT token oluştur, session'ı 24 saat TTL ile Redis'e yaz
4. Token'ı `auth-token` cookie'si içinde döndür (`httpOnly`, `secure`, `sameSite=strict`)
5. Middleware her istekte token'ı doğrular ve `context.locals.user` ayarlar
6. Route'lar rol bazlı erişim için `context.locals.isAdmin` kontrolü yapar

**Temel Fonksiyonlar** (`src/lib/auth.ts`):
- `signUp(email, password, fullName)` — hesap oluşturur
- `signIn(email, password)` — kimlik doğrular, session oluşturur
- `verifyToken(token)` — Redis içindeki session'ı doğrular
- `createToken(userId, email, role)` — JWT üretir
- `signOut(token)` — Redis içindeki session'ı siler

**Korumalı Route'lar**:
- `/admin/*` `isAdmin` rolü ister; middleware içinde kontrol edilir, yetkisizse login'e yönlendirilir
- `/api/admin/*` `isAdmin` rolü ister; yoksa 403 `FORBIDDEN` döner
- `/api/health/detailed` ve `/api/performance` yalnızca admin içindir

### API Endpoint'leri

**Sağlık ve Gözlemlenebilirlik**:
- `GET /api/health` — Veritabanı/Redis durumu ve yanıt süreleri
- `GET /api/health/detailed` (admin) — Sistem metrikleri, pool bilgisi ve hata detayları
- `GET /api/metrics` (admin) — Toplu request metrikleri, hata oranları, cache istatistikleri ve en yavaş endpoint'ler
- `GET /api/performance` (admin) — Yavaş sorgular, yavaş operasyonlar, pool kullanımı ve performans paneli

**Ops ve Admin Kontrat Yüzeyleri**:
- `GET /api/admin/dashboard/overview` — Admin panel özet yüzeyi
- `GET /api/admin/system/metrics` — Admin metrikleri ve normalize durum özeti
- `GET /api/admin/system/artifact-health` — Artefact snapshot ve özet
- `GET /api/admin/deployment/status` — Deployment readiness ve artefact health
- `GET /api/admin/audit-logs` — Admin audit kaydı, filtreler ve CSV dışa aktarım
- `GET /api/admin/system/integration-settings` — Integration readiness snapshot
- `PUT /api/admin/system/integration-settings` — Integration ayar mutation'ı
- `GET /api/admin/performance/optimization` — Performans optimizasyon özeti
- `GET /api/admin/subscriptions/users` — Abonelik kullanıcı listesi
- `POST /api/admin/subscriptions/users` — Abonelik yönetim aksiyonları
- `POST /api/admin/messages/{id}/status` — İletişim mesajı durum mutation'ı
- `GET /api/openapi.json` — Üretilmiş admin tipleri için güncel kontrat kaynağı

**Admin UI Ops Yüzeyleri**:
- `/admin/runtime-monitor` — Runtime sağlık / performans / artefact izleme yüzeyi
- `/admin/audit` — Kalıcı admin ops audit görüntüleyicisi
- `/admin/access-coverage` — Admin wrapper coverage izleme ve rapor indirme yüzeyi
- `/admin` — Typed admin client katmanından beslenen admin ana panel özeti

**Kimlik Doğrulama**:
- `POST /api/auth/register` — Hesap oluşturur (şema: e-posta, en az 8 karakter, büyük harf/sayı/özel karakter içeren şifre)
- `POST /api/auth/login` — Giriş yapar (e-posta, şifre)
- `POST /api/auth/logout` — Çıkış yapar; session'ı Redis'ten temizler

**Veri ve İçerik**:
- `GET /api/places` — Mekanları listeler (5 dakika cache)
- `GET /api/places/:id` — Mekan detayını döner (10 dakika cache)
- `GET /api/reviews?placeId=:id` — Mekan yorumlarını döner (10 dakika cache)
- `POST /api/reviews` — Yorum oluşturur; yorum cache'ini invalidate eder
- `GET /api/favorites` — Kullanıcının kaydettiği mekanlar (5 dakika cache, kullanıcı bazlı)
- `POST /api/favorites` — Mekan kaydeder; favori cache'ini invalidate eder
- `DELETE /api/favorites/:id` — Kayıtlı mekanı kaldırır; cache'i invalidate eder

**Sadakat ve Ödüller**:
- `GET /api/loyalty/points` — Kullanıcının puan bakiyesi ve geçmişi (auth gerekli)
- `GET /api/loyalty/rewards` — Kullanılabilir ödül kataloğu (public)
- `GET /api/loyalty/achievements` — Kullanıcı başarımları (auth gerekli, view=all/unviewed/stats destekli)
- `POST /api/loyalty/achievements` — Başarım görüntülendi olarak işaretler (auth gerekli)
- `GET /api/loyalty/tiers` — Kullanıcının seviyesi ve seviye listesi (auth gerekli)
- `POST /api/admin/loyalty/rewards` (admin) — Yeni ödül oluşturur
- `GET /api/admin/loyalty/rewards` (admin) — Tüm ödülleri listeler (aktif + pasif)
- `POST /api/admin/loyalty/award` (admin) — Kullanıcıya manuel puan veya rozet verir

**Sosyal Özellikler**:
- `GET /api/hashtags` — Trend hashtag'leri döner (30 dakika cache)
- `GET /api/hashtags/:slug` — Hashtag detayını, etiketli mekan ve yorumlarla döner (10 dakika cache)
- `GET /api/users/:id/mentions` — Kullanıcı mention ve bildirimlerini döner (auth gerekli)
- `GET /api/realtime/feed` — SSE: gerçek zamanlı sosyal akış güncellemeleri (cursor tabanlı, 15sn polling)
- `GET /api/leaderboards/users` — En iyi kullanıcı liderlik tablosu (sortBy=points/reviews ve limit destekli)

**Gerçek Zamanlı Analitik** (admin):
- `GET /api/realtime/analytics` — SSE: canlı metrikler (5sn) + KPI'lar (30sn polling)

**Kullanıcı Yönetimi**:
- `GET /api/users/:id/profile` — Herkese açık kullanıcı profili
- `GET /api/users/me` — Geçerli kullanıcı bilgisi (auth gerekli)
- `PUT /api/users/me` — Kullanıcı profilini günceller (auth gerekli)
- `GET /api/user/quotas` — Özellik kullanım kotaları (auth gerekli)
- `POST /api/blocking/block` — Kullanıcıyı engeller (auth gerekli)
- `GET /api/blocking/check` — Engelli durumunu kontrol eder (auth gerekli)
- `DELETE /api/blocking/unblock` — Kullanıcının engelini kaldırır (auth gerekli)

**Admin Moderasyonu**:
- `POST /api/reports/submit` — İçerik raporu gönderir
- `GET /api/admin/moderation/reports` (admin) — Raporları listeler
- `POST /api/admin/moderation/resolve` (admin) — Raporu çözer
- `DELETE /api/admin/moderation/remove-content` (admin) — Raporlanan içeriği kaldırır

**Abonelikler ve Ödemeler**:
- `GET /api/subscriptions/tiers` — Kullanılabilir abonelik katmanlarını döner
- `POST /api/subscriptions/checkout` — Stripe checkout oturumu oluşturur
- `POST /api/subscriptions/webhook` — Stripe webhook işleyicisi

**Dokümantasyon**:
- `GET /api/openapi.json` — OpenAPI 3.1 tanımı
- `GET /api/docs` — Swagger UI viewer

### Güvenlik

- **SQL Injection**: Table allowlist in `postgres.ts` (ALLOWED_TABLES set), parameterized queries
- **XSS**: Input sanitization via `sanitizeInput()` in validation
- **Rate Limiting**: 100 req/15min per IP via Redis (`/api/auth/register` and login endpoints flagged for extra attention)
- **CORS**: Configured in middleware, origin validation against `CORS_ORIGINS` env
- **Security Headers**: Content-Type, X-Frame-Options, X-XSS-Protection, CSP
- **Session Hijacking**: httpOnly + secure cookies, strict sameSite policy
- **Password**: Bcrypt (12 rounds), never logged, legacy SHA-256 migration built-in

### Gerçek Zamanlı Özellikler

The application supports real-time updates via **Server-Sent Events (SSE)** for low-latency features without WebSocket overhead.

**Architecture**:
- `src/lib/realtime-sse.ts` — RealtimeManager singleton with event source management, auto-reconnect with exponential backoff
- Dual-purpose endpoints: metrics update every 5s, KPIs every 30s
- Cursor-based pagination for feed updates (only new items since last fetch)
- Fire-and-forget background queries to avoid blocking response

**Implemented Streams**:
1. **Social Feed** (`GET /api/realtime/feed`, 15s polling)
   - User activities from followed places/users
   - Cursor tracked as `lastActivityId`, only new activities emitted
   - Queries: `user_activity` joined with `followers` and `users`

2. **Live Analytics** (`GET /api/realtime/analytics`, 5s metrics + 30s KPIs)
   - Real-time request metrics: Error Rate, Avg Response, P95 Response, Cache Hit, DB Pool Utilization
   - KPIs: Top 5 slowest endpoints
   - Uses `metricsCollector.getMetrics()` and `getKPIs(true)` from business-analytics

**Client-side Integration** (`src/lib/realtime-sse.ts`):
- `connectToFeed()` — Opens EventSource connection, sets auto-reconnect timer
- `handleFeedData(data)` — Parses and triggers `onFeedUpdate()` listener
- `reconnectFeed()` — Exponential backoff (1s, 2s, 4s... up to 60s)
- `onFeedUpdate(callback)` — Register callback to receive feed updates
- Auto-disconnects on component unmount via `disconnect()`

### Sadakat ve Ödül Sistemi

Puanlar, rozetler, başarımlar, seviyeler ve kullanılabilir ödüller içeren tam oyunlaştırma sistemi.

**Bileşenler**:
- `src/lib/loyalty-points.ts` — Puan işlemleri, bakiye takibi ve geçmiş
- `src/lib/badges.ts` — Rozet tanımları ve verme mantığı
- `src/lib/achievements.ts` — Başarım tanımları, açılma koşulları ve istatistikler
- `src/lib/gamification.ts` — Başarımları tetikleyen event hook'ları (yorum oluşturma, fotoğraf yükleme, günlük giriş)

**Veritabanı Tabloları**:
- `loyalty_points` — Point transactions (user_id, amount, type, reason, created_at)
- `user_badges` — Awarded badges (user_id, badge_key, awarded_at, reason)
- `user_achievements` — Unlocked achievements (user_id, achievement_id, unlocked_at, viewed_at)
- `loyalty_tiers` — User tier assignments (user_id, tier_name, total_points_earned, current_points, achieved_at)
- `rewards` — Reward catalog (reward_name, description, category, points_cost, tier_requirement, is_active, display_order)
- `reward_inventory` — Stock tracking (reward_id, available_stock, total_stock)
- `user_tier_history` — Tier progression log (user_id, tier_name, previous_tier, achieved_at, points_at_achievement)

**Temel Akışlar**:
1. **Puan Kazanma**: `awardPoints(userId, amount, reason)` işlem oluşturur, `loyalty_tiers.current_points` değerini günceller ve seviye yükseltmesini kontrol eder
2. **Başarım Açma**: `checkCommonAchievements(userId)` oyunlaştırma hook'larından çağrılır, koşullar sağlanırsa otomatik açar
3. **Rozet Verme**: `awardBadgeToUser(userId, badgeKey, reason)` kayıt ekler; rozet zaten verilmişse `false` döner
4. **Ödül Kullanma**: Kullanıcı yeterli puanı varsa ödülü seçer, puanlar işlem üzerinden düşülür

**Admin Yönetimi**:
- `GET /api/admin/loyalty/rewards` — Tüm ödülleri listeler (aktif + pasif), 2 dakika cache
- `POST /api/admin/loyalty/rewards` — İsteğe bağlı envanterle yeni ödül oluşturur
- `POST /api/admin/loyalty/award` — Kullanıcıya manuel puan/rozet verir

**Cache**:
- `sanliurfa:loyalty:balance:{userId}` — Kullanıcının puan bakiyesi (TTL: 300s)
- `sanliurfa:tier:user:{userId}` — Kullanıcının güncel seviyesi (TTL: 300s)
- `sanliurfa:achievements:stats:{userId}` — Başarım istatistikleri (TTL: 300s)
- `sanliurfa:admin:rewards:catalog` — Admin ödül listesi (TTL: 120s)

### Sosyal Özellikler

Hashtag, mention, aktivite akışı ve trend içerik içeren sosyal ağ öğeleri.

**Bileşenler**:
- `src/lib/social-features.ts` — Hashtag trend mantığı ve mention tespiti
- `src/components/HashtagExplorer.astro` — Trend hashtag'leri ve ilişkili içeriği gezme yüzeyi
- Aktivite akışı, gerçek zamanlı SSE endpoint'i üzerinden sağlanır

**Özellikler**:
1. **Hashtag'ler** (`/api/hashtags` ve `/api/hashtags/:slug`)
   - Trend hashtag'ler mekan/yorum açıklamalarından çıkarılır
   - Endpoint; hashtag adı, kullanım sayısı ve trend dönemini döner
   - Detay görünümü, hashtag ile etiketli mekan ve yorumları gösterir
   - Cache: 30 dakika (liste), 10 dakika (detay)

2. **Mention'lar** (`/api/users/:id/mentions`)
   - Yorum ve açıklamalardaki @mention'ları izler
   - Görüntülenme durumlu kullanıcı bildirim sistemi sağlar
   - Fire-and-forget arka plan sorgusu mention'ları okundu işaretler
   - Kullanıcı başına 2 dakika cache

3. **Aktivite Akışı** (Gerçek zamanlı SSE: `/api/realtime/feed`)
   - Kullanıcı aktiviteleri: yorumlar, yüklemeler, seviye başarımları
   - Cursor tabanlı takip ile yalnızca son fetch'ten sonraki yeni aktiviteleri döner
   - 15 saniyelik polling aralığı kullanır

4. **Kullanıcı Profilleri** (`/api/users/:id/profile`)
   - Yazılan yorumlar, rozetler, seviye ve başarımlar dahil herkese açık profil istatistikleri sunar
   - Takipçi/takip edilen sayıları gösterir

**Veritabanı Tabloları**:
- `user_activity` — Activity log (user_id, activity_type, related_id, created_at)
- `followers` — Follow relationships (follower_id, following_id, created_at)
- `mentions` — @mentions (user_id, mentioned_by_id, review_id, viewed_at)

**Cache**:
- `sanliurfa:hashtags:list:{period}:{limit}` — Trend hashtag'ler (TTL: 30 dakika)
- `sanliurfa:hashtag:slug:{slug}` — Hashtag detayı (TTL: 10 dakika)
- `sanliurfa:mentions:{userId}:{unreadOnly}` — Kullanıcı mention'ları (TTL: 2 dakika)

### Premium Abonelikler ve Özellik Kısıtlama

Tier-based access control for premium features.

**Subscription Tiers**:
- **Free** (default) — Basic features (view places, create 1 review/month)
- **Premium** — Enhanced features (unlimited reviews, priority listings, advanced analytics)
- **Business** — Commercial features (multi-user management, API access, custom integrations)

**Feature Gating**:
- `src/lib/feature-gating.ts` — `isFeatureAvailable(userId, featureKey)` checks user's tier and feature availability
- PREMIUM_FEATURES constant defines feature → tier mapping
- Quota enforcement via `/api/user/quotas` endpoint

**Stripe Integration**:
- `POST /api/subscriptions/checkout` — Creates Stripe checkout session
- `POST /api/subscriptions/webhook` — Listens for Stripe events (subscription.updated, invoice.payment_succeeded)
- Webhook security: HMAC-SHA256 signature validation
- Exponential backoff retry for webhook failures

**Database Tables**:
- `user_subscriptions` — Active subscriptions (user_id, tier_name, status, stripe_subscription_id, current_period_start, current_period_end)
- `subscription_usage` — Monthly feature quotas (user_id, feature_key, usage_count, period_start, period_end)

## Yaygın Geliştirme Görevleri

### Yeni Bir API Endpoint Ekleme

1. Create file at `src/pages/api/resource/action.ts` (follows REST naming)
2. Import types, validation, logger, metrics, database functions
3. Use Astro's `APIRoute` type and async handler
4. Validate input: `validateWithSchema(body, commonSchemas.mySchema)` → return 422 if invalid
5. Execute business logic (query DB, call external API)
6. Record metrics: `recordRequest(method, path, statusCode, duration)`
7. Log important events: `logger.logMutation('create', 'places', recordId, userId)`
8. Return JSON response with request ID in header

**Example**:
```typescript
import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../lib/postgres';
import { validateWithSchema, commonSchemas } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Validate input
    const body = await request.json();
    const validation = validateWithSchema(body, commonSchemas.mySchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/resource', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid input', HttpStatus.UNPROCESSABLE_ENTITY, validation.errors, requestId);
    }

    // Business logic
    const result = await update('places', { id: body.id }, { name: validation.data.name });

    // Log and record metrics
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/resource', HttpStatus.CREATED, duration);
    logger.logMutation('update', 'places', body.id, locals.user?.id, { duration });

    return apiResponse({ success: true, data: result }, HttpStatus.CREATED, requestId);
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/resource', HttpStatus.INTERNAL_SERVER_ERROR, duration, { error: err instanceof Error ? err.message : String(err) });
    logger.error('Request failed', err instanceof Error ? err : new Error(String(err)), { duration });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
```

### Veri Cacheleme

```typescript
import { getCache, setCache, deleteCache, deleteCachePattern } from '../../../lib/cache';

// Read from cache
const cached = await getCache('sanliurfa:places:list:all');
if (cached) return JSON.parse(cached);

// Write to cache (5 min TTL)
const places = await queryMany('SELECT * FROM places');
await setCache('sanliurfa:places:list:all', JSON.stringify(places), 300);

// Invalidate single key
await deleteCache('sanliurfa:places:123');

// Invalidate pattern (all places list caches)
await deleteCachePattern('sanliurfa:places:list:*');
```

### Request Doğrulaması Ekleme

1. Define schema in `src/lib/validation.ts` under `commonSchemas`
2. Use in API endpoint: `validateWithSchema(body, commonSchemas.mySchema)`
3. Schema fields: type, required, minLength, maxLength, min, max, pattern, custom validator, sanitize

```typescript
const mySchema = {
  title: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 100,
    sanitize: true  // XSS prevention
  },
  rating: {
    type: 'number' as const,
    required: true,
    min: 1,
    max: 5
  }
} as ValidationSchema;
```

### Performans İzleme

Check slow queries and request metrics:
```bash
# Get detailed performance dashboard (requires admin auth)
curl -H "Cookie: auth-token=YOUR_TOKEN" http://localhost:3000/api/performance

# Get aggregated metrics
curl -H "Cookie: auth-token=YOUR_TOKEN" http://localhost:3000/api/metrics
```

**Metrics available**:
- `slowRequests` — requests > 500ms
- `slowRequestRate` — percentage of slow requests
- `avgDuration` — average request duration
- `p95Duration` — 95th percentile (tail latency)
- `cacheHitRate` — percentage of cached responses
- `slowestEndpoints` — top 5 by average duration
- Slow queries — database operations > 100ms
- Database pool — connection utilization percentage

### Yavaş Operasyonları Hata Ayıklama

Slow operations are logged and trackable:
```typescript
// Get slow queries from metrics
import { metricsCollector } from '../../../lib/metrics';
const slowQueries = metricsCollector.getSlowQueries(10);  // Last 10 slow queries
const slowOps = metricsCollector.getSlowOperations(20);   // Last 20 slow operations
```

### Gerçek Zamanlı SSE Endpoint'leri

SSE endpoints follow a consistent pattern for low-latency real-time updates:

```typescript
// Server-side pattern (src/pages/api/realtime/example.ts)
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ request, locals }) => {
  // Auth check
  if (!locals.user) return apiError(...);

  const controller = new AbortController();
  const body = new ReadableStream({
    async start(enqueue) {
      // Setup polling interval
      const interval = setInterval(async () => {
        try {
          const data = await fetchNewData(); // Cursor-based or timestamp-based
          if (data) enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          clearInterval(interval);
          controller.abort();
        }
      }, 15000); // 15s polling

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    }
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};

// Client-side pattern (React/Astro component)
const RealtimeManager = {
  async connectToFeed() {
    const eventSource = new EventSource('/api/realtime/feed');
    eventSource.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      this.onFeedUpdate?.(data);
    });
  },
  // Auto-reconnect with exponential backoff
  reconnect(attempt = 0) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
    setTimeout(() => this.connectToFeed(), delay);
  }
};
```

**Key Patterns**:
- Use `ReadableStream` for backpressure handling
- Poll server every N seconds (15s for feed, 5s for metrics)
- Cursor-based tracking to only send new data
- Fire-and-forget background queries for non-critical updates
- Exponential backoff reconnection (max 60s)

### Oyunlaştırma ve Event Hook'ları

Achievement unlocking is triggered by user actions via event hooks:

```typescript
// src/lib/gamification.ts pattern
export async function onReviewCreated(userId: string) {
  // Existing hooks
  await checkAndGrantBadges(userId, 'review');
  await updateUserLevelIfNeeded(userId);

  // NEW: Auto-unlock achievements
  await checkCommonAchievements(userId); // From achievements.ts
}

// src/lib/achievements.ts
export async function checkCommonAchievements(userId: string) {
  try {
    // Internal logic: get user stats, check conditions, unlock matching achievements
    // No throw: has internal try/catch
  } catch (err) {
    logger.error('Achievement check failed', err);
  }
}
```

**Wired Event Hooks**:
- `onReviewCreated(userId)` — Check review-related achievements
- `onPhotoUploaded(userId)` — Check upload-related achievements
- `onDailyLogin(userId)` — Check streak/login-related achievements

### Testler

```bash
# Unit tests
npm run test:unit
npm run test:unit:watch

# E2E tests (requires app running)
npm run test:e2e
npm run test:e2e:ui

# All tests
npm run test
```

Test files in `e2e/` for end-to-end testing (auth, places, admin access).

## Önemli Dosyalar

### Çekirdek Altyapı
| Dosya | Amaç |
|------|------|
| `DEPLOYMENT.md` | PM2, Nginx, SSL ve yedeklerle tam CentOS Web Panel production dağıtım rehberi |
| `tsconfig.json` | TypeScript strict mode; gevşetilmemelidir |
| `.env.example` | Ortam değişkeni şablonu (kritik: DATABASE_URL, JWT_SECRET, REDIS_URL) |
| `Dockerfile` | Yerel docker-compose stack'i için geliştirme container imajı |
| `docker-compose.yml` | PostgreSQL, Redis ve Node.js içeren geliştirme stack'i (yalnızca yerel geliştirme) |
| `ecosystem.config.js` | Production için PM2 yapılandırması (dağıtım sırasında oluşturulur) |

### Çekirdek Kütüphaneler
| Dosya | Amaç |
|------|------|
| `src/middleware.ts` | Request auth, CORS, rate limiting ve security header'ları |
| `src/lib/postgres.ts` | Veritabanı pool'u, parametrik sorgular, table allowlist ve yavaş sorgu izleme |
| `src/lib/auth.ts` | Bcrypt hashleme, Redis session'ları, token üretim/doğrulama |
| `src/lib/cache.ts` | Redis istemcisi, namespaced key'ler, rate limiting ve cache işlemleri |
| `src/lib/validation.ts` | Sanitization ile schema tabanlı doğrulama |
| `src/lib/logging.ts` | Request ID takibi ile structured logging |
| `src/lib/metrics.ts` | Request/query metrikleri, aggregation ve performans istatistikleri |
| `src/lib/api.ts` | Response/error formatlayıcılar, HTTP sabitleri ve doğrulama yardımcıları |
| `src/lib/env.ts` | Ortam değişkeni doğrulama |

### Sağlık ve Gözlemlenebilirlik
| Dosya | Amaç |
|------|------|
| `src/pages/api/health.ts` | Health check endpoint'i (temel durum) |
| `src/pages/api/health/detailed.ts` | Detaylı sağlık endpoint'i (admin, sistem metrikleri, pool bilgisi) |
| `src/pages/api/metrics.ts` | Toplu metrik paneli (admin) |
| `src/pages/api/performance.ts` | Performans izleme endpoint'i (admin, yavaş sorgular, yavaş operasyonlar, pool) |
| `src/pages/api/openapi.json.ts` | OpenAPI 3.1 tanımı |
| `src/pages/api/docs.ts` | Swagger UI endpoint'i |

### Ops Governance ve Source Of Truth
| Dosya | Amaç |
|------|------|
| `docs/ops/README.md` | Ops doküman giriş noktası |
| `docs/ops/SOURCE_OF_TRUTH_MAP.md` | Hangi kararın hangi dosyaya ait olduğunu gösterir |
| `docs/RELEASE_GATES.md` | Release gate davranışı ve karar modeli |
| `docs/ops/BRANCH_PROTECTION.md` | Zorunlu kontroller ve parity kuralları |
| `docs/ops/ARTIFACT_FRESHNESS_POLICY.md` | Artefact freshness durum semantiği |
| `docs/ops/ARTIFACT_RETENTION_POLICY.md` | Artefact ve audit retention kuralları |
| `docs/ops/INCIDENT_RUNBOOK.md` | Incident müdahale sırası |
| `docs/ops/INTEGRATION_READINESS.md` | Admin integration readiness politikası |
| `docs/ops/LEGACY_PHASE_SURFACE.md` | Legacy phase uyumluluk sınırları |
| `docs/SCRIPT_SURFACE_POLICY.md` | Script yüzeyi ve runner-first politikası |
| `src/types/generated-admin-api.ts` | Üretilmiş admin API kontrat tipleri |
| `src/types/admin-api.ts` | UI-facing admin tip katmanı |
| `src/lib/admin-format.ts` | Admin ops ortak tarih/fallback format source |
| `src/lib/admin-index-data.ts` | Admin ana sayfa SSR data loader source |
| `src/lib/admin-index.ts` | Admin ana sayfa risk/tool view model source |
| `src/lib/admin-index-page.ts` | Admin ana sayfa badge/card class source |
| `src/lib/admin-index-view.ts` | Admin ana sayfa render view model source |
| `src/lib/admin-ops-pages.ts` | Runtime monitor + access coverage trend/delta/history source |
| `src/lib/runtime-monitor.ts` | Runtime monitor endpoint ve coverage summary source |
| `src/lib/admin-access-coverage-page.ts` | Access coverage alert/summary/drift HTML source |
| `src/lib/admin-dom.ts` | Admin ops sayfaları için ortak DOM update helper source |
| `src/lib/admin-page-bootstrap.ts` | Admin ops sayfaları için ortak refresh/interval bootstrap source |
| `src/lib/astro-migration-report.ts` | Astro hydration risk inventory source |
| `scripts/astro-hydration-inventory.ts` | Astro hydration inventory report generator |

### Gerçek Zamanlı ve Analitik
| Dosya | Amaç |
|------|------|
| `src/lib/realtime-sse.ts` | Server-Sent Events yöneticisi, yeniden bağlanma mantığı ve event listener'lar |
| `src/lib/business-analytics.ts` | KPI hesapları ve performans metriği toplama |
| `src/pages/api/realtime/analytics.ts` | Gerçek zamanlı metrik/KPI SSE endpoint'i (yalnızca admin) |
| `src/pages/api/realtime/feed.ts` | Gerçek zamanlı sosyal akış SSE endpoint'i (auth gerekli) |
| `src/components/LiveAnalyticsDashboard.astro` | Renk kodlu sağlık durumuyla canlı metrik görünümü |
| `src/pages/canli-analitik/index.astro` | Admin analitik panel sayfası |

### Sadakat ve Ödül Sistemi
| Dosya | Amaç |
|------|------|
| `src/lib/loyalty-points.ts` | Points transactions, balance tracking |
| `src/lib/badges.ts` | Badge definitions and award logic |
| `src/lib/achievements.ts` | Achievement definitions, unlock conditions |
| `src/lib/gamification.ts` | Event hooks for automatic achievement unlocking |
| `src/pages/api/loyalty/points.ts` | User points balance and history endpoint |
| `src/pages/api/loyalty/rewards.ts` | Public rewards catalog endpoint |
| `src/pages/api/loyalty/achievements.ts` | User achievements endpoint (GET all/unviewed/stats, POST mark viewed) |
| `src/pages/api/loyalty/tiers.ts` | User tier and tier progression endpoint |
| `src/pages/api/admin/loyalty/rewards.ts` | Admin rewards management (GET list, POST create) |
| `src/pages/api/admin/loyalty/award.ts` | Admin manual award endpoint (points or badge) |
| `src/components/LoyaltyDashboard.astro` | Kullanıcının sadakat durumu ve ödül görünümü |
| `src/components/AdminLoyaltyPanel.astro` | Ödül kataloğu, manuel ödül verme ve istatistiklerden oluşan admin 3-tab paneli |
| `src/pages/admin/loyalty/index.astro` | Admin sadakat yönetim sayfası |

### Sosyal Özellikler
| Dosya | Amaç |
|------|------|
| `src/lib/social-features.ts` | Hashtag trend mantığı ve mention tespiti |
| `src/pages/api/hashtags/index.ts` | Trend hashtag endpoint'i |
| `src/pages/api/hashtags/[slug].ts` | Etiketli mekan/yorumlarla hashtag detay endpoint'i |
| `src/pages/api/users/[id]/mentions.ts` | Kullanıcı mention ve bildirim endpoint'i |
| `src/pages/api/users/[id]/profile.ts` | Herkese açık kullanıcı profil endpoint'i |
| `src/pages/api/leaderboards/users.ts` | En iyi kullanıcı liderlik tablosu endpoint'i |
| `src/components/HashtagExplorer.astro` | Hashtag gezme ve trend görünümü |
| `src/components/UserPublicProfile.astro` | Herkese açık kullanıcı profil görünümü |
| `src/pages/sosyal/index.astro` | Feed ve hashtag explorer içeren sosyal keşif sayfası |

### Abonelikler ve Kullanıcı Yönetimi
| Dosya | Amaç |
|------|------|
| `src/lib/subscriptions.ts` | Stripe entegrasyonu ve abonelik katmanı yönetimi |
| `src/lib/feature-gating.ts` | Abonelik katmanına göre özellik erişim kontrolü |
| `src/pages/api/subscriptions/checkout.ts` | Stripe checkout session oluşturma |
| `src/pages/api/subscriptions/webhook.ts` | Stripe webhook event işleyicisi |
| `src/pages/api/subscriptions/tiers.ts` | Kullanılabilir abonelik katmanları endpoint'i |
| `src/pages/api/user/quotas.ts` | Özellik kullanım kotası endpoint'i |
| `src/pages/api/blocking/block.ts` | Kullanıcı engelleme endpoint'i |
| `src/pages/api/blocking/check.ts` | Kullanıcı engelli mi kontrol endpoint'i |
| `src/pages/api/blocking/unblock.ts` | Kullanıcı engel kaldırma endpoint'i |
| `src/pages/api/reports/submit.ts` | İçerik raporu gönderimi |
| `src/pages/api/admin/moderation/reports.ts` | Admin moderasyon rapor listesi |
| `src/pages/api/admin/moderation/resolve.ts` | Admin rapor çözümleme |
| `src/pages/api/admin/moderation/remove-content.ts` | Admin içerik kaldırma |
| `src/pages/ayarlar/index.astro` | Kullanıcı ayar sayfası |
| `src/pages/fiyatlandirma/index.astro` | Abonelik fiyatlandırma sayfası |
| `src/pages/abonelik/index.astro` | Abonelik yönetim sayfası |
| `src/components/UserSettings.astro` | Kullanıcı ayar arayüzü |

### Testler
| Dosya | Amaç |
|------|------|
| `e2e/` | Playwright uçtan uca testleri |

## Ortam Değişkenleri

**Kritik** (production için zorunlu):
- `DATABASE_URL` — PostgreSQL connection string (required)
- `JWT_SECRET` — Secret for token signing (min 32 chars, required)
- `REDIS_URL` — Redis connection string (required, includes namespace prefix logic)
- `REDIS_KEY_PREFIX` — Redis key namespace (default: `sanliurfa:`, isolates from other projects)

**Önerilen**:
- `CORS_ORIGINS` — Comma-separated allowed origins (default: https://sanliurfa.com)
- `NODE_ENV` — `production` or `development` (affects SSL, logging, error messages)

**İsteğe Bağlı**:
- Supabase keys (legacy, for backward compatibility)
- OAuth keys (Google, Facebook)
- Email service API keys (Resend)

## Dağıtım

### Geliştirme Stack'i (Docker)
- **Docker Compose**: PostgreSQL, Redis ve Node.js servisleriyle `docker-compose.yml`
- **Kullanım**: Tüm bağımlılıklarla tam yerel stack için `docker-compose up`
- **Amaç**: Tutarlı geliştirme ortamı; production servislerini taklit eder

### Production Dağıtımı (CentOS Web Panel)
- **Platform**: CentOS Web Panel üzerinde paylaşımlı barındırma (Docker değil)
- **Servis Yöneticisi**: PM2 (önerilen) veya Systemd
- **Süreç**:
  1. Clone repo to `~/sanliurfa` (user's home directory)
  2. Install Node.js via NVM
  3. `npm install --legacy-peer-deps` and `npm run build`
  4. Configure PostgreSQL/Redis (provided by hosting)
  5. Setup PM2 with `ecosystem.config.js`
  6. Configure Nginx reverse proxy in CWP panel (port 6000)
  7. Setup Let's Encrypt SSL (via CWP SSL Manager)
  8. Schedule automated backups via crontab

Tam CentOS Web Panel production kurulum rehberi için **`DEPLOYMENT.md`** dosyasına bak.

- **Env**: Kritik değişkenleri sunucudaki `.env` dosyasında ayarla
- **Redis**: Erişilebilir olmalı (`redis-cli ping`); çoğu zaman hosting tarafından sağlanır
- **Veritabanı**: PostgreSQL sağlanır; kullanıcı ve veritabanı oluştur, ilk açılışta migration'ları çalıştır
- **İzleme**: `/api/health` endpoint'i, PM2 logları ve crontab health check script'i kullan

## Sonraki Geliştirme İçin Notlar

### Kritik Kurallar
1. **TypeScript Strict Mode**: Never relax `strict: true` in tsconfig.json. All errors must be fixed or marked with `// @ts-expect-error` with explanation.
2. **Parameterized Queries**: Always use `$1`, `$2`, etc. syntax in SQL. Never interpolate user input.
3. **Table Name Allowlist**: If adding new tables, update `ALLOWED_TABLES` set in `postgres.ts`.
4. **Redis Namespacing**: All new cache keys must start with `sanliurfa:` prefix (handled via `prefixKey()` helper). **CRITICAL**: namespace isolation prevents cache collision with other projects on shared Redis.
5. **Input Validation**: Every API endpoint must validate input via `validateWithSchema()` before using.
6. **Error Handling**: Catch errors in API routes, never throw raw errors to clients. Log to stdout/stderr for server visibility.
7. **SSE Implementation**: Always use `ReadableStream` for real-time endpoints, include `Cache-Control: no-cache` and `Connection: keep-alive` headers, implement client-side exponential backoff reconnection with max 60s delay.
8. **Gamification Hooks**: `checkCommonAchievements()` must be called from event hooks, not directly. It has internal try/catch so it cannot throw.
9. **Cache Invalidation**: On any mutation (POST/PUT/DELETE), invalidate related cache patterns. For loyalty changes, invalidate `sanliurfa:loyalty:*` and `sanliurfa:tier:*` patterns.
10. **Admin Guard**: New admin API endpoints must use `withAdminOpsReadAccess(...)` or `withAdminOpsWriteAccess(...)`. Admin pages may redirect; admin API routes must return API-style 403/429/422 responses, not redirects.
11. **Admin API Contract**: If an admin endpoint changes, update `src/pages/api/openapi.json.ts`, regenerate `src/types/generated-admin-api.ts`, and keep `src/types/admin-api.ts` aligned. Treat `npm run types:admin:drift:check` as authoritative.
12. **Primary Gates**: Before calling a change green, prefer `npm run typecheck:app`, `npm run test:critical`, and `npm run test:e2e:smoke`. `npm run test` remains broader legacy coverage, not the primary operational gate.
13. **Phase Workflow**: Phase compatibility is runner-first. Do not reintroduce broad `package.json` phase alias surfaces; use the phase runner and manifest flow documented in `docs/ops/LEGACY_PHASE_SURFACE.md` and `docs/SCRIPT_SURFACE_POLICY.md`.
14. **Fire-and-Forget**: For non-critical background work (marking mentions as read), queue async queries without awaiting to avoid request timeout.
15. **Admin UI Ops Pages**: For `/admin`, `/admin/runtime-monitor`, and `/admin/access-coverage`, change helper/view-model modules first (`src/lib/admin-format.ts`, `src/lib/admin-index-data.ts`, `src/lib/admin-index*.ts`, `src/lib/admin-ops-pages.ts`, `src/lib/runtime-monitor.ts`, `src/lib/admin-access-coverage-page.ts`, `src/lib/admin-dom.ts`, `src/lib/admin-page-bootstrap.ts`) and keep the browser smoke tests green. For `/admin`, prefer `src/lib/admin-index-data.ts` for SSR data collection and `src/lib/admin-index-view.ts` for page render decisions before editing `index.astro`.
16. **Astro Migration Planning**: Migration backlog is currently closed. If React UI or hydration is intentionally reintroduced, do not pick the next React-to-Astro target from intuition alone. Refresh `npm run astro:migration:inventory`, read `docs/reports/astro-hydration-inventory.md`, and take the low-risk bucket first unless there is a documented reason to take a medium/high-risk surface.

### Performans Optimizasyonu
- Cache aggressively (5-10 min TTL for reads, invalidate on mutations)
- Monitor database pool: if utilization > 80%, investigate slow queries
- Use `/api/performance` to identify bottlenecks before they become incidents
- Slow queries (> 1000ms) auto-logged with warnings, investigate immediately
- Slow requests (> 500ms) tracked, review aggregates to identify trending issues

### Özellik Ekleme

**New Database Tables**:
- Update `ALLOWED_TABLES` in `postgres.ts`
- Create migration file in `migrations/` (timestamp_description.sql)
- Run migration on all environments before deploying endpoint code

**New API Endpoints**:
- Follow response formatter pattern from `src/lib/api.ts`
- For admin endpoints, use the shared admin ops access wrapper instead of ad hoc inline role checks
- Validate input via `validateWithSchema()` before using
- Record metrics: `recordRequest(method, path, status, duration)`
- Log important mutations: `logger.logMutation(action, table, recordId, userId, details)`
- Return X-Request-ID in response headers
- If the endpoint is consumed by admin UI or changes admin contract shape, update `src/pages/api/openapi.json.ts`
- Regenerate admin API types with `npm run types:admin:generate`
- Keep `npm run types:admin:drift:check` green
- For SSE endpoints, use `ReadableStream` pattern, include proper headers, implement client-side reconnection

**New Validations**:
- Add to `commonSchemas` in validation.ts
- Include sanitization for user-facing text (set `sanitize: true`)

**New Caching**:
- Use `prefixKey()` helper (or hardcode `sanliurfa:` prefix)
- Document TTL in comments (5 min = 300s, 10 min = 600s, etc.)
- Always invalidate on mutations using `deleteCache()` or `deleteCachePattern()`

**New Loyalty Features**:
- New achievements: add to `ACHIEVEMENT_DEFINITIONS` in `src/lib/achievements.ts`
- Wire `checkCommonAchievements(userId)` into relevant gamification hooks
- New rewards: create via `POST /api/admin/loyalty/rewards` (UI or direct DB insert)
- New badges: add to badge definitions and call `awardBadgeToUser()` when earned
- New points: use `awardPoints(userId, amount, reason)` with meaningful reason strings

**New Real-time Streams**:
- Create SSE endpoint in `/pages/api/realtime/example.ts`
- Use `ReadableStream` with polling interval
- Implement cursor-based pagination (track `lastActivityId`, `lastTimestamp`, etc.)
- Update `src/lib/realtime-sse.ts` with `connectToExample()`, `handleExampleData()`, listener method
- Implement client-side reconnection logic with exponential backoff

**New Feature Gates**:
- Add feature key to `PREMIUM_FEATURES` in `src/lib/feature-gating.ts`
- Map feature → required tier (Free/Premium/Business)
- Check availability with `isFeatureAvailable(userId, featureKey)`
- Enforce quota limits via `/api/user/quotas` endpoint

**New Metrics**:
- Add to `recordRequest()` calls or custom `recordSlowOperation()` calls
- Aggregated in `/api/metrics` endpoint (viewable by admins)

### Testler
- Minimum pre-commit / pre-push gate:
  - `npm run typecheck:app`
  - `npm run test:critical`
  - `npm run test:e2e:smoke`
- Admin contract changes also require:
  - `npm run types:admin:drift:check`
- Use `npm run release:gate` when the change affects release readiness, branch protection parity, summaries, or ops decisions
- `npm run test` is still useful for broad regression coverage, but it is not the primary blocker signal

### İzleme
- Check `/api/health` on every deployment
- Monitor `/api/metrics` for error rate increases or cache miss spikes
- Review slow queries in `/api/performance` weekly for optimization opportunities
- Database pool saturation (> 80% active) indicates scaling needs
- All errors logged to stdout with request ID for distributed tracing
