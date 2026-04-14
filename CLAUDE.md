# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Şanlıurfa.com** — Astro 6.1 + React 19 + TypeScript şehir rehberi platformu. PostgreSQL (pg), Redis cache/session/rate-limit, bcrypt auth, SSE real-time, Stripe subscriptions, gamification (loyalty/badges/achievements). ~280 lib modules, ~180 components, ~70 pages.

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
npm run db:migrate       # Run pending migrations (npx tsx scripts/migrate.ts)
npm run db:migrate:status # Show migration status
npm run db:seed          # Load SQL seed files (npx tsx scripts/seed.ts)
```

Single test file: `npx vitest run src/lib/__tests__/specific.test.ts`

## Architecture

### Stack
- **Framework**: Astro 6.1 SSR with file-based routing
- **UI**: React 19 (client:load/client:idle hydration directives)
- **DB**: PostgreSQL via `pg` library (direct pool, NOT an ORM)
- **Cache/Sessions/Rate-limit**: Redis with `sanliurfa:` namespace prefix
- **Auth**: bcrypt (12 rounds) + JWT + Redis sessions (24h sliding window)
- **Real-time**: Server-Sent Events (SSE) via ReadableStream
- **Payments**: Stripe (checkout sessions, webhooks with HMAC-SHA256)
- **Styling**: Tailwind CSS 3.4

### Key Directories
- `src/pages/` — File-based routing: `.astro` pages + `api/` REST endpoints
- `src/pages/api/` — All API endpoints return `{ success, data?, error? }` JSON
- `src/lib/` — Core utilities and business logic (~280 modules in subdirectories)
- `src/components/` — Astro (.astro) for static, React (.tsx) for interactive
- `src/middleware.ts` — Auth, CORS, rate limiting, security headers
- `src/migrations/` — Database migration files (TypeScript)
- `src/lib/__tests__/` — Vitest test suites

### Path Alias
`@/*` maps to `src/*` (configured in tsconfig.json)

## Critical Conventions

### Database
- **Always parameterized queries**: `pool.query('SELECT * FROM places WHERE id = $1', [id])` — never string interpolation
- **Table allowlist**: New tables must be added to `ALLOWED_TABLES` in `src/lib/postgres.ts`
- **Migrations**: Add timestamped file in `src/migrations/`, run `npm run db:migrate`

### Redis Caching
- **Namespace**: ALL keys must use `sanliurfa:` prefix (via `prefixKey()` helper in `src/lib/cache.ts`)
- **Isolation is critical**: Shared Redis instance, namespace prevents collision with other projects
- **Invalidation**: Every mutation (POST/PUT/DELETE) must invalidate related cache patterns via `deleteCache()` or `deleteCachePattern()`
- Cache helpers: `getCache()`, `setCache(key, value, ttlSeconds)`, `deleteCache()`, `deleteCachePattern()`

### API Endpoints
- Response format: `apiResponse(data, status, requestId)` and `apiError(code, message, status, details, requestId)` from `src/lib/api.ts`
- Every endpoint must: validate input via `validateWithSchema()`, record metrics via `recordRequest()`, include X-Request-ID header
- Admin endpoints: check `locals.user.role !== 'admin'` → return 403 (never redirect)
- Auth check: `locals.user` set by middleware from `auth-token` cookie

### SSE (Real-time)
- Use `ReadableStream` pattern with `Cache-Control: no-cache`, `Connection: keep-alive` headers
- Client reconnection: exponential backoff (1s, 2s, 4s... max 60s)
- Manager singleton in `src/lib/realtime-sse.ts`

### Gamification
- Achievement checks via `checkCommonAchievements(userId)` — always call from event hooks in `src/lib/gamification.ts`, never directly
- Points: `awardPoints(userId, amount, reason)` from `src/lib/loyalty-points.ts`
- Badges: `awardBadgeToUser(userId, badgeKey, reason)` from `src/lib/badges.ts`

### Validation
- Schema-based via `validateWithSchema(body, schema)` from `src/lib/validation.ts`
- Add new schemas to `commonSchemas` object
- Set `sanitize: true` on user-facing text fields for XSS prevention

### Commit Convention
Conventional Commits: `feat(scope): description`, `fix(scope): description`, etc.
Branch naming: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`

## Strict Prohibitions

### Turkish Only — NO i18n
- This project supports **Turkish language only**
- **FORBIDDEN**: Multi-language support, language selectors, hreflang tags, language preference APIs, language files (en.json, ar.json, etc.), content switching based on accept-language header

### No Paid External Services
- **FORBIDDEN**: Image CDNs (Cloudinary, Imgix), paid stock photos (Shutterstock, Getty), paid APIs (Google Maps API, SendGrid, AWS SES), third-party mapping (Google Maps, Mapbox)
- **ALLOWED**: Free alternatives (OpenStreetMap, free SMTP, local image processing)

## Deployment

- **Production**: CentOS Web Panel, PM2 process manager, Apache reverse proxy (port 4321)
- **Dev**: Docker Compose (PostgreSQL + Redis + Node.js)
- **Required env vars**: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`
- **Node**: >=20.0.0
- See `DEPLOYMENT.md` and `CWP-DEPLOYMENT-GUIDE.md` for production setup

## TypeScript Configuration

tsconfig extends `astro/tsconfigs/strict` but **strict mode is disabled** (`strict: false`). All strict sub-options (noImplicitAny, strictNullChecks, etc.) are also off. JSX configured for React (`react-jsx`).
