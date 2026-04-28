# TEST.md — Manuel Test Senaryoları

---

## Batch #174 — review duplicate + notification preference atomik upsert

**Amaç:** `src/lib/places/`, `src/lib/review/`, `src/lib/user/`, `src/lib/blog/`, `src/lib/notifications/`, `src/lib/search/`, `src/lib/events/`, `src/pages/api/admin/` (81 endpoint) tarandı; 2 gerçek ihlal giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/lib/review/review-submission.ts:64-70` | `SELECT id FROM reviews WHERE ...` + `if rows > 0 throw` — eş zamanlı iki istek her ikisini de `INSERT` yapabilir (HARD RULE #47) | Pre-check SELECT kaldırıldı; `INSERT` etrafına try-catch eklendi: PostgreSQL `23505` (unique_violation) → `'Bu mekan için zaten yorum yazdınız.'` |
| `src/lib/notifications/index.ts:305-323` | `getNotificationPreference()` SELECT + koşullu `UPDATE`/`INSERT` — concurrent istek duplicate INSERT yapabilir (HARD RULE #47) | Tek atomik `INSERT ... ON CONFLICT (user_id, channel) DO UPDATE SET enabled=..., frequency=..., updated_at=NOW()` |

### False Positive (düzeltilmedi)

| Dosya | Raporlanan sorun | Neden false positive |
|---|---|---|
| `src/lib/places/db.ts:incrementViewCount` | Race condition | `UPDATE SET view_count = view_count + 1` — zaten atomic, SELECT yok |
| `src/lib/blog/newsletter-subscriptions.ts` | SELECT + INSERT ON CONFLICT | SELECT sadece erken dönüş için, INSERT zaten ON CONFLICT ile atomic |
| `src/lib/events/events-management.ts:attendee_count` | Count race | `UPDATE SET attendee_count = attendee_count + 1` — atomic |
| `src/lib/search/search-intelligence.ts` | Dynamic RegExp | `escapedTerm` regex escape doğru uygulanmış; false positive |
| `src/pages/api/admin/` (81 endpoint) | HARD RULE #52 | Tüm yüksek-etki endpoint'ler `role !== 'admin'` kontrolü kullanıyor; clean |

### Manuel test

1. Aynı `place_id` + `user_id` kombinasyonu için eş zamanlı iki `submitPlaceReview` isteği gönder → yalnızca biri `INSERT` yapmalı; diğeri `'Bu mekan için zaten yorum yazdınız.'` hatası almalı
2. `updateNotificationPreference` aynı `(userId, channel)` için iki kez çağır → duplicate INSERT olmadan her ikisi de başarıyla tamamlanmalı

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/lib/review/` (6 dosya) | ✅ Temiz |
| `src/lib/notifications/` (3 dosya) | ✅ Temiz |
| `src/lib/places/` (6 dosya) | ✅ Temiz |
| `src/lib/user/` (5 dosya) | ✅ Temiz |
| `src/lib/blog/` (4 dosya) | ✅ Temiz |
| `src/lib/search/` (10 dosya) | ✅ Temiz |
| `src/lib/events/` (2 dosya) | ✅ Temiz |
| `src/pages/api/admin/` (81 endpoint) | ✅ Temiz — HARD RULE #52 uyumlu |

---

## Batch #173 — admin-users atomik upsert

**Amaç:** `src/lib/admin/`, `src/lib/analytics/`, `src/lib/email/`, `src/pages/api/warehouse/`, `src/lib/analytics-realtime/` tarandı; 1 gerçek ihlal giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/lib/admin/admin-users.ts:352-370` | `updateUserActivitySummary` — `SELECT id` + koşullu `update()`/`insert()` — eş zamanlı iki çağrı aynı `user_id` için duplicate INSERT yapabilir (HARD RULE #47) | `SAFE_COL` regex filtresi ile kolonları validate et; tek atomik `INSERT ... ON CONFLICT (user_id) DO UPDATE SET ...` |

### False Positive (düzeltilmedi)

| Dosya | Raporlanan sorun | Neden false positive |
|---|---|---|
| `src/lib/city-content-agents.ts:302` | `error.message` return değerinde | İç kütüphane fonksiyonu, API endpoint değil; `digest` alanı operasyonel iç veri, client'a doğrudan gitmiyor |
| `src/lib/email/index.ts:151` | `error.message` return değerinde | Kütüphane fonksiyonu; callers API response'a koymadan önce `safeErrorDetail` uygulamalı |
| `src/pages/api/warehouse/query.ts:54-55` | `parseInt(String(limit), 10)` | Body'den gelen değer (query param değil); `Number.isFinite()` guard mevcut — HARD RULE #17 yalnızca `url.searchParams` kapsamında |
| `src/lib/analytics-realtime/index.ts:137` | `parseInt(dbActiveUsers.rows[0]?.count)` | DB COUNT() sonucu, query param değil; HARD RULE #17 kapsamı dışı |
| `src/lib/analytics/supply-chain-analytics.ts` | `Math.random()` kullanımı | Analytics simülasyonu — HARD RULE #38 explicit istisnası |

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/lib/admin/admin-users.ts` | ✅ Temiz — atomic upsert |
| `src/lib/analytics/supply-chain-analytics.ts` | ✅ False positive — simülasyon |
| `src/lib/email/index.ts` | ✅ Temiz — library level, endpoint sorumluluğu |
| `src/pages/api/warehouse/query.ts` | ✅ Temiz — NaN guard mevcut |
| `src/lib/analytics-realtime/index.ts` | ✅ Temiz — DB değeri, query param değil |

---

## Batch #172 — actions/index.ts safeErrorDetail + content-management atomik sayaç

**Amaç:** `src/actions/index.ts` (13 action catch block) ve `src/lib/content/content-management.ts` tarandı; 2 farklı türde açık giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/actions/index.ts:35` | 13 non-auth action catch block — `error instanceof Error && error.message ? error.message : 'fallback'` pattern; DB constraint adları, iç tablo isimleri response'a sızar (HARD RULE #48) | `import { safeErrorDetail } from '../lib/api'` eklendi; 13 catch block `safeErrorDetail(error, 'Türkçe fallback')` ile güncellendi |
| `src/lib/content/content-management.ts:219-228` | `recordContentView` — `queryOne(...).then(c => c.view_count + 1)` Promise nesnesi DB'ye yazılıyordu (Promise-as-value bug); `SELECT id` + `UPDATE/INSERT` race condition (HARD RULE #47) | Atomic `UPDATE content_items SET view_count = view_count + 1 WHERE id = $1`; `INSERT INTO content_analytics ON CONFLICT DO UPDATE SET view_count = view_count + 1` |

### False Positive (düzeltilmedi)

- `src/actions/index.ts:login`, `verifyLoginTwoFactor`, `register`, `resetPassword` — auth flow catch block'ları `error.message`'ı direkt kullanıyor; `runLoginFlow` / `runLoginTwoFactorFlow` / `runRegisterFlow` / `resetPasswordWithToken` kasıtlı kullanıcıya yönelik mesaj throw eder ("E-posta veya şifre hatalı" gibi); CLAUDE.md istisnası geçerli
- `src/actions/index.ts:requestPasswordReset` — zaten hardcoded fallback mesaj kullanıyor, `error.message` yok; düzeltmeye gerek olmadı

### Manuel test

1. Bir yorum formu gönder → **başarı**: form gönderi çalışır; **DB hatası simüle et**: response'da `safeErrorDetail` fallback Türkçe mesaj görünmeli, iç DB hatası görünmemeli
2. Bir içerik sayfasına birden fazla kez eriş → `content_items.view_count` artmalı; eş zamanlı istek testi (race condition beklenmez artık)

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/actions/index.ts` (tüm action catch block'ları) | ✅ Temiz |
| `src/lib/content/content-management.ts` (recordContentView) | ✅ Temiz — atomic SQL |

---

## Batch #171 — pages + middleware + leaderboards güvenlik taraması

**Amaç:** `src/pages/` Astro sayfaları, `src/middleware.ts` ve kalan lib modülleri tarandı; 2 gerçek açık giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/pages/500.astro:11` | `Math.random().toString(36)` hata takip kodu üretiminde (HARD RULE #38) | `randomBytes(6).toString('hex').toUpperCase()` — `import { randomBytes } from 'node:crypto'` eklendi |
| `src/lib/leaderboards/leaderboards.ts:88-107` | `SELECT id` + `UPDATE/INSERT` race condition — eş zamanlı iki çağrı duplicate INSERT yapabilir (HARD RULE #47) | Tek atomik `INSERT ... ON CONFLICT (user_id, leaderboard_type, period) DO UPDATE SET rank=..., score=..., updated_at=NOW()` |

### False Positive (düzeltilmedi)

- `src/pages/blog/[slug].astro` ve `src/pages/gezilecek-yerler/[slug].astro` — `set:html={content_html}` admin tarafından girilen içerik; CLAUDE.md'de Astro `set:html` server-side trusted content için tasarlanmış; risk kabul edilebilir
- `src/lib/logger.ts` — `error.stack` logger içinde kullanımı; sistem log'u, API response değil
- `src/lib/gamification.ts` — logger.error içi error passing; false positive

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/pages/` (giris, kayit, sifre-sifirla, profil/*, admin/*, 404, 500) | ✅ Temiz |
| `src/middleware.ts` (rate limit, CORS, auth, security headers, body cap) | ✅ Temiz |
| `src/lib/leaderboards/` | ✅ Temiz |
| `src/lib/gamification/` | ✅ Temiz |
| `src/lib/loyalty-points.ts` | ✅ Temiz — atomic WHERE guard |
| `src/lib/exec-file.ts` | ✅ Temiz |
| `src/lib/public-app-url.ts` | ✅ Temiz |
| `src/lib/audit.ts` | ✅ Temiz — `crypto.randomBytes()` |

---

## Batch #170 — root-level lib + components güvenlik taraması

**Amaç:** Root-level lib dosyaları, oauth/badges/achievements/tracking, ve `src/components/` (110 dosya) tarandı — tüm bulgular false positive.

### False Positive (düzeltilmedi)

| Dosya | Raporlanan sorun | Neden false positive |
|---|---|---|
| `src/lib/webhooks/index.ts:233` | raw error `webhook_deliveries` tablosuna yazılıyor | İç DB log tablosu; push_deliveries ile aynı pattern; client'a dönmüyor |
| `src/components/BusinessAnalyticsDashboard.tsx:239` | Inline `<svg viewBox="0 0 100 42">` | Static lock sadece `viewBox="0 0 24 24"` yakalar; chart SVG farklı dimension |
| `src/components/vendor/AnalyticsDashboard.tsx:105` | Inline `<svg viewBox="0 0 32 32">` | Donut chart, `viewBox="0 0 24 24"` pattern'i değil |
| `src/components/map/LeafletMap.astro:108` | `<img>` Leaflet JS template string içinde | Astro Image component compile-time; JS string'e inject edilemez |
| `src/components/Map.astro:87` | Script bloğunda SVG markup atması | `<script is:inline>` vanilla JS; HARD RULE #28 React TSX kapsamı dışı |
| `src/lib/validation.ts:94` | `new RegExp(pattern)` | Developer-defined schema değeri, user input değil |

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/lib/*.ts` (root-level: auth, postgres, api, env, performance, utils) | ✅ Temiz |
| `src/lib/oauth/` | ✅ Temiz |
| `src/lib/badges/` | ✅ Temiz |
| `src/lib/achievements/` | ✅ Temiz — ON CONFLICT atomic pattern |
| `src/lib/tracking/` | ✅ Temiz — `crypto.randomBytes()` |
| `src/components/` (110 dosya — HARD RULE #19, #21, #26, #27, #28, #29, #30, #31) | ✅ Temiz |

---

## Batch #169 — lib modülleri tarama (places, file, realtime, data, seo)

**Amaç:** Kalan lib modüllerinde güvenlik taraması — tüm temiz.

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/lib/places/` (categories, user-submissions, reviews, place-application) | ✅ Temiz |
| `src/lib/file/` (file-management, index) | ✅ Temiz |
| `src/lib/realtime/` | ✅ Temiz |
| `src/lib/data/` (pipeline, warehouse, governance, quality, transformation, catalog) | ✅ Temiz |
| `src/lib/reporting/` | ✅ Temiz |
| `src/lib/recommendation/` | ✅ Temiz |
| `src/lib/seo/` (seo, seo-utils, sitemap, dynamic-meta) | ✅ Temiz |
| `src/lib/apm/`, `src/lib/performance/`, `src/lib/locale/`, `src/lib/maps/`, `src/lib/collection/`, `src/lib/reservation/`, `src/lib/payment/` | ✅ Dizin yok |

### False Positive

- `seo/seo-utils.ts:149` — `Math.random()` UI shuffle (related links önerisi); HARD RULE #38 güvenlik-kritik dosya kapsamı dışında
- `data/data-quality.ts:229` — `Math.random()` anomaly detection simülasyonu; analytics bağlamı, HARD RULE #38 kapsamı dışında
- `places/place-application.ts:107` — `bcrypt.hash(\`vendor-${ownerEmail}-${Date.now()}\`, 10)` provisional password hash; bcrypt salt ile korumalı, design concern değil security critical

---

## Batch #168 — blog-webhooks CommonJS require + SSRF fix

**Amaç:** `blog-webhooks.ts`'de `require('crypto')` CommonJS anti-pattern ve HARD RULE #33 (SSRF) düzeltildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/lib/blog/blog-webhooks.ts:164` | `require('crypto')` — CommonJS `require` ES module içinde; tree-shaking çalışmaz, static analiz kör kalır | `createHmac` `import { ..., createHmac } from 'node:crypto'` ile static import'a alındı |
| `src/lib/blog/blog-webhooks.ts:178` | `registerWebhook` yalnızca `https://` prefix check yapıyordu — `https://127.0.0.1:5432` gibi iç servis URL'leri geçiyordu (HARD RULE #33) | `validateExternalUrl(url)` ile SSRF koruması eklendi |

### False Positive (düzeltilmedi)

- `comment/comments.ts:180` — `${columnName}` SQL'e yazılıyor ama `columnName` ternary ile `'helpful_count' | 'unhelpful_count'` sabit değerlerinden birine bağlı — user input doğrudan ulaşamaz
- `moderation/index.ts:224` — `${mapping.table}` ve `'${mapping.status}'` hardcoded lookup table (`tableMap`) kaynaklı, `if (mapping)` guard ile korumalı
- `search/filters.ts:124,187` — `buildSearchQuery()` deprecated throw fonksiyonu çağrılıyor ama `getFacetCounts`/`executeFacetedSearch` hiçbir yerde import edilmiyor — dead code, runtime'a ulaşmaz

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/lib/blog/` | ✅ Temiz |
| `src/lib/events/` | ✅ Temiz |
| `src/lib/review/` | ✅ Temiz |
| `src/lib/comment/` | ✅ Temiz |
| `src/lib/search/` | ✅ Temiz (deprecated callers dead code) |
| `src/lib/analytics/` | ✅ Temiz |
| `src/lib/vendor/` | ✅ Temiz |
| `src/lib/user/` | ✅ Temiz |
| `src/lib/admin/` | ✅ Temiz |
| `src/lib/moderation/` | ✅ Temiz |

---

## Batch #167 — HARD RULE #51 (SQL column injection) + HARD RULE #47 (race condition)

**Amaç:** `places/db.ts` SQL sütun injection (KRITIK) + `subscription/index.ts` renewSubscription race condition giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/lib/places/db.ts:381-386` | `updatePlace` — `Object.entries(data)` key'leri allowlist'siz SQL'e yazılıyordu; `{ "'; DROP TABLE--": 1 }` gibi caller-controlled key arbitrary SQL çalıştırabilir (HARD RULE #51) | `PLACE_UPDATE_COLUMNS.has(key)` allowlist filter eklendi (allowlist zaten bir önceki adımda eklenmişti) |
| `src/lib/subscription/index.ts:187-210` | `renewSubscription` — SELECT + UPDATE race condition; iki concurrent call aynı aboneliği iki kez yenileyip iki fatura keserdi (HARD RULE #47) | Tek atomik `UPDATE ... WHERE renewed_at < NOW() - INTERVAL '23 hours' RETURNING price`; idempotency guard çift faturalamayı engeller |

### False Positive / Mimari Sınır (düzeltilmedi)

- `src/lib/subscription/index.ts:hasFeatureAccess` — `getUserSubscription()` + `COUNT(*)` iki ayrı query; kullanıcı kota limitini 1 birim aşabilir (eş zamanlı iki create isteği). Quota counter ile atomik çözüm gerektirir — mevcut mimari bunu desteklemiyor, architectural debt olarak kabul edildi.

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/lib/places/db.ts` | ✅ Temiz |
| `src/lib/subscription/index.ts` | ✅ Temiz (renewSubscription atomic; hasFeatureAccess soft-race belgelendi) |

---

## Batch #166 — SQL syntax bug + ReDoS × 2 (lib modülleri)

**Amaç:** lib sweep ile tespit edilen 1 runtime SQL crash + 2 ReDoS güvenlik açığı giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/lib/social/social-interactions.ts:87` | `COUNT(*) as any[] as count` — TypeScript cast `as any[]` SQL string'e sızmış; runtime SQL parse error | `COUNT(*) as count` |
| `src/lib/marketing/marketing-automation.ts:117` | `new RegExp(\`{{\s*${variable}\s*}}\`)` — template variable adı meta-char escape olmadan ReDoS (HARD RULE #16) | `variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` escape eklendi |
| `src/lib/multi/multi-level-cache.ts:73` | `pattern.replace('*', '.*')` — yalnızca `*` handle ediliyor; diğer regex meta-char'lar unescaped kalıyor | Tam meta-char escape + `^...$` anchors |

### False Positive (düzeltilmedi)

- `validation.ts:94` `new RegExp(pattern)` — `pattern` parametresi developer-defined schema regex, user input değil; escape = davranış bozar
- `distributed-cache.ts:69,85` `token === lock.token` timing — in-process in-memory lock, API'ye açık değil; risk kabul edilebilir
- `email/index.ts:151` (`sendViaResend`) — sadece `logger.warn()` içine gidiyor, client'a dönmüyor; Batch #165'te dış `sendEmail` catch düzeltildi

### Tarama durumu

| Alan | Durum |
|---|---|
| `src/pages/api/**` (457 dosya) | ✅ Temiz |
| `src/lib/bulk`, `notifications`, `export-tokens`, `cache-strategy`, `webhook-analytics` | ✅ Temiz (Batch #164) |
| `src/lib/postgres/supabase`, `email`, `webhooks`, `social/auth`, `api.ts` | ✅ Temiz (Batch #165) |
| `src/lib/auth/`, `push/`, `stripe/`, `loyalty/`, `gamification` | ✅ Temiz |
| `src/lib/security/`, `cache/`, `validation/`, `session/` | ✅ Temiz |
| `src/lib/social/` (social-interactions, auth) | ✅ Temiz |
| `src/lib/marketing/`, `multi/` | ✅ Temiz |

---

## Batch #165 — lib modülleri error.message sweep + api.ts parseInt

**Amaç:** 5 lib modülünde HARD RULE #48 (raw error.message) + api.ts'de bare parseInt giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/lib/postgres/supabase.ts:29` | `{ message: error.message }` — signIn Supabase compat layer | `safeErrorDetail(error, 'Oturum açma hatası')` |
| `src/lib/email/index.ts:218` | `sendEmail` outer catch — caller'lara sızıyor | `safeErrorDetail(error, 'E-posta gönderilemedi')` |
| `src/lib/email/index.ts:246` | `verifySmtpConnection` catch — admin test endpoint'e sızıyor | `safeErrorDetail(error, 'SMTP bağlantısı doğrulanamadı')` |
| `src/lib/webhooks/index.ts:88` | `createWebhook` catch — `error.message` | `safeErrorDetail(error, 'Webhook oluşturulamadı')` |
| `src/lib/social/auth.ts:106,212,322` | Google/Facebook/Twitter auth catch — 3 ayrı yer | `safeErrorDetail(error, '... kimlik doğrulaması başarısız')` |
| `src/lib/api.ts:147` | `parseInt(requestId)` NaN riski — overloaded apiResponse | `Number(requestId) || 200` |

### Notlar

- `email/index.ts:150` (`sendViaResend` iç catch) ve `email/index.ts:146` (Resend API response body) — yalnızca `logger.warn()` içine yazılıyor, client'a dönmüyor; FALSE POSITIVE, değiştirilmedi
- `admin/widgets.ts` `parseInt(COUNT(*))` — DB aggregat değeri, user input değil; HARD RULE #17 kapsamı dışı; FALSE POSITIVE
- API endpoint sweep: 457 dosya temiz, HARD RULE #48 tam uyumlu

---

## Batch #164 — lib modülleri: safeErrorDetail + hardcoded secret + Promise.allSettled

**Amaç:** `src/lib/` altındaki 5 modülde HARD RULE #48 ihlali, hardcoded fallback secret ve hatalı Promise semantiği giderildi.

### Düzeltilen dosyalar

| Dosya | Sorun | Fix |
|---|---|---|
| `src/lib/bulk/index.ts` | `error.message` × 4 (3× results.errors + 1× bulkOp.errorMessage) | `safeErrorDetail(error, '...')` — import eklendi |
| `src/lib/notifications/index.ts` | `return { success: false, error: error.message }` | `safeErrorDetail(error, 'Bildirim gönderilemedi')` |
| `src/lib/admin/export-tokens.ts` | `'sanliurfa-export-token-fallback-secret'` hardcoded fallback | Throw if neither `EXPORT_TOKEN_SECRET` nor `JWT_SECRET` set |
| `src/lib/cache/cache-strategy.ts` | `setMany`: `Promise.all` → hata olursa diğerleri abort | `Promise.allSettled` |
| `src/lib/webhook/webhook-analytics.ts` | `getCache().then()` pattern yetersiz; `setCache(key, '', 1)` anti-pattern | `deleteCache` + `Promise.allSettled` |

### Test

```bash
# Build hatasız tamamlanmalı
npm run build

# export-tokens: secret yoksa throw
# test env'de EXPORT_TOKEN_SECRET ve JWT_SECRET unset iken issueExportToken → 500 dönmeli (throw yakalanmalı üst katmanda)
```

### Önemli notlar

- `notifications/index.ts` satır 87: `logNotification({..., error: error.message})` — bu iç log tablosuna yazılır, client'a dönmez; intentionally raw bırakıldı
- `messages.astro` (`Astro.url.search` passthrough): hedef hardcoded `/mesajlar`, URL parser'dan geçmiş query string — low risk, değiştirilmedi

---

## Batch #163 — ESLint auto-fix sıfır ihlal + newsletter curly quote parse fix

**Amaç:** Validation sweep tamamlandı, toolchain doğrulandı, pre-existing parse bug düzeltildi.

### Yapılan işlemler

| İşlem | Sonuç |
|---|---|
| `npx eslint "src/pages/api/**/*.ts" --fix` | 0 violation düzeltildi (tüm string validation pattern'leri zaten temiz) |
| `newsletter/subscribe.ts` curly quote fix | 15 adet U+2018/U+2019 curly quote (`'`) → ASCII apostrophe (`'`); Python binary replace ile; ESLint parse error giderildi |
| `blog/[id]/admin.ts` SQL column check | `fieldMap[key] ?? key` → `allowedFields.includes(col)` guard mevcut; FALSE POSITIVE |
| `promotions/[id].ts` SQL column check | `allowedFields.includes(key)` allowlist guard mevcut; SAFE |

### Nihai durum

```bash
npx eslint "src/pages/api/**/*.ts"          # 0 violation (boş çıktı)
npm run codemod:validation:dry              # 0 dosya
npm run codemod:ast:dry                     # 0 dosya
```

### Validation sweep özeti (Batch #157-#163)

Toplam düzeltilen dosya sayısı: **~50 endpoint**, **~150 satır** — tüm string validation anti-pattern'leri giderildi. Kalıcı araçlar:
- `eslint-local-rules.js` — `local/no-validation-coercion` (fixable) CI'da otomatik yakalanır
- `scripts/codemod-validation.ts` — regex tabanlı bulk fixer
- `scripts/codemod-ast.ts` — ts-morph AST tabanlı edge-case fixer (optional chaining dahil)

---

## Batch #162 — ESLint auto-fix + ts-morph AST codemod (sweep altyapısı tamamlandı)

**Amaç:** Manuel sweep döngüsünü tamamen ortadan kaldıran iki araç eklendi.

### Eklenen/güncellenen dosyalar

| Dosya | Değişiklik |
|---|---|
| `eslint-local-rules.js` | `fixable: 'code'` + her `context.report()` çağrısına `fix(fixer)` eklendi; `formData.get()?.toString?.()` false positive exlcuded |
| `scripts/codemod-ast.ts` | ts-morph tabanlı AST codemod — optional chaining, property access, tüm edge case'ler |
| `package.json` | `npm run codemod:ast` ve `npm run codemod:ast:dry` script'leri |

### Araç karşılaştırması

| | Regex codemod | ESLint auto-fix | ts-morph AST |
|---|---|---|---|
| Çalıştırma | `npm run codemod:validation` | `npm run lint:fix` | `npm run codemod:ast` |
| CI entegrasyonu | ❌ ayrı script | ✅ CI'da otomatik | ❌ ayrı script |
| Editor'de fix | ❌ | ✅ kayıtta düzelir | ❌ |
| Optional chaining | ❌ `?.` eşleşmez | ✅ AST tabanlı | ✅ AST tabanlı |
| Property access (`body.x`) | ✅ `[\w.]+` ile | ✅ | ✅ |
| False positive riski | Düşük | AST = sıfır | AST = sıfır |

### Güncel durum

```bash
npm run lint:fix                        # ESLint — mevcut violation yok, gelecekte otomatik fix
npm run codemod:ast:dry                 # AST codemod — 0 dosya (idempotent)
npm run codemod:validation:dry          # Regex codemod — 0 dosya (idempotent)
```

### False positive notu

`formData.get(...)?.toString?.()` pattern'i ESLint kuralından exclude edildi. TypeScript `FormData.get()` return type'ını `string | File | null` olarak type'lıyor — `.toString?.()` güvenli. Sadece `request.json()` kaynaklı `body.x?.toString?.()` pattern'leri raporlanır.

---

## Batch #161 — String(body.x) property access codemod + 9 dosya otomatik fix

**Amaç:** Codemod transforms 1/2/3 `[\w.]+` ile genişletildi; `String(body.x).length > N` ve `body.x && String(body.x).length > N` pattern'leri artık otomatik yakalanıyor. 5 dosya codemod ile, 1 dosya (optional chaining edge case) manuel düzeltildi.

### Değiştirilen dosyalar

| Dosya | Transform | Anti-pattern |
|---|---|---|
| `admin/site/homepage-sections.ts` | transform 2 + 3 | `body.description && String(body.description).length > 1000`; `String(body.section_key|title).length > N` |
| `admin/site/services.ts` | transform 3 | `String(body.service_key|service_group|title|slug|href).length > N` (5 satır) |
| `collections/index.ts` | transform 2 | `body.description && String(body.description).length > 1000`; `body.icon && String(body.icon).length > 500` |
| `contact.ts` | transform 2 + 3 | `body.phone && String(body.phone).length > 30`; `String(body.name|email|subject|message).length > N` |
| `promotions/[id].ts` | transform 1 | `body.title !== undefined && String(body.title).length > 200`; `body.description !== undefined && String(body.description).length > 5000` |
| `admin/site/media/index.ts` | manuel | `body?.mimeType && String(body.mimeType).length > 100` → optional chaining `?.` regex match etmez, `||` precedence bug olurdu |

### Codemod güncelleme

`scripts/codemod-validation.ts` transforms 1/2/3 `[\w.]+` → property access pattern'leri de kapsar. Edge case: `body?.mimeType &&` opsiyonel zincirleme olan satırlarda transform 3 (standalone) tek başına `body?.mimeType && typeof ... || body.mimeType.length` şeklinde operator precedence hatası üretir → bu tür satırlar manuel düzeltilmeli.

### Kontrol

```bash
npx tsx scripts/codemod-validation.ts --dry-run   # 0 dosya beklenir
npm run lint                                        # 0 violation beklenir
```

---

## Batch #160 — content/ property access typeof guard + codemod genişletme

**Amaç:** Codemod'un `\w+` backreference sınırlaması nedeniyle yakalayamadığı `body.x && body.x.length > N` gibi property access pattern'leri manuel düzeltildi; codemod transforms 4/5/6 `[\w.]+` ile genişletildi.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/content/index.ts` | `!body.title \|\| body.title.length < 3` → typeof eksik; `body.description && body.description.length > 5000` falsy+bare; `body.content && body.content.length > 100000` falsy+bare; `body.content_type && !VALID.has(body.content_type)` falsy ENUM; `body.visibility && !VALID.has(body.visibility)` falsy ENUM | 5 satır: typeof guard + optional typeof pattern + optional ENUM pattern |
| `src/pages/api/content/[contentId].ts` PUT | `body.description && body.description.length > 5000` falsy+bare; `body.content && body.content.length > 100000` falsy+bare; `body.content_type && !VALID.has()` falsy ENUM; `body.visibility && !VALID.has()` falsy ENUM | 4 satır: optional typeof + optional ENUM pattern |
| `scripts/codemod-validation.ts` | Transform 4/5/6 `(\w+)` → `([\w.]+)` — property access pattern'leri (body.x) artık otomatik yakalanır | Backreference genişletme; gelecek codemod çalıştırmalarında `body.x && body.x.length` otomatik fix edilir |

### Neden codemod yakalamadı?

`(\w+)` regex sadece `[a-zA-Z0-9_]` eşleştirir — nokta içermeyen basit identifier'lar. `body.description` gibi property access için `([\w.]+)` gerekli. Backreference `\1` hala aynı string'i (nokta dahil) eşleştirir, false positive riski yok.

### Manuel test

```bash
# content/ endpoint'leri doğrula
npm run lint                              # ESLint — 0 violation beklenir
npx tsx scripts/codemod-validation.ts --dry-run  # 0 dosya beklenir (idempotent)
```

---

## Batch #159 — Codemod + ESLint local rule (otomatik fix altyapısı)

**Amaç:** Manuel batch sweep'lerin yerini alacak iki kalıcı araç eklendi.

### Eklenen dosyalar

| Dosya | Amaç |
|---|---|
| `scripts/codemod-validation.ts` | Tek seferlik otomatik fixer — `src/pages/api/**/*.ts` tüm dosyaları tarar, 6 anti-pattern'i dönüştürür |
| `eslint-local-rules.js` | ESLint v9 flat config local plugin — `local/no-validation-coercion` kuralı |
| `eslint.config.mjs` (güncellendi) | `src/pages/api/**/*.ts` için `local/no-validation-coercion: error` aktif |
| `package.json` (güncellendi) | `npm run codemod:validation` ve `npm run codemod:validation:dry` script'leri |

### Codemod düzelttiği pattern'ler

1. `x !== undefined && String(x).length > N` → `x !== undefined && x !== null && (typeof x !== 'string' || x.length > N)`
2. `x && String(x).length > N` → optional typeof pattern
3. `String(x).length > N` (standalone) → `typeof x !== 'string' || x.length > N`
4. `x && x.length > N` → optional typeof pattern
5. `x && !SET.has(x)` → optional ENUM pattern
6. `x !== undefined && !SET.has(x)` → null+typeof ENUM pattern

### Bu çalıştırmada otomatik fix edilen dosyalar (24 adet)

`admin/city-content-agents.ts`, `admin/moderation/queue.ts`, `admin/performance/recommendations.ts`, `admin/places/create.ts`, `admin/recipes.ts`, `admin/site/media/import.ts`, `admin/site/media/index.ts`, `admin/site/settings.ts`, `admin/social/policies.ts`, `admin/subscriptions/users.ts`, `admin/users/index.ts`, `email/campaigns/index.ts`, `loyalty/rewards.ts`, `loyalty/transactions.ts`, `marketing-campaigns/index.ts`, `notifications/send.ts`, `places/submissions.ts`, `places/[id]/update.ts`, `reservations/index.ts`, `rewards/index.ts`, `social/feed.ts`, `upload/index.ts`, `webhooks/filters.ts`, `webhooks/index.ts`

### Kullanım

```bash
npm run codemod:validation:dry   # önizle (değiştirmez)
npm run codemod:validation       # uygula
npm run lint                     # ESLint — yeni kod anti-pattern içerirse error
```

### İkinci çalıştırma kontrolü

Codemod çalıştırıldıktan sonra `--dry-run` tekrar çalıştırıldı → `0 dosya` (idempotent, kalan pattern yok).

---

## Batch #158 — typeof guard + ENUM optional pattern + .toString?.() coercion (7 dosya, Round 24)

**Amaç:** Round 24 sweep: reviews/index.ts UPDATE path `String(x)` coercion → typeof; places/[id]/like.ts ENUM `action !== undefined` → null+typeof eklendi; reviews/[id]/reactions.ts ENUM falsy → `x !== undefined && x !== null && (typeof ...)`; places/[id]/share.ts platform ENUM falsy fix; social/swipe.ts `targetUserId?.toString?.()` coercion → typeof; social/followers.ts requestId+action typeof+ENUM guard; admin/users/[id].ts flagType+severity+reason+newRole typeof. False positive: `places/[id]/update.ts` ve `admin/places/create.ts` formData kullanıyor (formData.get() her zaman string | null, falsy check sonrası length safe).

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/reviews/index.ts` UPDATE | `String(title).length > 200`, `String(content).length > 5000` — coercion | `x !== undefined && x !== null && (typeof x !== 'string' \|\| x.length > N)` |
| `src/pages/api/places/[id]/like.ts` POST | `action !== undefined && !VALID.has(action)` — null check eksik, typeof yok | `action !== undefined && action !== null && (typeof action !== 'string' \|\| !VALID.has(action))` |
| `src/pages/api/reviews/[id]/reactions.ts` POST | `action && !VALID_ACTIONS.has(action)` — falsy ENUM; `action=0` bypass → default 'add' çalışır | `x !== undefined && x !== null && (typeof x !== 'string' \|\| !VALID.has(x))` |
| `src/pages/api/places/[id]/share.ts` POST | `platform && !VALID_SHARE_PLATFORMS.has(platform)` — falsy ENUM | Aynı optional ENUM pattern |
| `src/pages/api/social/swipe.ts` POST | `body?.targetUserId?.toString?.()` — `.toString()` coercion; `{}` → `'[object Object]'` geçer | `typeof body?.targetUserId === 'string' ? body.targetUserId : null` |
| `src/pages/api/social/followers.ts` POST | `!requestId \|\| !action` falsy only; action ENUM kontrolü yok; non-string body geçilebilir | typeof+ENUM: `VALID_FOLLOW_ACTIONS = Set(['accept','decline'])` guard eklendi |
| `src/pages/api/admin/users/[id].ts` POST | `!VALID_FLAG_TYPES.has(flagType)` typeof yok; `severity && !has()` falsy ENUM; `String(reason).length > 1000` coercion; `!newRole \|\| !has(newRole)` typeof yok | 4 satır: typeof guard + optional ENUM pattern |

### Test senaryoları

- `POST /api/reviews` `action=update` body `{"reviewId":"x","title":99}` → 400 (title typeof number)
- `POST /api/reviews` `action=update` body `{"reviewId":"x","title":{},"content":"x"}` → 400 (title typeof object)
- `POST /api/places/:id/like` body `{"action":null}` → 400 (action null → ENUM fail)
- `POST /api/places/:id/like` body `{"action":123}` → 400 (action typeof number)
- `POST /api/reviews/:id/reactions` body `{"reaction_type":"like","action":0}` → 400 (action falsy number ENUM fail)
- `POST /api/places/:id/share` body `{"platform":42}` → 400 (platform typeof number)
- `POST /api/places/:id/share` body `{"platform":null}` → 400 (platform null ENUM fail)
- `POST /api/social/swipe` body `{"targetUserId":{}}` → 400/null (targetUserId coercion kaldırıldı)
- `POST /api/social/followers` body `{"requestId":"x","action":"ban"}` → 400 (action ENUM invalid)
- `POST /api/social/followers` body `{"requestId":123,"action":"accept"}` → 400 (requestId typeof number)
- `POST /api/admin/users/:id` `action=flag` body `{"flagType":{},...}` → 422 (flagType typeof object)
- `POST /api/admin/users/:id` `action=flag` body `{...,"severity":"supermax"}` → 422 (severity ENUM invalid)
- `POST /api/admin/users/:id` `action=changeRole` body `{"newRole":["admin"]}` → 422 (newRole typeof array)

---

## Batch #157 — typeof guard + String() coercion → typeof + Number.isFinite (7 dosya, Round 23)

**Amaç:** Round 23 sweep: places/submissions.ts UPDATE+CREATE path `name && .length` → optional typeof pattern; CREATE path priceRange ENUM guard eklendi; places/[id]/share.ts `String(share_url)` → typeof; admin/moderation.ts `String(reason/notes)` → typeof; admin/loyalty/rewards.ts `String(reward_name/category/description)` → typeof; admin/loyalty/award.ts `amount` eksik `Number.isFinite` guard. events/create.ts ve events/[id]/update.ts: false positive — formData `?.toString()` sonrası required field check yeterli, `.length` güvenli.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/places/submissions.ts` UPDATE | `name && name.length > 200` × 4 — falsy guard; non-string truthy değerler (object) geçer | `x !== undefined && x !== null && (typeof x !== 'string' \|\| x.length > N)` × 4 |
| `src/pages/api/places/submissions.ts` CREATE | `name.length > 200` bare `.length` × 2 (required); `shortDescription && length` falsy; priceRange ENUM eksik | required: `typeof !== 'string' \|\| length > N`; optional shortDescription: `x !== undefined && ...`; priceRange ENUM Set eklendi |
| `src/pages/api/places/[id]/share.ts` POST | `share_url && String(share_url).length > 2000` — `String()` coercion; `share_url={}` → `'[object Object]'` (16 char) guard bypass | `x !== undefined && x !== null && (typeof x !== 'string' \|\| x.length > 2000)` |
| `src/pages/api/admin/moderation.ts` POST | `String(reason).length > 1000`, `String(notes).length > 2000` — `String()` coercion | `x !== undefined && x !== null && (typeof x !== 'string' \|\| x.length > N)` |
| `src/pages/api/admin/loyalty/rewards.ts` POST | `String(reward_name).length > 200`, `String(category).length > 100`, `description && String(description).length > 2000` — `String()` coercion | required: `typeof !== 'string' \|\| length > N`; optional description: `x !== undefined && (typeof !== 'string' \|\| length > N)` |
| `src/pages/api/admin/loyalty/award.ts` POST | `typeof amount !== 'number' \|\| amount <= 0` — `Number.isFinite` guard eksik; `Infinity` veya `NaN` points award'a geçebilir | `typeof amount !== 'number' \|\| !Number.isFinite(amount) \|\| amount <= 0` |

### Test senaryoları

- `POST /api/places/submissions` `action=update` body `{"submissionId":"x","name":123}` → 400 (name typeof number)
- `POST /api/places/submissions` `action=update` body `{"submissionId":"x","description":{}}` → 400 (description typeof object)
- `POST /api/places/submissions` CREATE body `{"name":"Test","category":"cafe","description":"x","address":"y","priceRange":"unknown"}` → 400 (priceRange ENUM invalid)
- `POST /api/places/submissions` CREATE body `{"name":{},"category":"cafe","description":"x","address":"y"}` → 400 (name typeof object)
- `POST /api/places/:id/share` body `{"share_url":{}}` → 400 (share_url typeof object)
- `POST /api/places/:id/share` body `{"share_url":12345}` → 400 (share_url typeof number)
- `POST /api/admin/moderation` body `{"type":"review","action":"approve","id":"x","reason":99}` → 400 (reason typeof number)
- `POST /api/admin/moderation` body `{"type":"review","action":"approve","id":"x","notes":[]}` → 400 (notes typeof array)
- `POST /api/admin/loyalty/rewards` body `{"reward_name":true,"category":"x","points_cost":100}` → 422 (reward_name typeof boolean)
- `POST /api/admin/loyalty/rewards` body `{"reward_name":"x","category":{},"points_cost":100}` → 422 (category typeof object)
- `POST /api/admin/loyalty/award` body `{"userId":"x","type":"points","amount":Infinity,"reason":"test"}` → 422 (amount not finite)
- `POST /api/admin/loyalty/award` body `{"userId":"x","type":"points","amount":NaN,"reason":"test"}` → 422 (amount NaN)

---

## Batch #156 — String() coercion → typeof + bare .length → typeof pattern (6 dosya, Round 22)

**Amaç:** Round 22 sweep: places/index.ts POST 8 alan `String(x).length` → `typeof !== 'string' || x.length`; admin/blog/index.ts + admin/blog/[id].ts 6 alan `x && x.length` → `x !== undefined && (typeof !== 'string' || x.length)`; admin/blog/categories.ts + admin/blog/tags.ts `String(x)` coercion → typeof; user/favorites.ts placeId POST typeof guard.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/places/index.ts` POST | `name`: `!name \|\| String(name).length > 200` coercion; 7 optional alan: `x && String(x).length > N` — non-string truthy değerler (object, array) coerce edilip DB'ye yazılıyor (`String({})` = `'[object Object]'`) | `name`: `!name \|\| typeof !== 'string' \|\| length > 200`; optional alanlar: `x !== undefined && (typeof !== 'string' \|\| length > N)` |
| `src/pages/api/admin/blog/index.ts` POST | `body.title && body.title.length > 200` — truthy check ardından typeof garantisiz `.length`; title=`{}` → `{}.length` = undefined → `undefined > 200` = false → bypass | 6 alan: `x !== undefined && x !== null && (typeof x !== 'string' \|\| x.length > N)` |
| `src/pages/api/admin/blog/[id].ts` PUT | Aynı pattern: `body.title && body.title.length > 200` × 6 alan | 6 alan: aynı düzeltme |
| `src/pages/api/admin/blog/categories.ts` POST | `String(body.name).length > 200`, `String(body.slug).length > 100` required; `body.description && String(body.description).length > 500` optional — `String()` coercion | required: `typeof !== 'string' \|\| length > N`; optional: `x !== undefined && (typeof !== 'string' \|\| length > N)` |
| `src/pages/api/admin/blog/tags.ts` POST | Aynı pattern: `String(name)`, `String(slug)`, `String(description)`, `String(color)` | 4 alan typeof guard; `color` optional için `x !== undefined && (typeof !== 'string' \|\| length > N)` |
| `src/pages/api/user/favorites.ts` POST | `if (!placeId)` — falsy check; typeof guard yok; `placeId = {}` → truthy geçer, DB'ye object yazılmaya çalışılır | `if (!placeId \|\| typeof placeId !== 'string')` |

### Test senaryoları

- `POST /api/places` body `{"name":{},"slug":"test"}` → 400 (name typeof object)
- `POST /api/places` body `{"name":"Test","description":[1,2,3]}` → 400 (description typeof array)
- `POST /api/places` body `{"name":"Test","phone":true}` → 400 (phone typeof boolean)
- `POST /api/admin/blog` body `{"title":42,"content":"x"}` → 422 (title typeof number)
- `POST /api/admin/blog` body `{"title":["a","b"],"content":"x"}` → 422 (title typeof array)
- `PUT /api/admin/blog/:id` body `{"slug":{},"content":"x"}` → 422 (slug typeof object)
- `POST /api/admin/blog/categories` body `{"name":true,"slug":"cat"}` → 422 (name typeof boolean)
- `POST /api/admin/blog/categories` body `{"name":"cat","slug":"s","description":99}` → 422 (description typeof number)
- `POST /api/admin/blog/tags` body `{"name":"tag","slug":"t","color":["red"]}` → 422 (color typeof array)
- `POST /api/user/favorites` body `{"placeId":{}}` → 400 (placeId typeof object)
- `POST /api/user/favorites` body `{"placeId":12345}` → 400 (placeId typeof number)

---

## Batch #155 — typeof guard + String() coercion → typeof pattern (6 dosya, Round 21)

**Amaç:** Round 21 sweep: feed.ts `String(title)` coercion kaldırıldı; messages.ts `placeName`/`placeMessage` String() coercion → typeof; match-profile.ts `photos.map(String)` → filter(typeof string) + bio `toString?.()` coercion → typeof + maxLength; email/templates/index.ts POST required alanlar typeof; email/send-test.ts typeof + maxLength; user/features.ts featuresToCheck filter typeof guard.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/social/feed.ts` POST | `String(title).length > 200` — number/object geçerken coerce ediliyor; title=123 → '123', length=3 → length guard bypass, number DB'ye yazılıyor | `typeof title !== 'string' \|\| title.length > 200` — non-string direkt 400 |
| `src/pages/api/social/messages.ts` POST sharePlace | `String(placeName).length > 200` coercion; `placeMessage && String(placeMessage).length > 1000` — non-string truthy değerler sessizce geçiyor | `typeof !== 'string'` guard ikisi için; placeMessage için `x !== undefined && x !== null && (typeof !== 'string' \|\| length > N)` |
| `src/pages/api/social/match-profile.ts` POST | `photos.map((p) => String(p))` — non-string array elemanlarını coerce ediyor; `bio?.toString?.()` — optional chaining toString coercion, maxLength yok | photos: `filter(typeof === 'string')`; bio: `typeof === 'string' ? bio : ''` + maxLength 2000 guard |
| `src/pages/api/email/templates/index.ts` POST | `name`, `slug`, `subject_line`, `html_content` required alanlar `!x` falsy check sonrası `.length` erişimi — typeof guard yok; optional `plain_text_content`/`preview_text` `x && x.length > N` pattern | Required alanlara `typeof !== 'string'` eklendi; optional alanlar `x !== undefined && (typeof !== 'string' \|\| length > N)` pattern |
| `src/pages/api/email/send-test.ts` POST | `to`/`subject`/`html` falsy check — typeof guard yok, maxLength yok; `sendEmail({to:123,...})` tip uyumsuzluğu | typeof guard + to≤254, subject≤500, html≤500000 maxLength |
| `src/pages/api/user/features.ts` POST | `featuresToCheck.filter(f => f in PREMIUM_FEATURES)` — `in` operatörü non-string için undefined behavior; `[123, null, {}]` gönderilirse `in` check'i beklenmedik davranış verebilir | `typeof f === 'string' && f in PREMIUM_FEATURES` — string olmayan elemanlar filtrelenir |

### Test senaryoları

- `POST /api/social/feed` body `{"activity_type":"post","object_type":"place","object_id":"uuid","title":999}` → 422 (title typeof number)
- `POST /api/social/messages` body `{"action":"sharePlace","conversationId":"id","placeId":"id","placeName":["array"]}` → 400 (placeName typeof array)
- `POST /api/social/messages` body `{"action":"sharePlace","conversationId":"id","placeId":"id","placeName":"ok","placeMessage":42}` → 400 (placeMessage typeof number)
- `POST /api/social/match-profile` body `{"photos":["url1",123,"url3"]}` → photos=[url1, url3] (number filtrele), length=2 ≤ 4 → OK
- `POST /api/social/match-profile` body `{"bio":{"x":"injection"}}` → bio='' (object → typeof guard → boş string)
- `POST /api/social/match-profile` body `{"bio":"${'x'.repeat(2001)}"}` → 400 (bio maxLength 2000)
- `POST /api/email/templates` body `{"name":42,"slug":"t","template_type":"system","subject_line":"s","html_content":"h"}` → 400 (name typeof number)
- `POST /api/email/templates` body `{"name":"t","slug":"t","template_type":"system","subject_line":"s","html_content":"h","plain_text_content":999}` → 400 (plain_text_content typeof number)
- `POST /api/email/send-test` body `{"to":["a@b.com"],"subject":"s","html":"h"}` → 422 (to typeof array)
- `POST /api/email/send-test` body `{"to":"a@b.com","subject":"s","html":"${'x'.repeat(500001)}"}` → 422 (html maxLength)
- `POST /api/user/features` body `{"features":[123,null,"feature_name"]}` → 123/null filtrele, yalnızca "feature_name" validFeatures'e girer

---

## Batch #154 — typeof guard + HARD RULE #17 NaN fix (3 dosya, Round 20)

**Amaç:** Round 20 sweep: notifications/draft.ts required alanlar typeof guard + optional alanlar standart `x !== undefined && (typeof !== 'string' || length > N)` pattern; search/saved.ts üç alan typeof guard; admin/exports/token.ts `Number()` → `safeIntParam()` NaN fix (HARD RULE #17).

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/notifications/draft.ts` POST | `title`/`message` required: falsy check yalnızca — `typeof` guard yok; `title=123` geçer, `title.length` = `undefined`, `undefined > 255` = false → length guard bypass. Optional `url`/`segment`/`target`: `if (url && url.length > N)` pattern typeof garantilemez | Required alanlara `typeof !== 'string'` eklendi; optional alanlar `x !== undefined && x !== null && (typeof x !== 'string' \|\| x.length > N)` pattern |
| `src/pages/api/search/saved.ts` POST | `searchName`/`searchQuery`/`searchType` falsy check — typeof yok; sayı/array geçerse sonraki `.length` erişimi `undefined` döner; `VALID_SEARCH_TYPES.has(x)` typeof garantilemez | `typeof !== 'string'` guard üç alan için initial check'e eklendi |
| `src/pages/api/admin/exports/token.ts` POST | `ttlSeconds = Number(body?.ttlSeconds \|\| 300)` — `Number('abc')` = NaN; `Math.max(30, Math.min(3600, NaN))` = NaN → DB'ye NaN TTL yazılır; `maxDownloads` aynı sorun (HARD RULE #17) | `safeIntParam(String(x ?? default), default, min, max)` — NaN güvenli, range clamp |

### Test senaryoları

- `POST /api/notifications/draft` body `{"title":42,"message":"test"}` → 400 (title typeof number)
- `POST /api/notifications/draft` body `{"title":"t","message":["a","b"]}` → 400 (message typeof array)
- `POST /api/notifications/draft` body `{"title":"t","message":"m","url":{"x":1}}` → 400 (url typeof object)
- `POST /api/notifications/draft` body `{"title":"t","message":"m","target":99}` → 400 (target typeof number)
- `POST /api/notifications/draft` body `{"title":"t","message":"m","target":"vip"}` → 400 (ENUM dışı)
- `POST /api/search/saved` body `{"searchName":123,"searchQuery":"q","searchType":"places"}` → 422 (searchName typeof number)
- `POST /api/search/saved` body `{"searchName":"n","searchQuery":{},"searchType":"places"}` → 422 (searchQuery typeof object)
- `POST /api/search/saved` body `{"searchName":"n","searchQuery":"q","searchType":["places"]}` → 422 (searchType typeof array)
- `POST /api/admin/exports/token` body `{"resourceKey":"admin.places.lifecycle.export","ttlSeconds":"evil"}` → ttlSeconds 300'e fallback (safeIntParam NaN → default)
- `POST /api/admin/exports/token` body `{"resourceKey":"admin.places.lifecycle.export","ttlSeconds":9999}` → ttlSeconds 3600'e clamp (max)
- `POST /api/admin/exports/token` body `{"resourceKey":"admin.places.lifecycle.export","maxDownloads":0}` → maxDownloads 1'e clamp (min)

---

## Batch #153 — typeof guard + maxLength + ENUM (4 dosya, Round 19)

**Amaç:** Round 19 sweep: auth/login + auth/register typeof guards (non-string body injection); register.ts String() coercion kaldırıldı; email/campaigns POST 6 alan maxLength + VALID_CAMPAIGN_TYPES ENUM; social-lifecycle.ts emailTo query param 254 char cap.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/auth/login.ts` POST | `email` ve `password` yalnızca falsy check — `typeof` guard yok; `email=123` (number) truthy geçip `runLoginFlow(123,...)` çağrılıyordu | `typeof email !== 'string' \|\| typeof password !== 'string'` → 400 guard eklendi |
| `src/pages/api/auth/register.ts` POST | `fullName`, `email`, `password` yalnızca falsy check — typeof yok; `fullName` için `String(fullName).length > 200` coercion pattern | typeof guard üç alan için birleştirildi; `String()` coercion → `fullName.length` doğrudan (typeof zaten garanti ediyor) |
| `src/pages/api/email/campaigns/index.ts` POST | 6 alan (`name`, `campaign_type`, `from_email`, `subject_line`, `html_content`, `plain_text_content`) için typeof + maxLength yok; `campaign_type` için ENUM yok; `createCampaign()` sınırsız veri alıyordu | typeof guard + name≤255, from_email≤254, subject_line≤500, html_content≤500000, plain_text≤500000; `VALID_CAMPAIGN_TYPES` Set (7 değer) |
| `src/pages/api/admin/reports/social-lifecycle.ts` GET | `emailTo` = `url.searchParams.get('to')` — maxLength cap yok; 10KB+ email adresi sendEmail'e geçilebilirdi | `.substring(0, 254)` cap eklendi |

### Test senaryoları

- `POST /api/auth/login` body `{"email":12345,"password":"secret"}` → 400 (email typeof number)
- `POST /api/auth/login` body `{"email":"a@b.com","password":true}` → 400 (password typeof boolean)
- `POST /api/auth/login` body `{"email":"","password":"x"}` → 400 (falsy)
- `POST /api/auth/register` body `{"fullName":null,"email":"a@b.com","password":"pass"}` → 400 (typeof null)
- `POST /api/auth/register` body `{"fullName":"${'a'.repeat(201)}","email":"a@b.com","password":"Pass123!"}` → 400 (maxLength)
- `POST /api/email/campaigns` body `{"name":12345,"campaign_type":"newsletter","from_email":"a@b.com","subject_line":"s","html_content":"h"}` → 400 (name typeof number)
- `POST /api/email/campaigns` body `{"name":"t","campaign_type":"spam","from_email":"a@b.com","subject_line":"s","html_content":"h"}` → 400 (ENUM dışı campaign_type)
- `POST /api/email/campaigns` body `{"name":"t","campaign_type":"newsletter","from_email":"${'x'.repeat(255)}@b.com","subject_line":"s","html_content":"h"}` → 400 (from_email maxLength)
- `POST /api/email/campaigns` body `{"name":"t","campaign_type":"newsletter","from_email":"a@b.com","subject_line":"${'s'.repeat(501)}","html_content":"h"}` → 400 (subject_line maxLength)
- `GET /api/admin/reports/social-lifecycle?email=1&to=${'x'.repeat(500)}@evil.com` → emailTo cap 254 char'a truncate edilir

---

## Batch #152 — typeof guard + HARD RULE #51 + ENUM (2 dosya, Round 18)

**Amaç:** Round 18 sweep: flags.ts POST typeof guard + PUT HARD RULE #51 (updates spread) + DELETE key guard; bulk-action.ts implicit tableMap → explicit VALID_RESOURCE_TYPES Set. admin/blog/*, vendor/*, verifications/* CLEAN bulundu.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/admin/flags.ts` POST | `key` ve `name` `String()` coercion ile geçiyor — `key=123` (number) truthy → `String(123).length` check geçer → `createFlag(123,...)` çağrısı yapılır; `type` için `typeof` guard yok | `typeof key !== 'string'`, `typeof name !== 'string'`, `typeof type !== 'string'` guard'ları eklendi |
| `src/pages/api/admin/flags.ts` PUT | HARD RULE #51: `const { key, ...updates } = body` → `updateFlag(key, updates)` tüm body'nin geri kalanını geçiyor | `key` typeof + maxLength guard; `ALLOWED_FLAG_UPDATE_FIELDS` Set (8 alan) ile explicit extraction |
| `src/pages/api/admin/flags.ts` DELETE | `key` hiç validate edilmeden `deleteFlag(key)` çağrısı yapılıyor | `!key \|\| typeof !== 'string' \|\| length > 100` → 400 guard eklendi |
| `src/pages/api/admin/bulk-action.ts` | `type` query param için `tableMap[resourceType] \|\| 'places'` implicit allowlist — yanlış type sessizce 'places'e düşüyor; explicit Set yok | `VALID_RESOURCE_TYPES = {places, reviews, users, blog_posts, events, photos}` Set + safe default 'places' |

### Test senaryoları

- `POST /api/admin/flags` body `{"key":123,"name":"Test","type":"boolean"}` → 400 (key typeof string değil)
- `POST /api/admin/flags` body `{"key":"ok","name":true,"type":"boolean"}` → 400 (name typeof string değil)
- `POST /api/admin/flags` body `{"key":"ok","name":"Test","type":"hack"}` → 400 (type ENUM dışı)
- `PUT /api/admin/flags` body `{"key":"my_flag","enabled":true,"DROP TABLE users":"x"}` → allowlist filtreler, yalnızca `enabled` DB'ye gider
- `PUT /api/admin/flags` body `{"key":null,"enabled":true}` → 400 (key guard)
- `DELETE /api/admin/flags` body `{}` → 400 (key missing)
- `DELETE /api/admin/flags` body `{"key":["a","b"]}` → 400 (key typeof array)
- `POST /api/admin/bulk-action` body `{"action":"delete","items":["uuid1"],"type":"secret_table"}` → resourceType 'places'e fallback (ENUM dışı)
- `POST /api/admin/bulk-action` body `{"action":"delete","items":["uuid1"],"type":"reviews"}` → reviews tablosu hedeflenir

---

## Batch #151 — ENUM + maxLength + Array cap + object validation (5 dosya, Round 17)

**Amaç:** Round 17 sweep: media/search VALID_PROVIDERS + query cap, media/import maxLength çoklusu + metadata cap, admin/places placeIds upper bound, admin/users log action validation, recipes slug maxLength.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/admin/site/media/search.ts` GET | `provider` query param TypeScript cast — runtime ENUM yok; `q` maxLength yok; bilinmeyen provider sessizce boş sonuç dönüyordu | `VALID_PROVIDERS = {all, unsplash, pexels}` Set + safe default 'all'; `q.length > 500` → 400 |
| `src/pages/api/admin/site/media/import.ts` POST | `assetKey`, `url`, `alt` maxLength yok; `metadata` JSONB size cap yok — `upsertMediaAsset()` fonksiyonuna sınırsız veri geçiyordu | assetKey ≤200, url ≤2000, alt ≤500; `Array.isArray \|\| JSON.stringify > 5000` → 400 |
| `src/pages/api/admin/places.ts` POST | `placeIds` array için üst sınır yok — 100K ID göndererek tek UPDATE ile tablo kilitlenebilir | `placeIds.length > 1000` → 400 (max 1000) |
| `src/pages/api/admin/users/[id].ts` POST 'log' action | `actionType` ve `changes` alanları doğrudan `logAdminAction()` fonksiyonuna geçiyor — hiç validation yok | `actionType` string + maxLength 100; `changes` nesne + JSON.stringify ≤10000 → 422 |
| `src/pages/api/admin/recipes.ts` POST 'upsert' | `slug` trim kontrolü var ama maxLength yok — DB UNIQUE index'ine uzun slug yazılabiliyordu | `slug.length > 200` → 422 |

### Test senaryoları

- `GET /api/admin/site/media/search?q=test&provider=telegram` → provider 'all'e fallback (ENUM dışı)
- `GET /api/admin/site/media/search?q=test&provider=unsplash` → yalnızca Unsplash aranır
- `GET /api/admin/site/media/search?q=${'a'.repeat(501)}` → 400 (q maxLength)
- `POST /api/admin/site/media/import` body `{"assetKey":"${'x'.repeat(201)}","url":"https://a.com"}` → 400
- `POST /api/admin/site/media/import` body `{"assetKey":"k","url":"https://a.com","metadata":[1,2,3]}` → 400 (array metadata)
- `POST /api/admin/places` body `{"placeIds":[...1001 id...],"action":"approve"}` → 400 (max 1000)
- `POST /api/admin/users/:id` body `{"action":"log","actionType":"${'a'.repeat(101)}"}` → 422
- `POST /api/admin/users/:id` body `{"action":"log","actionType":"delete","changes":{"x":"${'a'.repeat(11000)}"}}` → 422 (size cap)
- `POST /api/admin/recipes` body `{"action":"upsert","slug":"${'s'.repeat(201)}","name":"test"}` → 422 (slug maxLength)

---

## Batch #150 — ENUM + maxLength + type guard + HARD RULE #51 (10 dosya, Round 16)

**Amaç:** Round 16 güvenlik sweep: social/messages locationMessage validation, visit.ts notes partial type guard, moderation VALID_SUBMISSION_ACTIONS, alerts ENUM allowlist, places/index search/category cap, seo-overrides HARD RULE #51 body spread, homepage-sections config size cap, media-usage metadata size cap, social-lifecycle VALID_FORMATS, vendor/reject reason maxLength.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/social/messages.ts` POST shareLocation | `locationMessage` typeof kontrolü ve maxLength yok — `shareLocation()` fonksiyonuna doğrudan geçiyor | `typeof !== 'string' \|\| length > 1000` → 400 |
| `src/pages/api/places/[id]/visit.ts` POST | `notes` partial type guard: `body.notes && typeof === 'string'` — `body.notes` truthy non-string değer typeof kontrolünü atlıyordu | `notes !== undefined && notes !== null && (typeof !== 'string' \|\| length > 1000)` → 400 |
| `src/pages/api/admin/moderation.ts` POST submission | `type === 'submission'` bloğunda action ENUM allowlist yok — bilinmeyen action'lar son `apiResponse(400)` bloğuna düşüyordu ama explicit kontrol yoktu | `VALID_SUBMISSION_ACTIONS = {approve, reject, requestInfo}` Set → explicit 400 |
| `src/pages/api/admin/alerts.ts` GET | `type` ve `severity` query params `as AlertType` TypeScript cast ile geçiyor — runtime ENUM validation yok | `VALID_ALERT_TYPES` + `VALID_ALERT_SEVERITIES` Set; bilinmeyen değer → `undefined` (filtre uygulanmaz) |
| `src/pages/api/places/index.ts` GET | `category` ve `search` params maxLength cap yok — SQL ILIKE'a geçiyor | `category.substring(0, 100)`, `search.substring(0, 200)` |
| `src/pages/api/admin/site/seo-overrides.ts` PUT | HARD RULE #51: `upsertSeoOverride(body, ...)` tüm body geçiyor | `seoData` allowlist (entity_type/entity_key/canonical_path + 7 optional SEO field + noindex/nofollow/structured_data); maxLength guard her field için |
| `src/pages/api/admin/site/homepage-sections.ts` PUT | `config` JSONB arbitrary nesne kabul ediliyor — size cap yok | `Array.isArray \|\| JSON.stringify(config).length > 10000` → 400 |
| `src/pages/api/admin/site/media-usage.ts` PUT | `metadata` JSONB arbitrary nesne kabul ediliyor — size cap yok | `Array.isArray \|\| JSON.stringify(metadata).length > 5000` → 400 |
| `src/pages/api/admin/reports/social-lifecycle.ts` GET | `format` param herhangi string kabul ediliyor — ENUM allowlist yok | `VALID_FORMATS = {json, html, pdf}` Set + safe default 'json' |
| `src/pages/api/admin/vendor/[id]/reject.ts` POST | `validateWithSchema` schema'sında `reason` için `maxLength` tanımlı değildi | `maxLength: 500` eklendi |

### Test senaryoları

- `POST /api/social/messages` `{"action":"shareLocation","locationMessage":9999}` → 400 (typeof string değil)
- `POST /api/social/messages` `{"action":"shareLocation","locationMessage":"${'x'.repeat(1001)}"}` → 400 (maxLength)
- `POST /api/places/:id/visit` body `{"notes":12345}` → 400 (non-string notes rejected)
- `POST /api/places/:id/visit` body `{"notes":"${'a'.repeat(1001)}"}` → 400 (maxLength)
- `POST /api/admin/moderation` body `{"type":"submission","action":"hack","id":"x"}` → 400 (ENUM dışı)
- `POST /api/admin/moderation` body `{"type":"submission","action":"approve","id":"x"}` → place lifecycle devreye girer
- `GET /api/admin/alerts?type=xss_attack` → type filtre uygulanmaz (Set dışı, undefined döner)
- `GET /api/admin/alerts?severity=critical` → severity filtre uygulanır
- `GET /api/places?search=${'A'.repeat(300)}` → arama 200 char'a kırpılır
- `GET /api/places?category=${'B'.repeat(200)}` → kategori 100 char'a kırpılır
- `PUT /api/admin/site/seo-overrides` body `{"entity_type":"page","entity_key":"home","canonical_path":"/","adminOverride":"DROP TABLE"}` → allowlist filtreler, DB'ye ulaşmaz
- `PUT /api/admin/site/seo-overrides` body `{"og_image":"${'x'.repeat(2001)}"}` → 400 (2000 char limit)
- `PUT /api/admin/site/homepage-sections` body `{"section_key":"s","title":"t","config":[1,2,3]}` → 400 (Array kabul edilmez)
- `PUT /api/admin/site/media-usage` body `{"asset_key":"a","entity_type":"b","entity_key":"c","placement_key":"d","metadata":"string"}` → 400 (object değil)
- `GET /api/admin/reports/social-lifecycle?format=xml` → 'json' fallback
- `GET /api/admin/reports/social-lifecycle?format=pdf` → PDF Content-Disposition response
- `POST /api/admin/vendor/:id/reject` body `{"reason":"${'r'.repeat(501)}"}` → 400 (schema maxLength 500)

---

## Batch #149 — ENUM + HARD RULE #51 + Astro config (8 değişiklik, Round 15)

**Amaç:** Round 15 güvenlik sweep + eksik Astro yapılandırmaları: email campaigns HARD RULE #51, journey type ENUM, moderation type ENUM, social events cap; astro.config.mjs SMTP/social env vars, middleware.ts App.Locals isModerator, env.d.ts temizleme.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `astro.config.mjs` env.schema | SMTP_HOST/PORT/SECURE/USER/PASS env vars şemada yoktu — `email/providers.ts` tarafından `process.env` ile kullanılıyor | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` eklendi (secret/public uygun şekilde) |
| `astro.config.mjs` env.schema | SOCIAL_TINDER_ENABLED, SOCIAL_SWIPE_DAILY_LIMIT, SOCIAL_OPEN_ACCESS, SOCIAL_AUTO_CONVERSATION şemada yoktu | 4 social env var eklendi |
| `src/middleware.ts` App.Locals | `isModerator` middleware'de set ediliyor ama interface'de tanımlı değildi (TypeScript blind spot); `vendor` rolü union'da yoktu | `isModerator: boolean` eklendi; role union'a `'vendor'` eklendi |
| `src/env.d.ts` | Eski `App.SessionData` interface (Astro 6'da kaldırıldı, kullanılmıyor); SMTP + social env vars ImportMetaEnv'de yoktu; NodeJS.ProcessEnv'de de yoktu | SessionData silindi; SMTP + social alanları her iki env interface'e eklendi |
| `src/pages/api/email/campaigns/index.ts` GET | `status` query param ENUM allowlist yok — doğrudan SQL WHERE'e geçiyor | `VALID_CAMPAIGN_STATUSES` (draft/scheduled/active/paused/completed/failed) → 400 |
| `src/pages/api/email/campaigns/[id].ts` PUT | HARD RULE #51: `const { action, ...campaignData } = body` tüm body'yi `updateMarketingCampaign()` fonksiyonuna yayıyordu | `ALLOWED_CAMPAIGN_FIELDS` Set + explicit key extraction; name ≤255, subject_line ≤500, html_content ≤500000, from_name ≤200, from_email ≤254 |
| `src/pages/api/analytics/journeys.ts` GET | `type` param if/else chain ile dolaylı doğrulanıyordu — explicit Set yok | `VALID_JOURNEY_TYPES` Set + safe default 'journeys' |
| `src/pages/api/admin/social/events.ts` GET | `eventType` param maxLength yok — parameterized query'e geçiyor | `substring(0, 100)` cap |

### Test senaryoları

- `GET /api/email/campaigns?status=hacked` → 400 (ENUM dışı)
- `GET /api/email/campaigns?status=draft` → 200
- `PUT /api/email/campaigns/:id` body `{"name":"${'A'.repeat(256)}"}` → 400 (maxLength)
- `PUT /api/email/campaigns/:id` body `{"adminOverride":"DROP TABLE users"}` → field allowlist filtreler, DB'ye ulaşmaz
- `PUT /api/email/campaigns/:id` body `{"action":"launch"}` → campaign launch (subject_line vs. istenmez)
- `PUT /api/email/campaigns/:id` body `{"from_email":"${'a'.repeat(255)}@b.com"}` → 400 (254 char limit)
- `GET /api/analytics/journeys?type=hack` → type 'journeys'e fallback (ENUM dışı)
- `GET /api/analytics/journeys?type=top_paths` → top_paths handler çalışır
- `GET /api/admin/social/events?eventType=${'A'.repeat(200)}` → eventType 100 char'a kırpılır
- TypeScript: `locals.isModerator` artık tip güvenli (boolean, TS hata vermez)
- TypeScript: `user.role === 'vendor'` artık union'da geçerli

---

## Batch #148 — ENUM allowlist + maxLength + Array cap + isFinite (8 dosya, Round 14)

**Amaç:** Round 14 taramasında tespit edilen admin/places status ENUM, share platform, like action, trending period, collections note ve blog categories alanlarındaki validasyon eksiklikleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/admin/places.ts` GET | `status` query param doğrudan SQL WHERE `p.status = $1`'e geçiyor — allowlist yok; `search` maxLength yok | `VALID_PLACE_STATUSES` (all/active/pending/rejected/suspended/deleted) + safe default 'all'; `rawSearch.substring(0, 200)` |
| `src/pages/api/places/[id]/share.ts` POST | `platform` ENUM yok (herhangi string kabul); `share_url` maxLength yok | `VALID_SHARE_PLATFORMS` (7 değer) → 400; `share_url.length > 2000` → 400 |
| `src/pages/api/places/[id]/like.ts` POST | `action` yalnızca `=== 'unlike'` kontrolü — bilinmeyen değer `like` olarak işleniyordu | `VALID_LIKE_ACTIONS = {like, unlike}` → bilinmeyen değer → 400 |
| `src/pages/api/social/trending.ts` GET | `type` ternary+null dönüşü ile dolaylı doğrulanıyordu; `period` hiç doğrulanmıyordu — kütüphaneye geçiyor | `VALID_TRENDING_TYPES` Set + safe default; `VALID_PERIODS` (hour/day/week/month/year) + safe default 'day' |
| `src/pages/api/collections/[id]/items.ts` POST | `body.note` typeof kontrolü ve maxLength yok — `addPlaceToCollection()` doğrudan DB'ye yazıyor | `typeof !== 'string' \|\| length > 500` → 400 |
| `src/pages/api/places/[id]/request-verification.ts` POST | `documents` field `Array.isArray` kontrolü yok, length cap yok | `!Array.isArray(documents) \|\| documents.length > 20` → 400 |
| `src/pages/api/admin/blog/categories.ts` POST | `color` ve `icon` maxLength yok; `sort_order` Number.isFinite guard yok (`body.sort_order \|\| 0` NaN/Infinity kabul ediyor) | color ≤50; icon ≤100; `Number.isFinite(sortOrderRaw) ? Math.floor() : 0` |

### Test senaryoları

- `GET /api/admin/places?status=hacked` → status 'all'e fallback (SQL injection yok)
- `GET /api/admin/places?status=pending` → `p.status = 'pending'` WHERE eklenir
- `GET /api/admin/places?search=${'A'.repeat(300)}` → arama 200 char'a kırpılır
- `POST /api/places/:id/share` body `{"platform":"telegram"}` → 400 (ENUM dışı)
- `POST /api/places/:id/share` body `{"platform":"twitter","share_url":"${'x'.repeat(2001)}"}` → 400 (maxLength)
- `POST /api/places/:id/share` body `{"platform":"facebook"}` → 201
- `POST /api/places/:id/like` body `{"action":"superlike"}` → 400 (ENUM dışı)
- `POST /api/places/:id/like` body `{"action":"unlike"}` → 200
- `POST /api/places/:id/like` (action yok) → 200 (like varsayılan)
- `GET /api/social/trending?type=users` → type 'hashtags'e fallback (ENUM dışı)
- `GET /api/social/trending?period=decade` → period 'day'e fallback
- `GET /api/social/trending?period=week&type=places` → getTrendingPlaces(limit, 'week') çağrılır
- `POST /api/collections/:id/items` body `{"placeId":"x","note":12345}` → 400 (typeof)
- `POST /api/collections/:id/items` body `{"placeId":"x","note":"${'A'.repeat(501)}"}` → 400 (maxLength)
- `POST /api/places/:id/request-verification` body `{"documents":[...21 items]}` → 400 (array cap)
- `POST /api/places/:id/request-verification` body `{"documents":"notanarray"}` → 400 (typeof)
- `POST /api/admin/blog/categories` body `{"slug":"x","name":"y","color":"${'A'.repeat(51)}"}` → 422 (color maxLength)
- `POST /api/admin/blog/categories` body `{"slug":"x","name":"y","sort_order":Infinity}` → sort_order 0'a düşer
- `POST /api/admin/blog/categories` body `{"slug":"x","name":"y","sort_order":"abc"}` → sort_order 0'a düşer (isFinite guard)

---

## Batch #147 — ENUM allowlist + Array cap + maxLength + HARD RULE #51 (7 dosya, Round 13)

**Amaç:** Round 13 taramasında tespit edilen events/blog/reviews/notifications/collections endpoint'lerindeki ENUM, array cap, safeIntParam ve HARD RULE #51 ihlalleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/events/list.ts` | `category` query param maxLength yok — doğrudan `getEvents()` fonksiyonuna geçiyor | `rawCategory.substring(0, 100)` ile cap eklendi |
| `src/pages/api/blog/posts/index.ts` GET | `status` için `normalizeStatus()` silent fallback (bilinmeyen değer 'published'e dönüyordu, 400 dönmüyordu); `category` maxLength yok | `VALID_POST_STATUSES` Set + explicit fallback (default 'published', hata dönmüyor — bilinçli tasarım); `rawCategory.substring(0, 100)` |
| `src/pages/api/reviews/index.ts` GET | `sortBy` silent fallback `orderMap[sortBy] \|\| default` (ENUM olmadan); `ratingFilter` `parseInt()` + `!isNaN` (HARD RULE #17) | `VALID_SORT_OPTIONS` Set + safe default; `safeIntParam(ratingFilter, 0, 1, 5)` |
| `src/pages/api/reviews/index.ts` POST | `images` array `Array.isArray` kontrolü yok — `submitPlaceReview()` çağrısına doğrudan geçiyor | `!Array.isArray(images) \|\| images.length > 20` → 400 |
| `src/pages/api/notifications/center.ts` POST | `action` alanı yalnızca if/else chain ile kontrol ediliyor, explicit ENUM Set yok | `VALID_ACTIONS = new Set(['read', 'archive'])` → bilinmeyen değer → 422 |
| `src/pages/api/notifications/send.ts` POST | `userIds` Array.isArray kontrolü var ama `.length > N` cap yok (admin endpoint); `segment` maxLength yok | `userIds.length > 500` → 422; `segment.length > 100` → 422 |
| `src/pages/api/collections/[id].ts` PUT | HARD RULE #51: `const { name, description, icon, is_public } = body` ile validation yapılıyor ama `updateCollection(..., body)` tüm body'yi iletiyordu | `updates` objesi explicit field'lardan oluşturuluyor; yalnızca `updates` DB'ye gönderiliyor |

### Test senaryoları

- `GET /api/events/list?category=${'A'.repeat(200)}` → category 100 char'a kırpılır (hard truncate, 400 değil)
- `GET /api/blog/posts?status=malicious` → status 'published'e fallback (safe — DB'ye sadece geçerli değer)
- `GET /api/blog/posts?category=${'A'.repeat(200)}` → category 100 char'a kırpılır
- `GET /api/reviews?sortBy=hack` → sortBy 'newest'e fallback (safe default)
- `GET /api/reviews?sortBy=helpful` → `r.helpful_count DESC` order (allowlist'te geçerli değer)
- `GET /api/reviews?rating=abc` → safeIntParam 0 döner → WHERE eklenmez (rating filtresi devre dışı)
- `GET /api/reviews?rating=3` → `r.rating = 3` WHERE eklenir
- `POST /api/reviews` action=create body `{"placeId":"x","images":[...21 items]}` → 400 (array cap)
- `POST /api/reviews` action=create body `{"placeId":"x","images":"notanarray"}` → 400 (typeof)
- `POST /api/notifications/center` body `{"action":"purge_all","notificationId":"x"}` → 422 (ENUM dışı)
- `POST /api/notifications/center` body `{"action":"read","notificationId":"x"}` → 200
- `POST /api/notifications/send` (admin) body `{"title":"t","message":"m","target":"specific","userIds":[...501 items]}` → 422
- `POST /api/notifications/send` (admin) body `{"title":"t","message":"m","target":"segment","segment":"${'A'.repeat(101)}"}` → 422
- `PUT /api/collections/:id` body `{"name":"ok","adminOverride":"DROP TABLE"}` → adminOverride DB'ye ulaşmaz (allowlist filtresi)

---

## Batch #146 — maxLength + ENUM + Array cap + HARD RULE #51 (6 dosya, Round 12)

**Amaç:** Round 12 taramasında tespit edilen email templates PUT eksik validasyonları, webhook event format regex, settings HARD RULE #51 ihlali ve filtre allowlist eksiklikleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/email/templates/[id].ts` PUT | POST'ta bulunan 5 maxLength kontrolü PUT'ta tamamen yoktu | `name ≤200`, `subject_line ≤500`, `html_content ≤500000`, `plain_text_content ≤500000`, `preview_text ≤500` |
| `src/pages/api/email/campaigns/[id]/subscribers.ts` | `subscribers` array uzunluk kontrolü yoktu — DoS vektörü | `Array.isArray + length === 0 veya > 1000` → 400 |
| `src/pages/api/webhooks/index.ts` POST | `event` alanı sadece length kontrolü vardı, format regex yoktu | `event.length > 100` + `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$` regex → 422 |
| `src/pages/api/webhooks/filters.ts` | `filterType` ve `operator` allowlist yok; `filterKey` ve `filterValue` maxLength yok | `VALID_FILTER_TYPES` (string/number/boolean/datetime) + `VALID_OPERATORS` (11 değer); filterKey ≤255; filterValue ≤10000 |
| `src/pages/api/webhooks/settings.ts` | HARD RULE #51: `const { webhookId, ...settings } = body` tüm body key'lerini settings'e yayıyor; isFinite guard yok | `ALLOWED_SETTINGS_KEYS` Set ile explicit key extraction; `Number.isFinite` guard `timeoutSeconds` (≥5) ve `maxRetries` (≥0) için |
| `src/pages/api/webhooks/templates.ts` | `name`, `event`, `description`, `settings` JSON — hiçbirinde validation yoktu | name ≤255; event regex + ≤100; description ≤1000; settings JSON serialize ≤100000 |

### Test senaryoları

- `PUT /api/email/templates/:id` body `{"name":"A".repeat(201)}` → 422 (maxLength)
- `PUT /api/email/templates/:id` body `{"subject_line":"A".repeat(501)}` → 422 (maxLength)
- `PUT /api/email/templates/:id` body `{"html_content":"A".repeat(500001)}` → 422 (maxLength)
- `POST /api/email/campaigns/:id/subscribers` body `{"subscribers":[]}` → 400 (boş dizi)
- `POST /api/email/campaigns/:id/subscribers` body `{"subscribers":[...1001 items]}` → 400 (aşım)
- `POST /api/webhooks` body `{"event":"invalid","url":"https://example.com"}` → 422 (regex)
- `POST /api/webhooks` body `{"event":"place","url":"https://example.com"}` → 422 (tek segment, nokta yok)
- `POST /api/webhooks` body `{"event":"place.created","url":"https://example.com"}` → 201 (geçerli)
- `POST /api/webhooks/filters` body `{"webhookId":"x","filterType":"xml","filterKey":"a","operator":"equals"}` → 400 (ENUM dışı)
- `POST /api/webhooks/filters` body `{"webhookId":"x","filterType":"string","filterKey":"a","operator":"hack"}` → 400 (ENUM dışı)
- `POST /api/webhooks/filters` body `{"webhookId":"x","filterType":"string","filterKey":"A".repeat(256),"operator":"equals"}` → 400 (maxLength)
- `PUT /api/webhooks/settings` body `{"webhookId":"x","timeoutSeconds":2}` → 400 (en az 5 saniye)
- `PUT /api/webhooks/settings` body `{"webhookId":"x","timeoutSeconds":"abc"}` → 400 (isFinite guard)
- `PUT /api/webhooks/settings` body `{"webhookId":"x","maxRetries":-1}` → 400 (negatif değer)
- `PUT /api/webhooks/settings` body `{"webhookId":"x","adminOverride":"DROP TABLE users"}` → güvenli (allowlist filtresi — unknown key skip edilir)
- `POST /api/webhooks/templates` body `{"name":"A".repeat(256),"event":"place.created"}` → 400 (name maxLength)
- `POST /api/webhooks/templates` body `{"name":"T","event":"PLACE.CREATED"}` → 400 (regex uppercase reddeder)
- `POST /api/webhooks/templates` body `{"name":"T","event":"place.created","description":"A".repeat(1001)}` → 400 (description maxLength)

---

## Batch #145 — ENUM allowlist + Array cap + maxLength (7 dosya, Round 11)

**Amaç:** Round 11 taramasında tespit edilen feed/reports/upload/comments/newsletter endpoint'lerindeki validasyon eksiklikleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/feed/index.ts` | `type` param allowlist yok — lib fonksiyonuna geçiyor | `VALID_FEED_TYPES = {following,trending,recommended,nearby,discover}` — geçersiz değer 'following'e düşer |
| `src/pages/api/feed/activity.ts` | `filter` allowlist yok — bilinmeyen değer raw string olarak SQL WHERE'e push ediliyordu; `sortBy` allowlist yok | `VALID_FILTERS` + `VALID_SORT_BY` allowlist; `filterActionMap` ile fallback kaldırıldı |
| `src/pages/api/reports/index.ts` POST | `metric_ids` ve `recipients` array'ler validateWithSchema dışında — sınırsız öğe kabul ediyor | `metric_ids` Array.isArray + ≤50; `recipients` Array.isArray + ≤20 |
| `src/pages/api/upload/index.ts` | `caption` formData field'ı maxLength olmadan SQL INSERT'e geçiyordu | caption ≤500; `String(rawCaption)` güvenli dönüşüm |
| `src/pages/api/comments/index.ts` GET | `targetType` URL param ENUM allowlist yok — `getComments(targetType,...)` lib'e geçiyor | `VALID_TARGET_TYPES = {place,review,blog,event,recipe}` → 400 |
| `src/pages/api/newsletter/subscribe.ts` POST | email maxLength kontrolü yok — regex öncesi length check eksik | `email.length > 254` → 400 (maxLength önceden, regex sonradan) |
| `src/pages/api/newsletter/subscribe.ts` DELETE | email hiç validate edilmiyordu — `typeof` + maxLength check yok | `typeof email !== 'string' \|\| email.length > 254` → 400 |

### Test senaryoları

- `GET /api/feed?type=malicious` → feedType 'following'e fallback (safe default)
- `GET /api/feed/activity?filter=hack` → filter 'all'e fallback; SQL WHERE eklenmez
- `GET /api/feed/activity?filter=reviews` → `action_type = 'review_created'` (map kullanılır, raw string push kaldırıldı)
- `POST /api/reports` body `{"name":"x","metric_ids":[...51 items]}` → 422
- `POST /api/reports` body `{"name":"x","recipients":[...21 emails]}` → 422
- `POST /api/upload` formData caption=`'a'.repeat(501)` → 400
- `GET /api/comments?targetType=unknown&targetId=1` → 400 (ENUM dışı)
- `GET /api/comments?targetType=place&targetId=1` → 200
- `POST /api/newsletter/subscribe` body `{"email":"${'a'.repeat(250)}@b.com"}` → 400 (maxLength)
- `DELETE /api/newsletter/subscribe` body `{"email":12345}` → 400 (typeof guard)

---

## Batch #144 — ENUM allowlist + maxLength (8 endpoint, Round 10)

**Amaç:** Round 10 taramasında tespit edilen loyalty/rewards/reservations/promotions endpoint'lerindeki ENUM ve maxLength eksiklikleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/rewards/index.ts` GET | `type` ve `status` query param allowlist yok | `VALID_REWARD_TYPES` (voucher/discount/product/experience/digital/physical) + `VALID_REDEMPTION_STATUSES` (pending/redeemed/expired/cancelled) |
| `src/pages/api/loyalty/transactions.ts` GET | `type` (transaction_type) allowlist yok — doğrudan SQL WHERE'e ekleniyor | `VALID_TRANSACTION_TYPES` (earn/spend/redeem/expire/adjustment/bonus/refund) |
| `src/pages/api/loyalty/rewards.ts` GET | `category` ve `tier` param allowlist yok — lib fonksiyonuna geçiyor | `VALID_REWARD_CATEGORIES` (7 değer) + `VALID_REWARD_TIERS` (bronze/silver/gold/platinum/vip) |
| `src/pages/api/loyalty/points.ts` POST | `reason` maxLength yok + `points` isFinite guard yok | reason ≤500; `Number.isFinite(points)` guard eklendi |
| `src/pages/api/loyalty/achievements.ts` GET | `view` param herhangi string kabul ediyordu | `VALID_VIEWS` = {all, unviewed, stats} allowlist |
| `src/pages/api/loyalty/achievements.ts` POST | `userAchievementId` maxLength yok (UUID = 36 char) | `userAchievementId.length > 36` → 422 |
| `src/pages/api/reservations/index.ts` GET | `status` query param allowlist yok — SQL WHERE'e geçiyor | `VALID_RESERVATION_STATUSES` (pending/confirmed/cancelled/completed/no_show) |
| `src/pages/api/promotions/index.ts` GET | `status` param (default 'active') allowlist yok | `VALID_PROMOTION_STATUSES` (active/draft/paused/expired/scheduled) |
| `src/pages/api/messages/index.ts` POST | `recipientId` maxLength yok | `rawRecipientId.length > 36` → 400 |

### Test senaryoları

- `GET /api/rewards?type=free_money` → 400 (ENUM dışı)
- `GET /api/rewards?my=true&status=stolen` → 400 (ENUM dışı)
- `GET /api/loyalty/transactions?type=hack` → 400 (ENUM dışı)
- `GET /api/loyalty/rewards?category=weapons` → 400 (ENUM dışı)
- `GET /api/loyalty/rewards?tier=superuser` → 400 (ENUM dışı)
- `POST /api/loyalty/points` body `{"userId":"x","points":999,"reason":"A".repeat(501)}` → 422
- `POST /api/loyalty/points` body `{"userId":"x","points":Infinity}` → 422
- `GET /api/loyalty/achievements?view=hack` → 400 (ENUM dışı)
- `POST /api/loyalty/achievements` body `{"userAchievementId":"x".repeat(37)}` → 422
- `GET /api/reservations?status=hacked` → 400 (ENUM dışı)
- `GET /api/promotions?status=unlimited` → 400 (ENUM dışı)
- `POST /api/messages` body `{"recipientId":"x".repeat(37),"content":"hi"}` → 400

---

## Batch #143 — Array length cap + metadata maxLength + ENUM (6 endpoint, Round 9)

**Amaç:** Round 9 taramasında tespit edilen DoS vektörleri, unbounded metadata alanları, ve ENUM eksiklikleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/admin/bus-routes.ts` | `bulk_schedules` action'da `times` dizisi sınırsız INSERT döngüsüne girebiliyordu (DoS) | `times.length > 200` → 400 |
| `src/pages/api/analytics/events.ts` | `sessionId` unbounded; metadata alanları (pageUrl, type, element, query, placeId, source) uncapped; resultCount isFinite guard yok | sessionId ≤200; pageUrl ≤2000; type ≤100; element ≤200; query ≤500; placeId/source ≤100; resultCount isFinite |
| `src/pages/api/analytics/performance.ts` POST | `url` (referer) ve `user-agent` header'ları maxLength olmadan DB INSERT'e geçiyordu | url ≤2000; ua ≤500 |
| `src/pages/api/search/index.ts` | `sort` param allowlist yok; `category`/`city` maxLength yok; `q` maxLength yok | `VALID_SORT_OPTIONS = {rating,newest,name,distance}`; category ≤100; city ≤100; q ≤500 |
| `src/pages/api/contact.ts` GET | `status` URL param allowlist yok | `VALID_CONTACT_STATUSES = {open,pending,resolved,closed}` |
| `src/pages/api/search/saved.ts` POST | `filters` JSON boyut sınırı yok | JSON.stringify(filters) ≤5000 |

### Test senaryoları

- `POST /api/admin/bus-routes` action=bulk_schedules, times=[201 items] → 400 (times dizisi 200 öğeyi geçemez)
- `POST /api/analytics/events` sessionId=`'a'.repeat(201)` → 400
- `POST /api/analytics/events` eventType=search, metadata.resultCount="nan" → 0 olarak normalize
- `POST /api/analytics/performance` data.url=`'a'.repeat(2001)` → url truncated to 2000 before INSERT
- `GET /api/search?q=${'a'.repeat(501)}` → 422
- `GET /api/search?sort=invalid` → fallback to 'rating' (güvenli default)
- `GET /api/search?category=${'a'.repeat(101)}` → category truncated to 100
- `GET /api/contact?status=spam` (admin) → 400 (ENUM dışı)
- `GET /api/contact?status=open` (admin) → 200
- `POST /api/search/saved` filters=`{very large object > 5000 chars}` → 422

---

## Batch #142 — Raw Body Spread + URL Param ENUM + maxLength (3 endpoint, Round 8)

**Amaç:** Round 8 taramasında tespit edilen en kritik sorunlar giderildi: raw body spread ile DB write, URL filtre param'larında ENUM eksikliği.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/places/index.ts` POST | `...body` spread ile DB insert — keyfi alan yazılabiliyordu | Explicit field destructure + maxLength (name ≤200, description ≤5000, address ≤500, phone ≤30, email ≤254, website ≤500, slug ≤200) + lat/lon isFinite + tags Array.isArray ≤50 |
| `src/pages/api/admin/users/index.ts` GET | `role` ve `status` URL param'ları allowlist yok | `VALID_USER_ROLES` + `VALID_USER_STATUSES` Set; search ≤200 |
| `src/pages/api/admin/subscriptions/users.ts` GET | `search` unbounded ILIKE; `tier` maxLength yok; `status` ENUM yok | search ≤200; tier ≤100; `VALID_SUB_STATUSES = {active, cancelled, expired, trialing, past_due}` |

### Test senaryoları

- `POST /api/places` body `{"name": "ok", "status": "hacked", "owner_id": "evil_uuid"}` → owner_id ignored; status forced to 'active'
- `POST /api/places` body `{"name": "A".repeat(201)}` → 400
- `POST /api/places` body `{"name": "ok", "latitude": 999}` → 400 (aralık dışı)
- `POST /api/places` body `{"name": "ok", "tags": "notanarray"}` → 400
- `GET /api/admin/users?role=superadmin` → 400 (ENUM dışı)
- `GET /api/admin/users?status=pending` → 400 (ENUM dışı)
- `GET /api/admin/users?search=${'A'.repeat(201)}` → 400
- `GET /api/admin/subscriptions/users?status=unknown` → 400 (ENUM dışı)
- `GET /api/admin/subscriptions/users?search=${'A'.repeat(201)}` → 400
- `GET /api/admin/subscriptions/users?tier=${'A'.repeat(101)}` → 400

---

## Batch #141 — Array + ENUM + maxLength (7 endpoint, Round 7)

**Amaç:** Round 7 taramasında tespit edilen 7 endpoint'teki array validasyon, ENUM ve maxLength eksiklikleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/admin/recipes.ts` | `ingredients`/`instructions` Array.isArray + length cap yok | Array.isArray + length ≤100 her ikisi için |
| `src/pages/api/places/[id]/update.ts` | `amenities`/`tags` array length cap yok | length ≤50 her ikisi için |
| `src/pages/api/places/submissions.ts` | `features`/`photos` Array.isArray + length cap yok | Array.isArray + features ≤50, photos ≤20 |
| `src/pages/api/auth/register.ts` | `fullName` maxLength yok | fullName ≤200 |
| `src/pages/api/notifications/preferences.ts` (GET) | `notificationType` ENUM allowlist yok | `VALID_NOTIFICATION_TYPES` Set (10 tip) |
| `src/pages/api/notifications/preferences.ts` (PUT) | `notificationType` ENUM + `preferences` boyut sınırı yok | ENUM + JSON.stringify ≤5000 |
| `src/pages/api/admin/site/media/index.ts` | `assetKey`/`url`/`alt`/`mimeType`/`metadata` maxLength/boyut yok | assetKey ≤200, url ≤500, alt ≤500, mimeType ≤100, metadata JSON ≤5000 |

### Test senaryoları

- `POST /api/admin/recipes` body `{"action":"upsert", "ingredients": [1..101 items], ...}` → 422
- `POST /api/admin/recipes` body `{"action":"upsert", "instructions": "not_an_array", ...}` → 422
- Admin form place update: 51 amenity → too_many_amenities redirect
- Admin form place update: 51 tag → too_many_tags redirect
- `POST /api/places/submissions` body `{"features": "notanarray", ...}` → 400
- `POST /api/places/submissions` body `{"features": [1..51 items], ...}` → 400
- `POST /api/places/submissions` body `{"photos": [1..21 items], ...}` → 400
- `POST /api/auth/register` body `{"fullName": "A".repeat(201), ...}` → 400
- `GET /api/notifications/preferences?type=unknown` → 422 (ENUM dışı)
- `PUT /api/notifications/preferences` body `{"notificationType": "hack", ...}` → 422
- `PUT /api/notifications/preferences` body `{"notificationType": "comment", "preferences": {"data": "A".repeat(5001)}}` → 422
- `PUT /api/admin/site/media` body `{"assetKey": "A".repeat(201), "url": "https://x.com"}` → 400
- `PUT /api/admin/site/media` body `{"assetKey": "ok", "url": "https://x.com", "alt": "A".repeat(501)}` → 400

---

## Batch #140 — ENUM + maxLength + isFinite + Array Guard (7 endpoint, Round 6)

**Amaç:** Round 6 taramasında tespit edilen 7 endpoint'teki validasyon eksiklikleri kapatıldı.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/social/feed.ts` | `activity_type`/`object_type`/`visibility` ENUM yok; `title` maxLength yok | 3 VALID_* Set + title ≤200 |
| `src/pages/api/social/follow.ts` | `action` ENUM yok (herhangi string geçer) | `VALID_FOLLOW_ACTIONS = {follow, unfollow}` |
| `src/pages/api/social/messages.ts` | shareLocation `latitude`/`longitude` isFinite guard yok | `parseFloat + isFinite + aralık [-90,90] / [-180,180]` |
| `src/pages/api/admin/users/[id].ts` | `flag` action'da `flagType`/`severity` ENUM yok; `reason` maxLength yok | `VALID_FLAG_TYPES` + `VALID_SEVERITIES` Set + reason ≤1000 |
| `src/pages/api/admin/moderation.ts` | `reason`/`notes` maxLength yok (DB'ye yazılıyor) | reason ≤1000, notes ≤2000 |
| `src/pages/api/admin/flags.ts` | POST: `key`/`name` maxLength yok; `type` ENUM yok | key ≤100 + name ≤200 + `VALID_FLAG_TYPES = {boolean,percentage,string,json}` |
| `src/pages/api/admin/places/create.ts` | `parseInt(categoryId/districtId)` isFinite guard yok; `tags` length cap yok | isFinite guard + redirect + tags ≤50 |

### Test senaryoları

- `POST /api/social/feed` body `{"activity_type": "hack", ...}` → 422
- `POST /api/social/feed` body `{"visibility": "secret", ...}` → 422
- `POST /api/social/feed` body `{"title": "A".repeat(201), ...}` → 422
- `POST /api/social/follow` body `{"userId": "x", "action": "block"}` → 400 (ENUM dışı)
- `POST /api/social/messages` body `{"action": "shareLocation", "conversationId": "x", "latitude": 999, "longitude": 0}` → 400 (aralık dışı)
- `POST /api/social/messages` body `{"action": "shareLocation", ..., "latitude": "abc"}` → 400 (NaN)
- `POST /api/admin/users/:id` body `{"action": "flag", "flagType": "hacker", "reason": "x"}` → 422 (ENUM dışı)
- `POST /api/admin/users/:id` body `{"action": "flag", "flagType": "spam", "severity": "extreme", "reason": "x"}` → 422
- `POST /api/admin/users/:id` body `{"action": "flag", "flagType": "spam", "reason": "A".repeat(1001)}` → 422
- `POST /api/admin/moderation` body `{"type": "review", "action": "reject", "id": "x", "reason": "A".repeat(1001)}` → 400
- `POST /api/admin/flags` body `{"key": "ok", "name": "ok", "type": "unknown"}` → 400 (ENUM dışı)
- `POST /api/admin/flags` body `{"key": "A".repeat(101), "name": "ok", "type": "boolean"}` → 400
- Admin form: `category_id=abc` → invalid_category redirect (parseInt NaN guard)
- Admin form: 51 tag ile yer ekleme → too_many_tags redirect

---

## Batch #139 — maxLength + Array Validation (6 endpoint, Round 5)

**Amaç:** Round 5 taramasında tespit edilen son validasyon boşlukları kapatıldı. Kapsam: ValidationSchema maxLength eksiklikleri, array type/length guard eksiklikleri, edit/sharePlace maxLength ve metadata boyut kontrolü.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/vendor/onboarding/start.ts` | businessName/Category/Type maxLength yok | businessName ≤200, businessCategory/Type ≤100 |
| `src/pages/api/vendor/onboarding/step.ts` | `data` alanı maxLength yok | data ≤50000 |
| `src/pages/api/social/messages.ts` (edit) | `newContent` maxLength yok | newContent ≤5000 (+ typeof check) |
| `src/pages/api/social/messages.ts` (sharePlace) | `placeName`/`placeMessage` maxLength yok | placeName ≤200, placeMessage ≤1000 |
| `src/pages/api/social/messages.ts` (send) | `metadata` boyut sınırı yok | `JSON.stringify(metadata).length > 5000` → 400 |
| `src/pages/api/reviews/add.ts` | `images` Array.isArray ve length cap yok | Array.isArray check + length ≤20 |
| `src/pages/api/admin/blog/index.ts` | `tag_ids` Array.isArray ve length cap yok | Array.isArray check + length ≤50 |
| `src/pages/api/admin/blog/[id].ts` | `tag_ids` Array.isArray ve length cap yok | Array.isArray check + length ≤50 |

### Test senaryoları

- `POST /api/vendor/onboarding/start` body `{"businessName": "A".repeat(201), ...}` → 422
- `POST /api/vendor/onboarding/start` body `{"businessCategory": "A".repeat(101), ...}` → 422
- `POST /api/vendor/onboarding/step` body `{"step": 1, "data": "A".repeat(50001)}` → 422
- `POST /api/social/messages` body `{"action": "edit", "messageId": "x", "newContent": "A".repeat(5001)}` → 400
- `POST /api/social/messages` body `{"action": "sharePlace", ..., "placeName": "A".repeat(201)}` → 400
- `POST /api/social/messages` body `{"action": "sharePlace", ..., "placeName": "ok", "message": "A".repeat(1001)}` → 400
- `POST /api/social/messages` body `{..., "metadata": { "data": "A".repeat(5001) }}` → 400
- `POST /api/reviews/add` body `{"placeId": "...", "rating": 4, "content": "ok...", "images": "notanarray"}` → 422
- `POST /api/reviews/add` body `{"images": [1,2,...21 items]}` → 422 (>20 items)
- `POST /api/admin/blog` body `{"tag_ids": "notanarray", ...}` → 422
- `POST /api/admin/blog` body `{"tag_ids": [...51 items], ...}` → 422
- `PUT /api/admin/blog/:id` body `{"tag_ids": [...51 items]}` → 422

---

## Batch #138 — maxLength + ENUM + Numeric + DB Parse Guard (4 endpoint)

**Amaç:** 4 endpoint'te bulunan validasyon boşlukları kapatıldı. Tarama sonuçları bu round'da büyük ölçüde temizlenmiş — gerçek bulgu sayısı azalıyor.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/admin/site/services.ts` | service_key/service_group/title/slug/href maxLength yok | maxLength 100/100/200/200/500 |
| `src/pages/api/promotions/[id].ts` | `status` alanı ENUM allowlist yok | `VALID_PROMO_STATUSES` Set `{active, draft, paused, expired, scheduled}` |
| `src/pages/api/reviews/index.ts` (POST update) | rating isFinite yok; title/content maxLength yok | rating `parseFloat+isFinite+[1-5]`; title ≤200; content ≤5000 |
| `src/pages/api/reviews/index.ts` (GET stats) | `parseInt(row.rating/count)` NaN olursa sum bozulurdu | `isFinite` guard + `continue` ile NaN satırlar atlanır |

### Test senaryoları

- `PUT /api/admin/site/services` body `{service_key: "A".repeat(101), ...}` → 400
- `PUT /api/admin/site/services` body `{..., href: "A".repeat(501)}` → 400
- `PUT /api/promotions/:id` body `{"status": "pending"}` → 400 (ENUM dışı)
- `PUT /api/promotions/:id` body `{"status": "active"}` → başarılı
- `POST /api/reviews` body `{"action": "update", "reviewId": "...", "rating": 6}` → 400
- `POST /api/reviews` body `{"action": "update", "reviewId": "...", "rating": "abc"}` → 400
- `POST /api/reviews` body `{"action": "update", "reviewId": "...", "title": "A".repeat(201)}` → 400
- `GET /api/reviews?placeId=...&stats=1` → NaN satırlı DB verisi olsa bile average hesabı bozulmamalı

---

## Batch #137 — maxLength + ENUM + Numeric + Alan Kısıtlama (6 endpoint)

**Amaç:** Tarama ajanlarının tespit ettiği 6 endpoint'teki string/numeric/alan validasyon eksiklikleri giderildi.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/search/saved.ts` | searchName/searchQuery maxLength yok; searchType ENUM yok | maxLength 200/1000 + `VALID_SEARCH_TYPES` Set |
| `src/pages/api/admin/blog/tags.ts` | color alanı maxLength yok | color ≤50 char |
| `src/pages/api/featured-listings/[id].ts` | Body tümüyle geçiyordu (status, payment_status yazılabilirdi) | Sadece title/description destructure; maxLength 200/2000; `safeUpdates` objesi geçirildi |
| `src/pages/api/places/[id]/visit.ts` | rating: isFinite guard yok; durationMinutes: hiç doğrulama yok | rating: `parseFloat + isFinite + 0-5`; durationMinutes: `parseInt + isFinite + ≥0` |
| `src/pages/api/admin/loyalty/rewards.ts` | reward_name ve category maxLength yok | reward_name ≤200, category ≤100, description ≤2000 |

### Test senaryoları

- `POST /api/search/saved` body `{"searchName": "ok", "searchQuery": "ok", "searchType": "images"}` → 422 (ENUM dışı)
- `POST /api/search/saved` body `{"searchName": "A".repeat(201), ...}` → 422
- `POST /api/admin/blog/tags` body `{"name": "x", "slug": "x", "color": "A".repeat(51)}` → 422
- `PUT /api/featured-listings/:id` body `{"status": "active", "payment_status": "paid"}` → başarılı ama status/payment_status güncellenmez (field filtreleme)
- `PUT /api/featured-listings/:id` body `{"title": "A".repeat(201)}` → 400
- `POST /api/places/:id/visit` body `{"rating": "abc"}` → 400
- `POST /api/places/:id/visit` body `{"rating": 6}` → 400
- `POST /api/places/:id/visit` body `{"durationMinutes": -5}` → 400
- `POST /api/admin/loyalty/rewards` body `{"reward_name": "A".repeat(201), ...}` → 422

---

## Batch #136 — maxLength + ENUM + Numeric Body Doğrulama (5 endpoint)

**Amaç:** Tarama ajanlarının tespit ettiği 5 endpoint'te eksik string maxLength, ENUM allowlist ve numeric body doğrulama eklendi.

### Değiştirilen dosyalar

| Dosya | Eksiklik | Düzeltme |
|---|---|---|
| `src/pages/api/notifications/draft.ts` | title/message/url/segment maxLength yok, target ENUM yok | maxLength 255/10000/500/100 + `VALID_TARGETS` Set |
| `src/pages/api/email/templates/index.ts` | Tüm alanlar doğrulamasız | maxLength × 7 + `VALID_TEMPLATE_TYPES` ENUM |
| `src/pages/api/reviews/[id]/reactions.ts` | reaction_type ve action ENUM yok | `VALID_REACTION_TYPES` + `VALID_ACTIONS` Set |
| `src/pages/api/admin/recipes.ts` | prep_time/cook_time/servings NaN geçebilirdi | `parseInt + isFinite` + safe değişkenler DB sorgularına geçirildi |
| `src/pages/api/admin/bus-routes.ts` | route_no numeric guard yok; day_type/direction ENUM yok | `parseInt + isFinite + ≥1` + `VALID_DAY_TYPES/DIRECTIONS` Set (add_schedule + bulk_schedules) |

### Test senaryoları

- `POST /api/notifications/draft` body `{"title": "A".repeat(256), "message": "x"}` → 422
- `POST /api/notifications/draft` body `{"title": "t", "message": "m", "target": "vip"}` → 422 (ENUM dışı)
- `POST /api/email/templates` body `{...valid..., "template_type": "custom"}` → 400 (ENUM dışı)
- `POST /api/email/templates` body `{...valid..., "subject_line": "A".repeat(501)}` → 400
- `POST /api/reviews/:id/reactions` body `{"reaction_type": "angry"}` → 400 (ENUM dışı)
- `POST /api/reviews/:id/reactions` body `{"reaction_type": "like", "action": "toggle"}` → 400 (ENUM dışı)
- `POST /api/admin/recipes` body `{"action": "upsert", "name": "x", "slug": "x", "prep_time": "abc"}` → 422
- `POST /api/admin/recipes` body `{"action": "upsert", ..., "servings": -1}` → 422
- `POST /api/admin/bus-routes` body `{"action": "add_route", "route_no": "abc", "name": "x"}` → 400
- `POST /api/admin/bus-routes` body `{"action": "add_schedule", ..., "day_type": "holiday"}` → 400 (ENUM dışı)
- `POST /api/admin/bus-routes` body `{"action": "bulk_schedules", ..., "direction": "north"}` → 400 (ENUM dışı)

---

## Batch #135 — String maxLength + ENUM Doğrulama (collections, content, marketing-campaigns)

**Amaç:** 4 endpoint'te body string alanlarının maxLength ve ENUM doğrulaması yoktu; serbest string değerler DB'ye yazılıyordu.

### Değiştirilen dosyalar

| Dosya | Alan | Sorun | Düzeltme |
|---|---|---|---|
| `src/pages/api/collections/[id].ts` | `name`, `description`, `icon`, `is_public` | Body direkt `updateCollection`'a geçiyordu | maxLength 200/2000/200 + boolean check |
| `src/pages/api/content/index.ts` | `title`, `description`, `content`, `content_type`, `visibility` | Sadece minimum uzunluk kontrolü vardı | maxLength 500/5000/100000 + ENUM allowlist |
| `src/pages/api/content/[contentId].ts` | Aynı alanlar | Body doğrulamasız `updateContent`'e geçiyordu | Aynı validasyon POST ile eşleşti |
| `src/pages/api/marketing-campaigns/index.ts` | `name`, `description`, `campaign_type`, `budget` | ENUM yok, name maxLength yok, budget NaN geçebilirdi | maxLength 200/2000 + ENUM Set + parseFloat+isFinite |

### Test senaryoları

- `PUT /api/collections/:id` body `{"name": "A".repeat(201)}` → 400 dönmeli
- `PUT /api/collections/:id` body `{"icon": "A".repeat(201)}` → 400 dönmeli
- `PUT /api/collections/:id` body `{"is_public": "yes"}` → 400 dönmeli (string değil boolean)
- `POST /api/content` body `{"title": "AB"}` → 422 dönmeli (min 3 char)
- `POST /api/content` body `{"title": "ok", "content_type": "video"}` → 422 dönmeli
- `POST /api/content` body `{"title": "ok", "visibility": "friends"}` → 422 dönmeli
- `PUT /api/content/:id` body `{"content_type": "video"}` → 422 dönmeli
- `POST /api/marketing-campaigns` body `{"name": "A".repeat(201), "campaign_type": "promotion", "place_id": "..."}` → 400 dönmeli
- `POST /api/marketing-campaigns` body `{"name": "test", "campaign_type": "banner", "place_id": "..."}` → 400 dönmeli (ENUM dışı)
- `POST /api/marketing-campaigns` body `{"name": "test", "campaign_type": "promotion", "budget": "abc", "place_id": "..."}` → 400 dönmeli

Bu dosya otomatik test çalıştırılmaz. Her özellik/fix sonrası eklenir, manuel test için kullanılır.

---

## Batch #134 — Body Numeric Field Doğrulama Eksiklikleri

**Amaç:** JSON body'den gelen sayısal alanların `parseInt`/`Number.isFinite` guard'ı olmadan doğrudan DB'ye gönderilmesini önlemek. URL search param'lar için HARD RULE #17 vardı ama body param'lar benzer riske sahip.

### Değiştirilen dosyalar

| Dosya | Alan | Sorun | Düzeltme |
|---|---|---|---|
| `src/pages/api/points/add.ts` | `amount` | `!amount` kontrolü NaN'ı geçirir, `type` ENUM yok | `parseInt + isFinite + > 0` + `VALID_TYPES` Set |
| `src/pages/api/admin/loyalty/rewards.ts` | `stock_quantity` | `stock_quantity > 0` tipi doğrulamaz | `parseInt + isFinite + > 0` |
| `src/pages/api/warehouse/query.ts` | `limit` | `Math.min(limit \|\| 100, 1000)` NaN geçirir | `parseInt + isFinite` ile `safeLimit` |
| `src/pages/api/reservations/index.ts` | `partySize`, `customerEmail` | `!partySize` NaN'ı geçirir, email maxLength yok | `parseInt + isFinite + range [1-500]` + 254 char limit |
| `src/pages/api/places/submissions.ts` | `priceRange` | ENUM doğrulama yoktu | `VALID_PRICE_RANGES` Set kontrolü |

### Test senaryoları

- `POST /api/points/add` body `{"amount": "abc", "reason": "test"}` → 400 dönmeli
- `POST /api/points/add` body `{"amount": -10, "reason": "test"}` → 400 dönmeli
- `POST /api/points/add` body `{"amount": 50, "reason": "test", "type": "hack"}` → 400 dönmeli
- `POST /api/admin/loyalty/rewards` body `{"stock_quantity": "abc"}` → inventory kaydı oluşturulmamalı
- `POST /api/warehouse/query` body `{"limit": "abc", ...}` → 100 limit olarak davranmalı
- `POST /api/reservations` body `{"partySize": "abc"}` → 400 dönmeli
- `POST /api/reservations` body `{"partySize": 501}` → 400 dönmeli
- `PUT /api/places/submissions` body `{"action": "update", "priceRange": "hack"}` → 400 dönmeli
- `PUT /api/places/submissions` body `{"action": "update", "priceRange": "moderate"}` → başarılı güncelleme

---

## Batch #133 — Profil Sayfaları `noIndex: true` Eksikliği

**Amaç:** Auth gerektiren `/profil/*` sayfalarında `seo` objesine `noIndex: true` ekleme. Arama motorları bu sayfalara ulaşamasa da gereksiz crawl trafiğini önler.

### Değiştirilen dosyalar

| Dosya | Düzeltme |
|---|---|
| `src/pages/profil/index.astro` | `noIndex: true` eklendi |
| `src/pages/profil/favoriler.astro` | `noIndex: true` eklendi |
| `src/pages/profil/aktivite.astro` | `noIndex: true` eklendi |
| `src/pages/profil/yorumlar.astro` | `noIndex: true` eklendi |
| `src/pages/profil/bildirimler.astro` | `noIndex: true` eklendi |

### Test senaryoları

- `/profil`, `/profil/favoriler`, `/profil/aktivite`, `/profil/yorumlar`, `/profil/bildirimler` için response header'larında `X-Robots-Tag: noindex` veya HTML `<meta name="robots" content="noindex">` görünmeli
- Giriş yapmış kullanıcı için sayfa içeriği normal şekilde yüklenmeli

---

## Batch #132 — safeFloatParam Helper + URL Float Param Sweep

**Amaç:** HARD RULE #17'nin float karşılığı: URL search param'larından `parseFloat` + manuel `Number.isFinite` guard'ını `safeFloatParam` helper ile standardize etmek.

### Değiştirilen dosyalar

| Dosya | Sorun | Düzeltme |
|---|---|---|
| `src/lib/api.ts` | `safeFloatParam` helper yoktu | `safeIntParam` ile aynı mantık, `parseFloat` tabanlı helper eklendi |
| `src/pages/api/search/advanced.ts` | `parseFloat(…) + Number.isFinite + Math.max/min` | `safeFloatParam(…, 0, 0, 5)` |
| `src/pages/api/search/index.ts` | Aynı manual pattern | `safeFloatParam(…, 0, 0, 5)` |
| `src/pages/api/v2/places/index.ts` | `parseFloat(lat) → NaN` ve `Number.isFinite(latNum)` guard | `safeFloatParam(…, NaN, -90, 90)` ve `safeFloatParam(…, NaN, -180, 180)` |

### Test senaryoları

- `GET /api/search?q=test&minRating=abc` → minRating=0 (default) kullanılmalı, 500 veya NaN DB bind hatası olmamalı
- `GET /api/search?q=test&minRating=3.5` → minRating=3.5 olarak uygulanmalı
- `GET /api/search?q=test&minRating=10` → 5'e clamp edilmeli
- `GET /api/search/advanced?q=test&minRating=-1` → 0'a clamp edilmeli
- `GET /api/v2/places?lat=abc&lng=abc` → hasGeo=false, konum filtresi devre dışı
- `GET /api/v2/places?lat=37.5&lng=38.8` → hasGeo=true, konum bazlı sıralama aktif

---

## Batch #130 — Non-Admin Sayfa Auth Guard Sweep (14 dosya)

**Amaç:** `src/pages/` (admin/ dışında) altındaki tüm `if (!Astro.locals.user)` pattern'lerini `const user = Astro.locals.user; if (!user)` standardına çekmek. Redirect param eksik olan 12 dosyaya `?redirect=<path>` eklendi.

### Değiştirilen dosyalar

| Dosya | Sorun | Düzeltme |
|---|---|---|
| `işletme/pazarlama.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/işletme/pazarlama` |
| `icerik.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/icerik` |
| `kullanici/sadakat.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/kullanici/sadakat` |
| `mesajlar/index.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/mesajlar` |
| `abonelik.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/abonelik` |
| `loyalty/transactions.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/loyalty/transactions` |
| `loyalty/rewards.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/loyalty/rewards` |
| `loyalty/index.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/loyalty` |
| `ayarlar.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/ayarlar` |
| `akis.astro` | user var yok (redirect param vardı) | `const user` eklendi |
| `vendor/analytics.astro` | user var yok, `Astro.locals.user.id` → `user.id` | `const user` + userId refactor |
| `vendor/dashboard.astro` | user var yok, `Astro.locals.user.*` → `user.*` | `const user` + vendor object refactor |
| `isletme/analytics.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/isletme/analytics` |
| `ayarlar/kotalar.astro` | user var yok, redirect param yok | `const user` + `/giris?redirect=/ayarlar/kotalar` |

### Test senaryoları

- Oturumsuz kullanıcı `/mesajlar`, `/loyalty`, `/abonelik`, `/ayarlar`, `/vendor/dashboard`, `/akis` adreslerine git → `/giris?redirect=<sayfa>` yönlendirmesi olmalı
- Giriş yaptıktan sonra aynı sayfaya yönlendirilmeli (redirect param çalışmalı)

---

## Batch #131 — Tüm Sayfalarda Auth Guard Tam Sweep

**Amaç:** `src/pages/` genelinde kalan tüm auth guard sorunlarını temizle.

### Değiştirilen dosyalar

| Dosya | Sorun | Düzeltme |
|---|---|---|
| `aktivitelerim/index.astro` | `const { locals } = Astro; if (!locals.user)` | `const user = Astro.locals.user; if (!user)` |
| `bildirimler/index.astro` | Aynı `locals` destructure pattern | Standardize edildi |
| `veri-ambarı/index.astro` | Admin check `role === 'admin'` (HARD RULE #52 ihlali) | `!Astro.locals.isAdmin` |
| `canli-analitik/index.astro` | Aynı admin check sorunu | `!Astro.locals.isAdmin` |
| `raporlar/index.astro` | `userId` optional chaining check | `const user` + `const userId = user.id` |
| `api/profile/delete.ts` | API endpoint `redirect('/giris')` (API yanlışlıkla redirect yapıyor) | 401 JSON response |

### Test senaryoları

- Tüm auth gerektiren sayfalara oturumsuz erişimde `?redirect=<path>` ile `/giris`'e yönlendirmeli
- Giriş sonrası doğru sayfaya dönmeli
- `/veri-ambarı` ve `/canli-analitik` — moderatör kullanıcısı da erişebilmeli
- `DELETE /api/profile/delete` — oturumsuz istek 401 JSON dönmeli (redirect değil)

---

## Batch #129 — Admin Sayfaları AdminLayout.astro Migration (Tüm 57+ Dosya)

**Amaç:** Tüm `src/pages/admin/**/*.astro` dosyalarını `Layout.astro`'dan `AdminLayout.astro`'ya geçirmek. AdminLayout auth guard, hero başlığı/alt başlığı ve `<slot name="hero-action" />` düğme yerleşimini dahili olarak yönetir.

### Geçirilen dosyalar (57+)

Auth guard blokları (`if (!user || !isAdmin)`, `if (!isAdmin)`, `role !== 'admin'`) silindi — AdminLayout dahili olarak halleder. Hero-action düğmeleri `<a slot="hero-action" ...>` ile AdminLayout'a taşındı. Dinamik subtitle'lar `subtitle={`${count} öğe`}` şeklinde eklendi.

**Tier 1 (root admin):** analytics, monitoring, audit-logs, vendor-approval, import, manage, governance, export-tokens, component-gallery, integrations, revenue, webhooks, subscriptions, feature-flags, campaigns, notifications, api-docs, social-policies, social-risk, site-audit, social-events, content-agents, moderation, recipes, loyalty/index, verifications, site-content, categories, ulasim, pharmacies, places, reservations, user-deletions, reviews, reports, quotas, users/index, index, dashboard

**Tier 2 (places/blog/events alt dizinleri):** places/add, places/edit/[id], places/lifecycle, blog/index, blog/add, blog/edit/[id], blog/comments, blog/analytics, blog/posts, blog/new, blog/content-bot, events/index, events/add, events/edit/[id]/index

**Tier 3 (historical-sites + messages + tickets):** historical-sites/index, historical-sites/add, historical-sites/edit/[id]/index, messages/index, tickets/index

### Test senaryoları

**Layout kontrol:**
- Admin kullanıcıyla herhangi bir admin sayfasına git → AdminLayout'tan gelen sidebar + header görünmeli
- Oturumsuz kullanıcıyla admin sayfasına git → AdminLayout dahili yönlendirmesi `/giris` sayfasına gitmeli

**Hero başlık/alt başlık:**
- `/admin` → "Yönetim Paneli" başlığı + "Platform genel görünümü" alt başlık
- `/admin/dashboard` → "Yönetim Paneli" başlığı + "Platform yönetimi, moderasyon ve kullanıcı yönetimi"
- `/admin/blog` → "Blog Yönetimi" başlığı + "Yeni Yazı" hero-action düğmesi görünmeli
- `/admin/places` → "Mekan Yönetimi" başlığı + hero-action düğmesi görünmeli
- `/admin/events` → "Etkinlik Yönetimi" başlığı + "Yeni Etkinlik" hero-action düğmesi görünmeli
- `/admin/historical-sites` → "Tarihi Yerler" başlığı + "Yeni Yer Ekle" hero-action düğmesi görünmeli

**Dinamik subtitle:**
- `/admin/messages` → "X mesaj" şeklinde mesaj sayısı subtitle olarak görünmeli
- `/admin/blog/posts` → "X yazı bulundu" şeklinde yazı sayısı görünmeli
- `/admin/blog/edit/[id]` → yazı başlığı subtitle olarak görünmeli
- `/admin/events/edit/[id]/` → etkinlik başlığı subtitle olarak görünmeli
- `/admin/historical-sites/edit/[id]/` → tarihi yer adı subtitle olarak görünmeli

**İçerik koruması:**
- `/admin/blog/edit/abc-olmayan-id` → `/admin/blog` sayfasına yönlendirmeli (içerik guard korundu)
- `/admin/events/edit/abc-olmayan-id/` → `/admin/events` sayfasına yönlendirmeli
- `/admin/historical-sites/edit/abc-olmayan-id/` → `/admin/historical-sites` sayfasına yönlendirmeli

**Server Islands (dashboard):**
- `/admin/dashboard` → DashboardStats ve IntegrationsHealthSummary bileşenleri `server:defer` ile ertelendi; iskelet animasyonu görünmeli, ardından gerçek veriler yüklenmeli

---

## Batch #125–#128 — Admin Sayfaları Auth Guard Sweep

**Amaç:** Tüm admin Astro sayfalarında auth guard pattern'ini standartlaştırma: `const user = Astro.locals.user; if (!user || !Astro.locals.isAdmin)` + doğru redirect parametresi.

### Düzeltilen dosyalar

| Dosya | Sorun | Düzeltme |
|---|---|---|
| `src/pages/admin/dashboard.astro` | `!isAdmin` (user var yok, redirect param yok) | `const user = Astro.locals.user; if (!user \|\| !Astro.locals.isAdmin) { return Astro.redirect('/giris?redirect=/admin/dashboard'); }` |
| `src/pages/admin/analytics.astro` | `user.role !== 'admin'` (moderatör dışlanıyor) | `!Astro.locals.isAdmin` + redirect param |
| `src/pages/admin/index.astro` | **Auth check hiç yoktu** | Standart pattern eklendi |
| `src/pages/admin/places.astro` | `!isAdmin` (user var yok, redirect param yok) | Standart pattern |
| `src/pages/admin/reservations.astro` | `user?.role !== 'admin'` (moderatör dışlanıyor) | `!Astro.locals.isAdmin` |
| `src/pages/admin/vendor-approval.astro` | `!isAdmin` (user var yok) | Standart pattern |
| `src/pages/admin/user-deletions.astro` | `user?.role !== 'admin'` | `!Astro.locals.isAdmin` |
| `src/pages/admin/monitoring.astro` | `!isAdmin` (user var yok, redirect param yok) | Standart pattern |
| `src/pages/admin/audit-logs.astro` | Redirect param eksik | Standart pattern |
| `src/pages/admin/site-content.astro` | Redirect param eksik | Standart pattern |
| `src/pages/admin/loyalty/index.astro` | `!isAdmin` (user var yok, redirect param `/giris`) | Standart pattern |
| `src/pages/admin/verifications.astro` | `user.role !== 'admin'` | `!Astro.locals.isAdmin` |
| `src/pages/admin/categories.astro` | `!isAdmin` (user var yok) | Standart pattern |
| `src/pages/admin/users/index.astro` | `!isAdmin` (user var yok) | Standart pattern |
| `src/pages/admin/places/add.astro` | `!isAdmin` (user var yok, redirect `/admin`) | `redirect=/admin/places/add` |
| `src/pages/admin/places/edit/[id].astro` | `!isAdmin` (user var yok, redirect `/admin`) | `redirect=/admin/places` |

### Test senaryoları

**Oturumsuz kullanıcı:**
- `/admin`, `/admin/dashboard`, `/admin/analytics`, `/admin/places`, `/admin/places/add`, `/admin/places/edit/1` adreslerine git → `/giris?redirect=<sayfa>` yönlendirmesi olmalı

**Moderatör kullanıcı:**
- `role = 'moderator'` olan kullanıcıyla giriş yap → `/admin` ve tüm alt sayfalara erişebilmeli (HARD RULE #52: moderatörler panel erişimi alır)

**Admin kullanıcı:**
- Tüm admin sayfalarına erişim açık olmalı

---

## Batch #117 — Harran Scripts Phase 12 (notifications, icerik-rehberi, işletme/pazarlama, veri-ambarı)

**Amaç:** Bildirimler, içerik rehberi, işletme pazarlama ve veri ambarı sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/notifications.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; obsidyen hero + `HESABIM` tracking etiket + `text-[#F5EDD6]` başlık + `text-[#9A8470]` alt başlık eklendi; `NotificationCenter` içerik div'e taşındı |
| `src/pages/icerik-rehberi.astro` | `bg-gray-50 dark:bg-gray-900 py-12`→`min-h-screen bg-[#FDFAF3]`; obsidyen hero + `GELİŞTİRİCİ REHBERİ` tracking etiket + başlık/alt başlık; `bg-white dark:bg-gray-800 rounded-2xl shadow-lg`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm`; `text-gray-900 dark:text-white`→`text-[#1A1008]`; `text-gray-600 dark:text-gray-300`→`text-[#6B5540]`; dış link `text-emerald-600 dark:text-emerald-400`→`text-urfa-600 hover:text-urfa-700`; ipucu kutusu amber+dark→`bg-[rgba(200,160,100,0.06)] text-urfa-700 rounded-sm`; anahtar kelime chip'leri `rounded-full dark:*`→`rounded-sm` bakır; CTA `bg-emerald-600 rounded-xl`→`bg-urfa-600 rounded-sm`; `container-custom`→`container mx-auto px-4`; tüm `dark:*` kaldırıldı |
| `src/pages/işletme/pazarlama.astro` | `bg-gray-50 dark:bg-gray-900 min-h-screen pt-20 pb-12`→`min-h-screen bg-[#FDFAF3]`; obsidyen hero + `İŞLETME PANELİ` tracking etiket; iki panel `bg-white dark:bg-gray-800 rounded-lg shadow`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm`; `border-b border-gray-200 dark:border-gray-700`→`border-[rgba(200,160,100,0.14)]`; `text-gray-600 dark:text-gray-400`→`text-[#6B5540]`; 3 bilgi kutusu (mavi/yeşil/mor dark:*)→bakır `bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm`; başlıklar `text-[#1A1008]`; gövde `text-[#6B5540]`; tüm `dark:*` kaldırıldı |
| `src/pages/veri-ambarı/index.astro` | `bg-gray-50` yok→`min-h-screen bg-[#FDFAF3]`; obsidyen hero + `ANALİTİK` tracking etiket + `text-[#F5EDD6]` başlık + `text-[#9A8470]` alt başlık; `text-gray-900`→`text-[#1A1008]`; `text-gray-600`→`text-[#6B5540]`; `OLAPExplorer` içerik div'e taşındı |

### Test senaryoları

**Bildirimler (`/bildirimler` veya `/notifications`):**
- Obsidyen hero + `HESABIM` tracking etiket + `text-[#F5EDD6]` başlık
- `min-h-screen bg-[#FDFAF3]`; `NotificationCenter` bileşeni `py-8` içerik div'inde

**İçerik Rehberi (`/icerik-rehberi`):**
- Obsidyen hero + `GELİŞTİRİCİ REHBERİ` tracking etiket
- Adım kartları `rounded-sm border-[rgba(200,160,100,0.18)]` (rounded-2xl değil)
- Dış link'ler `text-urfa-600` (emerald değil)
- İpucu kutusu bakır arka plan
- Anahtar kelime chip'leri `rounded-sm` (rounded-full değil)
- CTA `bg-urfa-600 rounded-sm` (emerald/rounded-xl değil)

**İşletme Pazarlama (`/isletme/pazarlama` - `/işletme/pazarlama`):**
- Obsidyen hero + `İŞLETME PANELİ` tracking etiket
- İki panel `rounded-sm border-[rgba(200,160,100,0.18)]`; panel başlığı `border-[rgba(200,160,100,0.14)]`
- 3 bilgi kutusu hepsi bakır (mavi/yeşil/mor yok)

**Veri Ambarı (`/veri-ambarı`):**
- Admin girişiyle: obsidyen hero + `ANALİTİK` tracking etiket
- `OLAPExplorer` `bg-[#FDFAF3]` arka planda

---

## Batch #116 — Harran Scripts Phase 11 (eslesme, raporlar, canli-analitik, kullanici/sadakat, webhooks, icerik, [...seopage])

**Amaç:** Eşleşme, raporlar, canlı analitik, sadakat programı, webhooks, içerik yönetimi ve dinamik SEO landing page sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/eslesme.astro` | Auth-öncesi alan: `bg-slate-950`→`bg-[#0D0A08]`; kart `rounded-[2rem] border-white/10 bg-white/5`→`rounded-sm border-[rgba(200,160,100,0.14)] bg-[rgba(200,160,100,0.04)]`; tracking etiket `text-amber-300`→`text-[#9A8470]`; h1→`text-[#F5EDD6]`; body `text-slate-300`→`text-[#C4B49A]`; highlight kutu `rounded-2xl border-amber-300/30 bg-amber-300/10`→bakır; stat kartları `rounded-2xl bg-slate-900`→`rounded-sm border-[rgba(200,160,100,0.14)] bg-[rgba(200,160,100,0.06)]`; `text-amber-300/emerald-300/sky-300`→`text-urfa-400/urfa-300`; birincil CTA `rounded-xl bg-amber-400 text-slate-950`→`rounded-sm bg-urfa-600 text-white`; ikincil CTA'lar→`rounded-sm border-[rgba(200,160,100,0.2)] text-[#C4B49A]`; auth bölümü `min-h-screen bg-[#FDFAF3]` |
| `src/pages/raporlar/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero (`HESABIM` tracking etiket, `text-[#F5EDD6]` başlık, `text-[#9A8470]` alt başlık); `ReportManager` içerik div içinde |
| `src/pages/canli-analitik/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero (`ANALİTİK` tracking etiket, `text-[#F5EDD6]` başlık); `LiveAnalyticsDashboard` içerik div içinde |
| `src/pages/kullanici/sadakat.astro` | `bg-gray-50 dark:bg-gray-900 pt-20 pb-12`→`min-h-screen bg-[#FDFAF3]` + obsidyen hero (`HESABIM`); 3 bilgi kutusu (mavi/yeşil/mor)→hepsi bakır `bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm`; SSS kutusu `bg-white dark:bg-gray-800 rounded-lg shadow`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm`; tüm `dark:*` kaldırıldı; `text-gray-600 dark:*`→`text-[#6B5540]`; `text-*-900 dark:*`→`text-[#1A1008]` |
| `src/pages/webhooks.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero (`ENTEGRASYON`); 3 gradient bilgi kutusu→bakır; yönetici/analitik kartları `bg-white rounded-lg shadow-lg`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm`; kod blokları `bg-gray-50 rounded`→`bg-[rgba(200,160,100,0.04)] rounded-sm text-[#6B5540]`; ipucu kutusu `bg-blue-50 rounded-lg border-blue-200`→bakır `rounded-sm`; tüm `text-*-900`→`text-[#1A1008]`; `text-*-800/600`→`text-[#6B5540]` |
| `src/pages/icerik.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero (`HESABIM`); 3 bilgi kutusu `bg-blue/green/purple-50 rounded-lg`→bakır `rounded-sm`; başlık `text-blue/green/purple-900`→`text-[#1A1008]`; gövde `text-gray-700`→`text-[#6B5540]` |
| `src/pages/[...seopage].astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `bg-gradient-to-br from-red-700 to-red-900`→obsidyen + `ŞANLIURFA REHBERİ` tracking etiket + `text-[#F5EDD6]` başlık + `text-[#C4B49A]` alt metin; liste öğeleri `bg-white rounded-xl shadow-sm hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm hover:shadow-md hover:border-urfa-300`; numara rozet `bg-red-100 rounded-xl text-red-600`→`bg-[rgba(200,160,100,0.08)] rounded-sm text-urfa-600`; isim `text-gray-900 group-hover:text-red-600`→`text-[#1A1008] group-hover:text-urfa-700`; `text-gray-500/400`→`text-[#6B5540]/text-[#9A8470]`; yıldız `text-yellow-500`→`text-urfa-500`; boş durum `rounded-2xl border-amber-100`→`rounded-sm border-[rgba(200,160,100,0.18)]`; CTA'lar `rounded-xl bg-red-700`→`rounded-sm bg-urfa-600`; ikincil CTA'lar→`rounded-sm border-[rgba(200,160,100,0.2)] text-urfa-700` |

### Test senaryoları

**Eşleşme (`/eslesme`):**
- Giriş yapmamış kullanıcıda: `bg-[#0D0A08]` arka plan, obsidyen stil kart, `text-[#9A8470]` tracking etiket
- Giriş yapmış kullanıcıda: `min-h-screen bg-[#FDFAF3]`; eşleşme paneli yükleniyor

**Raporlar (`/raporlar`):**
- Obsidyen hero + `HESABIM` tracking etiket + `text-[#F5EDD6]` başlık
- `ReportManager` bileşeni `bg-[#FDFAF3]` arka planda görünüyor

**Canlı Analitik (`/canli-analitik`):**
- Admin girişiyle: obsidyen hero + `ANALİTİK` tracking etiket
- `LiveAnalyticsDashboard` bileşeni yükleniyor

**Sadakat Programı (`/kullanici/sadakat`):**
- Obsidyen hero + `HESABIM` tracking etiket
- 3 bilgi kutusu hepsi bakır renk (mavi/yeşil/mor yok)
- SSS kutusu `rounded-sm border-[rgba(200,160,100,0.18)]` (rounded-lg değil)

**Webhooks (`/webhooks`):**
- Obsidyen hero + `ENTEGRASYON` tracking etiket
- 3 bilgi kutusu bakır; yönetici/analitik beyaz kartlar `rounded-sm`
- Kod blokları `bg-[rgba(200,160,100,0.04)]`; ipucu kutusu bakır

**İçerik Yönetimi (`/icerik`):**
- Obsidyen hero + `HESABIM` tracking etiket
- 3 özellik kutusu bakır renk

**SEO Landing Pages (`/en-iyi-kebapcilar`, `/sanliurfada-ne-yenir` vb.):**
- Obsidyen hero + `ŞANLIURFA REHBERİ` tracking etiket + `text-[#F5EDD6]` başlık
- Liste öğeleri `rounded-sm border-[rgba(200,160,100,0.18)] hover:border-urfa-300`
- Numara rozet bakır arka plan + `text-urfa-600`
- Boş durum CTA'ları `rounded-sm bg-urfa-600` / `rounded-sm border-[rgba(200,160,100,0.2)]`

---

## Batch #115 — Harran Scripts Phase 10 (vendor/analytics, kullanici/[id], places/index, mahalleler/[ilce]/[mahalle], yorum/[slug], verify-email)

**Amaç:** Vendor analitik, kullanıcı profil, mekanlar listesi, mahalle detay, yorum yazma ve e-posta doğrulama sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/vendor/analytics.astro` | `bg-gray-50 pt-20`→`bg-[#FDFAF3]`; başlık bölümü obsidyen hero + `İŞLETME PANELİ` tracking etiket; geri buton `bg-gray-100 text-gray-700 rounded-lg`→`bg-[rgba(200,160,100,0.08)] text-[#C4B49A] rounded-sm border-[rgba(200,160,100,0.2)]` |
| `src/pages/kullanici/[id].astro` | `max-w-4xl mx-auto`→`min-h-screen bg-[#FDFAF3]`; ince obsidyen şerit (py-8 sadece geri link); geri link `text-blue-600 dark:text-blue-400 hover:underline`→`text-[#9A8470] hover:text-[#C4B49A]` |
| `src/pages/places/index.astro` | Sidebar `bg-white dark:bg-gray-800 rounded-xl border-gray-200 dark:border-gray-700`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)]`; aktif kategori `bg-urfa-50 dark:*`→`bg-[rgba(200,160,100,0.08)]`; hover `hover:bg-gray-50 dark:hover:bg-gray-700`→`hover:bg-[rgba(200,160,100,0.04)]`; fiyat filtre `rounded border-gray-300`→`rounded-sm border-[rgba(200,160,100,0.3)]`; sıralama select `dark:*` kaldırıldı; görünüm toggle `rounded-lg border-gray-200 dark:*`→`rounded-sm border-[rgba(200,160,100,0.18)]`; aktif görünüm `bg-gray-100 dark:*`→`bg-[rgba(200,160,100,0.08)] text-[#1A1008]`; mekan kartları `rounded-xl dark:*`→`rounded-sm border-[rgba(200,160,100,0.18)]`; badge `bg-white/90 dark:*`→`bg-white/90 text-[#1A1008]`; puan kutusu `bg-green-50 rounded-lg`→bakır `rounded-sm`; yıldız `text-green-600`→`text-urfa-600`; etiket chip'leri `rounded-full dark:*`→`rounded-sm`; boş durum `rounded-xl dark:*`→`rounded-sm border-[rgba(200,160,100,0.18)]` |
| `src/pages/mahalleler/[ilce]/[mahalle].astro` | `bg-gray-50`→`bg-[#FDFAF3]`; breadcrumb `border-b`→`border-b border-[rgba(200,160,100,0.14)]`; `text-gray-500`→`text-[#9A8470]`; `hover:text-red-600`→`hover:text-urfa-600`; hero gradient→obsidyen + `ŞANLIURFA SEMT REHBERİ` tracking etiket; `text-indigo-200`→`text-[#9A8470]`; mekan kartları `rounded-xl`→`rounded-sm border-[rgba(200,160,100,0.18)]`; ikon `bg-indigo-100 rounded-lg`→bakır `rounded-sm`; `text-indigo-600/yellow-500`→`text-urfa-600/urfa-500`; skeleton `bg-gray-200/bg-gray-100`→`bg-[rgba(200,160,100,0.1)]/bg-[rgba(200,160,100,0.06)]` |
| `src/pages/yorum/[slug].astro` | `bg-gray-50`→`bg-[#FDFAF3]`; breadcrumb `text-gray-500`→`text-[#9A8470]`; kart `rounded-2xl`→`rounded-sm border-[rgba(200,160,100,0.18)]`; header `border-b`→`border-b border-[rgba(200,160,100,0.14)]`; küçük görsel `bg-gray-100 rounded-xl`→bakır `rounded-sm`; tüm `text-gray-900`→`text-[#1A1008]`; `text-gray-500/400`→`text-[#9A8470]`; input/textarea `border-gray-300 rounded-xl focus:ring-red-500`→`border-[rgba(200,160,100,0.3)] rounded-sm focus:ring-urfa-500`; hata alert `rounded-xl`→`rounded-sm`; gönder `bg-red-600 rounded-xl`→`bg-urfa-600 rounded-sm`; iptal `bg-gray-100 rounded-xl`→bakır `rounded-sm`; JS: `text-gray-300`→`text-[#9A8470]`; `text-yellow-400`→`text-urfa-500`; `text-yellow-200`→`text-urfa-300`; `text-gray-500`→`text-[#9A8470]`; `text-gray-900`→`text-[#1A1008]` |
| `src/pages/verify-email.astro` | `bg-gradient-to-br from-blue-50 to-indigo-100`→`bg-[#FDFAF3]`; kart `rounded-lg shadow-xl`→`rounded-sm shadow-sm border-[rgba(200,160,100,0.18)]`; spinner `border-blue-200 border-t-blue-600`→`border-[rgba(200,160,100,0.2)] border-t-urfa-600`; yükleniyor metni `text-gray-600`→`text-[#6B5540]`; geçersiz link `text-gray-900`→`text-[#1A1008]`; tüm butonlar `bg-blue-600/green-600 rounded-lg`→`bg-urfa-600 rounded-sm`; JS DOM: başarı başlık `text-green-600`→`text-urfa-600`; açıklama `text-gray-600`→`text-[#6B5540]`; `innerHTML = ''`→`replaceChildren()` (hook uyumlu) |
| `src/pages/places/ekle.astro` | Yalnızca `return Astro.redirect('/isletme-kayit', 301)` — HTML yok, migrasyon gerekmedi |

### Test senaryoları

**Vendor Analitikler (`/vendor/analytics`):**
- `bg-[#FDFAF3]` arka plan; obsidyen hero + `İŞLETME PANELİ` tracking etiket
- Geri buton bakır arka plan + `rounded-sm`

**Kullanıcı Profili (`/kullanici/[id]`):**
- `min-h-screen bg-[#FDFAF3]`; ince obsidyen şerit (sadece geri link)
- Geri link `text-[#9A8470] hover:text-[#C4B49A]`

**Mekanlar (`/mekanlar`):**
- Sidebar `rounded-sm border-[rgba(200,160,100,0.18)]`; aktif kategori bakır; hover bakır
- Mekan kartları `rounded-sm` (rounded-xl değil); puan kutusu bakır
- Etiket chip'leri `rounded-sm` (rounded-full değil)

**Mahalle Detay (`/mahalleler/[ilce]/[mahalle]`):**
- Obsidyen hero + `ŞANLIURFA SEMT REHBERİ` tracking etiket; `text-[#9A8470]` alt başlık
- Mekan kartları `rounded-sm border-[rgba(200,160,100,0.18)]`; ikon bakır
- Skeleton fallback bakır tonlar (`bg-[rgba(200,160,100,0.1)]`)

**Yorum Yaz (`/yorum/[slug]`):**
- `bg-[#FDFAF3]`; kart `rounded-sm border-[rgba(200,160,100,0.18)]`
- Yıldız seçilince `text-urfa-500`; hover `text-urfa-300`
- Input/textarea bakır kenarlık + `rounded-sm`; gönder `bg-urfa-600 rounded-sm`
- İptal bakır arka plan + `rounded-sm`

**E-posta Doğrulama (`/verify-email`):**
- Düz `bg-[#FDFAF3]` (gradient yok); kart `rounded-sm border-[rgba(200,160,100,0.18)]`
- Spinner bakır `border-t-urfa-600`; tüm butonlar `bg-urfa-600 rounded-sm`
- Başarı başlık `text-urfa-600`; hata başlık `text-red-600`; açıklamalar `text-[#6B5540]`

---

## Batch #114 — Harran Scripts Phase 9 (sıralamalar, trend, öneriler, kullanıcılar, vendor)

**Amaç:** Sıralamalar, trend, öneriler, kullanıcılar, profil ayarları, işletme analitikleri ve vendor dashboard sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/siralamalar/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `ŞANLIURFA TOPLULUĞU` tracking etiket; `text-gray-900 dark:text-white`→`text-[#F5EDD6]`; `text-gray-600 dark:text-gray-400`→`text-[#C4B49A]`; tüm `dark:*` kaldırıldı |
| `src/pages/trend/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `ŞANLIURFA MEKAN REHBERİ` tracking etiket + alt başlık; `dark:*` yoktu |
| `src/pages/oneriler.astro` | `bg-gray-50 dark:bg-gray-900`→`bg-[#FDFAF3]`; başlık+açıklama obsidyen hero'ya taşındı + `ŞANLIURFA MEKAN REHBERİ` tracking etiket; mekan kartları `rounded-lg shadow-lg hover:shadow-xl`→`rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm hover:shadow-md hover:border-urfa-300 hover:-translate-y-0.5`; placeholder görsel `from-orange-200 to-red-200`→`bg-[rgba(200,160,100,0.08)]`; kategori badge `text-orange-700 bg-orange-100 rounded-full`→`text-urfa-700 bg-[rgba(200,160,100,0.08)] rounded-sm`; yıldız aktif `text-yellow-400`→`text-urfa-500`; yıldız pasif `text-gray-300`→`text-[#9A8470]`; tüm `text-gray-*`→`text-[#1A1008]/[#6B5540]/[#9A8470]`; CTA bölümü `bg-gradient-to-r from-orange-500 to-red-500`→`bg-[#0D0A08] border-[rgba(200,160,100,0.2)]`; CTA butonu `bg-white text-orange-600 rounded-lg`→`bg-urfa-600 text-white rounded-sm`; tüm `dark:*` kaldırıldı |
| `src/pages/kullanicilar.astro` | `container-custom py-8`→`min-h-screen bg-[#FDFAF3]` + obsidyen hero + `ŞANLIURFA TOPLULUĞU` tracking etiket; `text-gray-900 dark:text-white`→`text-[#F5EDD6]`; `text-gray-600 dark:text-gray-400`→`text-[#C4B49A]`; tüm `dark:*` kaldırıldı |
| `src/pages/profil/ayarlar/index.astro` | `bg-gray-50 dark:bg-gray-900`→`bg-[#FDFAF3]`; tüm kart `bg-white dark:bg-gray-800 rounded-xl border-gray-200 dark:border-gray-700`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)]`; geri link `text-gray-600 dark:text-gray-400`→`text-[#9A8470]`; `text-gray-900 dark:text-white`→`text-[#1A1008]`; hata/başarı alert'leri `rounded-lg dark:*`→`rounded-sm` (semantic kırmızı/yeşil korundu); form input `dark:*`→kaldırıldı; disabled input `bg-gray-100 dark:bg-gray-700`→`bg-[rgba(200,160,100,0.04)] text-[#9A8470]` |
| `src/pages/isletme/analytics.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `İŞLETME PANELİ` tracking etiket; 3 bilgi kutusu `bg-blue-50/green-50/purple-50 border-blue-200/green-200/purple-200 rounded-lg`→hepsi bakır `rounded-sm`; `text-blue-900/green-900/purple-900`→`text-[#1A1008]`; `text-gray-700`→`text-[#6B5540]` |
| `src/pages/vendor/dashboard.astro` | `bg-gray-50 pt-20`→`bg-[#FDFAF3]`; başlık bölümü `bg-white rounded-xl`→obsidyen hero'ya taşındı; plan badge `bg-amber-100 rounded-full`→`bg-[rgba(200,160,100,0.12)] rounded-sm border-[rgba(200,160,100,0.2)]`; link `bg-amber-600 rounded-lg`→`bg-urfa-600 rounded-sm`; stat kartları `rounded-xl`→`rounded-sm border-[rgba(200,160,100,0.18)]`; `text-green-600`→`text-urfa-600`; sol panel kartları `rounded-xl border-gray-200`→`rounded-sm border-[rgba(200,160,100,0.18)]`; sağ sidebar `rounded-xl`→`rounded-sm border-[rgba(200,160,100,0.18)]`; plan `text-amber-600`→`text-urfa-600`; hızlı işlem butonları `hover:bg-gray-50`→`hover:bg-[rgba(200,160,100,0.04)]`; ikon alanları `bg-blue/green/purple-100 rounded-lg`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; destek kutusu `bg-gradient-to-br from-amber-500`→`bg-[#0D0A08] border-[rgba(200,160,100,0.2)]`; buton `bg-white text-amber-600 rounded-lg`→`bg-urfa-600 text-white rounded-sm` |

### Test senaryoları

**Sıralamalar (`/siralamalar`):**
- Obsidyen hero, `ŞANLIURFA TOPLULUĞU` tracking etiket

**Trend (`/trend`):**
- Obsidyen hero, `ŞANLIURFA MEKAN REHBERİ` tracking etiket + alt başlık

**Öneriler (`/oneriler`):**
- Obsidyen hero; başlık `isPersonalized ? 'Sana Özel Öneriler' : 'En Popüler Yerler'` hero içinde
- Mekan kartları `rounded-sm border-[rgba(200,160,100,0.18)] hover:-translate-y-0.5`
- Kategori badge `rounded-sm` (rounded-full değil)
- CTA bölümü obsidyen (turuncu gradient değil)

**Kullanıcıları Keşfet (`/kullanicilar`):**
- Obsidyen hero, `ŞANLIURFA TOPLULUĞU` tracking etiket

**Profil Ayarları (`/profil/ayarlar`):**
- `bg-[#FDFAF3]` sayfa arka planı
- Kart `rounded-sm border-[rgba(200,160,100,0.18)]` (rounded-xl border-gray değil)
- Dark mode sınıfları yok
- Disabled e-posta input `bg-[rgba(200,160,100,0.04)] text-[#9A8470]`

**İşletme Analitikleri (`/isletme/analytics`):**
- Obsidyen hero, `İŞLETME PANELİ` tracking etiket
- 3 bilgi kutusu bakır (mavi/yeşil/mor değil)

**Vendor Dashboard (`/vendor/dashboard`):**
- Obsidyen hero (pt-20 bg-gray-50 değil)
- Plan badge `rounded-sm` (rounded-full değil)
- Stat kartları `rounded-sm border-[rgba(200,160,100,0.18)]`
- Destek kutusu obsidyen (amber gradient değil)
- Hızlı işlem butonları `rounded-sm hover:bg-[rgba(200,160,100,0.04)]`

---

## Batch #113 — Harran Scripts Phase 8 (keşfet, sosyal, aktivite, mesajlar, tercihler)

**Amaç:** Keşfet, sosyal akış, aktivite, mesajlar, bildirim tercihleri, koleksiyon detay ve kota sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/mesajlar/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]` |
| `src/pages/kesfet/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `ŞANLIURFA PLATFORMU` tracking etiket; `text-gray-900 dark:text-white`→`text-[#F5EDD6]` (hero) / `text-[#1A1008]` (içerik); `text-gray-600 dark:text-gray-400`→`text-[#C4B49A]` (hero) / `text-[#6B5540]` (içerik); öneri kartı `rounded-lg border-gray-200 dark:border-gray-700`→`rounded-sm border-[rgba(200,160,100,0.18)]`; hızlı bağlantı kutusu `bg-blue-50 border-blue-200`→bakır; `text-blue-600`→`text-urfa-600`; CTA `rounded-lg bg-red-600`→`rounded-sm bg-urfa-600`; ikincil CTA `border-gray-200`→bakır `rounded-sm` |
| `src/pages/sosyal/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `ŞANLIURFA PLATFORMU` tracking etiket; sol sidebar `bg-white dark:bg-gray-800 rounded-lg shadow`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm`; tab bar `border-gray-200 dark:border-gray-700`→`border-[rgba(200,160,100,0.14)]`; aktif tab `border-blue-600 text-gray-900 dark:text-white`→`border-urfa-600 text-[#1A1008]`; pasif tab `text-gray-600 dark:text-gray-400`→`text-[#9A8470]`; JS tab switch `border-blue-600/transparent text-gray-900/text-gray-600 dark:*`→`border-urfa-600/transparent text-[#1A1008]/text-[#9A8470]`; tüm `dark:*` kaldırıldı |
| `src/pages/aktivitelerim/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `HESABIM` tracking etiket |
| `src/pages/bildirim-tercihleri.astro` | `bg-gray-50` → `bg-[#FDFAF3]` + obsidyen hero + `HESABIM` tracking etiket |
| `src/pages/koleksiyonlar/[id].astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `← Koleksiyonlarım` geri linki |
| `src/pages/ayarlar/kotalar.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `HESABIM` tracking etiket; tüm `dark:*` kaldırıldı; `text-gray-900 dark:text-white`→`text-[#F5EDD6]` (hero) / `text-[#1A1008]` (içerik); `text-gray-600 dark:text-gray-400`→`text-[#C4B49A]` (hero) / `text-[#6B5540]` (içerik); `bg-blue-50 border-blue-200 rounded-lg`→bakır `rounded-sm`; `bg-green-50 border-green-200 rounded-lg`→bakır `rounded-sm`; `bg-green-600 rounded-lg`→`bg-urfa-600 rounded-sm`; SSS kartları `bg-white rounded-lg border-gray-200 dark:border-gray-700`→`bg-white rounded-sm border-[rgba(200,160,100,0.18)]` |

### Test senaryoları

**Mesajlar (`/mesajlar`):**
- `bg-[#FDFAF3]` sayfa arka planı (gri değil)

**Keşfet (`/kesfet`):**
- Obsidyen hero, `ŞANLIURFA PLATFORMU` tracking etiket
- Öneri kutusu `rounded-sm border-[rgba(200,160,100,0.18)]` (rounded-lg değil)
- Hızlı bağlantı kutusu bakır
- Misafir görünüm: CTA butonlar `rounded-sm bg-urfa-600` ve bakır

**Sosyal (`/sosyal`):**
- Obsidyen hero + `ŞANLIURFA PLATFORMU` tracking etiket
- Sol sidebar kart `rounded-sm border-[rgba(200,160,100,0.18)]` (rounded-lg shadow değil)
- Tab bar `border-[rgba(200,160,100,0.14)]` (gray değil)
- Aktif tab `border-urfa-600` (blue değil)

**Aktivitelerim (`/aktivitelerim`):**
- Obsidyen hero + `HESABIM` tracking etiket
- `bg-[#FDFAF3]` sayfa arka planı

**Bildirim Tercihleri (`/bildirim-tercihleri`):**
- Obsidyen hero + `HESABIM` tracking etiket
- `bg-[#FDFAF3]` sayfa arka planı

**Koleksiyon Detay (`/koleksiyonlar/:id`):**
- Obsidyen hero + `← Koleksiyonlarım` geri linki `text-[#9A8470]`

**Kullanım Kotaları (`/ayarlar/kotalar`):**
- Obsidyen hero + `HESABIM` tracking etiket
- İki bilgi kutusu bakır (mavi/yeşil değil)
- `bg-urfa-600 rounded-sm` CTA butonu
- SSS kartları `rounded-sm border-[rgba(200,160,100,0.18)]`

---

## Batch #112 — Harran Scripts Phase 7 (sadakat, mahalleler, hesap sayfaları)

**Amaç:** Sadakat programı, mahalleler rehberi, abonelik, bildirimler ve koleksiyonlar sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/loyalty/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `ÖDÜL SİSTEMİ` tracking etiket; 3 renkli bilgi kutusu (`bg-blue-50/green-50/purple-50 border-blue-200/green-200/purple-200 rounded-lg`)→hepsi `bg-[rgba(200,160,100,0.06)] border border-[rgba(200,160,100,0.2)] rounded-sm`; `text-blue-900/green-900/purple-900`→`text-[#1A1008]`; CTA bölümü `bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg`→`bg-[#0D0A08] border border-[rgba(200,160,100,0.2)] rounded-sm`; CTA butonu `bg-white text-blue-600 rounded-lg`→`bg-urfa-600 text-white rounded-sm` |
| `src/pages/loyalty/rewards.astro` | Obsidyen hero + `ÖDÜL SİSTEMİ` tracking etiket; `text-blue-600` geri linki→`text-[#9A8470] hover:text-[#C4B49A]`; SSS kutusu `bg-blue-50 border-blue-200 rounded-lg`→`bg-[rgba(200,160,100,0.06)] border border-[rgba(200,160,100,0.2)] rounded-sm`; `text-gray-700`→`text-[#6B5540]` |
| `src/pages/loyalty/transactions.astro` | Obsidyen hero + `ÖDÜL SİSTEMİ` tracking etiket; `text-blue-600` geri linki→`text-[#9A8470] hover:text-[#C4B49A]` |
| `src/pages/mahalleler/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-indigo-700 to-purple-800`→obsidyen hero + `ŞANLIURFA SEMT REHBERİ` tracking etiket; `text-indigo-100/200`→`text-[#C4B49A]/[#9A8470]`; bilgi kutusu `bg-indigo-50 border-indigo-200 rounded-2xl`→bakır `rounded-sm`; `text-indigo-800/700`→`text-[#1A1008]/[#6B5540]`; ilçe kartları `rounded-2xl border-gray-100 hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; `group-hover:text-indigo-600`→`group-hover:text-urfa-700`; popüler mahalle kartları `rounded-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:border-urfa-300`; `text-indigo-500`→`text-[#9A8470]`; `text-gray-800 group-hover:text-indigo-600`→`text-[#1A1008] group-hover:text-urfa-700` |
| `src/pages/abonelik.astro` | Obsidyen hero + `HESABIM` tracking etiket; tüm `dark:*` kaldırıldı; `rounded-lg border-green-200 bg-green-50 text-green-900`→`rounded-sm border-[rgba(200,160,100,0.2)] bg-[rgba(200,160,100,0.06)] text-[#6B5540]`; yardım kutusu `bg-blue-50 border-blue-200 rounded-lg`→bakır `rounded-sm`; `text-blue-900`→`text-[#1A1008]`; `text-blue-800`→`text-[#6B5540]`; link `text-blue-600`→`text-urfa-600` |
| `src/pages/bildirimler/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `HESABIM` tracking etiket |
| `src/pages/koleksiyonlar/index.astro` | `min-h-screen bg-[#FDFAF3]` + obsidyen hero + `HESABIM` tracking etiket; `text-gray-600`→`text-[#C4B49A]` |

### Test senaryoları

**Sadakat Programı (`/loyalty`):**
- Obsidyen hero, `ÖDÜL SİSTEMİ` tracking etiket
- 3 bilgi kutusu hepsi bakır `bg-[rgba(200,160,100,0.06)] rounded-sm` (mavi/yeşil/mor değil)
- CTA bölümü obsidyen arka plan; CTA butonu `bg-urfa-600 rounded-sm`

**Ödüller (`/loyalty/rewards`):**
- Geri link `text-[#9A8470]` (mavi değil)
- SSS kutusu bakır `rounded-sm`

**İşlem Geçmişi (`/loyalty/transactions`):**
- Geri link `text-[#9A8470]` (mavi değil)
- Obsidyen hero + tracking etiket

**Mahalleler (`/mahalleler`):**
- `bg-[#FDFAF3]` sayfa arka planı
- Obsidyen hero (indigo gradient yok)
- `ŞANLIURFA SEMT REHBERİ` tracking etiket
- İlçe kartları `rounded-sm border-[rgba(200,160,100,0.18)]`
- Popüler mahalle kartları bakır hover

**Abonelik (`/abonelik`):**
- Obsidyen hero, `HESABIM` tracking etiket
- Bilgi kutuları bakır (yeşil/mavi değil)
- Dark mode sınıfları yok

**Bildirimler (`/bildirimler`):**
- `bg-[#FDFAF3]` sayfa arka planı
- Obsidyen hero + `HESABIM` tracking etiket

**Koleksiyonlar (`/koleksiyonlar`):**
- `bg-[#FDFAF3]` sayfa arka planı
- Obsidyen hero + `HESABIM` tracking etiket
- Alt başlık `text-[#C4B49A]`

---

## Batch #111 — Harran Scripts Phase 6 (kullanıcı ve topluluk sayfaları)

**Amaç:** Kullanıcı profil, takip, topluluk ve statik sayfaları Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/gizlilik.astro` | `bg-gray-50 pt-20`→`bg-[#FDFAF3]` + obsidyen hero (`bg-[#0D0A08]`) + `YASAL BELGELER` tracking etiket; `bg-white rounded-2xl shadow-sm`→`bg-white rounded-sm border border-[rgba(200,160,100,0.18)] shadow-sm`; `text-gray-900`→`text-[#1A1008]`; `text-gray-500`→`text-[#9A8470]`; `text-gray-600`→`text-[#6B5540]`; `border-gray-200`→`border-[rgba(200,160,100,0.2)]` |
| `src/pages/ayarlar.astro` | `max-w-4xl mx-auto px-4 py-8` düz kap→`min-h-screen bg-[#FDFAF3]` + obsidyen hero + `HESABIM` tracking etiket; `text-gray-900 dark:text-white`→`text-[#F5EDD6]`; `text-gray-600 dark:text-gray-400`→`text-[#C4B49A]`; tüm `dark:*` sınıfları kaldırıldı |
| `src/pages/topluluk.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-indigo-900 to-slate-900`→obsidyen hero + `ŞANLIURFA PLATFORMU` tracking etiket; `text-indigo-100`→`text-[#C4B49A]`; özellik kartları `rounded-2xl border-gray-200`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:border-urfa-300`; `text-gray-900`→`text-[#1A1008]`; `text-gray-600`→`text-[#6B5540]`; misafir CTA `rounded-3xl border-indigo-100`→`rounded-sm border-[rgba(200,160,100,0.18)]`; `text-indigo-700` tracking etiket→`text-[#9A8470]`; butonlar `rounded-xl bg-indigo-700`→`rounded-sm bg-urfa-600`; ikincil butonlar bakır; Hızlı Cevap `rounded-2xl border-gray-200`→`rounded-sm border-[rgba(200,160,100,0.18)]` |
| `src/pages/takipciler.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `text-gray-600`→`text-[#6B5540]`; `text-amber-600`→`text-urfa-600`; kart `rounded-2xl shadow-sm`→`rounded-sm border border-[rgba(200,160,100,0.18)] shadow-sm`; `divide-y`→`divide-[rgba(200,160,100,0.12)]`; `text-gray-500/400`→`text-[#9A8470]`; karşılıklı takip badge `bg-gray-100 rounded-full`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; Takip Et buton `rounded-full`→`rounded-sm bg-urfa-600`; mesaj ikonu hover `rounded-full`→`rounded-sm` bakır; Profili Paylaş `rounded-lg`→`rounded-sm bg-urfa-600` |
| `src/pages/takip-edilenler.astro` | Aynı pattern takipciler.astro ile; Takipten Çık buton `bg-gray-100 rounded-full`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; `hover:bg-gray-200`→`hover:bg-[rgba(200,160,100,0.16)]` |
| `src/pages/profile.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; profil header `bg-white border-b`→`bg-white border-b border-[rgba(200,160,100,0.14)]`; avatar border `border-amber-100`→`border-[rgba(200,160,100,0.3)]`; `text-gray-500/600`→`text-[#9A8470]`/`text-[#6B5540]`; stats `hover:text-amber-600`→`hover:text-urfa-700`; kamera butonu `bg-gray-900 rounded-full`→`bg-[#1A1008] rounded-sm`; Profili Düzenle `bg-gray-100 rounded-lg`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; Mekan Ekle `bg-amber-600 rounded-lg`→`bg-urfa-600 rounded-sm`; içerik kutusu `rounded-2xl shadow-sm`→`rounded-sm border border-[rgba(200,160,100,0.18)] shadow-sm`; tab `border-amber-600 text-amber-600`→`border-urfa-600 text-urfa-600`; inactive tab `text-gray-500`→`text-[#9A8470]`; review `border-gray-100`→`border-[rgba(200,160,100,0.12)]`; `text-gray-300` (yıldız)→`text-[#9A8470]`; favori/aktivite kartları `rounded-xl border-gray-100 bg-gray-50 hover:border-amber-200 hover:bg-amber-50`→`rounded-sm border-[rgba(200,160,100,0.18)] bg-[#FDFAF3] hover:border-urfa-300`; CTA butonlar `bg-amber-600 rounded-lg`→`bg-urfa-600 rounded-sm`; JS tab switch `amber-600`→`urfa-600` |
| `src/pages/liderlik-tablosu.astro` | Düz `container-custom py-8`→`min-h-screen bg-[#FDFAF3]` + obsidyen hero + `ŞANLIURFA TOPLULUĞU` tracking etiket; `text-gray-900 dark:text-white`→`text-[#F5EDD6]`; `text-gray-600 dark:text-gray-400`→`text-[#C4B49A]`; tüm `dark:*` kaldırıldı |

### Test senaryoları

**Gizlilik (`/gizlilik-politikasi`):**
- Obsidyen hero, `YASAL BELGELER` tracking etiket
- İçerik kutusu `rounded-sm border-[rgba(200,160,100,0.18)]` (rounded-2xl shadow değil)
- Alt bölüm `border-[rgba(200,160,100,0.2)]` kenarlık (gray değil)

**Ayarlar (`/ayarlar`):**
- Obsidyen hero, `HESABIM` tracking etiket
- `bg-[#FDFAF3]` sayfa arka planı
- Dark mode sınıfları yok

**Topluluk (`/topluluk`):**
- Obsidyen hero (indigo gradient yok)
- `ŞANLIURFA PLATFORMU` tracking etiket
- Özellik kartları `rounded-sm border-[rgba(200,160,100,0.18)]`
- Misafir görünümü: butonlar `rounded-sm bg-urfa-600` ve bakır

**Takipçiler/Takip Edilenler:**
- Kart container `rounded-sm border border-[rgba(200,160,100,0.18)]`
- Satır ayraçları `divide-[rgba(200,160,100,0.12)]`
- Butonlar `rounded-sm` (yuvarlak değil)
- Hover renkler urfa-600 (amber değil)

**Profil (`/profil`):**
- `bg-[#FDFAF3]` arka plan
- Avatar border `border-[rgba(200,160,100,0.3)]`
- Tab aktif durumu `border-urfa-600 text-urfa-600` (amber değil)
- Favori/aktivite kartları copper hover
- Tüm CTA butonlar `rounded-sm bg-urfa-600`

**Liderlik Tablosu (`/liderlik-tablosu`):**
- Obsidyen hero, `ŞANLIURFA TOPLULUĞU` tracking etiket
- Dark mode sınıfları yok

---

## Batch #110 — Harran Scripts Phase 5 (SEO landing pages)

**Amaç:** SEO landing sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/en-iyi-kebapcilar.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-red-700 to-orange-800`→obsidyen hero + `ŞANLIURFA GASTRONOMİ REHBERİ` tracking etiket; `text-red-200/100`→`text-[#9A8470]`/`text-[#C4B49A]`; bilgi kutusu `bg-white rounded-xl border-l-4 border-red-600`→bakır kutu; mekan kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; sıralama alanı `bg-red-100 text-red-600`→`bg-[rgba(200,160,100,0.08)] text-urfa-600`; `group-hover:text-red-600`→`group-hover:text-urfa-700`; CTA `rounded-full bg-red-600`→`rounded-sm bg-urfa-600`; ikincil CTA `rounded-full border border-red-200 text-red-600`→bakır |
| `src/pages/en-iyi-cigerciler.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-amber-800 to-red-900`→obsidyen hero; `text-amber-200/100`→`text-[#9A8470]`/`text-[#C4B49A]`; bilgi kutusu `bg-white rounded-xl border-l-4 border-amber-700`→bakır; mekan kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; sıralama alanı `bg-amber-100 text-amber-700`→`bg-[rgba(200,160,100,0.08)] text-urfa-700`; `group-hover:text-amber-700`→`group-hover:text-urfa-700`; CTA `rounded-full bg-amber-700`→`rounded-sm bg-urfa-600` |
| `src/pages/bugun-sanliurfada-ne-yapilir.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-indigo-700 to-purple-800`→obsidyen hero; `text-indigo-200/100`→`text-[#9A8470]`/`text-[#C4B49A]`; aktivite kartları `rounded-xl`→`rounded-sm border-[rgba(200,160,100,0.18)]`; `group-hover:text-indigo-600`→`group-hover:text-urfa-700`; etkinlik ikon alanları `bg-indigo-100 rounded-lg`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; `text-xs text-indigo-600` konum→`text-xs text-urfa-600`; featured mekan ikon alanları bakır; bölüm linkleri `text-indigo-600`→`text-urfa-600` |
| `src/pages/sanliurfa-gece-acik-mekanlar.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-slate-800 to-blue-900`→obsidyen hero + `ŞANLIURFA GECE HAYATI` tracking etiket; `text-slate-300/200`→`text-[#9A8470]`/`text-[#C4B49A]`; mekan kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; ikon alanı `bg-slate-100`→`bg-[rgba(200,160,100,0.08)]`; `group-hover:text-blue-700`→`group-hover:text-urfa-700`; CTA `rounded-full bg-slate-700`→`rounded-sm bg-urfa-600`; ikincil CTA `rounded-full border border-slate-200/gray-200`→bakır |
| `src/pages/sanliurfa-kahvalti-mekanlari.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-yellow-600 to-amber-700`→obsidyen hero + `ŞANLIURFA MEKAN REHBERİ` tracking etiket; `text-yellow-200/100`→`text-[#9A8470]`/`text-[#C4B49A]`; bilgi kutusu `bg-white rounded-xl border-l-4 border-yellow-500`→bakır; mekan kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; sıralama alanı `bg-yellow-100 text-yellow-700`→`bg-[rgba(200,160,100,0.08)] text-urfa-700`; `group-hover:text-yellow-700`→`group-hover:text-urfa-700`; CTA `rounded-full bg-yellow-600`→`rounded-sm bg-urfa-600`; ikincil CTA `rounded-full border border-yellow-200`→bakır |
| `src/pages/sanliurfa-sira-gecesi-mekanlari.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-purple-800 to-indigo-900`→obsidyen hero + `ŞANLIURFA GECE HAYATI` tracking etiket; `text-purple-200/100`→`text-[#9A8470]`/`text-[#C4B49A]`; bilgi kutusu `bg-white rounded-xl border-l-4 border-purple-600`→bakır; mekan kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; ikon alanı `bg-purple-100`→`bg-[rgba(200,160,100,0.08)]`; `group-hover:text-purple-600`→`group-hover:text-urfa-700`; CTA `rounded-full bg-purple-700`→`rounded-sm bg-urfa-600`; ikincil CTAlar `rounded-full border`→`rounded-sm border` bakır |
| `src/pages/sanliurfada-ne-yenir.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-urfa-800 to-isot-800` gradient→`bg-[#0D0A08]` düz obsidyen + `ŞANLIURFA YEMEK REHBERİ` tracking etiket; `text-urfa-200/100`→`text-[#9A8470]`/`text-[#C4B49A]`; `text-gray-900`→`text-[#1A1008]`; lezzet kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; `group-hover:text-red-600`→`group-hover:text-urfa-700`; tarif kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; görsel alanı `bg-amber-100`→`bg-[rgba(200,160,100,0.06)]`; bölüm linkleri `text-red-600`→`text-urfa-600`; restoran ikon alanı `bg-red-100 rounded-lg`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; restoran kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300` |

### Test senaryoları

**En İyi Kebapçılar (`/en-iyi-kebapcilar`):**
- Hero obsidyen, tracking etiket görünür
- Bilgi kutusu bakır kenarlıklı (kırmızı sol kenarlık yok)
- Sıralama alanı (🥇🥈🥉) `bg-[rgba(200,160,100,0.08)]` (kırmızı değil)
- CTA butonlar `rounded-sm` (yuvarlak değil)

**En İyi Cigerciler (`/en-iyi-cigerciler`):**
- Hero obsidyen (amber-kırmızı gradient yok)
- Bilgi kutusu bakır (amber sol kenarlık yok)
- Sıralama alanı `text-urfa-700` (amber değil)

**Bugün Ne Yapılır (`/bugun-sanliurfada-ne-yapilir`):**
- Hero obsidyen (indigo-mor gradient yok)
- Aktivite kartları `rounded-sm border-[rgba(200,160,100,0.18)]`
- Etkinlik ikon alanı `bg-[rgba(200,160,100,0.08)] rounded-sm` (indigo değil)
- Bölüm linkleri `text-urfa-600` (indigo değil)

**Gece Açık Mekanlar (`/sanliurfa-gece-acik-mekanlar`):**
- Hero obsidyen, `ŞANLIURFA GECE HAYATI` tracking etiket
- Mekan ikon alanı `bg-[rgba(200,160,100,0.08)]` (slate değil)
- CTA `rounded-sm` (yuvarlak değil)

**Kahvaltı Mekanları (`/sanliurfa-kahvalti-mekanlari`):**
- Hero obsidyen (sarı gradient yok)
- Bilgi kutusu bakır (sarı sol kenarlık yok)
- Sıralama alanı `text-urfa-700` (sarı değil)

**Sıra Gecesi Mekanları (`/sanliurfa-sira-gecesi-mekanlari`):**
- Hero obsidyen (mor-indigo gradient yok)
- Bilgi kutusu bakır (mor sol kenarlık yok)
- Mekan ikon alanı `bg-[rgba(200,160,100,0.08)]` (mor değil)

**Şanlıurfa'da Ne Yenir (`/sanliurfada-ne-yenir`):**
- Hero obsidyen düz (urfa-isot gradient yok)
- `ŞANLIURFA YEMEK REHBERİ` tracking etiket
- Lezzet kartları `rounded-sm` (rounded-xl değil)
- Tarif görsel alanı `bg-[rgba(200,160,100,0.06)]` (amber değil)
- Restoran ikon alanı `bg-[rgba(200,160,100,0.08)] rounded-sm` (kırmızı değil)
- Tüm section linkleri `text-urfa-600` (kırmızı değil)

---

## Batch #109 — Harran Scripts Phase 4 (ulasim, gezilecek-yerler)

**Amaç:** Ulaşım ve gezilecek yerler sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/ulasim/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-slate-700 to-gray-800`→obsidyen hero + `ULAŞIM REHBERİ` tracking etiket; `text-gray-300`→`text-[#C4B49A]`; Hızlı Cevap kutusu `rounded-2xl border-slate-200 bg-slate-100`→`bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm`; GAP Havalimanı kutusu `bg-blue-50 border-blue-200`→bakır; GAP Otogarı kutusu `bg-orange-50 border-orange-200`→bakır; Otobüs Saatleri kutusu `bg-slate-50 border-slate-200`→bakır; kategori kartları `rounded-xl border-gray-100 group-hover:text-slate-600`→`rounded-sm border-[rgba(200,160,100,0.18)] group-hover:text-urfa-700`; featured mekan kartları `rounded-xl shadow-sm hover:shadow-lg`→`rounded-sm border hover:shadow-md hover:border-urfa-300`; `text-slate-500/600`→`text-[#9A8470]`/`text-urfa-600` |
| `src/pages/ulasim/[kategori].astro` | `bg-gray-50`→`bg-[#FDFAF3]`; ekmek kırıntısı `bg-white border-b hover:text-slate-600`→`bg-[#FDFAF3] border-b border-[rgba(200,160,100,0.14)] hover:text-urfa-600`; `from-slate-700 to-gray-800`→obsidyen hero; `text-gray-300`→`text-[#9A8470]`; mekan kartları `rounded-xl shadow-sm hover:shadow-lg group-hover:text-slate-600`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300 group-hover:text-urfa-700`; geri link `text-slate-600`→`text-urfa-600` |
| `src/pages/ulasim/otobus-hatlari.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-blue-700 to-blue-900`→obsidyen hero; breadcrumb `text-blue-300`→`text-[#9A8470]`; `text-blue-200`→`text-[#C4B49A]`; CTA butonlar `rounded-lg bg-white text-blue-800`→`rounded-sm bg-[#F5EDD6] text-[#1A1008]`; rota kartları `rounded-2xl border-gray-100`→`rounded-sm border-[rgba(200,160,100,0.18)]`; `text-red-600` hat no→`text-urfa-600`; saat chips `bg-blue-50 text-blue-700 rounded`→`bg-[rgba(200,160,100,0.08)] text-[#6B5540] rounded-sm`; boş durum `rounded-2xl`→`rounded-sm border`; bilgi kartları `rounded-2xl`→`rounded-sm border`; FAQ kutusu `rounded-2xl`→`rounded-sm border` |
| `src/pages/ulasim/otobus-saatleri.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-slate-800 to-slate-900`→obsidyen hero; `text-slate-300`→`text-[#C4B49A]`; CTA butonlar `rounded-lg bg-white text-slate-800`→`rounded-sm bg-[#F5EDD6] text-[#1A1008]`; Hızlı Cevap kutusu `border-slate-200 bg-white`→`bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm`; DB rota kartları `rounded-xl`→`rounded-sm border`; saat chips `bg-gray-100 rounded`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; yoğunluk kartları `rounded-xl`→`rounded-sm border`; zaman aralığı badge `bg-slate-100 rounded-full`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; aktarma kutusu `rounded-2xl`→`rounded-sm border`; Hızlı Erişim sidebar `bg-emerald-50 border-emerald-200 rounded-2xl text-emerald-800`→`bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm text-[#1A1008]`; linkler `text-emerald-700`→`text-urfa-600` |
| `src/pages/ulasim/ucak-saatleri.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-sky-900 to-slate-900`→obsidyen hero; `text-sky-100`→`text-[#C4B49A]`; CTA butonlar `rounded-lg bg-white text-slate-900`→`rounded-sm bg-[#F5EDD6] text-[#1A1008]`; Hızlı Cevap kutusu `rounded-2xl border-sky-200 text-sky-700`→bakır; uçuş yoğunluk kartları `rounded-xl`→`rounded-sm border`; zaman aralığı badge `bg-sky-100 text-sky-700 rounded-full`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; kontrol listesi kutusu `rounded-2xl`→`rounded-sm border`; Hızlı Erişim sidebar `bg-sky-50 border-sky-200 rounded-2xl text-sky-800`→`bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm text-[#1A1008]`; linkler `text-sky-700`→`text-urfa-600` |
| `src/pages/gezilecek-yerler/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-amber-700 to-amber-900`→obsidyen hero + `GEZİLECEK YERLER` tracking etiket; `text-amber-100`→`text-[#C4B49A]`; Hızlı Cevap kutusu `rounded-2xl border-amber-200 bg-amber-50 text-amber-800/900`→bakır; alt kategori kartları `rounded-xl shadow-sm hover:shadow-lg group-hover:text-amber-600`→`rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm hover:shadow-md hover:border-urfa-300 group-hover:text-urfa-700`; featured yer kartları `rounded-xl from-amber-100 to-orange-100 group-hover:text-amber-600`→`rounded-sm border bg-[rgba(200,160,100,0.06)] group-hover:text-urfa-700`; `text-gray-500/400`→`text-[#9A8470]` |
| `src/pages/gezilecek-yerler/[slug].astro` | `bg-gray-50`→`bg-[#FDFAF3]`; ekmek kırıntısı `bg-white border-b hover:text-red-600`→`bg-[#FDFAF3] border-b border-[rgba(200,160,100,0.14)] hover:text-urfa-600`; `text-gray-900`→`text-[#1A1008]`; `text-gray-500`→`text-[#9A8470]`; kapak görseli `rounded-2xl`→`rounded-sm`; bilgi kartları `rounded-xl border text-gray-900/600`→`rounded-sm border-[rgba(200,160,100,0.18)] text-[#1A1008]/text-[#6B5540]`; ilgili yerler kartları `rounded-xl border group-hover:text-amber-600 text-gray-500`→`rounded-sm border-[rgba(200,160,100,0.18)] group-hover:text-urfa-700 text-[#9A8470]` |

### Test senaryoları

**Ulaşım (`/ulasim`, `/ulasim/otogar`):**
- Hero obsidyen arka plan, `ULAŞIM REHBERİ` tracking etiket, `text-[#C4B49A]` alt başlık
- 3 bilgi kutusu (Havalimanı/Otogar/Otobüs) bakır kenarlıklı, renkli değil
- Kategori kartları `rounded-sm border-[rgba(200,160,100,0.18)]` hover bakır kenarlık

**Otobüs Hatları (`/ulasim/otobus-hatlari`):**
- Breadcrumb `text-[#9A8470]` (mavi değil)
- CTA buton `bg-[#F5EDD6] text-[#1A1008]` (mavi değil)
- Hat no `text-urfa-600` (kırmızı değil)
- Saat chips `bg-[rgba(200,160,100,0.08)] text-[#6B5540] rounded-sm` (mavi değil)

**Otobüs Saatleri (`/ulasim/otobus-saatleri`):**
- Hızlı Cevap kutusu bakır kenarlıklı
- Yoğunluk badge `bg-[rgba(200,160,100,0.08)] rounded-sm` (gri değil)
- Hızlı Erişim sidebar bakır kenarlıklı, `text-[#1A1008]` başlık, `text-urfa-600` linkler

**Uçak Saatleri (`/ulasim/ucak-saatleri`):**
- Hero obsidyen (gök mavisi gradient değil)
- Tüm renkli kutular bakır tema
- `text-urfa-600` linkler (gök mavisi değil)

**Gezilecek Yerler (`/gezilecek-yerler`, `/gezilecek-yerler/gobeklitepe`):**
- Hero obsidyen, `GEZİLECEK YERLER` tracking etiket
- Hızlı Cevap bakır kenarlıklı (amber değil)
- Alt kategori kartlar `rounded-sm border` hover bakır kenarlık
- Featured yer kartları görsel alan `bg-[rgba(200,160,100,0.06)]` (amber gradient değil)
- Detay sayfasında kapak görseli `rounded-sm` (rounded-2xl değil)
- İlgili yerler `group-hover:text-urfa-700` (amber değil)

---

## Batch #108 — Harran Scripts Phase 3 (egitim, konaklama, hizmetler, emlak, gastronomi)

**Amaç:** Eğitim, konaklama, hizmetler, emlak ve gastronomi sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/egitim/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-blue-700 to-indigo-800`→obsidyen hero + tracking etiket; Harran Üniversitesi bilgi kutusu `bg-blue-50 border-blue-200 rounded-2xl`→`bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm`; kategori kartları `rounded-xl border-gray-100 group-hover:text-blue-600`→`rounded-sm border-[rgba(200,160,100,0.18)] group-hover:text-urfa-700`; featured kurum kartları `rounded-xl group-hover:text-blue-600`→`rounded-sm border group-hover:text-urfa-700`; `text-blue-600`→`text-urfa-600` |
| `src/pages/egitim/[kategori].astro` | ekmek kırıntısı `bg-white border-b hover:text-blue-600`→`bg-[#FDFAF3] border-b border-[rgba(200,160,100,0.14)] hover:text-urfa-600`; `from-blue-700 to-indigo-800`→obsidyen hero; `text-blue-100`→`text-[#9A8470]`; mekan kartları `rounded-xl shadow-sm hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; `group-hover:text-blue-600`→`group-hover:text-urfa-700`; geri link `text-blue-600`→`text-urfa-600` |
| `src/pages/konaklama/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-amber-700 to-yellow-800`→obsidyen hero + tracking etiket; tarihi hanlar kutusu `bg-amber-50 border-amber-200 rounded-2xl`→`bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm`; kategori kartları `rounded-2xl p-8 border-gray-100 group-hover:text-amber-600`→`rounded-sm p-8 border-[rgba(200,160,100,0.18)] group-hover:text-urfa-700`; otel kartları `rounded-xl from-amber-100 to-yellow-100`→`rounded-sm border-[rgba(200,160,100,0.18)] bg-[rgba(200,160,100,0.06)]`; `text-amber-600` kategori etiketi→`text-urfa-600`; `text-gray-900 group-hover:text-amber-600`→`text-[#1A1008] group-hover:text-urfa-700` |
| `src/pages/konaklama/[kategori].astro` | ekmek kırıntısı `bg-white border-b hover:text-amber-600`→`bg-[#FDFAF3] border-b border-[rgba(200,160,100,0.14)] hover:text-urfa-600`; `from-amber-700 to-yellow-800`→obsidyen hero; `text-amber-100`→`text-[#9A8470]`; mekan kartları `rounded-xl from-amber-100 to-yellow-100`→`rounded-sm border bg-[rgba(200,160,100,0.06)]`; `group-hover:text-amber-600`→`group-hover:text-urfa-700`; `text-xs text-amber-600`→`text-xs text-urfa-600`; geri link `text-amber-600`→`text-urfa-600` |
| `src/pages/hizmetler/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-cyan-700 to-blue-800`→obsidyen hero + tracking etiket; 3 acil servis kutusu `bg-red-50/yellow-50/blue-50 border-red/yellow/blue-200 rounded-xl`→hepsi `bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)] rounded-sm`; `text-red/yellow/blue-800`→`text-[#1A1008]`; `text-red/yellow/blue-600`→`text-urfa-600`; kategori kartları `rounded-xl border-gray-100 group-hover:text-cyan-600`→`rounded-sm border-[rgba(200,160,100,0.18)] group-hover:text-urfa-700`; featured firma kartları `rounded-xl group-hover:text-cyan-600`→`rounded-sm border group-hover:text-urfa-700` |
| `src/pages/hizmetler/[kategori].astro` | ekmek kırıntısı `bg-white border-b hover:text-cyan-600`→`bg-[#FDFAF3] border-b border-[rgba(200,160,100,0.14)] hover:text-urfa-600`; `from-cyan-700 to-blue-800`→obsidyen hero; `text-cyan-100`→`text-[#9A8470]`; mekan kartları `rounded-xl shadow-sm hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; `group-hover:text-cyan-600`→`group-hover:text-urfa-700`; geri link `text-cyan-600`→`text-urfa-600` |
| `src/pages/emlak/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-emerald-700 to-green-800`→obsidyen hero + tracking etiket; kategori kartları `rounded-2xl p-8 border-gray-100 group-hover:text-emerald-600`→`rounded-sm p-8 border-[rgba(200,160,100,0.18)] group-hover:text-urfa-700`; İlçeye Göre Emlak kutusu `rounded-2xl shadow-sm`→`rounded-sm border shadow-sm`; ilçe linkleri `rounded-lg hover:bg-emerald-50 group-hover:text-emerald-600`→`rounded-sm hover:bg-[rgba(200,160,100,0.06)] group-hover:text-urfa-700`; featured ofis kartları `rounded-xl group-hover:text-emerald-600`→`rounded-sm border group-hover:text-urfa-700`; `text-emerald-600`→`text-urfa-600` |
| `src/pages/emlak/[kategori].astro` | ekmek kırıntısı `bg-white border-b hover:text-emerald-600`→`bg-[#FDFAF3] border-b border-[rgba(200,160,100,0.14)] hover:text-urfa-600`; `from-emerald-700 to-green-800`→obsidyen hero; `text-emerald-100`→`text-[#9A8470]`; mekan kartları `rounded-xl shadow-sm hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; `group-hover:text-emerald-600`→`group-hover:text-urfa-700`; `text-emerald-700` fiyat→`text-urfa-700`; geri link `text-emerald-600`→`text-urfa-600` |
| `src/pages/gastronomi/index.astro` | `from-urfa-800 to-urfa-900`→obsidyen hero + tracking etiket; `container-custom`→`container mx-auto px-4`; `section-title/subtitle` custom class→explicit Tailwind; `btn-accent`→explicit `bg-urfa-600 rounded-sm`; `btn bg-white/10`→explicit `rounded-sm`; `btn-outline`→explicit border button; `section bg-white/gray-50 dark:*`→`py-12 bg-[#FDFAF3]`/`bg-white`; fallback `rounded-2xl bg-gray-100 dark:bg-gray-800`→`rounded-sm bg-[rgba(200,160,100,0.08)]`; restoran kartları `card-hover rounded-xl dark:bg-gray-800`→`rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm hover:shadow-md hover:border-urfa-300`; rating badge `rounded-lg dark:bg-gray-800/90`→`rounded-sm bg-white/90`; tüm `dark:*` kaldırıldı |

### Test senaryoları

**Eğitim (`/egitim`, `/egitim/universiteler`):**
- Hero obsidyen arka plan, `EĞİTİM REHBERİ` tracking etiket
- Harran Üniversitesi bilgi kutusu bakır kenarlıklı, gri değil
- Kategori kartları `rounded-sm border-[rgba(200,160,100,0.18)]` hover bakır kenarlık

**Konaklama (`/konaklama`, `/konaklama/oteller`):**
- Hero obsidyen, tarihi hanlar kutusu bakır kenarlıklı
- Otel kartları görsel alanı bakır tonu `bg-[rgba(200,160,100,0.06)]`, sarı gradient değil
- Kategori etiketi urfa rengi olmalı

**Hizmetler (`/hizmetler`, `/hizmetler/cilingir`):**
- 3 acil servis kutusu (Çilingir/Elektrikçi/Tesisatçı) aynı bakır stil, renkli değil
- Link rengi urfa-600, kırmızı/mavi/sarı değil
- Kategori kartları `hover:border-urfa-300`

**Emlak (`/emlak`, `/emlak/satilik-daire`):**
- Hero obsidyen, kategori kartları `rounded-sm` (rounded-2xl değil)
- İlçe linkleri hover bakır ton

**Gastronomi (`/gastronomi`):**
- `section-title/subtitle` custom class yok, explicit Tailwind kullanılıyor
- Restoran kartlar `rounded-sm border` (rounded-xl değil), `dark:` class yok
- `btn-accent` custom class yok, explicit urfa buton

---

## Batch #107 — Harran Scripts Phase 2 (ara, akis, yeme-icme, alisveris)

**Amaç:** Arama, aktivite akışı, yeme içme ve alışveriş sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/ara.astro` | `bg-gray-50 py-12 border-b`→`bg-[#FDFAF3] border-b border-[rgba(200,160,100,0.14)]`; `container-custom`→`container mx-auto px-4`; arama input `rounded-xl border-gray-300`→`rounded-sm border-[rgba(200,160,100,0.3)]`; arama butonu `bg-amber-600 rounded-lg`→`bg-urfa-600 rounded-sm`; öneri pilleri `bg-gray-100 rounded-lg`→`bg-[rgba(200,160,100,0.08)] rounded-sm`; mekan/tarih/ilçe/blog kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; görsel alan `bg-gray-200`→`bg-[rgba(200,160,100,0.08)]`; yıldız pasif `text-gray-300`→`text-[rgba(200,160,100,0.25)]`; `group-hover:text-amber-600`→`group-hover:text-urfa-700`; `text-amber-600` kategori→`text-urfa-600` |
| `src/pages/akis.astro` | `container-custom`→`container mx-auto px-4`; `dark:text-white/gray-400` kaldırıldı; `text-gray-900`→`text-[#1A1008]`; `text-gray-600`→`text-[#9A8470]`; `min-h-screen bg-[#FDFAF3]` wrapper eklendi |
| `src/pages/yeme-icme/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-orange-600 to-red-700`→obsidyen hero + etiket satırı; `rounded-2xl border-orange-100 bg-orange-50`→`rounded-sm border-[rgba(200,160,100,0.2)] bg-[rgba(200,160,100,0.06)]`; rehber kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; `group-hover:text-red-600`→`group-hover:text-urfa-700`; alt kategori satırları `rounded-lg hover:bg-red-50`→`rounded-sm border hover:bg-[rgba(200,160,100,0.06)]`; mekan kartları `rounded-xl`→`rounded-sm border`; `text-red-600`→`text-urfa-600` |
| `src/pages/yeme-icme/[kategori].astro` | `bg-gray-50`→`bg-[#FDFAF3]`; ekmek kırıntısı `bg-white`→`bg-[#FDFAF3]`; `hover:text-orange-600`→`hover:text-urfa-600`; `from-orange-600 to-red-700`→obsidyen hero; `text-orange-100`→`text-[#9A8470]`; mekan kartları `rounded-xl from-orange-50 to-red-50`→`rounded-sm border-[rgba(200,160,100,0.18)] bg-[rgba(200,160,100,0.06)]`; `group-hover:text-orange-600`→`group-hover:text-urfa-700`; `text-xs text-orange-500`→`text-xs text-urfa-600`; pagination `bg-orange-600`→`bg-urfa-600`; geri link `text-orange-600`→`text-urfa-600` |
| `src/pages/alisveris/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-purple-700 to-pink-700`→obsidyen hero + tracking etiket; Kapalı Çarşı kutusu `rounded-2xl bg-amber-50 border-amber-200`→`rounded-sm bg-[rgba(200,160,100,0.06)] border-[rgba(200,160,100,0.2)]`; `text-amber-800/700`→`text-[#1A1008]`/`text-[#4A3828]`; kategori kartları `rounded-xl border-gray-100`→`rounded-sm border-[rgba(200,160,100,0.18)]`; `group-hover:text-purple-600`→`group-hover:text-urfa-700`; Yöresel ürünler kutusu `rounded-2xl`→`rounded-sm border`; ürün kartı `bg-purple-50 rounded-xl`→`bg-[rgba(200,160,100,0.06)] rounded-sm border-[rgba(200,160,100,0.12)]`; featured mağaza kartları `rounded-xl`→`rounded-sm border` |
| `src/pages/alisveris/[kategori].astro` | `bg-gray-50`→`bg-[#FDFAF3]`; ekmek kırıntısı `bg-white`→`bg-[#FDFAF3]`; `hover:text-purple-600`→`hover:text-urfa-600`; `from-purple-700 to-pink-700`→obsidyen hero; `text-purple-100`→`text-[#9A8470]`; mekan kartları `rounded-xl hover:shadow-lg`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:shadow-md hover:border-urfa-300`; `group-hover:text-purple-600`→`group-hover:text-urfa-700`; `text-xs text-purple-600`→`text-xs text-urfa-600`; `text-gray-500/600`→`text-[#9A8470]`/`text-[#6B5540]`; geri link `text-purple-600`→`text-urfa-600` |

### Test senaryoları

**Arama (`/ara`, `/ara?q=kebap`):**
- Arka plan `bg-[#FDFAF3]`, arama kutusu bakır kenarlıklı `rounded-sm` olmalı
- "Ara" butonu urfa kırmızısı/bakır olmalı (amber değil)
- Öneri pilleri (`Göbeklitepe`, `Kebapçı` vb.) bakır tonda `rounded-sm` olmalı
- Mekan/tarih/ilçe/blog sonuç kartları `rounded-sm border-[rgba(200,160,100,0.18)]` olmalı
- Yıldız pasif rengi bakır `rgba(200,160,100,0.25)` olmalı (gri değil)
- Blog kategori etiketi urfa rengi olmalı

**Aktivite akışı (`/akis`):**
- Giriş yoksa `/giris?redirect=/akis` yönlendirmesi olmalı
- Giriş varsa: arka plan `bg-[#FDFAF3]`, başlık `text-[#1A1008]`, altyazı `text-[#9A8470]`
- `dark:` sınıf kalmamalı

**Yeme İçme (`/yeme-icme`):**
- Obsidyen hero `bg-[#0D0A08]` + `İŞLETME REHBERİ` tracking etiketi görünmeli
- Hızlı cevap kutusu bakır ton olmalı (turuncu değil)
- Rehber kartları `rounded-sm border-[rgba(200,160,100,0.18)]` olmalı
- Alt kategori satırları `rounded-sm border` olmalı; hover bakır tona geçmeli
- Mekan kartları `rounded-sm border` olmalı; kategori etiketi urfa rengi

**Yeme İçme Alt Kategori (`/yeme-icme/kahvalti` vb.):**
- Obsidyen hero `bg-[#0D0A08]` görünmeli
- Mekan kartları `rounded-sm border-[rgba(200,160,100,0.18)]` olmalı; görsel alan bakır tonu
- Pagination aktif butonu `bg-urfa-600` (turuncu değil)

**Alışveriş (`/alisveris`):**
- Obsidyen hero `bg-[#0D0A08]` + `ALIŞVERİŞ REHBERİ` etiket görünmeli
- Kapalı Çarşı kutusu bakır ton `bg-[rgba(200,160,100,0.06)]` olmalı
- Kategori kartları `rounded-sm border` + hover `border-urfa-300` olmalı
- Yöresel ürünler kutusu `rounded-sm border-[rgba(200,160,100,0.18)]` olmalı; ürün kartı bakır

**Alışveriş Alt Kategori (`/alisveris/avmler` vb.):**
- Obsidyen hero görünmeli
- Mekan kartları `rounded-sm border-[rgba(200,160,100,0.18)]` olmalı
- Boş durum geri link urfa rengi olmalı

---

## Batch #106 — Harran Scripts Phase 2 (isletme index, arama/gelismis, hakkinda, kategori detay, harita)

**Amaç:** İşletme dizini, gelişmiş arama, hakkında, kategori detay ve harita sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/isletme/index.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `from-slate-800 to-slate-900`→obsidyen hero; CTA `bg-red-600`→`bg-urfa-600`; kategori/featured kartlar `rounded-sm border-[rgba(200,160,100,0.18)]`; CTA kutusu `bg-red-50`→`bg-[rgba(200,160,100,0.06)]`; verified badge yeşil→bakır; FAQ `rounded-sm` |
| `src/pages/arama/gelismis.astro` | `min-h-screen bg-[#FDFAF3]` wrapper + ekmek kırıntısı eklendi; `bg-blue-50/green-50/purple-50 rounded-lg border-blue-/green-/purple-200`→`bg-[rgba(200,160,100,0.06)] rounded-sm border-[rgba(200,160,100,0.2)]`; başlık renkleri bakır |
| `src/pages/hakkinda.astro` | `container-custom/section/section-title/section-subtitle/btn-accent/btn` utility sınıfları kaldırıldı; `dark:*` tamamı kaldırıldı; `bg-urfa-900 py-24`→obsidyen hero `bg-[#0D0A08]`; istatistikler `bg-urfa-50 dark:bg-gray-800`→`bg-[rgba(200,160,100,0.06)]`; değerler kartları `rounded-sm border-[rgba(200,160,100,0.18)]`; CTA bölümü `bg-urfa-900`→`bg-[#0D0A08]`; görseller `rounded-sm` |
| `src/pages/kategori/[slug].astro` | `container-custom`→`container mx-auto px-4`; renk-tabanlı hero `style={background-color: ${category.color}15}` kaldırıldı→`bg-[rgba(200,160,100,0.04)]`; inline SVG doğrulanmış rozet `<svg>`→`<Icon name="lucide:badge-check" />` (HARD RULE #21); filtre sidebar `rounded-xl`→`rounded-sm`; `bg-amber-600`→`bg-urfa-600`; mekan kartları `rounded-xl hover:border-red-300`→`rounded-sm border-[rgba(200,160,100,0.18)] hover:border-urfa-300`; yıldız pasif `text-gray-300`→`text-[rgba(200,160,100,0.25)]`; özellik etiketleri `bg-gray-100`→`bg-[rgba(200,160,100,0.1)]`; DB sorgusundan `color` alanı kaldırıldı |
| `src/pages/harita.astro` | `bg-gray-50`→`bg-[#FDFAF3]`; `container-custom`→`container mx-auto px-4`; filtre pilleri `rounded-full bg-amber-600`→`rounded-sm bg-urfa-600`; pasif pill `bg-gray-100 text-gray-700 hover:bg-gray-200`→`bg-[rgba(200,160,100,0.08)] text-[#6B5540] hover:bg-[rgba(200,160,100,0.15)]`; mobil liste butonu `rounded-xl shadow-lg bg-white`→`rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm`; modal panel `rounded-t-2xl`→`rounded-t-sm`; liste satırı `hover:bg-gray-50`→`hover:bg-[rgba(200,160,100,0.04)]`; thumbnail `rounded-lg bg-gray-200`→`rounded-sm bg-[rgba(200,160,100,0.08)]` |

### Test senaryoları

**İşletme dizini (`/isletme`):**
- Obsidyen hero üst başlık `İŞLETME REHBERİ` küçük yazı `text-[#9A8470]` renkte görünmeli
- `İşletmenizi Ekleyin` butonu urfa kırmızısı/bakır olmalı, kırmızı değil
- Kategori kartları `rounded-sm` (kare köşe); hover'da `border-urfa-300` geçişi görünmeli
- Verified badge sarı-yeşil değil bakır renk olmalı
- CTA kutusu açık bakır arka plan `rgba(200,160,100,0.06)` olmalı
- FAQ `<details>` `rounded-sm` olmalı; açıkken çevrilme animasyonu çalışmalı

**Gelişmiş arama (`/arama/gelismis`):**
- Ekmek kırıntısı `Ana Sayfa / Arama / Gelişmiş Arama` görünmeli
- 3 bilgi kutusu mavi/yeşil/mor değil, bakır ton olmalı (`rgba(200,160,100,0.06)`)
- `AdvancedSearchPanel` bileşeni hydrate olmalı (`client:visible`)

**Hakkında (`/hakkinda`):**
- CSS utility sınıfı kalmamalı: `container-custom`, `section`, `btn-accent`, `section-title` yok
- `dark:` sınıfı hiç görünmemeli
- Obsidyen hero + `text-[#F5EDD6]` başlık görünmeli
- İstatistikler bölümü hafif bakır arka plan `rgba(200,160,100,0.06)` olmalı
- Değerler kartları `rounded-sm border-[rgba(200,160,100,0.18)]` olmalı
- CTA bölümü obsidyen arka plan + urfa butonu görünmeli

**Kategori detay (`/kategori/restoran` vb.):**
- Eski renk-bazlı hero arka planı yok, bakır tona geçilmiş olmalı
- Doğrulanmış işletmelerde mavi SVG ikon değil bakır `lucide:badge-check` görünmeli
- Filtre butonu `rounded-sm` (kare köşe) ve urfa rengi olmalı
- Mekan kartları `rounded-sm` ve bakır kenarlık olmalı
- Yıldız pasif rengi `rgba(200,160,100,0.25)` olmalı (gri değil)
- Özellik etiketleri bakır `bg-[rgba(200,160,100,0.1)]` olmalı

**Harita (`/harita`):**
- Header arka planı `bg-[#FDFAF3]` ve bakır kenarlık olmalı
- Filtre pill butonları `rounded-sm` (kare köşe) olmalı
- Aktif pill urfa rengi `bg-urfa-600`, pasif `bg-[rgba(200,160,100,0.08)]` olmalı
- Mobil: liste butonu `rounded-sm border-[rgba(200,160,100,0.18)]` olmalı; amber/beyaz değil
- Mobil modal panel `rounded-t-sm` olmalı
- Mobil liste satırları hover'da bakır tona geçmeli

---

## Batch #105 — Harran Scripts Phase 2 (profil sub-pages, ilçeler, sağlık, yemek-tarifleri detay)

**Amaç:** Profil alt sayfaları, ilçeler, sağlık ve tarif detay sayfalarını Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/profil/aktivite.astro` | `dark:*` kaldırıldı; `bg-[#FDFAF3]`; kart `rounded-sm border-[rgba(200,160,100,0.18)]`; activityTypeConfig renkleri bakır/isot palette; timeline çizgisi `rgba(200,160,100,0.2)` |
| `src/pages/profil/yorumlar.astro` | `dark:*` kaldırıldı; yorum satırı `rounded-sm border-[rgba(200,160,100,0.12)]`; onay badge `rounded-sm`; boş durum bakır palette |
| `src/pages/profil/bildirimler.astro` | `btn-secondary/btn-ghost` utility → inline; notificationTypeConfig renkleri bakır/isot; okunmamış `bg-urfa-50 border-urfa-100`; `dark:*` kaldırıldı |
| `src/pages/profil/favoriler.astro` | `dark:*` kaldırıldı; favori satırı `rounded-sm border-[rgba(200,160,100,0.12)]`; silme butonu `isot-500`; boş durum bakır |
| `src/pages/ilceler/index.astro` | `bg-gradient-to-br from-teal-*`→obsidyen hero; merkez ilçe kartları `rounded-sm border-[rgba(200,160,100,0.18)]`; diğer ilçeler `rounded-sm`; `text-teal-*`→bakır/urfa |
| `src/pages/ilceler/[ilce]/index.astro` | `from-teal-700 to-teal-900`→obsidyen hero; ekmek kırıntısı `hover:text-red-600`→`hover:text-urfa-600`; kategori filter skeleton bakır; mekan kartları `rounded-sm` |
| `src/pages/ilceler/[ilce]/[kategori].astro` | Aynı ilçe pattern; mekan kartları `rounded-sm border-[rgba(200,160,100,0.18)]`; `text-teal-*`→urfa |
| `src/pages/saglik/index.astro` | `from-green-700 to-teal-800`→obsidyen hero; nöbetçi eczane kutusu `isot-*` palette; kategori kartları bakır |
| `src/pages/saglik/[kategori].astro` | `from-green-*`→obsidyen hero; `hover:text-green-600`→`hover:text-urfa-600`; mekan kartları `rounded-sm`; ekmek kırıntısı bakır |
| `src/pages/saglik/nobetci-eczaneler.astro` | `from-green-600 to-emerald-700`→obsidyen hero; filtre butonları `rounded-sm`; eczane kartları `border-[rgba(200,160,100,0.18)]`; acil kutu bakır |
| `src/pages/yemek-tarifleri/[slug].astro` | `bg-amber-50`→`bg-[#FDFAF3]`; kart `border-[rgba(200,160,100,0.18)]`; adım numarası `rounded-sm bg-[rgba(200,160,100,0.12)]`; `amber-*`→`urfa-*`; `red-*`→`isot-*` |

### Test senaryoları

**Profil alt sayfaları (`/profil/aktivite`, `/profil/yorumlar`, `/profil/bildirimler`, `/profil/favoriler`):**
- Aktivite geçmişi timeline çizgisi `rgba(200,160,100,0.2)` renkte görünmeli
- Bildirim okuma/silme işlemleri çalışmalı; okunmamış bildirim `bg-urfa-50` background almalı
- Favori kaldırma butonu isot kırmızısında görünmeli

**İlçeler (`/ilceler`, `/ilceler/eyyubiye`, `/ilceler/eyyubiye/restoranlar`):**
- Hero obsidyen arka planlı görünmeli (teal yok)
- Merkez ilçe kartları bakır kenarlıklı görünmeli

**Sağlık (`/saglik`, `/saglik/devlet-hastaneleri`, `/saglik/nobetci-eczaneler`):**
- Nöbetçi eczane filtre butonları `rounded-sm` (pill değil) görünmeli
- İlçe filtresi aktif buton `bg-urfa-600`

**Yemek tarifleri detay (`/yemek-tarifleri/[slug]`):**
- Adım numaraları `rounded-sm` köşeli görünmeli
- Acılı badge `isot-*` renkte; vejetaryen badge bakır tonunda

---

## Batch #104 — Harran Scripts Phase 2 (profil, etkinlikler, tarihi-yerler, yemek-tarifleri, yasal, arama, fiyatlandırma)

**Amaç:** Kullanıcıya dönük içerik sayfalarını ve yasal sayfaları Harran Scripts temasına geçirmek.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/profil/index.astro` | `bg-gray-50 dark:*` → `bg-[#FDFAF3]`; kart `rounded-sm border-[rgba(200,160,100,0.18)]`; `label` utility → explicit; skeleton `bg-[rgba(200,160,100,0.06)]` |
| `src/pages/etkinlikler/index.astro` | `page-header/section/container-custom` utility'leri kaldırıldı; obsidyen hero pattern; etkinlik kartları `rounded-sm border-[rgba(200,160,100,0.18)]`; indigo→bakır badge/empty state |
| `src/pages/etkinlikler/[slug].astro` | turMeta + event detail her ikisi; mor/indigo→bakır palette; `btn-primary`→inline `urfa-600`; skeleton bakır-ton; `dark:*` kaldırıldı |
| `src/pages/tarihi-yerler/index.astro` | `page-header/card-hover` utility'leri kaldırıldı; obsidyen hero; kart `rounded-sm border-[rgba(200,160,100,0.18)]`; `badge`→explicit `rounded-sm` |
| `src/pages/tarihi-yerler/[slug].astro` | `dark:*` kaldırıldı; kart/button `rounded-sm`; `container-custom`→`container mx-auto px-4`; `btn-primary`→inline; yan panel linkler `rounded-sm hover:bg-[rgba(200,160,100,0.06)]` |
| `src/pages/yemek-tarifleri/index.astro` | Amber gradient hero → obsidyen hero; kart `rounded-sm border-[rgba(200,160,100,0.18)]`; `text-amber-*`→bakır palette; `bg-red-100 text-red-700`→`isot-*` |
| `src/pages/fiyatlandirma.astro` | `bg-gradient-to-b from-blue-50 dark:*` → `bg-[#FDFAF3]` + obsidyen hero; SSS kartları `rounded-sm border-[rgba(200,160,100,0.18)]` |
| `src/pages/kullanim-kosullari.astro` | `container-custom/dark:*` → `container mx-auto px-4`; başlık `#F5EDD6`; içerik kart `rounded-sm border-[rgba(200,160,100,0.18)]`; `prose dark:prose-invert`→`prose` |
| `src/pages/gizlilik-politikasi.astro` | Aynı yasal sayfa pattern |
| `src/pages/kvkk.astro` | Aynı yasal sayfa pattern |
| `src/pages/cerez-politikasi.astro` | `bg-stone-50/slate-950/stone-200`→bakır palette; bölüm kartları `rounded-sm`; iletişim kutusu bakır ton |
| `src/pages/arama/index.astro` | `dark:*` kaldırıldı; obsidyen mini hero; `bg-[#FDFAF3]` wrapper |

### Test senaryoları

**Profil (`/profil`):**
- Parşömen arka plan, sidebar header bakır kenarlık alt çizgi
- İstatistik skeleton bakır soluk ton

**Etkinlikler listesi (`/etkinlikler`):**
- Obsidyen hero, arama kutusu yarı saydam kenarlık
- Etkinlik kartları yatay, hover bakır kenarlık
- Boş durum ikonu bakır, butonlar `rounded-sm`

**Etkinlik detay (`/etkinlikler/[slug]`):**
- Kategori sayfası: obsidyen nav+header; etkinlik kartları bakır hover
- Detay sayfası: bilgi kutuları bakır ton; skeleton bakır-soluk

**Tarihi Yerler (`/tarihi-yerler`, `/tarihi-yerler/[slug]`):**
- Hero obsidyen, kart 3'lü grid `rounded-sm`
- Detay: yol tarifi butonu `urfa-600 rounded-sm`, yan panel linkler bakır hover

**Yemek Tarifleri (`/yemek-tarifleri`):**
- Obsidyen hero, yavaş amber → bakır tonu
- Tarif ve mekan kartları `rounded-sm`

**Yasal sayfalar (`/fiyatlandirma`, `/kullanim-kosullari`, `/gizlilik-politikasi`, `/kvkk`, `/cerez-politikasi`):**
- Obsidyen başlık, parşömen içerik alanı
- Kart kenarlıklar bakır ton

**Arama (`/arama`):**
- Mini obsidyen header, beyaz arama sonuçları alanı

---

## Batch #102 — Phase 1 Tasarım Yenileme (404, 500, PlaceCard, giris, kayit)

**Amaç:** En görünür kullanıcıya dönük sayfa ve bileşenleri Harran Scripts temasına uyarlamak.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/404.astro` | Arka plan `#FDFAF3`, butonlar `urfa-600`, popüler link hover'ları urfa palette, bakır kenarlıklar |
| `src/pages/500.astro` | Arka plan `#FDFAF3`, "500" sayısı `#CE8E38/20` Cormorant Garamond italic, icon `text-urfa-500`, kart `rounded-sm` |
| `src/components/PlaceCard.astro` | Kart `border-[rgba(200,160,100,0.18)] rounded-sm`, yıldız `text-urfa-400`, başlık hover `text-urfa-700`, CTA link `text-urfa-600`, açıklama `text-[#9A8470]` |
| `src/pages/giris.astro` | Arka plan `#0D0A08` (obsidiyen), kart `#FDFAF3` parşömen, Cormorant Garamond logo, input kenarlıklar bakır, buton `urfa-600`, hata `isot-*` |
| `src/pages/kayit.astro` | Aynı auth pattern: obsidiyen arka plan + parşömen kart, `isot-*` hata renkleri, `urfa-*` aksiyonlar |

### Test senaryoları

**404.astro (`/404`):**
- Parşömen `#FDFAF3` arka plan, "Ana Sayfaya Dön" bakır buton
- Popüler link hover'ları bakır kenarlık + metin

**500.astro (`/500`):**
- Parşömen arka plan, büyük italic "500" soluk altın/bakır tonda
- İkon bakır/urfa rengi, kart köşeli

**PlaceCard (tüm mekan listeleri):**
- Kart: ince bakır kenarlık, köşeli, hover'da bakır kenarlık koyu
- Başlık hover: `text-urfa-700` (kırmızı değil)
- Yıldız rating: altın/bakır rengi
- "Detayları Gör" linki: `text-urfa-600`

**giris.astro + kayit.astro:**
- Arka plan: çok koyu obsidiyen siyah
- Kart: açık parşömen, bakır kenarlık, şık gölge
- Logo: Cormorant Garamond italic krem + bakır `.com`
- Butonlar: `urfa-600` bakır (kırmızı değil)
- Hata mesajları: `isot-*` (derin kırmızı — semantic error color)
- Input focus: bakır `urfa-400` ring
- Google OAuth butonu: bakır hover kenarlığı

---

## Batch #101 — Tasarım Yenileme Genişletmesi (index, loading, CLAUDE.md)

**Amaç:** Harran Scripts temasını Ana Sayfa hero/section stilleri, loading sayfası ve CLAUDE.md dokümantasyonuna yaymak.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/loading.astro` | Tamamen yeniden yazıldı: Jost font, obsidiyen arka plan `#0A0806→#1A1208`, bakır `#A85D22` logo, `#CE8E38` spinner, tips kartı koyu kenarlık |
| `src/pages/index.astro` | `heroMeta`: gradient `#0A0806→#1A1208` (mavi-gri silindi), stats panel/kart bakır kenarlık+warm arka plan, search button `urfa-600`, badge/link `#C4B49A`; `sectionStyles`: 15+ `red-*` → `urfa-*`; liveStatus/districtService/audiencePlans/faq bölümleri `slate-950/900` → `#0D0A08/#1A1008`, border `slate-800/700` → rgba bakır; `mainCtaConfig`: düğmeler urfa palette |
| `CLAUDE.md` | Styling satırına "Harran Scripts" tema tanımı, Cormorant Garamond + Jost font bilgisi, semantik CSS değişken referansı eklendi |

### Test senaryoları

**loading.astro (`/loading`):**
- Arka plan çok koyu sıcak siyah (mavi-gri değil)
- "Ş" logosu köşeli (`border-radius: 4px`), koyu turuncu arka plan
- Spinner bakır renk (`#CE8E38`)
- "Biliyor muydunuz?" kartı koyu zemin + bakır başlık

**index.astro hero (`/`):**
- Hero gradient sıcak siyah (mavi soğuk ton yok)
- Stats paneli: bakır kenarlık, koyu warm arka plan
- "Ara" butonu bakır/urfa-600 rengi (kırmızı değil)
- Hero badge ve quick link'ler `#C4B49A` krem rengi
- İşletme kartları `urfa-*` kenarlıklar

**index.astro bölümleri:**
- "Canlı Servis Durumu" bölümü: `#0D0A08` arka plan, bakır kenarlık
- "İlçe Servisi" bölümü: `#1A1008` arka plan
- "Hedef Kitleye Göre Planlar" bölümü: sıcak obsidiyen + bakır hover
- SSS bölümü: sıcak koyu arka plan
- CTA bölümü: `urfa-600` ana buton, `#1A1008` ikincil buton
- Tüm hover efektleri kırmızı değil urfa/bakır rengi

---

## Batch #100 — Komple Tasarım Yenileme — "Harran Scripts" Teması

**Amaç:** Tüm site görsel kimliğini Inter/Playfair Display → Cormorant Garamond + Jost ile değiştirmek; sıcak açık arka plan → obsidiyen karanlık arka plan; jenerik Tailwind renk şeması → bakır/altın Mezopotamya estetiği.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/styles/global.css` | Tamamen yeniden yazıldı: Cormorant Garamond + Jost font import, `urfa-{50-950}` bakır palette, `isot-{50-950}` kırmızı, anlamsal CSS değişkenleri (`:root`/`.dark`), `.btn-primary`, `.card`, `.badge`, `.page-header`, `.section-title` bileşen stilleri |
| `src/components/Header.astro` | HTML kısmı yeniden tasarlandı: `rgba(13,10,8,0.96)` arka plan, Cormorant Garamond logotipi, `#CE8E38` bakır hover renkleri, dropdown `#161210` zemin |
| `src/components/Footer.astro` | HTML kısmı yeniden tasarlandı: `#0A0806` siyah, Cormorant Garamond italic kelime işareti, `#CE8E38` bölüm başlıkları, `#6B5540` link renkleri |
| `src/layouts/Layout.astro` | Font yükleme: Inter → `Cormorant+Garamond` + `Jost` Google Fonts; kritik CSS `font-family` güncellendi; `body` arka plan `#FDFAF3`, renk `#1A1008` |

### Test senaryoları

**Tipografi yükleme:**
- Herhangi bir sayfada DevTools → Network → `fonts.googleapis.com` isteği görünmeli
- Cormorant Garamond (serif, italic) logo/başlıklarda yüklenmeli; Jost (sans-serif) gövde metinlerde yüklenmeli
- Fonts yüklenmeden önce sistem font fallback'i (sans-serif) görünmeli — CLS olmadan

**Header görünümü (`/`):**
- Arka plan `rgba(13,10,8,0.96)` koyu siyah (transparan değil fixed)
- Logo: "Sanliurfa" Cormorant Garamond italic krem rengi + ".com" bakır (`#C27530`)
- Nav linkleri: `#9A8470` rengi → hover `#F5EDD6`
- "Kayıt Ol" butonu: koyu kahverengi arka plan (`#A85D22`), büyük harf takip eden metin
- Mobil menü: aynı koyu obsidiyen renk, bakır kenarlıklar

**Footer görünümü:**
- Arka plan `#0A0806` (çok koyu sıcak siyah — gri değil)
- Kelime işareti: büyük Cormorant Garamond italic, krem rengi
- Bölüm başlıkları (Keşfet, İlçeler, vb.): `#CE8E38` bakır, 0.5625rem büyük harf
- Linkler: `#6B5540` → hover `#C4B49A`
- Alt çubuk: `#4A3828` rengi telif hakkı + yasal linkler

**Renk uyumu:**
- Sıcak ton: `#FDFAF3` krem/parşömen arka plan (açık modda)
- Koyu mod (`.dark` sınıfı): `#0D0A08` obsidiyen arka plan, `#F5EDD6` metin
- Eski palette hex'leri (`#fdf8f6`, `#a18072` vb.) hiçbir bileşende görünmemeli — HARD RULE #20

---

## Batch #95 — Admin innerHTML XSS → DOM API (5 dosya)

**Amaç:** Admin sayfalarında `innerHTML` + template literal ile DB/API verisi render edilirken stored XSS riski vardı. `textContent` + `createElement` ile sıfır-risk DOM metotlarına geçildi.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/admin/blog/index.astro` | `renderPosts`: `buildPostRow()` DOM fonksiyonu; `loadPosts` error → `setTbodyMsg()`; `escapeHtml` kaldırıldı |
| `src/pages/admin/moderation.astro` | `loadSocialAbuse`: `buildAuditRow()` + `setBodyText()` DOM; `escapeHtml` kaldırıldı |
| `src/pages/admin/site-audit.astro` | `load()`: `buildAuditRow()` + `setBodyMsg()`; `loadAnomaly()`: `makeRow()` DOM; `escapeHtml` kaldırıldı |
| `src/pages/admin/import.astro` | Submit handler: tüm `innerHTML` → `createElement`/`textContent`; `escapeHtml` kaldırıldı |
| `src/pages/admin/social-policies.astro` | `loadPolicies`: `buildPolicyRow()` + `setPolicyMsg()` DOM; `escapeHtml` kaldırıldı |

### Test senaryoları

**blog/index.astro — `/admin/blog`:**
- Blog listesi yüklenir, her post satırında `<tr>` gösterilir; DOM'da `<script>` veya `<img onerror>` değil metin görünür
- Bir blog yazısına title olarak `<img src=x onerror=alert(1)>` değeri yazıp kaydet → admin blog listesinde bu değer metin olarak gösterilmeli, script çalışmamalı
- "Düzenle" ve "Görüntüle" linkleri doğru href ile açılmalı
- "Sil" butonu → confirm + DELETE isteği gitmeli

**moderation.astro — `/admin/moderation`:**
- "Social Abuse Kayıtları Yükle" butonuna tık → tablo satırları DOM ile oluşturulur
- `setting_key`, `action`, `actor_email`, `ip_address` alanlarına `<script>` içeren değer var ise metin olarak render edilmeli
- API error durumunda (`/api/admin/site/audit` 500 döner) → hata mesajı `textContent` ile gösterilmeli

**site-audit.astro — `/admin/site-audit`:**
- "Yükle" → audit kayıtları tablo satırları DOM ile oluşturulur
- Anomaly kartı veriler `makeRow()` DOM fonksiyonu ile oluşturulur
- `data.error` alanı XSS payload içerse bile metin olarak render edilmeli

**import.astro — `/admin/import`:**
- CSV dosyası yükle → "İşleniyor..." `textContent` ile gösterilmeli
- Başarı → yeşil kutu DOM ile oluşturulur; error list `<li>` elementleri `textContent` ile
- `result.error` alanı XSS payload içerse ("&lt;script&gt;") → metin olarak render edilmeli

**social-policies.astro — `/admin/social-policies`:**
- Politika tablosu yüklenir → `buildPolicyRow()` ile DOM satırları
- `tenant_id` veya `note` alanı `<script>` içerse metin olarak render edilmeli

### Hook Notu
XSS security hook `innerHTML` + template literal kombinasyonunu bloklar. Bu fix DOM API (`textContent`, `createElement`, `replaceChildren`) kullanarak fix edildi — `innerHTML` + escapeHtml yerine daha güçlü savunma.

---

## Batch #97 — Admin innerHTML XSS → DOM API (3 dosya, 7 fonksiyon)

**Amaç:** `monitoring.astro`'da kalan 5 fonksiyon, `export-tokens.astro` token satır oluşturucu, `places/lifecycle.astro` timeline satırları. `x.place_name`/`x.actor_email`/`x.reason` HIGH RISK; `x.resource_key`/CIDR/ülke MEDIUM RISK; `updatedAt`/`d.date.slice(5)` MEDIUM RISK.

| Dosya | Değişiklik |
|---|---|
| `monitoring.astro` | `updateReviewHealth`: `rhCard()` DOM helper; `updateJobHealth`: `replaceChildren` + `updatedAt` textContent; `updateSloPanel`: `sloCard()` helper; `updateAlarmPanel`: `makeAlarmCard()` helper — event listener'lar inline (querySelectorAll kaldırıldı); `updateCronHealth`: `d.date.slice(5)` textContent |
| `export-tokens.astro` | `buildTokenRow()` DOM fonksiyonu — `x.resource_key`, `cidrs`, `countries`, `x.id` textContent/closure; revoke event listener inline bağlandı |
| `places/lifecycle.astro` | `buildLifecycleRow()` — `x.place_name`, `x.actor_email`, `x.reason` (HIGH) textContent |
| `content-agents.astro` | `loadData().catch` error paragraph → `createElement('p').textContent`; `escapeHtml` kaldırıldı |

### Test senaryoları

**monitoring.astro — kalan paneller:**
- Cron Health Trend barlarında `d.date` `<script>` içerse → tarih etiketi metin olarak görünmeli
- Job Health panelinde `updatedAt` API string XSS içerse → textContent ile metin olarak görünmeli
- Alarm kartlarındaki "Onayla" ve "30 dk ertele" butonları çalışmalı (event listener inline bağlı)
- SLO paneli sayılar doğru hesaplanmalı

**export-tokens.astro — `/admin/export-tokens`:**
- Token listesi yüklenir; `resource_key`, CIDR ve ülke kolonları XSS payload içerse metin olarak görünmeli
- "İptal Et" butonu → `promptInput` → DELETE isteği gitmeli (event listener closure'dan `x.id` kullanır, `data-id` atribute yok)

**places/lifecycle.astro — `/admin/places/lifecycle`:**
- Lifecycle tablosunda `place_name` = `<img onerror=alert(1)>` → metin olarak görünmeli
- `actor_email` XSS içerse → font-mono span'da metin olarak görünmeli
- `reason` alanı `<script>` içerse → son kolonda metin olarak görünmeli

---

## Batch #96 — Admin innerHTML XSS → DOM API (2 dosya)

**Amaç:** `monitoring.astro` ve `social-risk.astro` admin sayfalarında DB/API kaynaklı string'ler (`e.message`, `e.level`, `r.method`, `weather.source`, `r.reason`, `x.error`, `f.failure_class`, `t.tenantId`) `innerHTML` template literal'leri ile render ediliyordu. `replaceChildren()` + `createElement` + `textContent` ile XSS riski sıfırlandı.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/admin/monitoring.astro` | `updateErrorStats`: `replaceChildren` + `e.level`/`e.count` textContent; `updateRequestStats`: `r.method`/`r.count`/`r.avg_duration` textContent; `updateRecentErrors`: `e.message` (HIGH) + `e.level` textContent; `updateUpstreamHealth`: `makeInfoCard()` helper DOM; `container.replaceChildren()` |
| `src/pages/admin/social-risk.astro` | `loadRisk` metaPanel: `makeMetaCard()` helper + `replaceChildren`; cards: `buildTenantCard()` DOM (tenantId, score, reasons); `loadWebhookLog`: `x.error` (HIGH) textContent; `loadWebhookMetrics`: `wmCard()`/`wmList()` helpers, `f.failure_class` textContent |

### Test senaryoları

**monitoring.astro — `/admin/monitoring`:**
- Sayfa açılır, tüm paneller yüklenir (Error Stats, Request Stats, Recent Errors, Upstream Health)
- `e.message` alanı `<img src=x onerror=alert(1)>` içerse → "Son Hatalar" tablosunda metin olarak görünmeli, script çalışmamalı
- `e.level` değeri `<b>fatal</b>` ise → badge'de metin olarak görünmeli
- `weather.source` `<script>alert(1)</script>` içerse → Upstream Health kartında metin olarak görünmeli

**social-risk.astro — `/admin/sosyal-risk` (veya risk endpoint'i):**
- Sayfa yüklenir, tenant kartları gösterilir
- `t.tenantId` `<script>` içerse → tenant kartında `font-mono` metin olarak görünmeli
- `r.reason` (DB anomaly reason) XSS payload içerse → `<li>` itemlerinde metin olarak görünmeli
- `x.error` (webhook error) `<script>` içerse → webhook log'da `text-rose-700` div'de metin olarak görünmeli
- `f.failure_class` XSS payload içerse → "Hata Sınıfları" listesinde metin olarak görünmeli

### Güvenli bırakılan bölümler
`updateReviewHealth`, `updateJobHealth`, `updateSloPanel`, `updateAlarmPanel`, `updateCronHealth` — yalnızca sayılar/boolean/Date çıktısı içeriyor, DB string yok.

---

## Batch #98 — Admin + Lib innerHTML XSS → DOM API (4 dosya)

**Amaç:** `places.astro` (HIGH: `place.name`, `owner_name`, `owner_email`), `users/index.astro` (HIGH: `user.name`, `user.email`), `blog/index.astro` (pagination), `src/lib/toast.ts` (MEDIUM: `message` + SVG icon). Tüm `innerHTML + template literal` pattern'leri DOM API'ya dönüştürüldü.

| Dosya | Değişiklik |
|---|---|
| `src/pages/admin/places.astro` | `buildPlaceRow()` DOM fonksiyonu — `place.name`/`owner_name`/`owner_email` (HIGH) textContent; checkbox `addEventListener('change')`; approve butonu closure event listener |
| `src/pages/admin/users/index.astro` | `buildUserRow()` DOM fonksiyonu — `user.name`/`user.email` (HIGH) textContent; action button closure |
| `src/pages/admin/blog/index.astro` | Pagination `replaceChildren()` — integer `i` textContent (SAFE); `addEventListener('click', () => goToPage(i))` closure |
| `src/lib/toast.ts` | `getIcon()` → `SVGElement` (createElementNS); `makeCloseSvg()` → `SVGElement`; `message` textContent (MEDIUM); sıfır `innerHTML` |

### Test senaryoları

**places.astro — `/admin/places`:**
- İşletme listesi yüklenir; `place.name` = `<img src=x onerror=alert(1)>` → tablo hücresinde metin olarak görünmeli
- `owner_name` veya `owner_email` `<script>` içerse → Sahip kolonunda metin olarak görünmeli
- Checkbox seç → Bulk Actions bar görünmeli; "Onayla" → `PUT /api/admin/places` gitmeli
- Pagination butonları doğru sayfaya gitmeli

**users/index.astro — `/admin/users`:**
- Kullanıcı listesi yüklenir; `user.name` XSS payload içerse → tablo hücresinde metin olarak görünmeli
- `user.email` `<script>` içerse → email hücresinde metin olarak görünmeli
- "Askıya Al" / "Aktif Et" butonları doğru isteği göndermeli

**toast.ts (window.toast):**
- `window.toast.success('<img onerror=alert(1)>')` → toast'ta metin olarak görünmeli, script çalışmamalı
- Tüm toast tipleri (success/error/warning/info) doğru renk ve ikon ile görünmeli
- Kapatma butonu (X) tıklandığında toast kapanmalı

---

## Batch #99 — Bileşen innerHTML XSS → DOM API (3 dosya)

**Amaç:** `NotificationCenter.astro` (HIGH: `n.title`, `n.message`, `n.link`, `notification.title`, `notification.message`), `ErrorBoundary.astro` (developer prop + inline SVG), `ui/Toast.astro` (HIGH: `options.message`, MEDIUM: `options.action.label`). Tüm `innerHTML + template literal` temizlendi; `src/`'da sıfır `innerHTML = \`...${...` kaldı.

| Dosya | Değişiklik |
|---|---|
| `src/components/NotificationCenter.astro` | `buildNotificationItem()` DOM helper — `n.title`/`n.message` (HIGH) textContent; `linkA.href` DOM property; `n.read` boolean className; `list.replaceChildren()`; `showToast()` — `notification.title`/`notification.message` (HIGH) textContent; close button `addEventListener` |
| `src/components/ErrorBoundary.astro` | `showError()` — `createElementNS` SVG; `message` textContent; reload button `addEventListener('click', () => window.location.reload())` |
| `src/components/ui/Toast.astro` | `createToast()` — `options.message` (HIGH) textContent; `options.action.label` (MEDIUM) textContent; action/close buton `addEventListener`; `onclick` attribute kaldırıldı |

### Test senaryoları

**NotificationCenter.astro — bildirim dropdown:**
- Bildirim listesi yüklenir; `n.title` = `<script>alert(1)</script>` → listede metin olarak görünmeli
- `n.message` XSS payload içerse → bildirim açıklamasında metin olarak görünmeli
- `n.link` `javascript:alert(1)` içerse → DOM property ile set edildiğinden href olarak render edilir ama tıklanabilir olmaz (browser URL güvenliği)
- SSE push gelince `showToast()` çalışır; `notification.title`/`notification.message` XSS içerse → floating toast'ta metin olarak görünmeli
- Toast'ta X butonu → `addEventListener` ile bağlı; tıklayınca toast silinmeli

**ErrorBoundary.astro:**
- `window.dispatchEvent(new ErrorEvent('error', { error: new Error('test') }))` → hata kutusu görünmeli; SVG ikon `createElementNS` ile oluşturulmuş
- `data-fallback="<script>alert(1)</script>"` → hata kutusunda metin olarak görünmeli
- "Sayfayı Yenile" butonu → `addEventListener` ile `window.location.reload()` bağlı

**ui/Toast.astro — window.toast:**
- `toast.show({ message: '<img onerror=alert(1)>', type: 'success' })` → metin olarak görünmeli
- `toast.show({ message: 'test', action: { label: '<b>OK</b>', onClick: () => {} } })` → label metin olarak görünmeli
- Action onClick → `addEventListener` ile bağlı; tıklayınca callback çalışmalı
- Auto-dismiss 5s sonra gerçekleşmeli; manuel close butonu `addEventListener` ile çalışmalı

### Tamamlama Notu
`src/` genelinde `innerHTML\s*=\s*\`[^\`]*\$\{` pattern'i: **0 eşleşme**. Kalan `innerHTML` kullanımları: `Map.astro` (hardcoded SVG restore + inline SVG, HARD RULE #21 exception) ve `LeafletMap.astro` (emoji only, SAFE).

---

## Batch #77 — Rezervasyon Race Fix + maxLength

### Rezervasyon Oluşturma (POST /api/reservations)

**Golden path:**
- Geçerli placeId, customerName, customerPhone, reservationDate (bugünden sonra), reservationTime, partySize ile POST → 201 döner, rezervasyon oluşturulur

**Race condition fix:**
- Aynı telefon/tarih/saat/mekan için eşzamanlı iki POST isteği gönder → yalnızca biri 201, diğeri 409 (`Bu tarih ve saat için mevcut rezervasyonunuz var`) dönmeli
- İptal edilmiş (status=cancelled) rezervasyon ile aynı telefon/tarih/saat için yeni POST → 201 döner (re-booking izin verilir)

**maxLength:**
- customerName > 200 karakter → 400
- specialRequests > 1000 karakter → 400
- occasion > 200 karakter → 400

**Tarih validasyonu:**
- Geçmiş tarih → 400
- 3 aydan uzak tarih → 400

---

### Rezervasyon Güncelleme (PUT /api/reservations/[id])

**maxLength:**
- notes > 1000 karakter → 400
- tableNumber > 50 karakter → 400

**Status geçişleri:**
- pending → confirmed → müşteriye email gönderilmeli (customer_email varsa)
- pending → cancelled → müşteriye email gönderilmeli
- Geçersiz status → 400

---

### Promosyon Güncelleme (PUT /api/promotions/[id])

**maxLength:**
- title > 200 karakter → 400
- description > 5000 karakter → 400

**Yetki:**
- Admin: herhangi bir promosyonu güncelleyebilir
- Vendor: yalnızca kendi mekanına ait promosyonu güncelleyebilir → başkasına 403
- User/Moderator: 403

---

## Batch #78 — Map ID + Homepage Sections

### Harita Bileşenleri (Map.astro, LeafletMap.astro)

- `/isletme/[slug]` sayfasına git, harita görünüyor mu → evet
- Aynı sayfayı yenile → harita ID'si her render'da farklı hex string (F12 > Inspector > `id="map-..."`) — Math.random yerine randomBytes kullanılıyor
- Birden fazla harita bileşeni aynı sayfada varsa ID çakışması yok

---

## Batch #81 — Blog Admin + Saved Searches + Block/Mute

### Admin Blog Yazısı Oluşturma (POST /api/admin/blog)

**maxLength:**
- title > 200 → 422
- slug > 200 → 422
- excerpt > 1000 → 422
- content > 100.000 → 422
- meta_title > 200 → 422
- meta_description > 500 → 422

**ENUM:**
- `status: "invalid"` → 422

**Golden path:** title + slug + content ile POST → 201

---

### Admin Blog Yazısı Güncelleme (PUT /api/admin/blog/[id])

**maxLength (ek olarak):**
- slug > 200 → 422
- content > 100.000 → 422

(title/excerpt/meta_title/meta_description önceki batch'te zaten test edilmeli)

---

### Admin Blog Kategorileri (POST /api/admin/blog/categories)

**maxLength:**
- name > 200 → 422
- slug > 100 → 422
- description > 500 → 422 (önceden vardı)

---

### Admin Blog Etiketleri (POST /api/admin/blog/tags)

**maxLength:**
- name > 200 → 422
- slug > 100 → 422
- description > 500 → 422

---

### Kayıtlı Aramalar (POST /api/users/saved-searches)

**maxLength:**
- name > 100 → 400
- query > 500 → 400

**Zorunlu alan:**
- name veya query boş → 400

---

### Kullanıcı Engelleme (POST /api/users/privacy/block)

**maxLength:**
- reason > 500 → 422

**Kendini engelleme:**
- Kendi ID'si ile POST → 422, `'Kendinizi veya zaten engellediğiniz birini engelleyemezsiniz'` (DB hata detayı görünmemeli)

**Golden path:** Başka kullanıcı ID'si → 201

---

### Kullanıcı Susturma (POST /api/users/privacy/mute)

**Kendini susturma:**
- Kendi ID'si ile POST → 422, `'Kendinizi susturmak mümkün değil'` (DB hata detayı görünmemeli)

**Golden path:** Başka kullanıcı ID'si → 201

---

## Batch #80 — Points Race + Places maxLength + Delete-Account

### Puan Ekleme (POST /api/points/add)

**Golden path:**
- `{ amount: 50, reason: "test", type: "earn" }` → 200, `newPoints` doğru artar

**Lost-update fix:**
- Eşzamanlı iki +50 puan isteği → `newPoints` her iki artışı yansıtmalı (toplam +100), kayıp güncelleme olmamalı

**spend tipi:**
- `{ amount: 20, reason: "harcama", type: "spend" }` → puan 20 azalır

---

### Mekan Güncelleme (POST /api/places/[id]/update) — admin

**maxLength:**
- email > 254 karakter → hata yönlendirmesi (`?error=email_too_long`)
- phone > 30 karakter → hata yönlendirmesi (`?error=phone_too_long`)
- website > 500 karakter → hata yönlendirmesi (`?error=website_too_long`)

**Mevcut alanlar (önceki batch'ten):**
- name > 200, description > 5000, address > 500 → yönlendirme

---

### Hesap Silme İsteği (POST + DELETE /api/users/privacy/delete-account)

**POST golden path:**
- Giriş yapmış kullanıcı geçerli şifre + opsiyonel reason → 201, 30 gün sonrası scheduled_for

**Duplicate request:**
- Zaten aktif silme isteği varken tekrar POST → 409, mesaj `'Zaten aktif bir hesap silme isteğiniz var'` (DB constraint adı görünmemeli)

**DELETE (iptal):**
- Aktif istek varken DELETE → 200, istek iptal edildi
- Aktif istek yokken DELETE → 404, `'Aktif bir silme isteği bulunamadı'` (DB iç detayı görünmemeli)

**Şifre doğrulama:**
- Yanlış şifre → 401
- Şifre alanı eksik → 422

---

## Batch #79 — Race Fix + Contact Validation

### İnceleme Oylama (POST /api/reviews/[id]/vote)

**Golden path:**
- Giriş yapmış kullanıcı geçerli reviewId + `voteType: "helpful"` → 200, oy kaydedilir
- Aynı kullanıcı aynı review için tekrar oy gönderir → 409 (`Bu inceleme üzerinde zaten bir oy kullandınız`)

**Race condition fix:**
- Eşzamanlı iki identical POST isteği → yalnızca biri 200, diğeri 409 döner; `review_votes` tablosunda tek satır olmalı

**Yetki:**
- Giriş yapmamış kullanıcı → 401

---

### Promosyon Oluşturma (POST /api/promotions/create)

**Golden path:**
- Pro+ kullanıcı, kendi mekanı için benzersiz couponCode → 201

**Race/duplicate fix:**
- Aynı couponCode ile eşzamanlı iki istek → yalnızca biri 201, diğeri 409 (`Bu kupon kodu zaten kullanılmaktadır`)

**Yetki:**
- Başka kullanıcının mekanına promosyon → 403
- Pro+ olmayan kullanıcı → 403

---

### Favoriler (POST /api/favorites)

**Golden path:**
- Giriş yapmış kullanıcı geçerli placeId → 201, favoriye eklendi

**Race condition fix:**
- Eşzamanlı iki identical POST → yalnızca biri 201, diğeri 400 (`Bu mekan zaten favorilerinizde`)

**Normal duplicate:**
- Aynı mekanı tekrar favorile → 400

---

### İletişim Formu (POST /api/contact)

**Golden path:**
- Geçerli name, email, subject, message → 201

**maxLength:**
- name > 200 karakter → 400
- email > 254 karakter → 400
- phone > 30 karakter → 400
- subject > 200 karakter → 400
- message > 5000 karakter → 400

**ENUM (type):**
- `type: "invalid_type"` → 400 (`Geçersiz talep türü`)
- `type: "complaint"` → 201 (geçerli)
- type alanı boş bırakılır → varsayılan `"general"` ile 201

**Zorunlu alan:**
- name/email/subject/message eksik → 400

---

### Homepage Sections (PUT /api/admin/site/homepage-sections)

- Admin panelinden homepage section güncelle → 200 döner
- section_key > 100 karakter → 400
- title > 200 karakter → 400
- description > 1000 karakter → 400
- section_key veya title boş bırak → 400 (`section_key ve title zorunludur`)

---

## Admin Panel Genişletme — 5 Yeni Sayfa

### /admin/reservations — Rezervasyon Yönetimi

- `/admin/reservations` sayfasına git → tablo yükleniyor mu
- `?status=pending` filtresi → sadece bekleyen rezervasyonlar görünür
- `?date=2026-05-01` filtresi → o tarihe ait rezervasyonlar
- Onay bekleyen bir rezervasyonda "Onayla" butonuna bas → `PUT /api/reservations/[id]` ile `status: confirmed` gönderilir, sayfa yenileniyor
- "İptal" butonuna bas → `status: cancelled` gönderilir
- Hem confirmed hem pending için cancel butonu görünür; confirmed için sadece cancel görünür

### /admin/feature-flags — Feature Flag Console

- `/admin/feature-flags` sayfasına git → mevcut flagler listeleniyor mu
- Yeni flag oluştur: key + name + type doldur, "Oluştur" → liste yenileniyor
- Toggle switch'e tıkla → `PUT /api/admin/flags` ile `{ key, value: true/false }` gönderilir
- "Sil" butonuna tıkla, onayla → flag listeden kalkıyor
- Geçersiz key ile oluştur (boş) → form `required` ile engeller

### /admin/quotas — Kota Yönetimi

- `/admin/quotas` sayfasına git → kullanıcı listesi yükleniyor mu
- Kota kaydı olan kullanıcılarda `feature_key: used_count` bilgisi görünür
- "Tümünü Sıfırla" butonuna bas, onayla → `POST /api/admin/quotas/[userId]` ile `{ action: "reset_all" }` gönderilir
- Başarı sonrası buton "Sıfırlandı" yeşil renk gösterir

### /admin/user-deletions — Hesap Silme Talepleri

- `/admin/user-deletions` sayfasına git → aktif silme talepleri listeleniyor mu
- Yaklaşan tarihler (≤3 gün) amber badge gösterir
- Bugünden önceki tarihler kırmızı "Bugün silinecek" badge gösterir
- Silme talebi olmadığında "Aktif hesap silme talebi yok" mesajı görünür

### /admin/vendor-approval — Vendor Onay Paneli

- `/admin/vendor-approval` sayfasına git → `/api/admin/vendor/pending` çağrılıyor mu (F12 > Network)
- Bekleyen vendor yoksa "Onay bekleyen başvuru yok" mesajı görünür
- "Onayla" butonuna bas → `POST /api/admin/vendor/[placeId]/approve` gönderilir, liste yenilenir
- "Reddet" butonuna bas → prompt açılır, red sebebi girilir → `POST` ile reason gönderilir
- Yenile butonuna bas → veriyi yeniden yükler

### Admin Index (/admin)

- `/admin` sayfasını aç → Quick Actions listesinde 5 yeni link görünür:
  - Rezervasyonlar → `/admin/reservations`
  - Vendor Onayları → `/admin/vendor-approval`
  - Feature Flags → `/admin/feature-flags`
  - Kota Yönetimi → `/admin/quotas`
  - Hesap Silme Talepleri → `/admin/user-deletions`

---

## Frontend İyileştirmeleri — Skeleton + Empty State + Inline Error

### AdminVerificationQueue — alert() → inline hata

- Bir doğrulama talebini onaylarken hata oluşursa → sayfanın üstünde kırmızı inline banner belirir (artık `alert()` yok)
- Red formunda 10 karakterden az neden yazıp "Reddet"e bas → textarea kırmızıya döner, inline hata mesajı görünür (artık `alert()` yok)
- Textarea'ya yazmaya başlayınca kırmızı border ve hata mesajı kaybolur

### LeaderboardsDisplay — Skeleton + Empty State

- `/topluluk` veya liderlik tablosunun gösterildiği sayfaya git → veri yüklenirken 6 adet pulse animasyonlu kart iskelet görünür
- API boş liste döndürürse → "🏆 Henüz liderlik tablosunda kimse yok." mesajı görünür

### SearchResults — Skeleton + Empty State

- Arama kutusuna 2+ karakter girinceye kadar bekle → grid skeleton animasyonu görünür
- Sonuç bulunamayan terim yazınca → "🔍 [terim] için sonuç bulunamadı. Farklı bir anahtar kelime deneyin." görünür

---

## Batch #83 — Logger + Promise.all + Frontend Kalite

### console.error → logger.error (Kritik Public Sayfalar)

- Ana sayfa (`/`) hata oluşunca → artık `console.error` yerine `logger.error` ile yapılandırılmış log
- `/blog/[slug]`, `/yemek-tarifleri/[slug]`, `/tarihi-yerler` — aynı pattern
- Admin: `categories`, `campaigns`, `blog/comments`, `reservations`, `quotas`, `user-deletions` — hepsi logger ile

### Promise.all Paralel Sorgular

- `/mekanlar` açıldığında kategoriler + öne çıkan mekanlar artık paralel çekiliyor (Sequential → Promise.all)
- `/blog` açıldığında yazılar + kategoriler paralel çekiliyor

### AdminVerificationQueue — inline hata

- Onayla/Reddet hatası artık `alert()` yerine inline banner
- Red nedeninde 10 karakterden az → textarea kırmızı, inline mesaj görünür

---

## Batch #84 — alert() → inline + noIndex + Promise.all API

### React Bileşen alert() Kaldırma

**CollectionDetail:**
- Giriş yapmadan koleksiyon takip et butonuna bas (teorik: buton normalde gizli) → `/giris` yönlendirmesi (artık `alert()` yok)

**PricingPlans:**
- Faz 1 aktifken bir plan seç → plan butonunun altında mavi info banner "Faz 1 döneminde tüm özellikler ücretsiz ve herkese açık." belirir (artık `alert()` yok)
- Faz 1 pasifken plan seç → mavi info banner "Abonelik seçimi şu anda devre dışı." (artık `alert()` yok)
- ×'e tıkla → info banner kapanır

**ReportManager:**
- Bir rapor seç → "Çalıştır" butonuna bas → yeşil success banner "Rapor çalıştırıldı: X satır" belirir (artık `alert()` yok)
- ×'e tıkla → banner kapanır

**PromotionManager (Vendor):**
- Geçersiz veriyle kampanya oluşturmaya çalış → kırmızı error banner "Kampanya oluşturulamadı" belirir (artık `alert()` yok)
- Kampanya durumu güncellenirken hata oluşsa → kırmızı error banner "Durum güncellenemedi" (artık `alert()` yok)

---

### Admin Sayfaları noIndex

**AdminLayout.astro:**
- `AdminLayout` kullanan her admin sayfasında F12 > Elements > `<head>` → `<meta name="robots" content="noindex, nofollow">` görünür
- Etkilenen sayfalar: `/admin/api-docs`, `/admin/component-gallery`, `/admin/content-agents`, `/admin/import`, `/admin/recipes`, `/admin/blog/*` vs.

**Bağımsız sayfalar:**
- `/admin/notifications` → `<meta name="robots" content="noindex, nofollow">` var
- `/admin/governance` → seo objesinde `noIndex: true` ile gönderilir

---

### Promise.all Paralel Sorgular (API Endpoint'ler)

- `GET /api/admin/bus-routes?routeId=X` → `route` ve `schedules` artık paralel çekiliyor
- `GET /api/admin/site/audit` → COUNT ve liste sorgusu artık paralel çekiliyor

---

## Batch #85 — Logger Migration + Promise.all (Admin Pages)

### console.error → logger.error (Admin Frontmatter)

- `/admin/events` → events + stats artık paralel çekiliyor (Promise.all), logger.error eklendi
- `/admin/historical-sites` → sites + stats paralel, logger.error eklendi
- `/admin/blog/comments` → stats + comments paralel (Promise.all), zaten logger vardı
- `/admin/events/edit/[id]` → logger.error eklendi
- `/admin/historical-sites/edit/[id]` → logger.error eklendi
- `/admin/messages` → logger.error eklendi
- `/admin/places/add` → logger.error eklendi
- `/admin/places/edit/[id]` → logger.error eklendi
- `/admin/reports` → logger.error eklendi
- `/admin/reviews` → logger.error eklendi
- `/admin/users` → logger.error eklendi

**Not:** `content-bot`, `index` (dashboard), `monitoring`, `revenue`, `tickets` dosyalarındaki `console.error` çağrıları `<script>` tag içinde (browser-side) — HARD RULE #23'e göre muaf.

### Promise.all Paralel Sorgular (Admin Sayfalar)

- `/admin/events` → SELECT etkinlikler + SELECT COUNT artık Promise.all ile paralel
- `/admin/historical-sites` → SELECT sites + SELECT COUNT artık Promise.all ile paralel
- `/admin/blog/comments` → queryOne stats + queryMany yorumlar artık Promise.all ile paralel

---

## Batch #86 — Promise.all (Public Sayfalar)

### Promise.all Paralel Sorgular (Public Sayfalar)

Aşağıdaki sayfalarda bağımsız DB sorguları Sequential → Promise.all ile paralel hale getirildi:

- `/gastronomi` → SELECT restaurants + SELECT COUNT artık Promise.all ile paralel
- `/yeme-icme` → SELECT subcategories + SELECT topPlaces artık Promise.all ile paralel
- `/gezilecek-yerler` → SELECT subcategories + SELECT featuredSites artık Promise.all ile paralel
- `/saglik/nobetci-eczaneler` → SELECT pharmacies + SELECT DISTINCT districts artık Promise.all ile paralel
- `/mahalleler` → SELECT districts (subquery ile neighborhood_count dahil) + SELECT COUNT neighborhoods artık Promise.all ile paralel
- `/profil/bildirimler` → SELECT notifications + SELECT COUNT (okunmamış) artık Promise.all ile paralel
- `/isletme` (index) → 3 sorgu paralel: SELECT categories + SELECT featuredPlaces + SELECT COUNT places
- `/mekanlar` (places/index) → offset ve placesSql try bloğu öncesine taşındı; SELECT COUNT + SELECT places artık Promise.all ile paralel
- `/yeme-icme/[kategori]` → SELECT COUNT + SELECT places artık Promise.all ile paralel

**Test:**
- Her sayfayı aç → içerik doğru yükleniyor mu ✓
- `/mekanlar?category=restaurant&q=urfa` → filtrelenmiş count + places doğru ✓
- `/yeme-icme/kahvalti` → kategori filtrelenmiş places doğru ✓
- `/profil/bildirimler` → bildirim sayısı sidebar'da ve liste doğru görünüyor ✓
- `/isletme` → 3 bölüm (kategoriler, öne çıkan işletmeler, toplam sayı) doğru ✓

**Bağımlı sorgular (doğru şekilde paralelize edilmedi):**
- `/tarihi-yerler/[slug]` — `site.id` ikinci sorguda kullanılıyor → sequential kalmalı
- `/mahalleler/[ilce]/[mahalle]` — district → neighborhood → places zinciri → sequential kalmalı

---

## Batch #87 — console.error → logger.error (Public Sayfalar) + safeIntParam

### console.error → logger.error Migrasyonu (Public SSR Frontmatter)

HARD RULE #23 gereği ~35 public-facing `.astro` sayfasında SSR frontmatter `console.error` çağrıları `logger.error` ile değiştirildi.

**Test (genel):**
- Herhangi bir sayfanın DB bağlantısı kesildiğinde sunucu loglarında `console.error` yerine structured `logger.error` girişi görünür
- `<script>` tag içindeki (browser-side) `console.error` çağrıları değiştirilmedi — HARD RULE #23 muafiyeti

**Etkilenen sayfalar (kontrol listesi):**
- `/etkinlikler` ve `/etkinlikler/[slug]` → logger.error eklendi
- `/gezilecek-yerler` ve `/gezilecek-yerler/[slug]` → logger.error eklendi
- `/hizmetler` ve `/hizmetler/[kategori]` → logger.error eklendi
- `/ilceler` → logger.error eklendi
- `/isletme/[slug]` → logger.error eklendi
- `/kategori/[slug]` → logger.error eklendi (2 catch)
- `/konaklama` ve `/konaklama/[kategori]` → logger.error eklendi
- `/mahalleler` → logger.error eklendi
- `/mekanlar/[kategori]` → logger.error eklendi (2 catch, variable `error`)
- `/profil/aktivite`, `/profil/favoriler`, `/profil/index`, `/profil/yorumlar` → logger.error eklendi
- `/saglik` ve `/saglik/[kategori]` → logger.error eklendi
- `/tarihi-yerler/[slug]` → logger.error eklendi
- `/ulasim` ve `/ulasim/[kategori]` → logger.error eklendi
- `/vendor/analytics` ve `/vendor/dashboard` → logger.error eklendi
- `/yeme-icme` ve `/yeme-icme/[kategori]` → logger.error eklendi
- `/yemek-tarifleri` → logger.error eklendi (variable `error`)
- `/yorum/[slug]` → logger.error eklendi (2 catch)
- `/harita` → logger.error eklendi (depth-1: `../lib/logging`)
- `/isletme-kayit` → logger.error eklendi (depth-1)
- `/[...seopage]` → logger.error eklendi (depth-1)
- `/ilceler/[ilce]` → logger.error eklendi (depth-3: `../../../lib/logging`, 2 catch)
- `/ilceler/[ilce]/[kategori]` → logger.error eklendi (depth-3, 2 catch)
- `/mahalleler/[ilce]/[mahalle]` → logger.error eklendi (depth-3)
- `/profil/ayarlar` → logger.error eklendi (depth-3)

---

### safeIntParam — HARD RULE #17 (URL Search Param parseInt Yasak)

İki sayfada `parseInt(url.searchParams.get(...))` → `safeIntParam(...)` ile değiştirildi.

**`/yeme-icme/[kategori]`:**
- `?sayfa=abc` → `NaN` yerine varsayılan sayfa 1 ile içerik yüklenir
- `?sayfa=0` → clamp ile sayfa 1 kullanılır
- `?sayfa=5` → 5. sayfa içeriği doğru yüklenir

**`/places`:**
- `?page=abc` → varsayılan sayfa 1 ile içerik yüklenir
- `?page=-1` → clamp ile sayfa 1 kullanılır
- `?page=3` → 3. sayfa içeriği doğru yüklenir

---

## Batch #88 — console.error → logger.error (Grep Tarama Tamamlama) + safeIntParam

### console.error → logger.error (Kaçırılan 4 Sayfa)

Batch #87 sonrası grep taramasında tespit edilen SSR frontmatter `console.error` çağrıları `logger.error` ile değiştirildi.

**Etkilenen sayfalar:**
- `/isletme` (`src/pages/isletme/index.astro`) → `logger.error('isletme index error:', ...)` eklendi
- `/profil/bildirimler` (`src/pages/profil/bildirimler.astro`) → `logger.error('Error loading data:', ...)` eklendi; `<script>` tag içindeki browser-side `console.error` (satır 206-238) MUAF bırakıldı
- `/places` (`src/pages/places/index.astro`) → `logger.error('Error loading places:', ...)` eklendi
- `/saglik/nobetci-eczaneler` → `logger.error('Error loading pharmacies:', ...)` eklendi

**Test:**
- Herhangi bir sayfada DB bağlantısı koparken sunucu loglarında `console.error` yerine yapılandırılmış `logger.error` görünür
- `/profil/bildirimler` sayfasında: bildirim silme/okuma işlemleri çalışmaya devam eder (browser `console.error` değiştirilmedi)

---

### safeIntParam — HARD RULE #17 (2 Ek Fix)

**`/mekanlar/[kategori]`:**
- `Math.max(1, Number.parseInt(Astro.url.searchParams.get('sayfa') || '1', 10) || 1)` → `safeIntParam(..., 1, 1, 1_000_000)`
- `?sayfa=abc` → varsayılan sayfa 1 ile kategori içeriği yüklenir
- `?sayfa=0` → clamp ile sayfa 1 kullanılır

**`/admin/blog/posts`:**
- `parseInt(url.searchParams.get('page') || '1')` → `safeIntParam(..., 1, 1, 1_000_000)`
- `?page=abc` → blog yazıları listesi sayfa 1'den başlar, hata olmaz
- `?page=-5` → clamp ile sayfa 1 kullanılır

---

## Batch #89 — alert() → window.toast (Admin + Public Sayfalar, Toplu Geçiş)

### Kapsam

Tüm kaynak dosyalardaki `alert()` blocking dialog çağrıları `window.toast` non-blocking bildirimlere dönüştürüldü. Toplam ~44 `alert()` çağrısı 18 dosyada değiştirildi.

### Toast Altyapısı

**`src/layouts/AdminLayout.astro`** — Admin sayfalarının ortak layout'ına toast import eklendi:
```html
<script>
  import '../lib/toast';
</script>
```

**`src/pages/admin/notifications.astro`** — Kendi `<html>`/`<body>` yapısı var (AdminLayout kullanmıyor), ayrı dynamic import eklendi:
```html
<script>
  import('../../lib/toast').then(({ toast }) => { window.toast = toast; }).catch(() => {});
</script>
```

### Değiştirilen Dosyalar

**Admin sayfaları (AdminLayout → window.toast otomatik):**
- `src/pages/admin/notifications.astro` — 6 alert() (success/error toasts; `error.message` drop edildi)
- `src/pages/admin/campaigns.astro` — 6 alert() (3 success, 3 error; dynamic messages korundu)
- `src/pages/admin/social-policies.astro` — 1 koşullu alert() → ayrı success/error dallarına bölündü
- `src/pages/admin/content-agents.astro` — 2 alert() (raw `error.message` drop edildi, güvenlik)
- `src/pages/admin/blog/comments.astro` — 6 alert()
- `src/pages/admin/blog/content-bot.astro` — 5 alert() (dynamic success count korundu)
- `src/pages/admin/blog/edit/[id].astro` — 4 alert()
- `src/pages/admin/blog/new.astro` — 2 alert()
- `src/pages/admin/blog/index.astro` — 2 alert()
- `src/pages/admin/feature-flags.astro` — 1 alert()
- `src/pages/admin/export-tokens.astro` — 2 alert()
- `src/pages/admin/vendor-approval.astro` — 2 alert()
- `src/pages/admin/users/index.astro` — 4 alert()
- `src/pages/admin/social-risk.astro` — 1 alert()

**Public sayfalar (Layout.astro zaten window.toast başlatıyor):**
- `src/pages/blog/[slug].astro` — 2 alert() (clipboard copy)
- `src/pages/takipciler.astro` — 2 alert() (follow hata, profil link kopyalama)
- `src/pages/takip-edilenler.astro` — 2 alert() (unfollow success/error)

### Test

- Admin bir işlem yaptığında (blog sil, kampanya gönder, vs.) → sağ üstte renk kodlu toast bildirimi çıkar (artık `alert()` yok)
- Hata durumlarında kırmızı error toast görünür, raw `error.message` gösterilmez
- `/blog/[slug]` sayfasında "Linki Kopyala" butonuna bas → yeşil "Link kopyalandı" toast görünür

---

## Batch #90 — alert() → window.toast (Kalan 6 Çağrı, Sweep Tamamlama)

### Kapsam

Batch #89 sonrası grep taramasında tespit edilen kaçırılan `alert()` çağrıları. Bu batch ile tüm kaynak dosyalarda `alert()` sıfırlandı.

### Değiştirilen Dosyalar

- `src/components/WebhookManager.tsx` — `alert('Webhook ID kopyalandı')` → `window.toast?.success('Webhook ID kopyalandı')`
- `src/pages/admin/blog/add.astro` — 2 alert() (hata + bağlantı hatası) → `window.toast?.error(...)`
- `src/pages/admin/reservations.astro` — `alert('İşlem başarısız oldu.')` → `window.toast?.error('İşlem başarısız oldu.')`
- `src/pages/profil/favoriler.astro` — 2 alert() (işlem başarısız + hata) → `window.toast?.error(...)`
- `src/pages/profile.astro` — `alert('Silme işlemi başarısız')` → `window.toast?.error('Silme işlemi başarısız')`

### Test

- Admin panelinde webhook listesinde "ID'yi Kopyala" butonuna bas → yeşil toast belirir (artık `alert()` yok)
- `/admin/blog/add` sayfasında API hatası olursa → kırmızı error toast görünür
- `/admin/reservations` sayfasında rezervasyon durumu güncellenirken hata olursa → kırmızı toast
- `/profil/favoriler` sayfasında bir favori silinirken hata olursa → kırmızı toast
- `/profile` sayfasında yorum silme başarısız olursa → kırmızı toast

---

## Batch #91 — confirm() → window.showConfirm (Tüm Kaynak Dosyalar)

### window.showConfirm Altyapısı

`window.confirm()` browser'ı tamamen bloke eden (synchronous) bir dialog. `window.showConfirm()` adında async (Promise-based) özel confirm dialog eklendi: kırmızı "Onayla" + "İptal" butonları, backdrop'a tıklayarak veya Escape tuşuyla kapatılabilir, `textContent` kullandığı için XSS-güvenli.

**`src/layouts/AdminLayout.astro`** — `window.showConfirm` + `data-confirm` form interceptor eklendi (`<script is:inline>`):
- `window.showConfirm(message)` → özel inline modal, `Promise<boolean>` döner
- Form `data-confirm="..."` attribute'u varsa submit event'i intercept eder, onay sonrası `HTMLFormElement.prototype.submit.call(form)` ile gönderir (onsubmit listener'ı bypass ederek sonsuz döngü önlenir)

**`src/layouts/Layout.astro`** — Public sayfalar için aynı `window.showConfirm` eklendi (ayrı `<script is:inline>`).

### Değiştirilen Dosyalar — Admin .astro Sayfaları (14 dosya, 16 confirm)

- `src/pages/admin/blog/comments.astro` — `deleteComment`: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/blog/edit/[id].astro` — `deletePost`: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/blog/index.astro` — `deletePost`: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/campaigns.astro` — `sendCampaign`: sync → `async`, `confirm()` → `await window.showConfirm()`
- `src/pages/admin/feature-flags.astro` — click handler: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/notifications.astro` — `deleteDraft`: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/places.astro` — `bulkAction`: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/quotas.astro` — click handler: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/recipes.astro` — `deleteRecipe`: `confirm()` → `await window.showConfirm()`
- `src/pages/admin/users/index.astro` — `bulkAction` + `suspendUser` + `activateUser`: 3 × `confirm()` → `await window.showConfirm()`
- `src/pages/admin/events/index.astro` — form `onsubmit="return confirm(...)"` → `data-confirm="..."` (AdminLayout interceptor yakalar)
- `src/pages/admin/historical-sites/index.astro` — form `onsubmit="return confirm(...)"` → `data-confirm="..."`

### Değiştirilen Dosyalar — Public .astro Sayfaları (3 dosya, 3 confirm)

- `src/pages/profil/bildirimler.astro` — event handler: `confirm()` → `await window.showConfirm()`
- `src/pages/profil/favoriler.astro` — event handler: `confirm()` → `await window.showConfirm()`
- `src/pages/profile.astro` — `deleteReview`: `confirm()` → `await window.showConfirm()`

### Değiştirilen Dosyalar — React Bileşenleri (7 dosya, 7 confirm)

Tüm handler'lar zaten `async` olduğundan `await (window as any).showConfirm?.()` ile değiştirildi.

- `src/components/CollectionDetail.tsx` — `handleRemoveItem`
- `src/components/CollectionsManager.tsx` — `handleDeleteCollection`
- `src/components/FeaturedListingsManager.tsx` — `handleDelete`
- `src/components/MarketingCampaignBuilder.tsx` — `handleDelete`
- `src/components/MessagingInbox.tsx` — `handleDeleteConversation`
- `src/components/PhotoUpload.tsx` — `handleDelete`
- `src/components/WebhookManager.tsx` — `handleDelete`

### Test

- Admin panelinde herhangi bir silme butonuna bas → tarayıcı native dialog yerine sayfada kırmızı "Onayla" / "İptal" butonlu özel modal beliriyor
- "Onayla" → işlem devam eder; "İptal" veya Escape → işlem iptal edilir; backdrop'a tıklama → iptal
- `/admin/events` ve `/admin/historical-sites` silme formlarında submit → aynı özel modal (form `data-confirm` interceptor)
- `/profil/bildirimler` "Tümünü Temizle" → özel modal (artık `confirm()` dialog yok)
- Koleksiyon, kampanya, webhook, fotoğraf silme işlemlerinde özel modal çıkıyor (React bileşenleri)

---

## Batch #92 — prompt() → window.promptInput (Tüm Kaynak Dosyalar)

### window.promptInput Altyapısı

`window.prompt()` browser'ı bloke eden synchronous dialog. `window.promptInput(message, defaultValue?)` adında async (Promise-based) özel input dialog AdminLayout.astro'ya eklendi:
- Mavi "Tamam" + "İptal" butonları, `textContent` ile XSS-güvenli, Escape/backdrop ile kapanır
- Confirm'de `inp.value` (string, boş string dahil), Cancel'da `null` döner
- `defaultValue` varsa input'ta ön dolu gelir (örn. '48')

**`src/layouts/AdminLayout.astro`** — `window.promptInput` `<script is:inline>` bloğuna `window.showConfirm`'den hemen sonra eklendi.

### Değiştirilen Dosyalar (6 dosya, 11 prompt çağrısı)

**Admin .astro sayfaları:**
- `src/pages/admin/blog/edit/[id].astro` — `insertLink` ve `insertImage`: sync → `async`, `prompt()` → `await window.promptInput()`
- `src/pages/admin/blog/new.astro` — aynı pattern (insertLink, insertImage)
- `src/pages/admin/export-tokens.astro` — iptal nedeni: `prompt(...) || ''` → `await window.promptInput(...) ?? ''`
- `src/pages/admin/vendor-approval.astro` — red sebebi: `prompt(...) ?? ''` → `await window.promptInput(...) ?? ''`

**React bileşeni:**
- `src/components/admin/SiteContentManager.tsx` — 3 onClick handler:
  - İlçeye göre SLA bucket ekle (key + hours, 2 sıralı prompt)
  - byTeam SLA bucket ekle (key + hours, 2 sıralı prompt)
  - Tenant bazlı özel ayar (tenantId, 1 prompt)
  - Değişim: sync `onClick={() => {...}}` → `async`, `window.prompt(...)` → `await (window as any).promptInput?.(...)`
  - Sıralı prompt'larda: ilk prompt `null` dönerse erken çıkış yapılır (`if (!key) return`)
  - Hours fallback: `Number(hoursStr ?? '48') || 48` — boş veya iptal için 48 saat

### Test

- Blog edit/new sayfasında toolbar "🔗 Link" butonuna bas → tarayıcı native dialog yerine özel input modal; URL gir + Tamam → markdown link eklendi
- Blog edit/new sayfasında "🖼️ Görsel" butonu → aynı özel modal; iptal → hiçbir şey eklenmez
- `/admin/export-tokens` sayfasında token iptal et → "İptal nedeni" için özel input modal belirir
- `/admin/vendor-approval` sayfasında "Reddet" butonuna bas → "Red sebebi" için özel modal
- `/admin/site-content` SLA yönetiminde "İlçeye Göre + Ekle" → İlçe anahtarı modalı; girip Tamam → hedef saat modalı; ikincide İptal → işlem durur
- `PWARegister.astro`'daki `deferredPrompt.prompt()` — PWA install API, native dialog değil, dokunulmadı

---

## Batch #94 — console.error → logger.error (Kalan 5 Server Island Bileşeni)

### Kapsam

Batch #93 sonrası grep taramasında tespit edilen SSR frontmatter `console.error` çağrıları. Bu batch ile tüm `.astro` SSR frontmatter bağlamlarında `console.error` sıfırlandı. Kalan tüm `console.error` çağrıları `<script>` bloklarındadır (browser-side, HARD RULE #23 muafı).

### Değiştirilen Dosyalar (5 dosya, 5 console.error)

Tüm dosyalar Server Island (`server:defer`) bileşeni — SSR frontmatter içinde çalışır:

- `src/components/health/NearbyPharmacies.astro` — `console.error('NearbyPharmacies query failed:', e)` → `logger.error(...)`
- `src/components/places/DistrictCategoryFilter.astro` — `console.error('DistrictCategoryFilter query failed:', e)` → `logger.error(...)`
- `src/components/places/RelatedPlaces.astro` — `console.error('RelatedPlaces query failed:', e)` → `logger.error(...)`
- `src/components/profile/ProfileStats.astro` — `console.error('ProfileStats query failed:', e)` → `logger.error(...)`
- `src/components/recipes/RelatedRecipes.astro` — `console.error('RelatedRecipes query failed:', e)` → `logger.error(...)`

### Muaf Bırakılanlar (browser-side `<script>` blokları)

- `ErrorBoundary.astro` — `window.error` + `unhandledrejection` event handler (Sentry fallback)
- `Map.astro` — clipboard copy failure handler
- `NotificationCenter.astro` — SSE EventSource + notification fetch handler
- `PushNotifications.astro` — Web Push API subscription failure
- `PWARegister.astro` — Service Worker registration failure
- Admin sayfaları (`content-bot`, `index`, `monitoring`, `notifications`, `revenue`, `tickets`) — `<script>` tag içi fetch handler'ları
- `profil/bildirimler.astro` — `<script>` tag içi (Batch #88'de muaf olarak işaretlenmişti)

### Test

- Mahalle/ilçe sayfasında `<NearbyPharmacies server:defer>` DB hatası → yapılandırılmış `logger.error` kaydı oluşur, widget boş render edilir
- `/isletme/[slug]` sayfasında `<RelatedPlaces server:defer>` DB hatası → logger kaydı, "Benzer Mekanlar" bölümü gizlenir
- `/profil` sayfasında `<ProfileStats server:defer>` DB hatası → logger kaydı, istatistik kartları 0 gösterir
- Kalan `console.error` çağrıları browser DevTools'da görünmeye devam eder (muaf) — sunucu loglarına çıkmaz

---

## Batch #93 — console.error → logger.error (SSR Server Islands + Middleware + API Routes)

### Kapsam

SSR sunucu tarafında çalışan bileşen ve endpoint dosyalarındaki `console.error` çağrıları HARD RULE #23 gereği `logger.error` ile değiştirildi. Tüm dosyalara `import { logger } from '...lib/logging'` eklendi.

### Değiştirilen Dosyalar (8 dosya, 8 console.error)

**Server Island bileşenleri (SSR frontmatter — `server:defer` ile çalışır):**
- `src/components/admin/DashboardStats.astro` — `console.error('DashboardStats query failed:', e)` → `logger.error(...)`
- `src/components/admin/IntegrationsHealthSummary.astro` — `console.error('IntegrationsHealthSummary lookup failed:', e)` → `logger.error(...)`
- `src/components/blog/RelatedPosts.astro` — `console.error('RelatedPosts query failed:', e)` → `logger.error(...)`
- `src/components/events/RelatedEvents.astro` — `console.error('RelatedEvents query failed:', e)` → `logger.error(...)`
- `src/components/food/FeaturedFoods.astro` — `console.error('FeaturedFoods query failed:', e)` → `logger.error(...)`

**API endpoint'leri ve middleware:**
- `src/pages/blog/sitemap.xml.ts` — `console.error('Sitemap oluşturulamadı:', err)` → `logger.error(...)`
- `src/pages/og/[slug].png.ts` — `console.error('OG gorsel olusturma hatasi:', error)` → `logger.error(...)`
- `src/middleware.ts` — `console.error('Auth middleware error:', err)` → `logger.error(...)`

### Error Wrapping Pattern

Her dosyada `e instanceof Error ? e : new Error(String(e))` sarmalama kullanıldı — `logger.error` ikinci parametrede `Error` nesnesi beklediğinden non-Error değerleri (string, number) güvenle wrap edilir.

### Test

- DB bağlantısı kesildiğinde `/admin` dashboard → sunucu loglarında `console.error` yerine structured `logger.error` girişi görünür
- `server:defer` island'ları hata durumunda sessizce degrade olur (boş render), log'da structured kayıt oluşur
- `/blog/sitemap.xml` DB hatası durumunda boş `<urlset>` döner (kullanıcıya hata göstermez), log'da kayıt oluşur
- `/og/[slug].png` hata durumunda varsayılan SVG döner (500 status), log'da kayıt oluşur
- Auth middleware token doğrulama hatasında cookie silinir ve kullanıcı yönlendirilir, log'da `logger.error` kaydı oluşur

---

## Batch #103 — "Harran Scripts" Tema Geçişi Phase 2 (Content Pages)

### Kapsam

8 user-facing içerik sayfasında "Harran Scripts" tema geçişi tamamlandı. Tüm red/orange gradient hero bölümleri obsidiyen karanlık tema ile, gray/slate renk sistemi ise bakır-parchment palet ile değiştirildi.

### Değiştirilen Dosyalar

- `src/pages/iletisim.astro` — gray/red form → parchment kart + bakır border + urfa-600 submit butonu; isot-* form hataları; obsidiyen işletme CTA sidebar
- `src/pages/mekanlar/index.astro` — `from-red-700 to-red-900` hero → obsidiyen `#0D0A08`; red info box → bakır tint; kategori kartları rounded-sm + urfa hover
- `src/pages/mekanlar/[kategori].astro` — `bg-slate-50` + cold blue radial gradient hero → obsidiyen; slate-* sistemi → obsidiyen/parchment/bakır; pagination urfa-*; sidebar FAQ rounded-sm
- `src/pages/hakkimizda.astro` — `from-red-600 to-orange-500` hero → obsidiyen; stat değerleri `text-urfa-600`; özellik kartları border+rounded-sm; CTA section `bg-[#0D0A08]`
- `src/pages/isletme-kayit.astro` — form inputs `rounded-xl + focus:ring-red-500` → `rounded-sm + focus:ring-urfa-400`; submit `bg-red-600 rounded-xl` → `bg-urfa-600 rounded-sm`; isot-* form hataları
- `src/pages/sss.astro` — `from-red-700 to-orange-700` hero + `bg-slate-50` → obsidiyen hero + `bg-[#FDFAF3]`; FAQ kartları rounded-sm + bakır border; `text-slate-950/700` → `#1A1008/#6B5540`
- `src/pages/sifremi-unuttum.astro` — auth sayfası pattern: obsidiyen arka plan + parchment kart + Cormorant Garamond logo; hata isot-*; submit urfa-600
- `src/pages/sifre-sifirla.astro` — `dark:bg-gray-900` + `dark:bg-gray-800` + `btn-primary/label/input` utility sınıfları → tam obsidiyen auth pattern; dark mode referansları temizlendi

### Renk Dönüşüm Özeti

- Hero bölümleri: `bg-gradient-to-br from-red-*/orange-*` → `bg-[#0D0A08] border-b border-[rgba(200,160,100,0.14)]`
- Sayfa arka planı: `bg-gray-50 / bg-slate-50` → `bg-[#FDFAF3]`
- Form hataları: `text-red-600 / border-red-200 / bg-red-50` → `text-isot-600 / border-isot-200 / bg-isot-50`
- Aksiyon butonlar: `bg-red-600 rounded-xl/lg/2xl hover:bg-red-700` → `bg-urfa-600 rounded-sm hover:bg-urfa-700`
- Başlıklar: `text-gray-900 / text-slate-950` → `text-[#1A1008]`
- Açıklamalar: `text-gray-600 / text-slate-700` → `text-[#9A8470] veya #6B5540`
- Kartlar: `rounded-xl/2xl/3xl border-gray-100/slate-200 shadow-lg` → `rounded-sm border-[rgba(200,160,100,0.18)] shadow-sm`

### Test

- `/iletisim` form submit → parchment kart, bakır border, isot-* hata mesajları, urfa-600 submit butonu görünür
- `/mekanlar` → obsidiyen hero; kategori kartları bakır hover border
- `/mekanlar/kebapcilar` → obsidiyen hero panel; kategori özeti kartları `#1A1008` arka plan; pagination rounded-sm
- `/hakkimizda` → obsidiyen hero + CTA; stat değerleri urfa-600; özellik kartları bakır border
- `/isletme-kayit` form → rounded-sm input, urfa-600 submit, isot-600 hata mesajları
- `/sss` → obsidiyen hero; parchment arka plan; FAQ kartları bakır border
- `/sifremi-unuttum` ve `/sifre-sifirla` → auth layout (obsidiyen arka plan + parchment kart + Cormorant logo)
