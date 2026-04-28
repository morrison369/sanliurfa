# Security Guide

Bu doküman, Şanlıurfa.com codebase'inin **2026-04-25 / 2026-04-26 audit cycle**
sonrası güvenlik posture'unu belgeler. Önceki Kubernetes-tabanlı içerik
(geçersiz, yanlış altyapı varsayımı) tamamen yeniden yazıldı.

> **Production altyapısı**: CentOS Web Panel (CWP) shared hosting + PM2 +
> Apache reverse proxy. Container/Kubernetes değil. Secrets `.env` ve
> `/admin/integrations` admin panelinden yönetilir.

---

## Defense-in-Depth Mimarisi

Üç katmanlı koruma:

1. **Doküman seviyesi** — `CLAUDE.md` 16 SECURITY HARD RULE (kalıcı kurallar).
2. **Behavior test seviyesi** — 73 security regression test (specific scenarios).
3. **Static analysis seviyesi** — 12 lock test, codebase-wide scan, CI'da otomatik enforce.

Yeni geliştirici bir antipattern eklemeye kalkarsa CI seviyesinde durdurulur.

---

## Audit Sonuçları (2026-04-25/26)

**37 prod bug fix + 4 dead-code SQL builder hardened/locked.**

### Kategori bazında

| Kategori | Bulgu | Çözüm |
|---|---|---|
| **Auth bypass** | 3 (login timing, password reset symmetry, JWT timing) | DUMMY_BCRYPT_HASH, silent fail, `crypto.timingSafeEqual` |
| **Authorization (IDOR)** | 7 endpoint vendor-only antipattern | 3-yol switch (admin > vendor > 403) |
| **Internal endpoint auth** | 3 (emails/process, metrics, webhooks/trigger) | `verifyInternalToken` helper + `INTERNAL_API_TOKEN` env |
| **File upload** | 4 (XSS via filename ext, path traversal, IDOR, DB-supplied unlink) | MIME → ext mapping, regex validation, path containment |
| **Stripe webhook** | 4 (idempotency × 2, silent handler swallow, JWT timing) | duplicate check, `throw error`, 4xx vs 5xx semantics |
| **SQL injection** | 17 vector across 4 dead lib SQL builders | `queryOLAP` allowlist + 3 deprecated runtime locks |
| **ReDoS** | 4 dynamic RegExp escape eksikti | meta-char escape pattern |
| **Info disclosure** | 62 endpoint `error.message` leak | `safeErrorDetail()` helper |
| **Sensitive logging** | `email-notifications.ts` full payload log | metadata-only |
| **Race conditions** | `grantBadgeToUser` check-then-insert | `INSERT ON CONFLICT RETURNING` atomic |
| **DoS prevention** | 243 endpoint body size cap eksikti | middleware Content-Length 1MB/15MB cap, 413 |
| **Email refactor regression** | 8 silent bug (sendEmail bool→object) | caller scan + `result.success` check |

### Negative scan results (codebase clean)

- React XSS attribute usage: **0 occurrence**
- Dynamic code execution patterns (eval, Function): **0 occurrence**
- Prototype pollution patterns: **0 occurrence**
- localStorage/sessionStorage sensitive data: only UI prefs (theme, filters)
- Hardcoded secrets (Stripe live keys, AWS, JWT): **0 occurrence**
- npm audit (875 deps): **0 vulnerabilities**

---

## SECURITY HARD RULES (CLAUDE.md `Security Hard Rules` bölümü)

16 rule belgelidir; her birinin gerekçesi, antipattern örneği, doğru pattern
örneği ve enforce eden test/lock referansı CLAUDE.md'de mevcuttur.

| # | Rule | Static Lock |
|---|---|---|
| 1 | Refactor return type regression scan | (manual) |
| 2 | File upload — XSS via filename extension | ✅ `security-no-filename-ext.test.ts` |
| 3 | File upload — path traversal | (regex validation in code) |
| 4 | Login bcrypt constant-time defense | ✅ `security-login-bcrypt-defense.test.ts` |
| 5 | Password reset response symmetry | ✅ `security-password-reset-no-throw.test.ts` |
| 6 | JWT signature constant-time compare | ✅ `security-jwt-constant-time-required.test.ts` |
| 7 | Stripe webhook idempotency + 4xx/5xx | ✅ `security-stripe-handler-rethrow.test.ts` |
| 8 | Sensitive data logging (no full payload) | ✅ `security-no-sensitive-payload-log.test.ts` |
| 9 | Error response sanitization (`safeErrorDetail`) | ✅ `security-no-error-message-leak.test.ts` |
| 10 | Internal endpoint auth (`verifyInternalToken`) | ✅ `security-internal-endpoint-token-required.test.ts` |
| 11 | IDOR — vendor-only check antipattern | ✅ `security-no-vendor-only-idor.test.ts` |
| 12 | Security test coverage requirement | (meta — CLAUDE.md doc) |
| 13 | Body size cap (DoS prevention) | ✅ `security-middleware-body-cap-required.test.ts` |
| 14 | DB race conditions — atomic INSERT | ✅ `security-grant-atomic-insert.test.ts` |
| 15 | Static regression locks (meta) | (this section) |
| 16 | ReDoS — dynamic RegExp escape | ✅ `security-redos-regex-escape.test.ts` |

**12 of 16 (%75) statik analiz ile otomatik enforced.**

---

## Reusable Security Helpers

3 ortak helper, security pattern'leri merkezi tek noktadan yönetir:

### `safeErrorDetail(err, fallback)` (`src/lib/api.ts`)
Production'da `fallback`, dev'de `error.message` döner. DB schema, file path,
internal IP gibi sensitive info'nun client'a sızmasını önler.

### `verifyInternalToken(request)` (`src/lib/auth/internal-token.ts`)
Internal/cron endpoint'leri için Bearer token doğrulaması.
`INTERNAL_API_TOKEN` env yoksa endpoint 401 döner (security-by-default).

### `lifecycle.ts:registerShutdownHandler` (`src/lib/lifecycle.ts`)
PM2 SIGTERM ile graceful shutdown — DB pool drain + Redis quit. 8s timeout
+ PM2 `kill_timeout: 10000` config tutarlı.

---

## Production Lifecycle

### Cookie Security
- `auth-token`: `httpOnly: true`, `secure: import.meta.env.PROD`, `sameSite: 'strict'`, `maxAge: 86400`.
- `x-request-id`: tracing only, `httpOnly: false`.

### CSRF
- Astro `security.checkOrigin: true` (config seviyesinde).

### Rate Limiting (middleware)
- Tier-based (auth: 10/15min, default: 100/15min, admin: 300/15min).
- IP-based + per-user write limit (40/15min).
- E2E bypass: `E2E_RATE_LIMIT_BYPASS=1`.

### Body Size Cap (middleware)
- Regular `/api/*` POST/PUT/PATCH: 1MB
- Upload endpoints (`/api/upload`, `/api/photos/upload`, `/api/files/upload`): 15MB
- Aşan istekler 413 döner.

### CSP & Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; ...
```

### Web Vitals RUM
`PerformanceMonitor.tsx` + `web-vitals` library: CLS, INP, LCP, FCP, TTFB.
`navigator.sendBeacon` ile `/api/analytics/performance`'a gönderilir.

### PWA Push Notifications
VAPID key (env: `VAPID_PUBLIC_KEY` server, `PUBLIC_VAPID_PUBLIC_KEY` client).
Service Worker: `public/sw.js`, register: `src/components/PWARegister.astro`.

---

## Vulnerability Management

### Regular checks
```bash
npm audit              # 0 vulnerabilities expected
npm outdated           # check semver-safe updates
npm run lint:ci        # astro check + ESLint + image validation
npm run test:unit      # 540 tests, all passing
```

### Memory Entries (cross-session lessons)
`~/.claude/memory/`:
1. `refactor_return_type_regressions.md`
2. `security_internal_token.md`
3. `security_idor_vendor_only.md`
4. `security_email_enumeration.md`
5. `security_file_upload.md`
6. `security_stripe_webhook.md`
7. `astro_ssr_production_grade.md`
8. `security_sql_injection_sweep.md`
9. `security_redos_sweep.md`
10. `dependency_upgrade_complete.md` (12/12 major upgrades applied)

### Audit Trail
Bütün audit cycle history `CHANGELOG.md` `[Unreleased]` section'ında.

---

## Audit Sonrası Sayılar (Final)

```
Tests pass:         540 (96 test files, +93 vs başlangıç)
Type errors:        0
ESLint warnings:    0
Vulnerabilities:    0 (npm audit, 779 deps)
Hardcoded secrets:  0
SQL injection:      0 (reachable + dead all hardened/locked)
ReDoS vectors:      0 (4 fixed + static lock)
Code injection:     0 (eval/Function/proto)
Build time:         ~11s (kararlı)
npm outdated:       0 (12/12 major upgrades applied)

Security artifacts:
- 16 SECURITY HARD RULE (CLAUDE.md, 12 static-enforced)
- 12 memory entries (cross-session lessons)
- 12 static regression lock files (17 lock tests)
- 3 reusable security helpers (safeErrorDetail, verifyInternalToken, redisToString)
- 73 security regression tests
- 1 migration (168 — Web Vitals CLS/INP)

Stack (current):
- Astro 6.x SSR (server output, @astrojs/node)
- React 19, TypeScript 6, Tailwind CSS 4.2 (CSS-first config)
- ESLint 10 (flat config), Vitest 4
- PostgreSQL (pg pool), Redis 5 (with redisToString helper)
- bcryptjs 3, zod 4, web-vitals 5
```

---

## Reporting Security Issues

Production security incident:
1. Disable affected endpoint (PM2 reload after code change)
2. Check `logger.error` output for leaked info — sanitize and re-deploy
3. Add static lock test if pattern is novel
4. Update memory entry for future Claude/dev sessions

Internal vulnerability disclosure:
- Email: security@sanliurfa.com (route via admin panel notifications)
- Confidential: do NOT open public GitHub issue

---

**Last audit**: 2026-04-26 — 37 bug fix, 17 SQL injection vector, 4 ReDoS,
62 info disclosure, 12 memory entries, **12/12 major dependency upgrade applied** (npm outdated boş).
Tüm session detayları `CHANGELOG.md` `[Unreleased]` section'ında.
