# Repository Guidelines

## Project Structure & Module Organization
Core app code is under `src/`.
- `src/pages/`: Astro routes and API handlers (including `src/pages/api/`).
- `src/components/`, `src/layouts/`, `src/styles/`: UI composition and styling.
- `src/lib/`: domain logic, governance libraries, shared utilities.
- `src/lib/__tests__/`: phase-focused Vitest suites.
- `public/`: static files and PWA assets.
- `scripts/`: operational utilities (migrate, checks, deploy).

Phase delivery artifacts are tracked at repo root:
- `PHASE_*.md`, `PHASE_INDEX.md`, `memory.md`, `TASK_TRACKER.md`.

## Product Scope (Non-Negotiable)

Sanliurfa.com is a Turkish-only Şanlıurfa city guide and local social platform.
The core product is:

- premium Şanlıurfa city guide: places, districts, routes, food culture, events, transport, pharmacies
- member contribution: registered users can add places, add events, review places and rate places
- social layer: profiles, follow/friend surface, messaging and Şanlıurfa-focused swipe/match experience
- business layer: local businesses can submit and manage their presence

Do not reduce the project to a static blog, generic directory, travel template or admin-only CMS.
Public UX must make the city guide, contribution flows and social/match layer visible.

## Build, Test, and Development Commands
- `npm run dev`: run Astro dev server.
- `npm run build`: production build to `dist/`.
- `npm run preview`: preview built output.
- `npm run type-check`: `astro check`.
- `npm run lint`: ESLint over `src/**/*.{ts,tsx,astro}`.
- `npm run test:unit`: run all unit tests.
- `npm run test:phase:311-316`: run current phase regression quickly.
- `npm run test:e2e`: run Playwright tests.

Recommended local gate for phase work:
`npm run test:unit -- <phase-test-file> && npm run build`

## Coding Style & Naming Conventions
- Astro 6.x SSR, React 19, TypeScript 6 strict mode.
- Tailwind CSS 4.x is configured through `@tailwindcss/vite`.
- PostgreSQL access goes through canonical `src/lib/postgres.ts`.
- Canonical env names: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET`, `CORS_ORIGINS`, `EMAIL_FROM`, `SITE_URL`, `PUBLIC_SITE_URL`.
- 2-space indentation; keep formatting Prettier-compatible.
- Prefer descriptive `kebab-case` for `src/lib` modules.
- Keep phase modules small and composable (store/scorer/gate/reporter pattern).
- Test files use `*.test.ts` and live in `src/lib/__tests__/`.

Recommended release sanity gate:
`npm run type-check && npm run lint && npm run build && npm run security:scan-secrets && npm run db:migrate:check-duplicates && npm run release:readiness:report`

## Testing Guidelines
- Each phase block ships with 24 unit tests (6 modules x 4 tests).
- Test categories per module: store/add, compute/score, gate/route, report.
- For changed phase blocks, run only relevant suite first, then full build.

## Commit & Pull Request Guidelines
- Use milestone-style commit titles: `Phase 311-316: <short title>`.
- One logical delivery per commit (code + tests + docs + trackers).
- PR must include:
  - affected phase range,
  - commands executed,
  - test/build results,
  - any known warnings not addressed.

## Phase Workflow (Required)
For every new phase range:
1. Add 6 `src/lib` modules.
2. Add one 24-test suite in `src/lib/__tests__/`.
3. Export modules from `src/lib/index.ts`.
4. Add `PHASE_<range>_*.md` and register in `PHASE_INDEX.md`.
5. Update `memory.md` and `TASK_TRACKER.md`.
6. Keep `tsconfig.phase.json` scoped (`include: []` + explicit phase `files` list).
7. Prefer pure phase modules; avoid direct infra imports (`logger`, `postgres`) unless phase contract requires them.
8. Verify with `npm run test:phase:gate:ci` before handoff.

## 🚫 YASAKLAR (Strict Prohibitions)

**Multi-language / i18n YASAĞI:**
- Bu proje **sadece Türkçe** dil desteği içerir
- **KESİNLİKLE YASAK:** Çoklu dil desteği (i18n, l10n)
- **KESİNLİKLE YASAK:** Dil seçici (language selector) UI
- **KESİNLİKLE YASAK:** `hreflang` etiketleri
- **KESİNLİKLE YASAK:** Dil tercihi API'si veya veritabanı alanları
- **KESİNLİKLE YASAK:** `accept-language` header'ına göre içerik değiştirme
- **KESİNLİKLE YASAK:** Dil dosyaları (en.json, ar.json vb.)

**Neden:** Proje sahibi açıkça tek dil (Türkçe) istemiştir. Tüm UI metinleri, SEO içerikleri ve kullanıcı mesajları Türkçe olarak sabitlenmiştir.

**Ücretli Servis ve Harici CDN YASAĞI:**
- **KESİNLİKLE YASAK:** Image CDN servisleri (Cloudinary, Cloudflare Images, Imgix vb.)
- **KESİNLİKLE YASAK:** Ücretli görseller (Shutterstock, Getty Images vb.)
- **KESİNLİKLE YASAK:** Ücretli API'ler (Google Maps API, SendGrid, AWS SES vb.)
- **KESİNLİKLE YASAK:** Üçüncü parti haritalama servisleri (Google Maps, Mapbox vb.)
- **İZİN VERİLEN:** Ücretsiz alternatifler (OpenStreetMap, Ücretsiz SMTP, Local image processing)

**Neden:** Proje sahibi açıkça ücretsiz, açık kaynak çözümler istemiştir.

## 🧭 DB-First İçerik Yönetimi (Zorunlu)

**Kalıcı Kural:**
- Sitedeki tüm yönetilebilir içerikler admin panelinden ve database üzerinden yönetilir.
- Ana sayfa hero metinleri ve hero görseli dahil hiçbir kritik landing içeriği dosya içinde sabit kalmaz.

**Uygulama Standardı:**
- Yeni yönetilebilir alan eklendiğinde önce DB şeması (`site_settings`, `site_content_blocks`, `site_media_assets`) hazırlanır.
- Ardından admin API endpoint'i eklenir.
- Son olarak admin panel ekranı eklenir.
- Hardcoded değerler yalnızca fallback olarak kalabilir.

**Referans Doküman:**
- `docs/DB_FIRST_SITE_MANAGEMENT.md`
- `docs/MVP_PUBLIC_ACCEPTANCE.md`
- `docs/CITY_TAXONOMY_AND_SOCIAL_SURFACE.md`

## 🎯 Geliştirme Yaklaşımı

**Kalıcı Kural:**
- Öncelik altyapı, test veya CI döngüleri değil; kullanıcıya görünen site, admin paneli ve kullanıcı akışlarıdır.
- Test yazımı kullanıcı açıkça istemedikçe ertelenir.
- Her çalışma turu somut kullanıcı değeri üretir: sayfa, içerik, özellik veya performans iyileştirmesi.
