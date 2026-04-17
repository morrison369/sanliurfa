# CLAUDE.md

Bu dosya, bu depoda çalışırken Claude Code için günlük uygulama rehberi sağlar.

## Proje Özeti

**Şanlıurfa.com**, Astro 6.1.7 ve TypeScript ile kurulmuş üretim seviyesi bir şehir rehberi web uygulamasıdır. React paketleri, izin verilen bir Astro entegrasyonu uyumluluk katmanı olarak kurulu kalır; ancak aktif UI runtime Astro + plain TypeScript'tir. bcrypt tabanlı kimlik doğrulama, Redis cache/session/rate-limit, PostgreSQL, kapsamlı gözlemlenebilirlik, API dokümantasyonu ve E2E test içeren full-stack bir yapıya sahiptir. Altyapı; strict TypeScript, SQL injection önleme ve performans izleme ile kurumsal düzeyde hazırlanmıştır.

## Kaynak Gerçekler ve Çalışma Modeli

Bu dosya yüksek sinyalli bir çalışma rehberidir; tek karar kaynağı değildir. Operasyonel kararlar için önce şu dosyaları aç:

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
     - 100ms üzeri sorgular: hata ayıklama günlüğü
     - 1000ms üzeri sorgular: stack trace ile uyarı günlüğü
     - 500ms üzeri istekler: yavaş olarak kaydedilir ve yavaş operasyonlar listesine eklenir
   - **Pool İzleme**: Veritabanı bağlantı kullanımı (aktif/boşta/bekleyen) her 30 saniyede güncellenir
   - **Paneller**: `/api/metrics` (toplu), `/api/performance` (detaylı, yalnızca admin)

7. **API Sözleşmeleri**:
   - Tüm endpoint'ler JSON döner: `{ success: boolean, data?: T, error?: string }`
   - Durum kodları: 200 (başarılı), 400 (geçersiz girdi), 401 (kimlik doğrulama gerekli), 403 (yasak), 404 (bulunamadı), 409 (çakışma), 422 (doğrulama hatası), 429 (rate limit), 500 (sunucu hatası)
   - Dağıtık izleme için tüm yanıtlarda `X-Request-ID` başlığı bulunur
   - Cache'lenen endpoint'lerde `X-Cache` başlığı (`HIT/MISS`) bulunur
   - `/api/docs` → Swagger arayüzü, `/api/openapi.json` → OpenAPI 3.1 tanımı

8. **Bileşen Stratejisi**:
   - Sunucu tarafı render edilen içerik için Astro (`.astro`) kullanılır
   - Etkileşim, polling, mutation ve DOM güncellemeleri için plain TypeScript tarayıcı yardımcıları kullanılır
   - React entegrasyonu yalnızca uyumluluk seçeneği olarak korunur; varsayılan UI sahibi değildir

### Astro-Only Yönü

- Hedef yön Astro-first'tür; anlık React kaldırma değildir.
- `@astrojs/react`, açık paket kaldırma kararı yoksa kabul edilen üretim bağımlılığı olarak kalmalıdır.
- Bir framework migration batch'i planlamadan önce şunları oku:
  - `docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md`
  - `astro.config.mjs`
- Migration kuralı:
  - düşük etkileşimli widget'lar önce Astro + plain TypeScript'e taşınabilir
  - orta/yüksek durum taşıyan admin ve analitik paneller tek tek değerlendirilmelidir
  - tek hamlede React kaldırma önerme
  - hydration sıfıra indikten sonra denetim raporlarını yalnızca görünürlük için kullan; otomatik kaldırma işine çevirme

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
- `/admin/*` `isAdmin` rolü ister; middleware içinde kontrol edilir, yetkisizse giriş sayfasına yönlendirilir
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

- **SQL Injection**: `postgres.ts` içindeki table allowlist (`ALLOWED_TABLES` set'i) ve parametrik sorgular kullanılır
- **XSS**: `sanitizeInput()` üzerinden giriş sanitization uygulanır
- **Rate Limiting**: Redis üzerinden IP başına 15 dakikada 100 istek sınırı vardır (`/api/auth/register` ve login endpoint'leri ek dikkat gerektirir)
- **CORS**: Middleware içinde yapılandırılır; origin doğrulaması `CORS_ORIGINS` env değişkenine göre yapılır
- **Güvenlik Header'ları**: Content-Type, X-Frame-Options, X-XSS-Protection ve CSP uygulanır
- **Session Hijacking**: `httpOnly` + `secure` cookie'ler ve strict `sameSite` politikası kullanılır
- **Şifreler**: Bcrypt (12 tur) ile saklanır, asla log'lanmaz; legacy SHA-256 migration gömülüdür

### Gerçek Zamanlı Özellikler

Uygulama, WebSocket ek yükü olmadan düşük gecikmeli özellikler için **Server-Sent Events (SSE)** ile gerçek zamanlı güncellemeleri destekler.

**Mimari**:
- `src/lib/realtime-sse.ts` — event source yönetimi ve exponential backoff ile otomatik yeniden bağlanma içeren `RealtimeManager` singleton'ı
- Çift amaçlı endpoint'ler: metrikler her 5 saniyede, KPI'lar her 30 saniyede güncellenir
- Akış güncellemeleri için cursor tabanlı pagination kullanılır; yalnızca son fetch'ten sonraki yeni öğeler alınır
- Yanıtı bloklamamak için fire-and-forget arka plan sorguları kullanılır

**Uygulanan Akışlar**:
1. **Sosyal Akış** (`GET /api/realtime/feed`, 15sn polling)
   - Takip edilen mekan ve kullanıcılardan gelen aktiviteleri taşır
   - Cursor `lastActivityId` olarak izlenir; yalnızca yeni aktiviteler yayımlanır
   - Sorgular: `user_activity`, `followers` ve `users` ile join edilir

2. **Canlı Analitik** (`GET /api/realtime/analytics`, 5sn metrik + 30sn KPI)
   - Gerçek zamanlı request metrikleri: Error Rate, Avg Response, P95 Response, Cache Hit, DB Pool Utilization
   - KPI'lar: En yavaş 5 endpoint
   - `business-analytics` içindeki `metricsCollector.getMetrics()` ve `getKPIs(true)` fonksiyonlarını kullanır

**İstemci Tarafı Entegrasyonu** (`src/lib/realtime-sse.ts`):
- `connectToFeed()` — EventSource bağlantısını açar ve otomatik yeniden bağlanma zamanlayıcısını kurar
- `handleFeedData(data)` — Veriyi parse eder ve `onFeedUpdate()` dinleyicisini tetikler
- `reconnectFeed()` — Exponential backoff uygular (1sn, 2sn, 4sn... en fazla 60sn)
- `onFeedUpdate(callback)` — Akış güncellemelerini almak için callback kaydeder
- `disconnect()` ile component unmount olduğunda otomatik ayrılır

### Sadakat ve Ödül Sistemi

Puanlar, rozetler, başarımlar, seviyeler ve kullanılabilir ödüller içeren tam oyunlaştırma sistemi.

**Bileşenler**:
- `src/lib/loyalty-points.ts` — Puan işlemleri, bakiye takibi ve geçmiş
- `src/lib/badges.ts` — Rozet tanımları ve verme mantığı
- `src/lib/achievements.ts` — Başarım tanımları, açılma koşulları ve istatistikler
- `src/lib/gamification.ts` — Başarımları tetikleyen event hook'ları (yorum oluşturma, fotoğraf yükleme, günlük giriş)

**Veritabanı Tabloları**:
- `loyalty_points` — Puan işlemleri (`user_id`, `amount`, `type`, `reason`, `created_at`)
- `user_badges` — Verilen rozetler (`user_id`, `badge_key`, `awarded_at`, `reason`)
- `user_achievements` — Açılmış başarımlar (`user_id`, `achievement_id`, `unlocked_at`, `viewed_at`)
- `loyalty_tiers` — Kullanıcı seviye atamaları (`user_id`, `tier_name`, `total_points_earned`, `current_points`, `achieved_at`)
- `rewards` — Ödül kataloğu (`reward_name`, `description`, `category`, `points_cost`, `tier_requirement`, `is_active`, `display_order`)
- `reward_inventory` — Stok takibi (`reward_id`, `available_stock`, `total_stock`)
- `user_tier_history` — Seviye ilerleme günlüğü (`user_id`, `tier_name`, `previous_tier`, `achieved_at`, `points_at_achievement`)

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

Premium özellikler için katman tabanlı erişim kontrolü uygulanır.

**Abonelik Katmanları**:
- **Free** (varsayılan) — Temel özellikler (mekan görüntüleme, ayda 1 yorum oluşturma)
- **Premium** — Gelişmiş özellikler (sınırsız yorum, öncelikli listeleme, gelişmiş analitik)
- **Business** — Ticari özellikler (çok kullanıcılı yönetim, API erişimi, özel entegrasyonlar)

**Özellik Kısıtlama**:
- `src/lib/feature-gating.ts` — `isFeatureAvailable(userId, featureKey)` ile kullanıcının katmanını ve özellik erişimini kontrol eder
- `PREMIUM_FEATURES` sabiti, özellik → katman eşlemesini tanımlar
- Kota zorlaması `/api/user/quotas` endpoint'i üzerinden yapılır

**Stripe Entegrasyonu**:
- `POST /api/subscriptions/checkout` — Stripe checkout session oluşturur
- `POST /api/subscriptions/webhook` — Stripe event'lerini dinler (`subscription.updated`, `invoice.payment_succeeded`)
- Webhook güvenliği için HMAC-SHA256 imza doğrulaması kullanılır
- Webhook hatalarında exponential backoff retry uygulanır

**Veritabanı Tabloları**:
- `user_subscriptions` — Aktif abonelikler (`user_id`, `tier_name`, `status`, `stripe_subscription_id`, `current_period_start`, `current_period_end`)
- `subscription_usage` — Aylık özellik kotaları (`user_id`, `feature_key`, `usage_count`, `period_start`, `period_end`)

## Yaygın Geliştirme Görevleri

### Yeni Bir API Endpoint Ekleme

1. `src/pages/api/resource/action.ts` yolunda dosyayı oluştur (REST isimlendirmesini izler)
2. Tipleri, validation, logger, metrics ve veritabanı fonksiyonlarını içe aktar
3. Astro'nun `APIRoute` tipini ve async handler'ı kullan
4. Girişi doğrula: `validateWithSchema(body, commonSchemas.mySchema)` → geçersizse 422 döndür
5. İş mantığını çalıştır (DB sorgusu, dış API çağrısı vb.)
6. Metrikleri kaydet: `recordRequest(method, path, statusCode, duration)`
7. Önemli olayları log'la: `logger.logMutation('create', 'places', recordId, userId)`
8. Request ID header'ı ile JSON yanıt döndür

**Örnek**:
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
    // Girdiyi doğrula
    const body = await request.json();
    const validation = validateWithSchema(body, commonSchemas.mySchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/resource', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Gecersiz girdi', HttpStatus.UNPROCESSABLE_ENTITY, validation.errors, requestId);
    }

    // Is mantigi
    const result = await update('places', { id: body.id }, { name: validation.data.name });

    // Logla ve metrikleri kaydet
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

// İstemci tarafı kalıbı
const RealtimeManager = {
  async connectToFeed() {
    const eventSource = new EventSource('/api/realtime/feed');
    eventSource.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      this.onFeedUpdate?.(data);
    });
  },
  // Üstel geri çekilme ile otomatik yeniden bağlan
  reconnect(attempt = 0) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
    setTimeout(() => this.connectToFeed(), delay);
  }
};
```

**Ana Kalıplar**:
- Backpressure yönetimi için `ReadableStream` kullan
- Sunucuyu belirli aralıklarla yokla (feed için 15sn, metrikler için 5sn)
- Yalnızca yeni veriyi göndermek için cursor tabanlı takip uygula
- Kritik olmayan güncellemelerde beklemesiz arka plan sorguları kullan
- Üstel geri çekilme ile yeniden bağlan (en fazla 60sn)

### Oyunlaştırma ve Event Hook'ları

Başarım kilit açma akışı kullanıcı eylemlerinden tetiklenen event hook'larıyla çalışır:

```typescript
// src/lib/gamification.ts kalıbı
export async function onReviewCreated(userId: string) {
  // Mevcut hook'lar
  await checkAndGrantBadges(userId, 'review');
  await updateUserLevelIfNeeded(userId);

  // YENİ: Başarımları otomatik aç
  await checkCommonAchievements(userId); // achievements.ts içinden
}

// src/lib/achievements.ts
export async function checkCommonAchievements(userId: string) {
  try {
    // İç mantık: kullanıcı istatistiklerini al, koşulları kontrol et, eşleşen başarımları aç
    // Dışarı hata fırlatmaz: iç try/catch içerir
  } catch (err) {
    logger.error('Başarım kontrolü başarısız', err);
  }
}
```

**Bağlı Event Hook'ları**:
- `onReviewCreated(userId)` — Yorumla ilgili başarımları kontrol eder
- `onPhotoUploaded(userId)` — Yükleme ile ilgili başarımları kontrol eder
- `onDailyLogin(userId)` — Seri/giriş ile ilgili başarımları kontrol eder

### Testler

```bash
# Birim testleri
npm run test:unit
npm run test:unit:watch

# E2E testleri (uygulama çalışıyor olmalı)
npm run test:e2e
npm run test:e2e:ui

# Tüm testler
npm run test
```

`e2e/` altındaki test dosyaları uçtan uca akışları kapsar (auth, mekanlar, admin erişimi).

## Önemli Dosyalar

### Çekirdek Altyapı
| Dosya | Amaç |
|------|------|
| `DEPLOYMENT.md` | PM2, Nginx, SSL ve yedeklerle tam CentOS Web Panel üretim dağıtım rehberi |
| `tsconfig.json` | TypeScript strict modu; gevşetilmemelidir |
| `.env.example` | Ortam değişkeni şablonu (kritik: DATABASE_URL, JWT_SECRET, REDIS_URL) |
| `Dockerfile` | Yerel docker-compose yapısı için geliştirme container imajı |
| `docker-compose.yml` | PostgreSQL, Redis ve Node.js içeren geliştirme yapısı (yalnızca yerel geliştirme) |
| `ecosystem.config.js` | Üretim için PM2 yapılandırması (dağıtım sırasında oluşturulur) |

### Çekirdek Kütüphaneler
| Dosya | Amaç |
|------|------|
| `src/middleware.ts` | İstek kimlik doğrulama, CORS, rate limiting ve güvenlik başlıkları |
| `src/lib/postgres.ts` | Veritabanı pool'u, parametrik sorgular, tablo izin listesi ve yavaş sorgu izleme |
| `src/lib/auth.ts` | Bcrypt hashleme, Redis session'ları, token üretim/doğrulama |
| `src/lib/cache.ts` | Redis istemcisi, ad alanlı anahtarlar, rate limiting ve cache işlemleri |
| `src/lib/validation.ts` | Sanitization ile şema tabanlı doğrulama |
| `src/lib/logging.ts` | İstek kimliği takibi ile yapılandırılmış loglama |
| `src/lib/metrics.ts` | İstek/sorgu metrikleri, toplulaştırma ve performans istatistikleri |
| `src/lib/api.ts` | Yanıt/hata formatlayıcılar, HTTP sabitleri ve doğrulama yardımcıları |
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

### Ops Governance ve Kaynak Gerçekler
| Dosya | Amaç |
|------|------|
| `docs/ops/README.md` | Ops doküman giriş noktası |
| `docs/ops/SOURCE_OF_TRUTH_MAP.md` | Hangi kararın hangi dosyaya ait olduğunu gösterir |
| `docs/RELEASE_GATES.md` | Release gate davranışı ve karar modeli |
| `docs/ops/BRANCH_PROTECTION.md` | Zorunlu kontroller ve parity kuralları |
| `docs/ops/ARTIFACT_FRESHNESS_POLICY.md` | Artefact freshness durum semantiği |
| `docs/ops/ARTIFACT_RETENTION_POLICY.md` | Artefact ve audit retention kuralları |
| `docs/ops/INCIDENT_RUNBOOK.md` | Incident müdahale sırası |
| `docs/ops/INTEGRATION_READINESS.md` | Admin entegrasyon readiness politikası |
| `docs/ops/LEGACY_PHASE_SURFACE.md` | Eski faz uyumluluk sınırları |
| `docs/SCRIPT_SURFACE_POLICY.md` | Script yüzeyi ve runner-first politikası |
| `src/types/generated-admin-api.ts` | Üretilmiş admin API kontrat tipleri |
| `src/types/admin-api.ts` | UI-facing admin tip katmanı |
| `src/lib/admin-format.ts` | Admin ops ortak tarih/fallback format kaynağı |
| `src/lib/admin-index-data.ts` | Admin ana sayfa SSR veri yükleyici kaynağı |
| `src/lib/admin-index.ts` | Admin ana sayfa risk/araç görünüm modeli kaynağı |
| `src/lib/admin-index-page.ts` | Admin ana sayfa badge/kart sınıf kaynağı |
| `src/lib/admin-index-view.ts` | Admin ana sayfa render görünüm modeli kaynağı |
| `src/lib/admin-ops-pages.ts` | Runtime monitor + access coverage trend/delta/geçmiş kaynağı |
| `src/lib/runtime-monitor.ts` | Runtime monitor endpoint ve coverage özet kaynağı |
| `src/lib/admin-access-coverage-page.ts` | Access coverage uyarı/özet/drift HTML kaynağı |
| `src/lib/admin-dom.ts` | Admin ops sayfaları için ortak DOM güncelleme helper kaynağı |
| `src/lib/admin-page-bootstrap.ts` | Admin ops sayfaları için ortak refresh/interval bootstrap kaynağı |
| `src/lib/astro-migration-report.ts` | Astro hydration risk envanteri kaynağı |
| `scripts/astro-hydration-inventory.ts` | Astro hydration envanter raporu üreticisi |

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
| `src/lib/loyalty-points.ts` | Puan işlemleri ve bakiye takibi |
| `src/lib/badges.ts` | Rozet tanımları ve verme mantığı |
| `src/lib/achievements.ts` | Başarım tanımları ve kilit açma koşulları |
| `src/lib/gamification.ts` | Otomatik başarım açma için event hook'ları |
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

**Kritik** (üretim için zorunlu):
- `DATABASE_URL` — PostgreSQL bağlantı dizgesi (zorunlu)
- `JWT_SECRET` — Token imzalama sırrı (en az 32 karakter, zorunlu)
- `REDIS_URL` — Redis bağlantı dizgesi (zorunlu, namespace prefix mantığını içerir)
- `REDIS_KEY_PREFIX` — Redis anahtar ad alanı (varsayılan: `sanliurfa:`, diğer projelerden ayırır)

**Önerilen**:
- `CORS_ORIGINS` — Virgülle ayrılmış izinli origin listesi (varsayılan: https://sanliurfa.com)
- `NODE_ENV` — `production` veya `development` (SSL, loglama ve hata mesajlarını etkiler)

**İsteğe Bağlı**:
- Supabase anahtarları (eski uyumluluk için)
- OAuth anahtarları (Google, Facebook)
- E-posta servis API anahtarları (Resend)

## Dağıtım

### Geliştirme Stack'i (Docker)
- **Docker Compose**: PostgreSQL, Redis ve Node.js servisleriyle `docker-compose.yml`
- **Kullanım**: Tüm bağımlılıklarla tam yerel yapı için `docker-compose up`
- **Amaç**: Tutarlı geliştirme ortamı; production servislerini taklit eder

### Production Dağıtımı (CentOS Web Panel)
- **Platform**: CentOS Web Panel üzerinde paylaşımlı barındırma (Docker değil)
- **Servis Yöneticisi**: PM2 (önerilen) veya Systemd
- **Süreç**:
  1. Depoyu `~/sanliurfa` altına klonla
  2. NVM ile Node.js kur
  3. `npm install --legacy-peer-deps` ve `npm run build` çalıştır
  4. PostgreSQL/Redis'i yapılandır
  5. `ecosystem.config.js` ile PM2 ayarla
  6. CWP panelinde Nginx reverse proxy ayarla (port 6000)
  7. CWP SSL Manager ile Let's Encrypt SSL kur
  8. Crontab ile otomatik yedekleme planla

Tam CentOS Web Panel production kurulum rehberi için **`DEPLOYMENT.md`** dosyasına bak.

- **Env**: Kritik değişkenleri sunucudaki `.env` dosyasında ayarla
- **Redis**: Erişilebilir olmalı (`redis-cli ping`); çoğu zaman hosting tarafından sağlanır
- **Veritabanı**: PostgreSQL sağlanır; kullanıcı ve veritabanı oluştur, ilk açılışta migration'ları çalıştır
- **İzleme**: `/api/health` endpoint'i, PM2 logları ve crontab health check script'i kullan

## Sonraki Geliştirme İçin Notlar

### Kritik Kurallar
1. **TypeScript Strict Modu**: `tsconfig.json` içindeki `strict: true` ayarı gevşetilmez. Tüm hatalar düzeltilmeli veya açıklamalı `// @ts-expect-error` ile işaretlenmelidir.
2. **Parametrik Sorgular**: SQL'de her zaman `$1`, `$2` vb. sözdizimini kullan. Kullanıcı girdisini doğrudan sorguya gömme.
3. **Tablo İzin Listesi**: Yeni tablo eklersen `postgres.ts` içindeki `ALLOWED_TABLES` kümesini güncelle.
4. **Redis Ad Alanı**: Yeni tüm cache anahtarları `sanliurfa:` prefix'i ile başlamalıdır (`prefixKey()` helper'ı bunu yönetir). **KRİTİK**: ad alanı izolasyonu, paylaşılan Redis üzerinde diğer projelerle çakışmayı önler.
5. **Girdi Doğrulama**: Her API endpoint'i kullanmadan önce `validateWithSchema()` ile girdi doğrulaması yapmalıdır.
6. **Hata Yönetimi**: API route'larında hataları yakala; ham hataları istemciye fırlatma. Sunucu görünürlüğü için stdout/stderr'a logla.
7. **SSE Uygulaması**: Gerçek zamanlı endpoint'lerde her zaman `ReadableStream` kullan, `Cache-Control: no-cache` ve `Connection: keep-alive` başlıklarını ekle, istemci tarafında en fazla 60sn gecikmeli üstel geri bağlanma uygula.
8. **Oyunlaştırma Hook'ları**: `checkCommonAchievements()` doğrudan değil event hook'ları içinden çağrılmalıdır. İç try/catch kullandığı için dışarı hata fırlatmamalıdır.
9. **Cache Invalidation**: Her mutation'da (POST/PUT/DELETE) ilgili cache pattern'lerini temizle. Sadakat değişimlerinde `sanliurfa:loyalty:*` ve `sanliurfa:tier:*` pattern'lerini temizle.
10. **Admin Koruması**: Yeni admin API endpoint'leri `withAdminOpsReadAccess(...)` veya `withAdminOpsWriteAccess(...)` kullanmalıdır. Admin sayfaları yönlendirme yapabilir; admin API route'ları yönlendirme değil, API tarzı 403/429/422 yanıtları döndürmelidir.
11. **Admin API Kontratı**: Bir admin endpoint'i değişirse `src/pages/api/openapi.json.ts` dosyasını güncelle, `src/types/generated-admin-api.ts` dosyasını yeniden üret ve `src/types/admin-api.ts` ile hizalı tut. `npm run types:admin:drift:check` komutunu otoriter kabul et.
12. **Birincil Gate'ler**: Bir değişikliği yeşil saymadan önce `npm run typecheck:app`, `npm run test:critical` ve `npm run test:e2e:smoke` komutlarını tercih et. `npm run test` daha geniş eski regresyon kapsamıdır; birincil operasyonel gate değildir.
13. **Faz İş Akışı**: Faz uyumluluğu runner-first yaklaşımıyla yürür. `package.json` içinde geniş faz alias yüzeylerini geri getirme; `docs/ops/LEGACY_PHASE_SURFACE.md` ve `docs/SCRIPT_SURFACE_POLICY.md` içinde tanımlı runner ve manifest akışını kullan.
14. **Beklemesiz Arka Plan İşleri**: Kritik olmayan arka plan işleri için (örneğin mention'ları okundu işaretlemek) istek timeout'una yol açmamak adına sorguları `await` etmeden kuyruğa al.
15. **Admin UI Ops Sayfaları**: `/admin`, `/admin/runtime-monitor` ve `/admin/access-coverage` için önce helper/view-model modüllerini değiştir (`src/lib/admin-format.ts`, `src/lib/admin-index-data.ts`, `src/lib/admin-index*.ts`, `src/lib/admin-ops-pages.ts`, `src/lib/runtime-monitor.ts`, `src/lib/admin-access-coverage-page.ts`, `src/lib/admin-dom.ts`, `src/lib/admin-page-bootstrap.ts`) ve tarayıcı smoke testlerini yeşil tut. `/admin` için `index.astro` dosyasını düzenlemeden önce SSR veri toplama için `src/lib/admin-index-data.ts`, render kararları için `src/lib/admin-index-view.ts` dosyasını tercih et.
16. **Astro Migration Planlaması**: Migration backlog şu anda kapalıdır. React UI veya hydration bilinçli olarak geri getirilirse bir sonraki React-to-Astro hedefini sezgisel seçme. `npm run astro:migration:inventory` komutunu yeniden çalıştır, `docs/reports/astro-hydration-inventory.md` dosyasını oku ve belgelenmiş farklı bir gerekçe yoksa önce düşük riskli bucket'tan ilerle.

### Performans Optimizasyonu
- Okuma yüzeylerinde cache'i agresif kullan (5-10 dakika TTL, mutation'da temizle)
- Veritabanı pool'unu izle: kullanım %80'i aşarsa yavaş sorguları araştır
- Darboğazları incidente dönüşmeden önce görmek için `/api/performance` kullan
- 1000ms üzeri yavaş sorgular otomatik uyarı log'una düşer; hemen incele
- 500ms üzeri istekler takip edilir; trend sorunları görmek için toplu veriyi düzenli incele

### Özellik Ekleme

**Yeni Veritabanı Tabloları**:
- `postgres.ts` içindeki `ALLOWED_TABLES` listesini güncelle
- `migrations/` altında migration dosyası oluştur (`timestamp_description.sql`)
- Endpoint kodunu dağıtmadan önce migration'ı tüm ortamlarda çalıştır

**Yeni API Endpoint'leri**:
- `src/lib/api.ts` içindeki yanıt formatlayıcı kalıbını izle
- Admin endpoint'lerinde dağınık inline rol kontrolü yerine ortak admin ops access wrapper'ını kullan
- Kullanmadan önce `validateWithSchema()` ile girdi doğrulaması yap
- Metrikleri kaydet: `recordRequest(method, path, status, duration)`
- Önemli mutation'ları log'la: `logger.logMutation(action, table, recordId, userId, details)`
- Yanıt header'larında `X-Request-ID` döndür
- Endpoint admin UI tarafından tüketiliyorsa veya admin kontrat şeklini değiştiriyorsa `src/pages/api/openapi.json.ts` dosyasını güncelle
- `npm run types:admin:generate` ile admin API tiplerini yeniden üret
- `npm run types:admin:drift:check` komutunu yeşil tut
- SSE endpoint'lerinde `ReadableStream` kalıbını kullan, gerekli header'ları ekle ve istemci tarafı yeniden bağlanmayı uygula

**Yeni Doğrulamalar**:
- `validation.ts` içindeki `commonSchemas` listesine ekle
- Kullanıcıya görünen metinler için sanitization ekle (`sanitize: true`)

**Yeni Cache Kullanımı**:
- `prefixKey()` yardımcısını kullan (veya `sanliurfa:` prefix'ini açıkça yaz)
- TTL değerini yorumlarda belgele (5 dakika = 300sn, 10 dakika = 600sn vb.)
- Mutation'larda her zaman `deleteCache()` veya `deleteCachePattern()` ile invalidation yap

**Yeni Sadakat Özellikleri**:
- Yeni başarımları `src/lib/achievements.ts` içindeki `ACHIEVEMENT_DEFINITIONS` listesine ekle
- `checkCommonAchievements(userId)` çağrısını ilgili gamification hook'larına bağla
- Yeni ödülleri `POST /api/admin/loyalty/rewards` üzerinden oluştur (UI veya doğrudan DB insert)
- Yeni rozetleri badge tanımlarına ekle ve kazanıldığında `awardBadgeToUser()` çağır
- Yeni puan işlemlerinde anlamlı neden dizeleriyle `awardPoints(userId, amount, reason)` kullan

**Yeni Gerçek Zamanlı Akışlar**:
- `/pages/api/realtime/example.ts` altında SSE endpoint'i oluştur
- Polling aralığıyla birlikte `ReadableStream` kullan
- Cursor tabanlı pagination uygula (`lastActivityId`, `lastTimestamp` vb. takibi)
- `src/lib/realtime-sse.ts` içine `connectToExample()`, `handleExampleData()` ve listener metodunu ekle
- İstemci tarafı yeniden bağlanma mantığını üstel geri çekilme ile uygula

**Yeni Özellik Gate'leri**:
- Özellik anahtarını `src/lib/feature-gating.ts` içindeki `PREMIUM_FEATURES` listesine ekle
- Özellik → gerekli katman eşlemesini yap (Free/Premium/Business)
- Kullanılabilirliği `isFeatureAvailable(userId, featureKey)` ile kontrol et
- Kota limitlerini `/api/user/quotas` endpoint'i ile uygula

**Yeni Metrikler**:
- `recordRequest()` çağrılarına veya özel `recordSlowOperation()` çağrılarına ekle
- Metrikler `/api/metrics` endpoint'inde toplanır ve adminler tarafından görüntülenebilir

### Testler
- Minimum pre-commit / pre-push gate:
  - `npm run typecheck:app`
  - `npm run test:critical`
  - `npm run test:e2e:smoke`
- Admin kontrat değişikliklerinde ayrıca şunlar gerekir:
  - `npm run types:admin:drift:check`
- Değişiklik release readiness, branch protection parity, özetler veya ops kararlarını etkiliyorsa `npm run release:gate` kullan
- `npm run test` geniş regresyon kapsamı için hâlâ faydalıdır; ancak birincil bloklayıcı sinyal değildir

### İzleme
- Her dağıtımdan sonra `/api/health` kontrol et
- Hata oranı artışı veya cache miss sıçramaları için `/api/metrics` izle
- Optimizasyon fırsatları için `/api/performance` içindeki yavaş sorguları haftalık gözden geçir
- Veritabanı pool doygunluğu (>%80 aktif) ölçekleme ihtiyacına işaret eder
- Tüm hatalar dağıtık izleme için istek kimliğiyle birlikte stdout'a loglanır
