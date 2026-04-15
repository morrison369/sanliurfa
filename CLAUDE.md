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
- **Framework**: Astro 6.1 SSR (`output: 'server'`) with file-based routing
- **UI**: React 19 (client:load/client:idle hydration directives — Islands architecture)
- **DB**: PostgreSQL via `pg` library (direct pool, NOT an ORM)
- **Cache/Sessions/Rate-limit**: Redis with `sanliurfa:` namespace prefix
- **Auth**: bcrypt (12 rounds) + JWT + Redis sessions (24h sliding window)
- **Real-time**: Server-Sent Events (SSE) via ReadableStream
- **Payments**: Stripe (checkout sessions, webhooks with HMAC-SHA256)
- **File Storage**: Local disk only (`public/uploads/` via `src/lib/file/file-storage.ts`) — NO S3, NO cloud storage
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

---

## Astro Framework Patterns

### SSR Mode
This project runs in `output: 'server'` — all pages render on-demand. Key implications:
- `getStaticPaths()` is **ignored** — use `Astro.params` + DB queries instead
- Always guard with `Astro.redirect()` on missing/unauthorized resources
- `Astro.locals` is request-scoped and reset per request

```astro
---
// SSR dynamic route — params come from URL, not getStaticPaths
const { slug } = Astro.params;
const place = await queryOne('SELECT * FROM places WHERE slug = $1', [slug]);
if (!place) return Astro.redirect('/404');
---
```

### API Routes (Endpoints)
All endpoints live in `src/pages/api/` and export named HTTP method handlers:

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals, params, cookies, url }) => {
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  // ...
};
```

- Always use `apiResponse()` / `apiError()` from `src/lib/api.ts` — they add `X-Request-ID` and consistent shape
- `locals.user` is set by middleware from `auth-token` cookie — never trust client-supplied user IDs

### Middleware & locals
Middleware is in `src/middleware.ts`. The `App.Locals` interface is declared in `src/env.d.ts`:

```typescript
// src/env.d.ts
declare namespace App {
  interface Locals {
    user?: { id: string; email: string; role: string; fullName?: string };
    isAdmin?: boolean;
    requestId?: string;
  }
}
```

Access in pages via `Astro.locals`, in endpoints via `context.locals`. Never reassign the entire `locals` object — mutate its properties.

### React Islands (Client Hydration)
```astro
<Counter client:load />    <!-- Hydrate immediately -->
<Map client:idle />        <!-- Hydrate when browser idle -->
<Gallery client:visible /> <!-- Hydrate when scrolled into view -->
<Modal client:only="react" /> <!-- Client-only, no SSR -->
```

React props must be serializable — no `Date` objects, functions, or Maps. Pass ISO strings for dates.

### Cookies (Auth)
```typescript
// Set in API route
context.cookies.set('auth-token', token, {
  httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 86400
});

// Read in middleware
const token = context.cookies.get('auth-token')?.value;
```

### File-Based Routing Summary
```
src/pages/index.astro           → /
src/pages/mekan/[slug].astro    → /mekan/:slug  (SSR: use Astro.params.slug)
src/pages/api/places/[id].ts    → /api/places/:id
src/pages/_helpers/util.ts      → NOT a route (underscore prefix)
```

### Environment Variables
- `PUBLIC_*` vars are exposed to the browser (baked in at build time)
- Non-PUBLIC vars are server-only
- Access via `import.meta.env.VAR_NAME`

### Error Pages
- `src/pages/404.astro` — rendered when no route matches
- `src/pages/500.astro` — rendered for unhandled server errors

---

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
- Admin endpoints: check `locals.user.role !== 'admin'` or `locals.isAdmin` → return 403 (never redirect)
- Auth check: `locals.user` set by middleware from `auth-token` cookie

### File Uploads — LOCAL DISK ONLY
- **Use**: `saveFile(file, folder)` from `src/lib/file/file-storage.ts`
- **Saves to**: `public/uploads/photos/<folder>/` — served statically at `/uploads/photos/<folder>/`
- **FORBIDDEN**: AWS S3, GCS, Azure Blob, Cloudinary, any cloud file storage
- Uploaded file paths stored in `s3_files` table (legacy name — still used for local files)
- `UPLOAD_DIR` env var controls base path (default: `public/uploads/photos`)

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

---

## Strict Prohibitions

### Turkish Only — NO i18n
- This project supports **Turkish language only**
- **FORBIDDEN**: Multi-language support, language selectors, hreflang tags, language preference APIs, language files (en.json, ar.json, etc.), content switching based on accept-language header

### No Paid External Services
- **FORBIDDEN**: Image CDNs (Cloudinary, Imgix), paid stock photos (Shutterstock, Getty), paid APIs (Google Maps API, SendGrid, AWS SES, AWS S3), third-party mapping (Google Maps, Mapbox), any cloud object storage
- **ALLOWED**: Free alternatives (OpenStreetMap, free SMTP via nodemailer, local disk file storage, sharp for image processing)

### No Cloud File Storage
- **FORBIDDEN**: `aws-sdk`, `@aws-sdk/client-s3`, `@google-cloud/storage`, `azure-storage`, `multer-s3`
- **REQUIRED**: All uploaded files go to local disk via `src/lib/file/file-storage.ts`
- Backup files also go to local disk (see `src/lib/jobs/scheduler.ts` for pg_dump)

---

## Deployment

- **Production**: CentOS Web Panel, PM2 process manager, Apache reverse proxy (port 4321)
- **Dev**: Docker Compose (PostgreSQL + Redis + Node.js)
- **Required env vars**: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`
- **Node**: >=20.0.0
- See `DEPLOYMENT.md` and `CWP-DEPLOYMENT-GUIDE.md` for production setup

## TypeScript Configuration

tsconfig extends `astro/tsconfigs/strict` but **strict mode is disabled** (`strict: false`). All strict sub-options (noImplicitAny, strictNullChecks, etc.) are also off. JSX configured for React (`react-jsx`).

Pre-existing TS errors in `src/lib/advanced/`, `src/lib/affiliate/`, `src/lib/ai-moderation/`, and similar deep lib modules are from legacy drizzle-orm imports and do NOT block the Astro build — ignore them.
