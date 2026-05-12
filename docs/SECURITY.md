# Security HARD RULES — 53 Aktif Kural

Bu dosya CLAUDE.md'den ayrılmıştır. 2026-04-25 audit'inde 27 prod bug'dan çıkarılan kalıcı kurallar + 43 static lock test.

**Hızlı erişim**: `src/lib/__tests__/security-*.test.ts` 43 lock test yasak pattern'leri CI'da yakalar.

## SECURITY HARD RULES (Asla İhlal Etme)

Bu bölüm 2026-04-25 audit'inde bulunan 27 prod bug'dan çıkarılan kalıcı kurallardır. Her yeni kod review'da bu pattern'leri ihlal eden değişiklikler reddedilmelidir.

**53 active rule** (numerik sıra: #1-#54, #24 dropped — raw SQL `${var}` interpolation false positive yüksek olduğu için drop edildi, mevcut SQL injection lock'ları yeterli koruma sağlıyor). #15 meta-rule (Static Regression Locks summary) — diğer rule'ların lock test mapping'ini içerir. **43 static lock test** (`security-*.test.ts`) tüm codebase'i tarar, yeni kod yasak pattern'leri içerirse CI fail.

**Yeni HARD RULE eklerken**: numerik sıra korunur (yeni rule sondaki numara + 1), CLAUDE.md "Static Regression Locks" listesi (#15) güncellenir, lock test (`security-no-X.test.ts`) yazılır. Lock test name pattern: `security-no-<antipattern>.test.ts` veya `security-<area>-<aspect>.test.ts`.

**Drop policy**: Bir HARD RULE drop edildiğinde (false positive çok yüksek, value/effort dengesizliği) numerik kalır (history korunur), açıklayıcı not eklenir. Yeni rule eklenirken dropped numara reuse edilmez.

### 1. Refactor Return Type Regression
- Bir fonksiyonun return type'ı değiştirilirse (ör. `Promise<boolean>` → `Promise<{success, error?}>`) **tüm callerlar elle tarayıp güncelle**. `strict: true` olsa da implicit any bağlamında bazı runtime hatalar grep ile yakalanmaz; `if (!sent)` gibi always-false bug'lar için callerları taramak zorunlu.
- Lazım: `grep "= await fnName("` ile tüm callerları bul, dönüş tipini elle doğrula.

### 2. File Upload — XSS via Filename Extension
- **ASLA `file.name.split('.').pop()`** ile extension alma. Attacker `image/jpeg` MIME + `evil.html` adıyla yükleyip stored XSS yapar.
- Pattern: MIME → ext mapping table (`{'image/jpeg':'jpg', ...}`)
- Ek: `validateImageSignature()` magic bytes check (`src/lib/file/file-storage.ts`) zorunlu

### 3. File Upload — Path Traversal via Path Component
- `formData.get('placeId')` gibi user-input path component oluşturuyorsa **regex validation zorunlu**: `/^[a-zA-Z0-9_-]+$/`. Auth zaten reddetse de defense-in-depth.
- DB-supplied path'lerden `unlink()` öncesi `path.resolve()` + `startsWith(uploadsRoot + sep)` containment check.

### 4. Login Timing Oracle (Email Enumeration)
- Login flow'unda user-not-found case'inde **mutlaka** `bcrypt.compare(password, DUMMY_BCRYPT_HASH)` çağır. Aksi halde response time'dan email enumeration yapılır.
- `auth.ts:DUMMY_BCRYPT_HASH` ve `auth/auth-flows.ts:DUMMY_BCRYPT_HASH` constant'larını kullan.

### 5. Password Reset — Response Symmetry
- "If exists, send email" pattern'inde user-not-found ve email-fail **identique response** dönmeli. Email send hatasını `logger.warn` ile log'la, **asla `throw`**.
- Pattern: `password-reset.ts:requestPasswordReset` (silent fail).

### 6. JWT Signature — Constant-Time Compare
- JWT signature comparison **mutlaka** `crypto.timingSafeEqual()` ile, asla `!==` ile.
- Length pre-check zorunlu (timingSafeEqual farklı uzunluk throw eder).
- Pattern: `auth.ts:decodeToken`.

### 7. Stripe Webhook — Idempotency + Retry Semantics
- Her event handler **idempotent** olmalı:
  - `checkout.session.completed` → `stripe_subscription_id` duplicate check, varsa skip
  - `invoice.paid` → `stripe_invoice_id` duplicate check (zaten var)
  - `customer.subscription.deleted` → `status === 'cancelled'` early return
- Outer POST **iki ayrı try-catch**:
  - Signature verification fail → 4xx (Stripe asla retry etmez)
  - Handler fail → **5xx** (Stripe exponential backoff retry, 3 gün)
- Handler içinde catch'ten sonra **`throw error`** zorunlu — silent swallow yapma yoksa Stripe retry tetiklenmez.

### 8. Sensitive Data Logging
- **Asla** `logger.error('...', err, { payload })` gibi full payload log'lama. Reset token URL, verification code, message body, password gibi sensitive data sızar.
- Sadece metadata log'la: `{ type, recipient, postId }`. PII içermeyen ID'ler.

### 9. Error Response Sanitization
- Production'da `error.message`'ı doğrudan client'a geri verme — DB schema (`duplicate key violates "users_email_key"`), file path, internal IP sızdırır.
- **Use `safeErrorDetail(error, fallback)`** from `src/lib/api.ts` (production = fallback, dev = error.message).
- İstisna: kasıtlı user-facing throw'lar (login "E-posta veya şifre hatalı") helper kullanmadan da güvenli — sadece library/internal endpoint'lerde zorunlu.

### 10. Internal/Cron Endpoint Auth
- `/api/metrics`, `/api/emails/process`, `/api/webhooks/trigger` gibi internal endpoint'lerde **`verifyInternalToken(request)`** kullan. Asla manuel `if (!authHeader)` yazma — token doğrulamayan kontroller "Bearer xyz" gibi herhangi string'i geçirir.
- `INTERNAL_API_TOKEN` env yoksa endpoint 401 döner (security-by-default, NOT bypass).

### 11. IDOR — Vendor-Only Check Antipattern
- Yetki kontrolü **asla** `if (role === 'vendor')` only şeklinde yazılmaz. user/moderator/diğer rolleri serbest bırakır.
- 3-yol switch zorunlu (yukarıda detaylı). `else { return 403 }` clause yoksa code review'da reddet.

### 12. Security Test Coverage Zorunlu
- Her security fix **regression test** ile gelir. Aksi halde 6 ay sonra refactor sırasında re-introduce edilir.
- Test pattern'leri (`src/lib/__tests__/security-*.test.ts` örnekleri):
  - `security-vendor-idor.test.ts` — 3-yol switch enforcement (admin OK, vendor own OK, user 403, moderator 403, vendor other 403)
  - `security-file-upload-xss.test.ts` — MIME → ext mapping doğrula, path traversal regex doğrula
  - `security-login-timing.test.ts` — `bcrypt.compare` user-not-found path'inde de çağrılıyor mu, error message identique mi
  - `security-stripe-webhook-idempotency.test.ts` — duplicate event skip, signature fail = 4xx, handler fail = 5xx
  - `security-jwt-timing-safe.test.ts` — tampered/short/empty/wrong-secret signature reject
  - `security-middleware-body-size.test.ts` — DoS prevention (1MB regular, 15MB upload)
- Test mock pattern: `vi.mock('../../lib/postgres')` + `vi.mock('../../lib/auth/middleware')` ile DB ve auth dependency'lerini izole et.
- Test naming: `security-<area>-<issue>.test.ts` — grep ile tüm güvenlik test'leri tek seferde bulunur.

### 13. Body Size Cap (DoS Prevention)
- `src/middleware.ts` `/api/*` POST/PUT/PATCH için Content-Length header'ı kontrol eder. Aşan istekler 413 döner.
- Limit: regular API 1MB, `/api/upload`, `/api/photos/upload`, `/api/files/upload` 15MB.
- Yeni upload endpoint pattern'i için `isUpload` check'ini güncelle (path prefix ekle).
- Reverse proxy (Apache/Nginx) seviyesinde de cap olmalı (defense-in-depth).

### 14. DB Race Conditions — Atomic INSERT ON CONFLICT
- Check-then-insert pattern (SELECT → if not exists → INSERT) **race-prone**: concurrent request iki INSERT yapar.
- DB-level çözüm: UNIQUE constraint + `INSERT ... ON CONFLICT DO NOTHING RETURNING id`.
- `RETURNING` boş ise zaten vardı → side-effect (point award, email, vs.) **çalıştırma**.
- Pattern: `gamification.ts:grantBadgeToUser`. Tüm award/grant fonksiyonları bu pattern'i izlemeli.
- UNIQUE constraint olmayan tablolar için migration ekle, sonra atomic INSERT'e geç.

### 16. ReDoS — Dynamic RegExp Escape Zorunlu
- User input'tan gelen string `new RegExp()`'e geçmeden önce **mutlaka meta-char escape** yapılmalı. Aksi halde catastrophic backtracking ile DoS.
- Pattern: `const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); new RegExp(escaped, 'g');`
- Test pattern: `security-redos-regex-escape.test.ts` static lock codebase tarar, `new RegExp(VAR)` etrafında escape pattern arar.
- Hardcoded literal kullanımlar `ALLOWED_FILES` Set'inde explicit (cache, sanitize, voice-search).

### 17. Numeric Query Param — NaN Guard via `safeIntParam` / `safeFloatParam`
- **ASLA** `parseInt(url.searchParams.get('X') || 'N')` veya `Math.max/Math.min(parseInt(...))` ile sayısal query param parse etme. `parseInt('abc') === NaN`, `Math.max(1, NaN) === NaN`, NaN PostgreSQL bind value olarak undefined behavior verir (silent crash veya malformed SQL).
- **Use `safeIntParam(input, default, min, max)` from `src/lib/api.ts`** — `Number.isFinite()` guard + range clamp; `null`/`undefined`/`''`/`Infinity`/`NaN` → default.
- **Float params**: `safeFloatParam(input, default, min, max)` — `parseFloat` versiyonu; lat/lon/rating/distance gibi ondalıklı URL param'ları için kullan.
- Pattern:
  ```ts
  // ❌ YASAK
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20'));
  const lat   = parseFloat(url.searchParams.get('lat') || '0');

  // ✅ DOĞRU
  const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 50);
  const page  = safeIntParam(url.searchParams.get('page'), 1, 1, 1_000_000);
  const lat   = safeFloatParam(url.searchParams.get('lat'), 0, -90, 90);
  ```
- **Body numeric validation**: JSON body'den gelen sayısal alanlar da aynı guard almalı. `safeIntParam` body field'larına da uygulanabilir, ya da `parseInt(String(x), 10) + Number.isFinite()` inline guard kullan:
  ```ts
  // ❌ YASAK
  const amount = body.amount; // NaN/string DB'ye gidebilir
  // ✅ DOĞRU
  const amount = parseInt(String(body.amount), 10);
  if (!Number.isFinite(amount) || amount <= 0) return apiError(422, 'Geçersiz miktar');
  ```
- Enum/allowlist body alanları: `const VALID_X = new Set(['a', 'b']); if (!VALID_X.has(body.x)) return 422;`
- Static lock (`security-no-bare-parseint-searchparams.test.ts`) tüm `src/pages/api/` taranır; yeni vulnerable pattern eklenirse CI kırılır.
- Sweep history: 96 dosyada 127 lokasyon (2026-04-25 codemod ile migrate edildi).

### 18. Redis Namespace — Helper API zorunlu
- **ASLA** raw key ile `getRedisClient()` veya `createClient()` kullanma. Shared Redis instance'ta `'feature_flags'` gibi çıplak key başka projeyle collision yapar (data leak / corruption).
- **Use `redis.{get,set,del,...}` helper** (`src/lib/cache/cache.ts`) — internally `prefixKey()` uygular. Veya direct client gerekirse `prefixKey('myKey')` ile sarmala.
- Pub/sub channel'lar da aynı kurala tabi: `prefixKey('social:events:v1')` zorunlu.
- Pattern:
  ```ts
  // ❌ YASAK
  const r = await getRedisClient();
  await r.get('feature_flags');

  // ✅ DOĞRU (helper)
  import { redis } from '@/lib/cache/cache';
  await redis.get('feature_flags');  // helper otomatik prefixKey()

  // ✅ DOĞRU (raw client + manual prefix)
  import { getRedisClient, prefixKey } from '@/lib/cache/cache';
  const r = await getRedisClient();
  await r.expire(prefixKey(`session:${token}`), ttl);
  ```
- Static lock (`security-redis-namespace-required.test.ts`): `getRedisClient()`/`createClient()` kullanan her dosya `prefixKey(`/`KEY_PREFIX`/`'sanliurfa:'` literal de içermeli; aksi halde CI fail.

### 19. React Island'larda `process.env` yasak
- **ASLA** `.tsx`/`.jsx` (React component) dosyalarında `process.env.X` kullanma — browser'da `undefined` döner, silent display bug yaratır (boş GA ID, broken feature flag, vs.).
- **Use `import.meta.env.PUBLIC_*`** (Astro recommended). `PUBLIC_` prefix olmayan env'ler sadece server-side görünür; browser'a expose etmek için `astro.config.mjs` `env.schema`'da `context: 'client', access: 'public'` belirt.
- Exception: `process.env.NODE_ENV` Vite/Astro tarafından build-time string replace edilir → her tarafta çalışır.
- Pattern:
  ```tsx
  // ❌ YASAK (browser'da undefined)
  const ga = process.env.GA_TRACKING_ID;

  // ✅ DOĞRU
  const ga = import.meta.env.PUBLIC_GA_MEASUREMENT_ID;
  ```
- Static lock (`security-no-process-env-in-react.test.ts`): tüm `.tsx`/`.jsx` dosyalarını tarar, `process.env.X` kullanımı yakalar (NODE_ENV exception).
- `.astro` dosyalarında frontmatter `process.env` legitimate (server-side render).

### 20. Eski Theme Palette Hex'leri Yasak
- **ASLA** önceki Şanlıurfa palette hex'lerini codebase'de kullanma. 2026-04-26 modern tema migration sonrası bu hex'ler yasak — yeni palette `urfa-{50-950}` + `isot-{50-950}` Tailwind utility / CSS variable kullan.
- Yasak hex listesi: `#fdf8f6`, `#f2e8e5`, `#eaddd7`, `#e0cec7`, `#d2bab0`, `#a18072`, `#8a6a5c`, `#735448`, `#5c4239`, `#45322b` (eski urfa palette).
- Pattern:
  ```html
  <!-- ❌ YASAK (eski palette hex) -->
  <meta name="theme-color" content="#a18072" />
  <div style="background: #8a6a5c">

  <!-- ✅ DOĞRU (yeni palette) -->
  <meta name="theme-color" content="#be7239" /> <!-- urfa-500 yeni -->
  <div class="bg-urfa-600">                     <!-- Tailwind utility -->
  <div style="background: var(--color-urfa-500)"> <!-- CSS variable -->
  ```
- Static lock (`security-no-old-palette-hex.test.ts`) tüm `.astro`/`.css`/`.tsx`/`.ts`/`.mdx`/`.html` dosyalarını tarar; eski hex bulursa CI fail.
- İstisna: `loading.astro` standalone HTML (Layout import etmez, global.css yok), bu yüzden hex inline'da YENİ palette hex'leri kullanılır (`#be7239`, `#e8caa9`, `#582f23`, `#844528`).

### 22. Hardcoded `localhost`/`127.0.0.1` URL Yasak
- **ASLA** production code'da `http://localhost:N`, `https://localhost:N`, `127.0.0.1` URL hardcoded yazma. Deploy environment'ta yanlış host'a bağlanır.
- **Use env veya helper**: `process.env.DATABASE_URL`, `import.meta.env.REDIS_URL`, `getPublicAppUrl()`.
- Pattern:
  ```ts
  // ❌ YASAK
  await fetch('http://localhost:3000/api');
  const dbUrl = 'postgresql://127.0.0.1/db';

  // ✅ DOĞRU (env)
  await fetch(process.env.API_URL);
  const dbUrl = process.env.DATABASE_URL;

  // ✅ DOĞRU (env || dev fallback — `||` pattern lock'ta whitelist)
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  ```
- Static lock (`security-no-hardcoded-localhost.test.ts`): 8 file whitelist (cache.ts, postgres.ts, middleware.ts, deployment.ts, env.ts, openapi.json.ts, security __tests, event-stream).

### 23. `console.log/info/debug` Production Yasak
- **ASLA** production code'da `console.log`, `console.info`, `console.debug` kullanma. Log seviyesi yok, structured field eklenemez, log aggregation görmez.
- **Use `logger` helper** (`src/lib/logging`): `logger.info`, `logger.warn`, `logger.error`, `logger.debug` — context object ile.
- `console.warn` / `console.error` exception handler last-resort olarak OK.
- Pattern:
  ```ts
  // ❌ YASAK
  console.log('Cache hit', key);
  console.info('starting...');

  // ✅ DOĞRU
  import { logger } from '@/lib/logging';
  logger.info('Cache hit', { key });
  ```
- Static lock (`security-no-console-log-prod.test.ts`): 11 file whitelist (logger/logging implementations, dev tools, lifecycle log'ları) + folder whitelist (`src/migrations/*`, `src/lib/security/__tests/*`).

### 21. Inline SVG Yasak — astro-icon (Iconify) zorunlu
- **YENİ** komponentlerde `<svg viewBox="0 0 24 24">...</svg>` inline kullanma. astro-icon (`<Icon name="lucide:NAME" />`) zorunlu.
- Migration MILESTONE 2026-04-26: 51 → **5 dosya** (46 dosya astro-icon'a geçirildi, ~200+ SVG migrate edildi). Kalan 5 entry kalıcı istisna: 4 client-side template literal (ErrorBoundary.astro, admin/blog/index.astro, Map.astro, toast.ts) + 1 Google OAuth brand mark (giris.astro). Floor state ulaşıldı — yeni inline SVG eklenmesi CI'da yakalanır.
- Pattern:
  ```astro
  <!-- ❌ YASAK (yeni dosyada) -->
  <svg viewBox="0 0 24 24"><path d="..." /></svg>

  <!-- ✅ DOĞRU -->
  <Icon name="lucide:bell" class="w-5 h-5" />
  <Icon name="heroicons:home" />
  <!-- legacy backward-compat shim -->
  <Icon name="bell" />  <!-- → lucide:bell otomatik resolve -->
  ```
- Static lock (`security-no-new-inline-svg.test.ts`): tüm `.astro`/`.tsx`/`.jsx`/`.mdx` dosyalarını tarar; ALLOWED_FILES (51 legacy dosya) dışı yeni inline SVG kullanımı CI fail.
- Migration sırasında: bir dosya astro-icon'a geçirildiyse `ALLOWED_FILES` Set'inden çıkar (test console'a "removable" warning verir).
- React component'lerde (`.tsx`) `<Icon>` (Astro component) doğrudan kullanılamaz — alternative: `lucide-react` paket import.

### 33. SSRF — Unvalidated Fetch URL Yasak (Internal Network Defense)
- **ASLA** DB row'undan veya user input'tan gelen URL'i `validateExternalUrl()` ile validate etmeden `fetch()` çağrısına geçirme. Aksi halde SSRF: attacker webhook URL'ine `http://169.254.169.254/latest/meta-data/iam/security-credentials` (AWS metadata), `http://localhost:5432` (internal Postgres), `http://10.0.0.1/admin` (internal LAN) yazar → kullanıcı verisi çalınır veya internal services hacklenir.
- **Use `validateExternalUrl(url)` helper** (`src/lib/security/safe-url.ts`):
  - Reddeder: file://, ftp://, javascript:, data: protocols, URL credentials (`http://user:pass@host`), blocked ports (5432/6379/22/3306/27017 etc), loopback (`localhost`, `127.0.0.1`, `[::1]`), link-local (`169.254.0.0/16`), private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), IPv6 ULA (`fc00::/7`, `fe80::/10`), multicast/reserved ranges
  - Kabul eder: public hostname + http/https, accepts standard 80/443 + uncommon dev ports
- **Defense-in-depth iki yerde**: (1) registration time (entry point — validate before INSERT), (2) fetch time (DB row may have predated validation, admin bypass risk).
- Pattern:
  ```ts
  // ❌ YASAK (registration)
  const webhook = await insert('webhooks', { url, ... });

  // ✅ DOĞRU (registration)
  const check = validateExternalUrl(url);
  if (!check.ok) return apiError(VALIDATION_ERROR, 'unsafe URL');
  const webhook = await insert('webhooks', { url, ... });

  // ❌ YASAK (fetch)
  const response = await fetch(webhook.url, { method: 'POST', body: ... });

  // ✅ DOĞRU (fetch)
  const check = validateExternalUrl(webhook.url);
  if (!check.ok) { skip-or-fail; }
  const response = await fetch(webhook.url, ...);
  ```
- Static lock (`security-no-unvalidated-fetch-url.test.ts`): tüm `src/` taranır; `fetch(webhook.url|event.url|job.url)` çağrıları aynı dosyada `validateExternalUrl()` import etmeli; aksi halde CI fail. 1 file whitelist (`city-content-agents.ts` — hardcoded RSS source allowlist, admin curated).
- Helper unit tests (`safe-url.test.ts`): 46 test — safe public URLs, invalid input, forbidden protocols, URL credentials, blocked ports, loopback variants, private IPv4 ranges (RFC 1918, CGN, link-local, multicast, reserved), IPv6 private (ULA, link-local, multicast), edge cases (uppercase hostname, mixed case).
- Defense-in-depth: 4 fetch site protected (`webhooks/trigger.ts`, `webhook/webhook-queue.ts`, `webhook/webhooks.ts`, `webhooks/index.ts`); registration entry (`pages/api/webhooks/index.ts:POST`) protected. **Real bug fixed**: any authenticated user could SSRF via webhook URL (now blocked at both layers).
- DNS rebinding hardening (resolve hostname → IP → re-validate IP at fetch with custom HTTP agent) deferred — daha büyük refactor, şu anki hostname-only validation production-grade defense (admin-curated webhook URL'leri için yeterli).

### 35. JWT Logout Invalidation — Redis Session Her Zaman Kontrol Edilmeli
- **ASLA** `REQUIRE_REDIS_SESSION=false` (eski davranış) ile JWT-only validation yapma. Logout token'ı geçersiz kılmaz: çalınan JWT 24 saat geçerli kalır.
- **`verifyToken` her zaman Redis session kontrol eder** (`src/lib/auth.ts:verifyTokenWithSession`). Fail-open pattern:
  - Redis up + session **found** → izin ver ✅
  - Redis up + session **not-found** (kullanıcı logout etmiş) → `null` döner ✅
  - Redis **unavailable** → JWT-only fallback (fail-open, service down olmasın) — çalınan token sadece Redis outage sırasında çalışabilir (kabul edilebilir risk) ✅
- **`getSession` ayrımı**: `{ status: 'found' | 'not-found' | 'unavailable' }` → `not-found` ile `unavailable` farklı davranış tetikler.
- Pattern:
  ```typescript
  // ❌ YASAK (eski)
  if (REQUIRE_REDIS_SESSION) { // Env opt-in, default false → JWT-only
    const session = await getSession(token);
    if (!session) return null; // Fail-closed
  }

  // ✅ DOĞRU (yeni)
  const session = await getSession(token);
  if (session.status === 'not-found') return null; // Explicitly logged out → reject
  if (session.status === 'unavailable') logger.warn('Redis down, fail-open'); // Degrade gracefully
  ```
- `signOut()` → `deleteSession()` → Redis'ten session silinir → tüm sonraki istekler `not-found` döner → 401.
- **Real bug fixed (2026-04-26)**: `REQUIRE_REDIS_SESSION` varsayılan `false` olduğundan logout hiç Redis'i kontrol etmiyordu → stolen token 24h geçerliydi.

### 36. Shell `exec()` Yasak — `execFileNoThrow()` Zorunlu (Command Injection Defense)
- **ASLA** `child_process` modülünden `exec` fonksiyonunu import etme. `exec` bir shell üretir — DB'den gelen ya da user-supplied argümanlar shell metacharacter içeriyorsa (`;`, `&&`, `|`, backtick, `$()`) komut injection'a dönüşür.
- **Use `execFileNoThrow(command, args[])` from `src/lib/exec-file.ts`** — argümanlar dizi olarak OS'e iletilir, shell yorumlanmaz; non-zero exit `throw` yerine `{ stdout, stderr, code }` döner.
- `execFile()` / `execFileSync()` da kabul edilir ama error handling için `execFileNoThrow()` tercih edilir.
- Pattern:
  ```ts
  // ❌ YASAK — shell spawns; DB-sourced path metacharacter'ları interpret edilir
  import { exec } from 'child_process'; // ← import bile yasak

  // ✅ DOĞRU — no shell, args as array
  import { execFileNoThrow } from '@/lib/exec-file';
  const result = await execFileNoThrow('clamscan', ['--no-summary', fullPath]);
  if (result.code === 1) { /* virus found */ }
  ```
- HARD RULE #3 ile birlikte uygulanır: `execFileNoThrow` shell injection'ı engeller ama path traversal'ı engellemez.
- Static lock (`security-no-exec-shell-injection.test.ts`): tüm `src/**/*.ts` taranır; `child_process`'ten bare `exec` import bulunan dosya CI fail. 1 whitelist: `src/lib/exec-file.ts` (safe wrapper).
- **Real bug fixed (2026-04-27)**: `file-management.ts:scanFileVirus` — `file_key` (DB'den) shell komut string'ine eklenerek `exec()` ile çalıştırılıyordu; `execFileNoThrow()` + HARD RULE #3 containment ile kapatıldı.

### 38. `Math.random()` Güvenlik Bağlamında Yasak — `crypto.randomBytes()` Zorunlu
- **ASLA** güvenlik-kritik dosyalarda token, ID, filename, nonce üretimi için `Math.random()` kullanma. V8 engine `Math.random()` seed'i tahmin edilebilir (~53-bit entropi), sequence predictable — attacker observed değerlerden gelecek değerleri türetebilir → token enumeration, brute-force.
- **Use `crypto.randomBytes(n)` from `node:crypto`** — OS entropy kaynaklı, kriptografik güçte rastlantısallık.
- Güvenlik-kritik kapsam: `src/lib/auth/`, `src/lib/security/`, `src/lib/file/`, `src/middleware.ts`, `src/lib/api.ts`, `src/lib/audit.ts`.
- Serbest: analytics, AI simulation, rendering jitter, non-security UI randomness.
- Pattern:
  ```ts
  // ❌ YASAK (auth/file/security dosyalarında)
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${name}`;

  // ✅ DOĞRU
  import { randomBytes } from 'node:crypto';
  const requestId = `req-${Date.now()}-${randomBytes(6).toString('hex')}`;
  const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}-${name}`;
  ```
- Static lock (`security-no-math-random-security.test.ts`): güvenlik-kritik path'lerdeki tüm `.ts` dosyaları taranır; `Math.random` bulunursa CI fail. Analytics/AI/simulation dışarıda.
- **Real bugs fixed (2026-04-27)**: `middleware.ts` request ID, `api.ts` request ID, `security-headers.ts` CSRF token, `file-storage.ts` dosya adı, `audit.ts` audit ID — hepsi `randomBytes()` ile değiştirildi.

### 39. 2FA TOTP Brute-Force — Deneme Sınırı Zorunlu
- **ASLA** 2FA doğrulama endpoint'ini deneme sayısı sınırı olmadan bırakma. 6 haneli TOTP kodu (10^6 = 1.000.000 kombinasyon) sınırsız deneme ile 30 saniyelik pencerede brute-force edilebilir.
- **Max 5 başarısız deneme** → 2FA pending session invalidate edilmeli (tam re-login zorlanır). Deneme sayacı Redis'te 2FA session TTL'i kadar (300s) tutulur.
- Implement pattern:
  - `attemptKey = '2fa:attempt:{tempToken}'`
  - Başarısız denemede: `setCache(attemptKey, attempts + 1, 300)` → `TwoFactorCodeError` throw
  - Limit aşıldığında: `deleteCache('2fa:pending:{tempToken}')` → `TwoFactorRateLimitError` throw
  - Başarılı denemede: pending cache key silinir (implicit cleanup)
- HTTP status ayrımı zorunlu: rate limit → **429**, yanlış kod → **401**, sistem hatası → **500**.
- Typed exception class'lar kullan: `TwoFactorRateLimitError extends Error` / `TwoFactorCodeError extends Error` — `instanceof` ile catch block'ta ayırt et.
- Pattern:
  ```ts
  // ❌ YASAK — rate limit yok
  const isValid = verifyTOTPCode(secret, code);
  if (!isValid) throw new Error('Kod hatalı'); // Sınırsız deneme

  // ✅ DOĞRU
  const attempts = Number(await getCache(attemptKey)) || 0;
  if (attempts >= MAX_2FA_ATTEMPTS) {
    await deleteCache(`2fa:pending:${tempToken}`);
    throw new TwoFactorRateLimitError(); // → HTTP 429
  }
  if (!verifyTOTPCode(secret, code)) {
    await setCache(attemptKey, attempts + 1, 300);
    throw new TwoFactorCodeError(); // → HTTP 401
  }
  ```
- **Real bug fixed (2026-04-27)**: `runLoginTwoFactorFlow` rate limit olmadan sınırsız 2FA denemesine açıktı; `MAX_2FA_ATTEMPTS = 5` + attempt counter + typed exception class'lar ile kapatıldı.

### 40. `url.origin` / `request.url.origin` Yasak (Email / External URL'lerde) — `getPublicAppUrl()` Zorunlu
- **ASLA** email linkleri veya external servislere gönderilen URL'lerde `context.url.origin`, `new URL(request.url).origin` veya `url.origin` kullanma. Reverse proxy (Apache/CWP) arkasında bu değer iç URL'i döner (`http://localhost:4321`), canonical domain'i değil → kırık email linkleri, geçersiz OAuth redirect_uri.
- **Use `getPublicAppUrl()`** from `src/lib/public-app-url.ts` — `PUBLIC_APP_URL` → `SITE_URL` → `PUBLIC_SITE_URL` → `'https://sanliurfa.com'` fallback zinciri. Her zaman canonical domain döner.
- Pattern:
  ```ts
  // ❌ YASAK — reverse proxy arkasında http://localhost:4321 döner
  await requestPasswordReset(email, context.url.origin);
  await requestPasswordReset(email, new URL(request.url).origin);

  // ✅ DOĞRU — her zaman https://sanliurfa.com
  import { getPublicAppUrl } from '@/lib/public-app-url';
  await requestPasswordReset(email, getPublicAppUrl());
  ```
- İstisna: OAuth callback URI'leri OAuth providerlarının allowlist'iyle eşleşmeli — bu dosyalar whitelist'te explicit (`oauth/authorize.ts`, `oauth/callback.ts`, `social/facebook.ts` zaten `process.env.SITE_URL || url.origin` pattern'ini kullanıyor).
- Static lock (`security-no-url-origin-in-email-links.test.ts`): `requestPasswordReset` gibi email-sending fonksiyonları import eden dosyalar `url.origin` kullanamazsa CI fail.
- **Real bugs fixed (2026-04-27)**: `forgot-password.ts` + `actions/index.ts` — `new URL(request.url).origin` / `context.url.origin` → `getPublicAppUrl()` ile kapatıldı.
- **Real bugs fixed (Batch #50)**: `oauth/authorize.ts` + `social/facebook.ts` — `url.origin` → `getPublicAppUrl()`; `authorize.ts` `redirect_uri` allowlist validation eklendi; `oauth/callback.ts` — kırık `createUserSession` (hex token, user_sessions tablosu, JWT uyumsuz) → `runOAuthSessionFlow` (standart JWT + Redis session, HARD RULE #35 uyumlu). OAuth login önceden middleware'e göre geçersiz token üretiyordu — kullanıcılar OAuth ile giriş yapamıyordu.

### 41. TOTP Replay Attack — Kullanılan Kod Redis'te İşaretlenmeli
- **ASLA** başarılı TOTP doğrulaması sonrasında kodu yeniden kullanılmaya açık bırakma. 30 saniyelik TOTP penceresi boyunca aynı 6 haneli kod geçerlidir; ağ trafiğini izleyen saldırgan kodu yakalayıp 90 saniye içinde tekrar kullanabilir (replay attack).
- Başarılı doğrulamanın **hemen ardından** `2fa:used:{userId}:{code}` Redis cache key oluştur (90 saniye TTL — 3 TOTP window). Aynı key zaten mevcutsa kodu geçersiz say.
- TTL neden 90 saniye: TOTP `±1 window` toleransı ile toplamda `-60s ... +60s` geçerli kod penceresi oluşur; 90 saniye bu pencerenin tamamını kapsar.
- Pattern:
  ```ts
  const isCodeValid = verifyTOTPCode(secret, code);
  if (!isCodeValid) throw new TwoFactorCodeError();

  // Replay prevention — sonraki kod aynıysa 90s boyunca geçersiz
  const replayKey = `2fa:used:${userId}:${code}`;
  const alreadyUsed = await getCache(replayKey).catch(() => null);
  if (alreadyUsed) throw new TwoFactorCodeError();
  await setCache(replayKey, '1', 90).catch(() => null);
  ```
- **Real bug fixed (2026-04-27)**: `runLoginTwoFactorFlow` TOTP sonrası replay check yoktu; `2fa:used:{userId}:{code}` 90s key eklendi.

### 42. Güvenlik-Kritik Operasyonlar — Şifre Yeniden Doğrulama Zorunlu
- **2FA kurulumu (setup) ve devre dışı bırakma (disable), şifre değiştirme, hesap silme** endpoint'lerinde **mutlaka** kullanıcının mevcut şifresini doğrula. Yalnızca aktif oturum kontrolü yetmez: çalınan session cookie ile saldırgan kendi authenticator'ını ekleyebilir, kurbana ait 2FA'yı devre dışı bırakabilir (account takeover).
- Pattern: `bcrypt.compare(password, userRecord.password_hash)` başarısızsa → 401 döner, operasyon çalışmaz.
  ```ts
  // ❌ YASAK — yalnızca oturum kontrolü
  if (!locals.user) return 401;
  await disableTwoFactor(locals.user.id);

  // ✅ DOĞRU — oturum + şifre doğrulama
  if (!locals.user) return 401;
  const { password } = await request.json();
  const userRecord = await queryOne<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1', [locals.user.id]
  );
  if (!await bcrypt.compare(password, userRecord.password_hash)) return 401;
  await disableTwoFactor(locals.user.id);
  ```
- Kapsam: `2fa/setup`, `2fa/disable`, password change, account delete.
- **Real bugs fixed (2026-04-27)**: `/api/auth/2fa/disable` + `/api/auth/2fa/setup` — yalnızca session check ile çalışıyordu; her ikisine `bcrypt.compare` şifre doğrulaması eklendi.

### 43. Re-Login Sırasında Eski Session Redis'ten Silinmeli (Stale Session Revocation)
- **Login işleminde** (şifre ile veya OAuth) yeni session token oluşturmadan önce **mevcut `auth-token` cookie'si Redis'ten silinmeli**. Aksi halde: Kullanıcı re-login yaptıktan sonra önceden çalınmış bir token SESSION_TIMEOUT (varsayılan 24s) süresi boyunca geçerli kalmaya devam eder.
- Bu "session fixation" değil, "stale session" sorunudur: JWT imza doğrulaması saldırganın token oluşturmasını engeller, ama çalınmış geçerli bir eski token re-login sonrası revoke edilmez.
- Pattern — `runLoginFlow` ve `runOAuthSessionFlow` başında zorunlu:
  ```ts
  // ❌ YASAK — eski session Redis'te kalır
  const token = createToken({ userId, email, role });
  await persistAuthSession(token, user);

  // ✅ DOĞRU — önce eskiyi iptal et
  await invalidateExistingSession(cookies); // auth-token cookie okunur → Redis'ten silinir
  const token = createToken({ userId, email, role });
  await persistAuthSession(token, user);
  ```
- `SessionCookieStore` interface'i `get?` method'unu içermeli; Astro `context.cookies` uyumludur.
- `invalidateExistingSession` non-fatal olmalı (try/catch) — Redis erişim hatası login'i engellemez.
- Kapsam: `runLoginFlow`, `runOAuthSessionFlow`. `runLoginTwoFactorFlow` hariç — 2FA tamamlanınca zaten fresh session başlar (temp token upgrade).
- **Real bug fixed (2026-04-27)**: `runLoginFlow` + `runOAuthSessionFlow` — re-login sonrası eski token 24s geçerli kalıyordu; `invalidateExistingSession` helper eklendi.

### 44. Backup Code / OTP Karşılaştırması Constant-Time Olmalı (`timingSafeEqual`)
- **Backup code ve email/SMS OTP karşılaştırmalarında** `===`, `.indexOf()`, `.includes()` veya `.findIndex()` (default equality) kullanma. TOTP verifyTOTPCode zaten `timingSafeEqual` kullanıyor; backup code listesi de aynı standartta olmalı.
- `Array.prototype.indexOf` aşağı seviyede `===` ile karşılaştırır → ilk farklı karakterde kısa devre yapar → timing side-channel.
- Pattern:
  ```ts
  // ❌ YASAK — indexOf string eşitliği timing'e duyarlı
  const codeIndex = backupCodes.indexOf(code);

  // ✅ DOĞRU — constant-time karşılaştırma
  import { timingSafeEqual } from 'crypto';
  const codeIndex = backupCodes.findIndex((c: string) => {
    const a = Buffer.from(c);
    const b = Buffer.from(code);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  ```
- Kapsam: `two-factor.ts` backup code doğrulama, tüm OTP / secret code karşılaştırmaları. TOTP zaten korunuyor (`two-factor.ts:verifyTOTPCode`).
- **Real bug fixed (2026-04-27)**: `two-factor.ts:218` `backupCodes.indexOf(code)` → `findIndex + timingSafeEqual`.

### 37. E2E Bypass Env Var'ları Sadece Non-Production'da Çalışmalı
- **Tüm `E2E_*_BYPASS` env check'leri mutlaka** `process.env.NODE_ENV !== 'production'` ile guard'lanmalı. Guard yoksa production'da bu env var yanlışlıkla set edilirse güvenlik kontrolü devre dışı kalır — auth bypass, rate limit bypass.
- Kapsam: `E2E_ADMIN_BYPASS` (admin auth bypass), `E2E_RATE_LIMIT_BYPASS` (rate limiting bypass), yeni E2E bypass env var'ları.
- Pattern:
  ```ts
  // ❌ YASAK — production'da bypass açık
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  const rateLimitBypassed = process.env.E2E_RATE_LIMIT_BYPASS === '1';

  // ✅ DOĞRU — sadece non-production ortamda bypass
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  const rateLimitBypassed = process.env.NODE_ENV !== 'production' && process.env.E2E_RATE_LIMIT_BYPASS === '1';
  ```
- Static lock (`security-e2e-bypass-prod-guard.test.ts`): `E2E_ADMIN_BYPASS === '1'` veya `E2E_RATE_LIMIT_BYPASS === '1'` içeren her satır aynı zamanda `NODE_ENV !== 'production'` içermeli; aksi halde CI fail. 1 whitelist: lock test'in kendi dosyası. Yeni E2E bypass env var eklenince `E2E_BYPASS_VARS` dizisine eklenmeli.
- **Real bugs fixed (2026-04-27)**: 20 admin endpoint'te `isAdmin()` production guard olmadan bypass yapıyordu; `middleware.ts` rate limit bypass da aynı sorundan etkilendi.

### 45. Content-Disposition Filename — CRLF Injection Sanitization Zorunlu
- **ASLA** kullanıcı veya DB kaynaklı bir değeri Content-Disposition `filename=` içinde sanitize etmeden kullanma. `\r\n` karakterleri HTTP response header'larını böler → header injection: `Set-Cookie`, `Location` gibi keyfi header enjekte edilebilir.
- Özellikle `report.name`, `file.original_name`, form input gibi admin veya user-controlled alanlar.
- Sanitize pattern — filename oluşturmadan önce zorunlu:
  ```ts
  // ❌ YASAK — CRLF / quote / backslash korunmasız
  const filename = `${report.name.replace(/\s+/g, '_')}_${date}.${ext}`;

  // ✅ DOĞRU — header injection temizlendi
  const safeName = rawName
    .replace(/[\r\n\0"\\]/g, '')   // CRLF, null, quote, backslash kaldır
    .replace(/\s+/g, '_')
    .substring(0, 100) || 'file';
  const filename = `${safeName}_${date}.${ext}`;
  ```
- **Real bug fixed (2026-04-27)**: `report-engine.ts:310` — `report.name` yalnızca boşluk replace'liyordu; CRLF, null, quote sanitize eklendi.

### 46. Password Reset Token DB'de Hash Olarak Saklanmalı (SHA-256)
- **ASLA** password reset token'ı plaintext olarak `users.reset_token` sütununda saklama. DB ihlalinde saldırgan tüm bekleyen reset token'larını anında kullanarak hesapları ele geçirebilir.
- Token 256-bit random olduğu için tuz gerekmez — `SHA-256(token)` deterministik, hızlı, güvenli. Email'de gönderilen orijinal token saklanmaz, sadece hash saklanır.
- Pattern:
  ```ts
  // ❌ YASAK — plaintext DB'ye yazılır
  const resetToken = crypto.randomBytes(32).toString('hex');
  await query('UPDATE users SET reset_token = $1 ...', [resetToken, ...]);

  // ✅ DOĞRU — hash sakla, plaintext email'de gönder
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  await query('UPDATE users SET reset_token = $1 ...', [resetTokenHash, ...]);
  // resetToken → email URL'inde; resetTokenHash → DB

  // Doğrulama:
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  const user = await queryOne('SELECT id FROM users WHERE reset_token = $1 ...', [tokenHash, ...]);
  ```
- Kapsam: password reset, **email verification token** — tüm tek kullanımlık URL token'ları.
- **Real bugs fixed (2026-04-27)**: `password-reset.ts` + `src/lib/email/index.ts` — plaintext storage; her ikisine SHA-256 hash eklendi.

### 47. Atomik Okuma-Yazma Zorunlu (Race Condition Önleme)
- **ASLA** bakiye/kota/puan gibi finansal veya limit-kritik değerleri `SELECT ... UPDATE` (read-then-write) ile güncelleme. İki eşzamanlı istek aynı eski değeri okuyup her ikisi de write yaparsa negatif bakiye, kota aşımı veya duplicate kayıt oluşur.
- **Kural**: Tek atomik SQL sorgusuyla güncelle; koşul WHERE'e gömülür; satır kilidi PostgreSQL tarafından otomatik yönetilir.
- Pattern — puan harcama (check-then-deduct race):
  ```ts
  // ❌ YASAK — SELECT + uygulama katmanı kontrolü → race condition
  const row = await queryOne('SELECT current_balance FROM loyalty_points WHERE user_id = $1', [userId]);
  if (row.current_balance < amount) return false;
  const newBalance = row.current_balance - amount;
  await update('loyalty_points', { current_balance: newBalance }, ...);

  // ✅ DOĞRU — atomic WHERE guard, PostgreSQL row-level lock
  const result = await queryOne(
    `UPDATE loyalty_points
     SET current_balance = current_balance - $1
     WHERE user_id = $2 AND current_balance >= $1
     RETURNING current_balance`,
    [amount, userId]
  );
  if (!result) return false; // bakiye yetersiz (atomic)
  ```
- Pattern — idempotent INSERT (webhook retry / duplicate delivery):
  ```ts
  // ❌ YASAK — SELECT EXISTS + INSERT → concurrent webhook iki kez INSERT yapabilir
  const existing = await queryOne('SELECT id FROM billing_history WHERE stripe_invoice_id = $1', [id]);
  if (!existing) await insert('billing_history', { stripe_invoice_id: id, ... });

  // ✅ DOĞRU — ON CONFLICT ile atomik upsert
  await queryOne(
    `INSERT INTO billing_history (..., stripe_invoice_id)
     VALUES (..., $1)
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET payment_status = 'paid'`,
    [id, ...]
  );
  ```
- Kapsam: loyalty points spend, kota artışları, Stripe webhook duplicate kayıtlar, abonelik oluşturma.
- **Real bugs fixed (2026-04-27)**: `loyalty-points.ts:spendPoints` — SELECT+UPDATE → atomic `UPDATE WHERE balance >= $1`; `webhooks/stripe.ts:invoice.paid` — SELECT+INSERT → `INSERT ON CONFLICT`.

### 48. API Endpoint Catch Block — `safeErrorDetail` Zorunlu (Admin Dahil)
- **ASLA** API endpoint catch block'unda `error instanceof Error ? error.message : 'fallback'` pattern'ini doğrudan response field'a yazma. HARD RULE #9 tüm endpoint'leri kapsar — admin-only route olmak raw DB error string'ini gösterme hakkı vermez.
- DB constraint adları (`duplicate key "billing_history_stripe_invoice_id_key"`), iç tablo isimleri, file path'ler, Redis key'leri sızar.
- **Use `safeErrorDetail(error, 'Türkçe fallback')` from `src/lib/api.ts`** — production'da fallback, dev'de error.message döner. Import'ı unutma.
- Pattern:
  ```ts
  // ❌ YASAK (admin endpoint dahil tüm endpoint'lerde)
  import { apiResponse } from '../../lib/api';
  return json({ success: false, error: error instanceof Error ? error.message : 'failed' }, 500);

  // ✅ DOĞRU
  import { apiResponse, safeErrorDetail } from '../../lib/api';
  return json({ success: false, error: safeErrorDetail(error, 'İşlem başarısız') }, 500);
  ```
- **Real bugs fixed (2026-04-27)**: `admin/social/policies/simulate.ts`, `admin/site/audit/anomaly.ts`, `admin/site/media/{search,import,index}.ts`, `admin/site/settings/{rollback,rollback-preview,diff,presets}.ts`, `admin/social/policies.ts`, `admin/site/audit.ts`, `health/detailed.ts`, `contact.ts` — hepsinde raw `error.message` response'a yazılıyordu; `safeErrorDetail` ile değiştirildi.
- Static lock (`security-no-admin-error-message-leak.test.ts`): `src/pages/api/**/*.ts` tüm endpoint'ler taranır; `error: error instanceof Error ? error.message` pattern'i CI fail.

### 49. Feature Flag Percentage Rollout — Deterministik SHA-256 Zorunlu (`Math.random()` Yasak)
- **ASLA** feature flag yüzde bazlı (percentage rollout) hesaplamalarında `Math.random()` kullanma. Her HTTP request'te farklı sonuç üretir → aynı kullanıcı sayfayı yenilediğinde feature bazen açık, bazen kapalı görür (flickering UX).
- **Use SHA-256 deterministic bucket**: `parseInt(createHash('sha256').update(\`${userId}:${flagKey}\`).digest('hex').slice(0, 8), 16) % 100`
- userId yoksa (anonim kullanıcı): `return false` — anonim kullanıcılar percentage rollout'a dahil edilmez. Bu stabil bir davranış: her zaman false, hiçbir zaman random.
- `rolloutPercentage >= 100`: Tüm kullanıcılara açık (100% rollout) → hem anonim hem de logged-in kullanıcılar için `true` dönebilir.
- Pattern:
  ```ts
  // ❌ YASAK — her request'te farklı sonuç
  return Math.random() * 100 < flag.rolloutPercentage;

  // ✅ DOĞRU — deterministik SHA-256 bucket
  import { createHash } from 'node:crypto';
  if (!userId) return false; // anonim kullanıcı = percentage rollout dışı
  const bucket = parseInt(
    createHash('sha256').update(`${userId}:${flagName}`).digest('hex').slice(0, 8), 16
  ) % 100;
  return bucket < flag.rolloutPercentage;
  ```
- Kapsam: `src/lib/feature/`, `src/lib/feature-flags/` içindeki tüm feature flag modülleri.
- Static lock (`security-no-math-random-feature-flags.test.ts`): feature flag dizinlerindeki `.ts` dosyaları taranır; `Math.random()` içeren dosya CI fail.
- **Real bugs fixed (2026-04-27)**: `src/lib/feature/gating.ts` (no-userId percentage path), `src/lib/feature-flags/feature-flags.ts:checkPercentage` (no-userId fallback + weak DJB2 hash), `src/lib/feature/feature-flags.ts:FeatureFlagManager` (no-context case + anonymous fallback + weak DJB2 hashString method removed).

### 50. Şifre Değişikliği Sonrası Mevcut Session Redis'ten İptal Edilmeli (HARD RULE #50)
- **ASLA** şifre değişikliği başarılı olduktan sonra mevcut auth-token session'ını Redis'te bırakma. Şifre değiştiğinde eski token hala geçerli kalırsa, çalınmış bir token 24 saat boyunca erişim sağlayabilir.
- Pattern: `changePassword` başarı sonrası `cookies.get('auth-token')?.value` oku → `deleteCache('session:' + token)` ile Redis'ten sil. Non-fatal: `.catch(() => null)` ile wrap et — Redis erişim hatası şifre değişikliğini engellememeli.
- Pattern:
  ```ts
  // ❌ YASAK — eski session Redis'te kalıyor
  await changePassword(userId, newPassword);
  return apiResponse({ success: true, message: 'Şifre değiştirildi' });

  // ✅ DOĞRU — şifre değişikliği + session iptali
  await changePassword(userId, newPassword);
  const authToken = cookies.get('auth-token')?.value;
  if (authToken) {
    await deleteCache(`session:${authToken}`).catch(() => null);
  }
  return apiResponse({ success: true, message: 'Şifre değiştirildi. Tekrar giriş yapmanız gerekiyor.' });
  ```
- Kapsam: `/api/users/password.ts` password change endpoint.
- Static lock (`security-session-revoke-after-password-change.test.ts`): `users/password.ts` dosyasında `deleteCache` import ve `session:` string birlikte bulunmalı.
- **Real bug fixed (2026-04-27)**: `users/password.ts` — şifre değişikliği başarı sonrası session Redis'te kalıyordu; `deleteCache('session:' + authToken)` eklendi.

### 51. Bulk Update — Sütun Adı Allowlist Zorunlu (SQL Column Injection Defense)
- **ASLA** `Object.entries(updates)` key'lerini doğrudan SQL sütun adı olarak kullanma. Caller-controlled key'ler SQL injection vektörüdür: `{ "'; DROP TABLE users;--": 1 }` gibi updates objesi arbitrary SQL çalıştırabilir.
- **Per-entity `ALLOWED_UPDATE_COLUMNS` Set** tanımla; yalnızca allowlist'te olan key'leri SQL'e dahil et. Allowlist dışı key'ler sessizce skip edilir.
- Pattern:
  ```ts
  // ❌ YASAK — updates keys direkt SQL'e ekleniyor
  Object.entries(updates).forEach(([key, value], index) => {
    sets.push(`${key} = $${index + 1}`); // SQL column injection
  });

  // ✅ DOĞRU — allowlist filter
  const allowedEntries = Object.entries(updates).filter(([key]) => ALLOWED_UPDATE_COLUMNS[entityType].has(key));
  if (allowedEntries.length === 0) return { success: 0, failed: entityIds.length, errors: [...] };
  allowedEntries.forEach(([key, value], index) => {
    sets.push(`${key} = $${index + 1}`); // safe — allowlisted column
  });
  ```
- Static lock (`security-bulk-update-column-allowlist.test.ts`): `src/lib/bulk/index.ts` dosyasında `ALLOWED_UPDATE_COLUMNS` sabiti ve `allowedColumns.has(key)|allowedEntries` pattern bulunmalı.
- **Real bug fixed (2026-04-27)**: `bulkUpdate` — `Object.entries(updates)` keys filtresiz SQL'e ekleniyordu; `ALLOWED_UPDATE_COLUMNS` per-entity Set + filter eklendi.

### 52. `isAdmin` Admin Panel Erişimi ile Operasyonel Yetki Ayrımı (Moderatör Privilege Escalation)
- **`context.locals.isAdmin`** (`middleware.ts`) = `role === 'admin' || role === 'moderator'` — admin panel sayfalarına erişim hakkı verir. Moderatörler `/admin/*` sayfa rotasına erişebilir (tasarım gereği: moderation, vendor approval gibi işlemler için).
- **ASLA** sistem genelini etkileyen operasyonlarda yalnızca `!locals.isAdmin` kontrolü yapma. Bu kontrol moderatörlere de izin verir. Aşağıdaki yüksek-etki admin operasyonlarında **`locals.user.role !== 'admin'`** explicit kontrolü kullan:
  - Feature flag yönetimi (`admin/flags.ts`) — tüm kullanıcıları etkiler
  - Bulk ban/delete (`admin/bulk-action.ts`) — admin hesaplarını da etkiler
  - Kota sıfırlama (`admin/quotas/[userId].ts`)
  - Güvenlik audit log (`admin/security/audit.ts`)
  - Export token oluşturma (`admin/exports/token.ts`)
  - Deployment status (`admin/deployment/status.ts`)
- Moderatörlerin erişebileceği endpoint'ler: `moderation/`, `vendor/*/approve|reject`, `verifications/`
- Pattern:
  ```ts
  // ❌ YASAK — sistem geneli etkili operasyonda moderatör geçer
  if (!locals.isAdmin) return 403;
  await deleteFeatureFlag(id); // Moderatör bunu yapabilmemeli!

  // ✅ DOĞRU — yüksek-etki admin-only operasyon
  if (locals.user.role !== 'admin') return 403;
  await deleteFeatureFlag(id);
  ```
- `locals.isModerator = role === 'moderator'` field'ı middleware'de mevcut — moderatör-spesifik kontroller için kullan.
- **Real bug found (2026-04-27)**: `middleware.ts:269` — `isAdmin = admin || moderator`; `flags.ts`, `bulk-action.ts` ve diğer 35+ endpoint moderatörlere açık. Full sweep Batch #58'e ertelendi.

### 53. `changeRole` Action — Rol Allowlist Zorunlu
- **ASLA** `changeUserRole(userId, adminId, newRole)` çağrısına kullanıcıdan gelen `newRole` değerini doğrudan geçirme. Geçersiz rol string'leri veya mevcut olmayan roller DB'ye yazılabilir.
- `newRole` değerini `new Set(['user', 'admin', 'moderator', 'vendor'])` allowlist'ine karşı validate et; allowlist dışı değerler → 422.
- Pattern:
  ```ts
  // ❌ YASAK
  const { newRole } = body;
  await changeUserRole(userId, adminId, newRole); // 'super_admin' veya 'hacker' gibi keyfi string

  // ✅ DOĞRU
  const VALID_ROLES = new Set(['user', 'admin', 'moderator', 'vendor']);
  if (!newRole || !VALID_ROLES.has(newRole)) return 422;
  await changeUserRole(userId, adminId, newRole);
  ```
- **Real bug fixed (2026-04-27)**: `admin/users/[id].ts:changeRole` — `newRole` validation yoktu; `VALID_ROLES` Set + guard eklendi.

### 54. 2FA Setup Verify — Brute-Force Attempt Limiti Zorunlu (Batch #58)
- **ASLA** 2FA kurulum doğrulama endpoint'ini (`/api/users/2fa/verify`) deneme sayısı sınırı olmadan bırakma. 6 haneli TOTP kodu sınırsız deneme ile brute-force edilebilir.
- **Max 5 başarısız deneme** → setup secret invalidate edilmeli (kullanıcı kurulumu yeniden başlatmalı). Deneme sayacı Redis'te `2fa:setup:attempt:{userId}` key'inde saklanır (TTL = setup secret TTL, 300s).
- Başarılı doğrulama sonrası attempt counter silinmeli (`deleteCache(attemptKey)`).
- HTTP status: rate limit aşıldı → **429**, yanlış kod → **401**.
- Pattern:
  ```ts
  // ❌ YASAK — sınırsız deneme
  const verified = verifyTOTPCode(secret, code);
  if (!verified) return apiError(401, 'Kod hatalı');

  // ✅ DOĞRU
  const attemptKey = `2fa:setup:attempt:${userId}`;
  const attempts = Number(await getCache(attemptKey).catch(() => null)) || 0;
  if (attempts >= MAX_SETUP_ATTEMPTS) {
    deleteTwoFactorSetupSecret(userId);
    await deleteCache(`2fa:setup:${userId}`).catch(() => null);
    return apiError(ErrorCode.RATE_LIMITED, 'Çok fazla hata — kurulumu yeniden başlatın', HttpStatus.RATE_LIMITED, ...);
  }
  if (!verifyTOTPCode(secret, code)) {
    await setCache(attemptKey, String(attempts + 1), SETUP_ATTEMPT_TTL).catch(() => null);
    return apiError(ErrorCode.UNAUTHORIZED, 'Kod geçersiz', HttpStatus.UNAUTHORIZED, ...);
  }
  await deleteCache(attemptKey).catch(() => null); // başarı → counter temizle
  ```
- Kapsam: `src/pages/api/users/2fa/verify.ts`.
- Static lock (`security-2fa-setup-brute-force.test.ts`): `MAX_SETUP_ATTEMPTS`, `setup:attempt`, `attempts >= MAX_SETUP_ATTEMPTS` birlikte aranır.
- **Real bug fixed (2026-04-27 Batch #58)**: `users/2fa/verify.ts` — brute-force counter yoktu; `MAX_SETUP_ATTEMPTS = 5` + attempt counter + setup secret invalidation eklendi.

### 34. Wildcard CORS (`Access-Control-Allow-Origin: *`) API Endpoint'lerde Yasak
- **ASLA** individual API endpoint dosyasında `'Access-Control-Allow-Origin': '*'` header'ı set etme. Authenticated endpoint + wildcard CORS = CORS data exfiltration riski: `evil.com` sayfası `EventSource('https://sanliurfa.com/api/realtime/notifications')` açar → SameSite cookie gevşerse → user'ın private SSE stream'i okunur.
- **CORS merkezi olarak `src/middleware.ts` yönetir** (`CORS_ORIGINS` env allowlist). Bireysel endpoint'ler kendi CORS header'ını set etmemeli.
- SSE endpoint'lerde sadece SSE-özgü header'ları set et:
  ```ts
  // ❌ YASAK
  const headers = {
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Origin': '*',   // wildcard CORS + auth = exfiltration risk
  };

  // ✅ DOĞRU (CORS middleware'e bırakılır)
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
  ```
- İstisna: `api/image/[...path].ts` — public image proxy; herhangi bir sayfadan cross-origin `<img>` kullanımı için `*` intentional (no auth, public assets).
- `Vary: Origin` zorunlu: `middleware.ts` CORS header set ettiğinde (allowlist match) `Vary: Origin` de ekler — CDN proxy'lerin farklı origin'ler için yanlış response cache etmesini önler.
- **Neden şu an kısmen safe?** Cookie `SameSite=Strict` — farklı origin `EventSource` bağlantısında cookie gönderilmez → 401. Ama bu defense-in-depth değil; SameSite politikası değişirse wildcard CORS anında açık verir. Defense-in-depth: bireysel endpoint `*` set etmez.
- Static lock (`security-no-wildcard-cors.test.ts`): `src/pages/api/` altındaki tüm `.ts` dosyaları taranır; `Access-Control-Allow-Origin: *` pattern'i bulunursa CI fail. 1 file whitelist (`image/[...path].ts` public proxy).
- **Real bugs fixed (2026-04-26)**: 5 SSE endpoint (`notifications`, `messages`, `analytics`, `feed`, `presence`) + `graphql.ts` stub — hepsinden `*` kaldırıldı. Middleware `Vary: Origin` eklendi.

### 32. Open Redirect — Query Param Redirect Target Yasak (Phishing Defense)
- **ASLA** `Astro.url.searchParams.get('redirect')` (veya `returnTo`/`next`/`return`) gibi user-controlled query param değerini doğrudan `Astro.redirect()` veya HTTP `Location` header'ına geçirme. Aksi halde post-login open redirect: `https://sanliurfa.com/giris?redirect=https://evil.com` → kullanıcı login sonrası evil.com'a yönlendirilir → phishing.
- **Use `safeRedirectTarget(candidate, fallback?)` helper** (`src/lib/auth/safe-redirect.ts`) — same-origin path olmayanları reddeder (`/path` ✓; `https://`, `//`, `/\\`, `javascript:`, `data:`, CR/LF, control chars ✗).
- Pattern:
  ```ts
  // ❌ YASAK
  const target = Astro.url.searchParams.get('redirect') || '/';
  return Astro.redirect(target);

  // ✅ DOĞRU
  import { safeRedirectTarget } from '@/lib/auth/safe-redirect';
  const target = safeRedirectTarget(Astro.url.searchParams.get('redirect'));
  return Astro.redirect(target);
  ```
- Static lock (`security-no-open-redirect.test.ts`): tüm `src/pages/` dosyalarını tarar; redirect query param okuyup `safeRedirectTarget()` çağırmadan kullanan dosya CI fail. 3 file whitelist (intentional flows): `email/track.ts` (admin-curated campaign URL), `oauth/authorize.ts` + `social/facebook.ts` (provider redirect_uri allowlist'inde validate edilir).
- Helper unit tests (`safe-redirect.test.ts`): 19 test — safe inputs, falsy/invalid, attack vectors (absolute URL, protocol-relative, backslash trick, javascript:/data:, CRLF injection, null byte).

### 31. `href="javascript:..."` URI Yasak (XSS Vector)
- **ASLA** `<a href="javascript:...">` kullanma. Browser inline JS eval eder — XSS attack vector. Modern alternative: `onClick={handler}` veya semantic `<button onClick={...}>`.
- Sweep tertemiz (0 violation), proactive lock gelecek regression engelle.
- Pattern:
  ```html
  <!-- ❌ YASAK -->
  <a href="javascript:void(0)" onClick="...">click</a>
  <a href="javascript:doThing()">action</a>
  <a href={`javascript:${userInput}`}>...</a>            <!-- template injection! -->

  <!-- ✅ DOĞRU -->
  <button onClick={handler}>action</button>
  <a href="#" onClick={(e) => { e.preventDefault(); handler(); }}>action</a>
  <a href="/path">normal navigation</a>
  ```
- Static lock (`security-no-javascript-uri.test.ts`): tüm `.astro`/`.tsx`/`.jsx`/`.mdx`/`.html` taranır; `href="javascript:` (HTML attribute, JSX, template literal) CI fail.

### 30. `<input type="password">` `autocomplete` Attribute Zorunlu
- **YENİ** password input'larda `autocomplete="current-password"` (login) veya `autocomplete="new-password"` (signup, change password) attribute'u zorunlu. Eksikse: browser autofill yanlış field'a doldurur, password manager'lar field'ı algılayamaz, WCAG accessibility uyumsuz.
- React `.tsx`'te JSX camelCase `autoComplete` syntax (`autoComplete="current-password"`); .astro'da HTML lowercase `autocomplete`. Lock pattern her ikisini de kabul eder (`/auto[Cc]omplete\s*=/`).
- Whitelist boş — tüm password input'lar autocomplete attribute'a sahip (8 input fix yapıldı: ayarlar 3 + auth pages 5 + React 8).
- Pattern:
  ```html
  <!-- ❌ YASAK -->
  <input type="password" name="password" required />

  <!-- ✅ DOĞRU (login form) -->
  <input type="password" name="password" autocomplete="current-password" required />

  <!-- ✅ DOĞRU (signup, change password, reset) -->
  <input type="password" name="password" autocomplete="new-password" required />
  ```
- Auth pages migrate edildi: giris.astro (current-password), kayit.astro (new-password ×2), sifre-sifirla.astro (new-password ×2), profil/ayarlar (current-password + new-password ×2).
- Static lock (`security-password-input-autocomplete.test.ts`): tüm `.astro`/`.tsx`/`.jsx`/`.mdx` taranır; `<input type="password">` autocomplete eksikse CI fail (4 legacy whitelist hariç).

### 29. `target="_blank"` `rel="noopener"` Eksik Yasak (Tab-Nabbing Defense)
- **YENİ** dosyada `<a target="_blank">` kullanırken `rel="noopener"` (veya `noreferrer`/`nofollow`) attribute'u zorunlu. Modern browser'lar implicit `noopener` uygular ama defense-in-depth için explicit yazma standardı.
- 14 mevcut dosya snapshot whitelist'te (legacy admin pages); yeni eklenen dosya CI'da fail.
- Pattern:
  ```html
  <!-- ❌ YASAK (yeni dosyada) -->
  <a href="..." target="_blank">...</a>

  <!-- ✅ DOĞRU -->
  <a href="..." target="_blank" rel="noopener">...</a>
  <a href="..." target="_blank" rel="noopener noreferrer">...</a>
  <a href="..." target="_blank" rel={dynamicRel}>...</a>  <!-- dynamic OK -->
  ```
- Static lock (`security-no-target-blank-without-rel.test.ts`): tüm `.astro`/`.tsx`/`.jsx`/`.mdx` taranır; ALLOWED_FILES (14 legacy admin/page) dışı yeni `target="_blank"` rel'siz CI fail.

### 28. React Unsafe HTML Prop Yasak (XSS)
- **ASLA** React `.tsx`/`.jsx` component'lerde React'in raw HTML render eden prop'unu (`__html` ile inner HTML) kullanma. User input direkt geçerse persistent XSS açığı.
- **Use sanitization** zorunlu: `import DOMPurify from 'dompurify'; <div ... >{DOMPurify.sanitize(html)}</div>` veya React'in default text auto-escape pattern'i.
- Astro `set:html` (server-side, `.astro` frontmatter) **lock kapsamı dışında** — server context controlled, user input zaten escape/sanitized.
- Pattern:
  ```tsx
  // ❌ YASAK
  <div dangerously{InnerHTML}={{ __html: post.content }} />  // unsanitized

  // ✅ DOĞRU
  <div>{post.content}</div>                          // text auto-escape
  import DOMPurify from 'dompurify';
  <div dangerously{InnerHTML}={{ __html: DOMPurify.sanitize(post.html) }} />
  ```
- Static lock (`security-no-dangerously-set-inner-html.test.ts`): tüm `.tsx`/`.jsx` taranır; ALLOWED_FILES boş (sweep tertemiz, gelecek regression engelleyici).

### 27. localStorage / sessionStorage Sensitive Credential Yasak
- **ASLA** JWT token, password, API secret, session ID, auth token gibi sensitive credential'ı `localStorage.setItem` veya `sessionStorage.setItem` ile yazma. Browser-side persistent storage XSS attacker JavaScript tarafından okunabilir → token hijacking + session takeover.
- **Use httpOnly + secure cookie** (server-set, JS erişemez): `context.cookies.set('auth-token', token, { httpOnly: true, secure: true, sameSite: 'strict' })`.
- Allowed: UI preferences (`theme`, `lang-tr`, `sidebar-collapsed`), non-sensitive user settings, anonim analytics tracking ID.
- Pattern:
  ```ts
  // ❌ YASAK
  localStorage.setItem('token', jwt);
  localStorage.setItem('jwt', authToken);
  localStorage.setItem('auth-token', t);
  sessionStorage.setItem('session-id', sid);

  // ✅ DOĞRU
  // Server: context.cookies.set('auth-token', token, { httpOnly: true, secure: true });
  // Browser: cookie otomatik gönderilir, JS okuyamaz
  localStorage.setItem('theme', 'dark');           // OK — UI preference
  localStorage.setItem('lang-tr', 'true');         // OK — non-sensitive
  ```
- Static lock (`security-no-localstorage-secret.test.ts`): `(local|session)Storage.setItem('KEY', ...)` çağrılarında KEY substring'i `token`/`jwt`/`password`/`secret`/`session`/`auth` içeriyorsa CI fail.
- İstisna: `src/lib/analytics/google-analytics.ts` `ga_session_id` (anonim GA tracker, auth credential değil) ALLOWED_FILES whitelist'inde.

### 26. Raw `<img>` Tag Yasak — Astro `<Image>` zorunlu
- **YENİ** komponent/page'de `<img src="...">` kullanma. Astro `<Image>` (`src/components/Image.astro`) sharp ile AVIF/WebP conversion + lazy loading + responsive srcset üretir; raw `<img>` bunları kaçırır → bandwidth + LCP regression.
- Mevcut 40+ legacy dosya snapshot whitelist'te (Astro pages + React components + helper'lar); yeni eklenen dosya CI'da fail.
- Pattern:
  ```astro
  <!-- ❌ YASAK (yeni dosyada) -->
  <img src="/x.jpg" alt="..." class="w-full" />

  <!-- ✅ DOĞRU -->
  import Image from '@/components/Image.astro';
  <Image src="/x.jpg" alt="..." width={400} height={300} loading="lazy" />
  ```
- Static lock (`security-no-raw-img-tag.test.ts`): tüm `.astro`/`.tsx`/`.jsx` taranır; ALLOWED_FILES (40+ legacy + 3 helper module + 2 SEO util) dışı yeni `<img>` kullanımı CI fail.
- React `.tsx` exception: Astro `<Image>` Astro-only, .tsx'ten çağırılamaz; `lucide-react` veya raw `<img>` kullan + lazy loading + width/height attrs ekle (CLS önleme).

### 25. i18n / Multi-language Adoption Yasak (Türkçe-only)
- **ASLA** `astro:i18n` import etme. Astro'nun i18n routing entry point'i kullanılırsa multi-language flow başlar — proje Türkçe-only (CLAUDE.md "Strict Prohibitions").
- **ASLA** `public/` veya `src/` içinde locale JSON/TS/MJS dosyası ekleme: `en.json`, `ar.json`, `fr.json`, `de.json`, `es.json`, `it.json`, vb. (toplam 20 yasak locale code).
- **ASLA** `astro.config.mjs` içinde top-level `i18n: { ... }` block ekleme.
- Pattern:
  ```ts
  // ❌ YASAK
  import { getRelativeLocaleUrl } from 'astro:i18n';
  // public/locales/en.json — yasak
  // src/i18n/ar.ts — yasak

  // ✅ DOĞRU (Türkçe hardcoded)
  <html lang="tr">
  ```
- Static lock (`security-no-i18n-adoption.test.ts`): 3 test — astro:i18n import yakala, locale JSON file glob, astro.config.mjs i18n block. ALLOWED_FILES boş (tam temiz).

### 15. Static Regression Locks (Static Analysis Tests)
- Codebase'i tarayan **static analysis test'leri** kritik HARD RULE'ları enforce eder. Test başarısız olursa CI/code review'da yakalanır.
- Lock dosyaları: `src/lib/__tests__/security-*.test.ts` (12 dosya, 16 HARD RULE'un 12'sini enforce):
  - `security-no-error-message-leak.test.ts` — HARD RULE #9 (non-auth endpoint `error.message` direct leak)
  - `security-no-vendor-only-idor.test.ts` — HARD RULE #11 (vendor-only check antipattern)
  - `security-no-sensitive-payload-log.test.ts` — HARD RULE #8 (full payload log)
  - `security-no-filename-ext.test.ts` — HARD RULE #2 (`file.name.split('.').pop()` XSS)
  - `security-internal-endpoint-token-required.test.ts` — HARD RULE #10 (`verifyInternalToken` usage)
  - `security-jwt-constant-time-required.test.ts` — HARD RULE #6 (`crypto.timingSafeEqual` + length pre-check)
  - `security-login-bcrypt-defense.test.ts` — HARD RULE #4 (DUMMY_BCRYPT_HASH + bcrypt.compare in not-found path)
  - `security-password-reset-no-throw.test.ts` — HARD RULE #5 (password reset email failure must NOT throw)
  - `security-stripe-handler-rethrow.test.ts` — HARD RULE #7 (Stripe handlers re-throw + 4xx vs 5xx)
  - `security-middleware-body-cap-required.test.ts` — HARD RULE #13 (Content-Length cap + 413)
  - `security-grant-atomic-insert.test.ts` — HARD RULE #14 (INSERT ON CONFLICT in grant functions)
  - `security-redos-regex-escape.test.ts` — HARD RULE #16 (dynamic RegExp meta-char escape)
  - `security-no-bare-parseint-searchparams.test.ts` — HARD RULE #17 (parseInt(searchParams) NaN guard, safeIntParam zorunlu)
  - `security-redis-namespace-required.test.ts` — HARD RULE #18 (raw Redis client + prefixKey() proof zorunlu)
  - `security-path-traversal-containment.test.ts` — HARD RULE #3 (file deletion outside helpers yasak)
  - `security-no-process-env-in-react.test.ts` — HARD RULE #19 (.tsx/.jsx process.env kullanımı yasak)
  - `security-no-old-palette-hex.test.ts` — HARD RULE #20 (eski Şanlıurfa palette hex'leri yasak; yeni urfa/isot Tailwind utility veya CSS variable zorunlu)
  - `security-no-new-inline-svg.test.ts` — HARD RULE #21 (yeni dosyada inline `<svg viewBox="0 0 24 24">` yasak; astro-icon zorunlu, 51 legacy dosya snapshot whitelist'te)
  - `bundle-size-baseline.test.ts` — bundle size budget guardrail (CSS ≤250KB, JS total ≤1100KB, ≤130 chunk; build artifact'tan ölçülür, build yoksa skip)
  - `security-no-hardcoded-localhost.test.ts` — HARD RULE #22 (hardcoded localhost/127.0.0.1 URL yasak; env / helper zorunlu)
  - `security-no-console-log-prod.test.ts` — HARD RULE #23 (production code'da console.log/info/debug yasak; logger helper zorunlu)
  - `security-no-i18n-adoption.test.ts` — HARD RULE #25 (Türkçe-only proje; astro:i18n import + locale JSON files + astro.config i18n block yasak)
  - `security-no-raw-img-tag.test.ts` — HARD RULE #26 (raw `<img>` yasak; Astro `<Image>` component zorunlu, 40+ legacy snapshot whitelist'te)
  - `security-no-localstorage-secret.test.ts` — HARD RULE #27 (localStorage/sessionStorage sensitive credential yasak; httpOnly cookie zorunlu)
  - `security-no-dangerously-set-inner-html.test.ts` — HARD RULE #28 (React unsafe HTML prop yasak; DOMPurify.sanitize zorunlu)
  - `security-no-target-blank-without-rel.test.ts` — HARD RULE #29 (target="_blank" rel="noopener" eksik yasak; tab-nabbing defense, 14 legacy snapshot)
  - `security-password-input-autocomplete.test.ts` — HARD RULE #30 (password input autocomplete attribute zorunlu; whitelist boş)
  - `security-no-javascript-uri.test.ts` — HARD RULE #31 (href="javascript:..." URI yasak; XSS vector, sweep tertemiz proactive lock)
  - `security-no-open-redirect.test.ts` — HARD RULE #32 (open redirect query param yasak; safeRedirectTarget() helper zorunlu, 3 file whitelist intentional OAuth/email flows)
  - `security-no-unvalidated-fetch-url.test.ts` — HARD RULE #33 (SSRF: fetch(DB-sourced URL) validateExternalUrl() zorunlu; 1 file whitelist hardcoded admin RSS source)
  - `security-no-wildcard-cors.test.ts` — HARD RULE #34 (wildcard CORS `*` API endpoint'lerde yasak; CORS merkezi middleware.ts yönetir; 1 file whitelist `image/[...path].ts` public proxy)
  - `security-no-exec-shell-injection.test.ts` — HARD RULE #36 (bare `exec` from child_process yasak; `execFileNoThrow()` zorunlu; 1 whitelist `src/lib/exec-file.ts`)
  - `security-e2e-bypass-prod-guard.test.ts` — HARD RULE #37 (E2E_ADMIN_BYPASS check'i `NODE_ENV !== 'production'` guard olmadan yasak; 20 admin endpoint fix; 1 whitelist lock test'in kendi dosyası)
  - `security-no-math-random-security.test.ts` — HARD RULE #38 (Math.random() auth/security/file/middleware/api/audit dosyalarında yasak; crypto.randomBytes() zorunlu; analytics/AI dışarıda)
  - `security-no-url-origin-in-email-links.test.ts` — HARD RULE #40 (url.origin/request.url.origin email-sending fonksiyonlarında yasak; getPublicAppUrl() zorunlu; 3 OAuth file whitelist)
  - `security-no-backup-code-indexof.test.ts` — HARD RULE #44 (backup code / secret code karşılaştırmasında indexOf/includes yasak; timingSafeEqual zorunlu; self whitelist)
  - `security-no-admin-error-message-leak.test.ts` — HARD RULE #48 (tüm API endpoint catch block'larında raw `error.message` response'a yazma yasak; `safeErrorDetail` zorunlu; admin endpoint muaf değil)
  - `security-no-math-random-feature-flags.test.ts` — HARD RULE #49 (feature flag percentage rollout'ta `Math.random()` yasak; SHA-256 deterministik bucket zorunlu; feature/feature-flags dizinleri taranır)
  - `security-session-revoke-after-password-change.test.ts` — HARD RULE #50 (şifre değişikliği sonrası `deleteCache('session:' + token)` zorunlu; `users/password.ts` dosyasında `deleteCache` import ve `session:` string birlikte bulunmalı)
  - `security-bulk-update-column-allowlist.test.ts` — HARD RULE #51 (bulk update'te SQL column injection yasak; `ALLOWED_UPDATE_COLUMNS` per-entity allowlist + filter zorunlu; `bulk/index.ts` dosyasını tarar)
  - `security-role-change-allowlist.test.ts` — HARD RULE #53 (changeRole action'da `VALID_ROLES` allowlist zorunlu; admin/users/[id].ts taranır)
  - `security-isadmin-moderator-privilege.test.ts` — HARD RULE #52 (yüksek-etki admin endpoint'lerde `locals.user.role !== 'admin'` zorunlu; `!locals.isAdmin` tek başına yetersiz; flags.ts, bulk-action.ts, quotas/[userId].ts taranır)
  - `security-2fa-setup-brute-force.test.ts` — HARD RULE #54 (2FA setup verify endpoint'inde `MAX_SETUP_ATTEMPTS` brute-force koruması zorunlu; setup attempt counter + invalidation gerekli)
- **Yeni HARD RULE eklenince static lock yazılmalı** — pattern'i CI'da otomatik enforce etmek için.
- Whitelist mekanizması: legitimate exception'lar `ALLOWED_*` Set'inde explicit komentle belgelenmeli (yorum: niye exception, hangi user-facing durum).

---

