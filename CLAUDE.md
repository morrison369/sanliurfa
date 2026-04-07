# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Şanlıurfa.com** is a production-grade city guide web application built with Astro 6.1, React 19, and TypeScript. Full-stack with bcrypt authentication, Redis caching/sessions/rate-limiting, PostgreSQL, comprehensive observability, API documentation, and E2E testing. Enterprise-ready infrastructure with strict TypeScript, SQL injection prevention, and performance monitoring.

## Quick Start Commands

### Development
- `npm run dev` — Start dev server on port 3000
- `npm run dev:1111` — Dev server on custom port (1111, 1112, 1113 available)
- `npm run dev:wsl` — Dev server for WSL with external host access

### Building & Preview
- `npm run build` — Production build
- `npm run preview` — Preview production build locally

### Testing
- `npm run test:unit` — Run Vitest unit tests
- `npm run test:unit:watch` — Watch mode for unit tests
- `npm run test:e2e` — Run Playwright E2E tests
- `npm run test:e2e:ui` — Run E2E tests with UI
- `npm run test` — Run all tests (unit + E2E)

### Database & Services
- `npm run db:start` — Start PostgreSQL Docker container
- `npm run db:stop` — Stop database
- `npm run db:reset` — Reset database (drops volumes)
- `npm run db:psql` — Open psql shell to database
- `npm run db:logs` — View database logs

### Other
- `npm run lint` — Run TypeScript strict check + Astro check (must pass before commits)
- `npm run format` — Format code with Prettier (including Astro)
- `npm run deploy` — Deploy application

## Architecture

### Directory Structure

```
src/
├── components/        # Astro + React UI components
├── pages/            # File-based routing (Astro pages + API routes)
│   └── api/          # REST API endpoints (health, auth, places, reviews, metrics, performance, docs)
├── layouts/          # Page layout templates
├── lib/              # Core utilities (TypeScript strict)
│   ├── postgres.ts   # PostgreSQL pool, parameterized queries, table allowlist security
│   ├── auth.ts       # Bcrypt hashing, Redis sessions, token management
│   ├── cache.ts      # Redis client, namespaced key prefixing (sanliurfa:), rate limiting
│   ├── validation.ts # Schema-based input validation with XSS sanitization
│   ├── logging.ts    # Structured logging with request ID tracking
│   ├── metrics.ts    # Request/query metrics, slow operation detection, performance stats
│   ├── api.ts        # Response formatters, error codes, validation helpers
│   └── env.ts        # Environment variable validation
├── middleware.ts     # Request auth, CORS, rate limiting, security headers
├── types/            # TypeScript type definitions
├── content/          # Markdown/MDX content files
├── styles/           # Tailwind CSS
└── data/             # Static data
```

### Technology Stack

- **Framework**: Astro 6.1 (SSR, file-based routing)
- **UI**: React 19 (client-side interactivity)
- **Styling**: Tailwind CSS 3.4 + Tailwind Forms
- **Database**: PostgreSQL (direct `pg` library connection)
- **Cache/Session/Rate Limit**: Redis (namespaced `sanliurfa:*` keys)
- **Auth**: JWT + bcrypt (passwords), Redis sessions (24h TTL, sliding window)
- **Password Hashing**: bcryptjs (12 rounds), SHA-256 migration path for legacy hashes
- **Input Validation**: Schema-based with sanitization
- **Observability**: Structured logging, request ID tracking, metrics aggregation, slow query detection
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Code Quality**: TypeScript strict mode, Astro Check, Prettier, pre-commit linting

### Key Architectural Decisions

1. **Database Security**:
   - Parameterized queries via `pool.query($1, [$param])` syntax prevent SQL injection
   - Table name allowlist in `postgres.ts` validates all table references
   - Connection pool with min 2, max 20 connections, idle timeout 30s
   - Auto-reconnect on pool error

2. **Authentication**:
   - **Password**: Bcrypt (12 rounds) hashes stored in DB. Legacy SHA-256 hashes auto-migrated to bcrypt on next successful login
   - **Sessions**: Redis-backed JWT tokens, not in-memory. Key format: `sanliurfa:session:{token}`
   - **Flow**: Login → bcrypt verify → create token → `SET session` in Redis (TTL 86400s) → return cookie
   - **Verification**: Middleware reads `auth-token` cookie → `GET session` from Redis → validate expiry → set `context.locals.user`
   - **Sliding Window**: Token TTL refreshed on each successful verification (users stay logged in while active)

3. **Caching Strategy**:
   - **Redis Namespacing**: All keys prefixed `sanliurfa:` to isolate from other projects on shared Redis
   - **Cache Patterns**:
     - Places list: `sanliurfa:places:list:{filter}` (5 min TTL)
     - Place detail: `sanliurfa:places:{id}` (10 min TTL)
     - Reviews: `sanliurfa:reviews:{placeId}` (10 min TTL)
     - User favorites: `sanliurfa:favorites:{userId}` (5 min TTL)
   - **Invalidation**: Pattern deletion on mutations (POST/PUT/DELETE)
   - **Metrics**: Cache hit/miss tracked per endpoint, aggregated in `/api/metrics`

4. **Rate Limiting**:
   - **Mechanism**: Redis key `sanliurfa:ratelimit:{ip}` with counter and TTL (15 min window)
   - **Limit**: 100 requests per 15 minutes per IP
   - **Fallback**: If Redis unavailable, uses in-memory map (fail-open with warning log)
   - **IP Detection**: Extracts rightmost IP from `x-forwarded-for` header (prevents spoofing)

5. **Input Validation**:
   - Schema-based validation in `src/lib/validation.ts` with `validateWithSchema()`
   - Schemas defined in `commonSchemas` (login, register, review, place)
   - XSS sanitization via `sanitizeInput()` (HTML escape)
   - Returns `{valid, errors, data}` structure
   - 422 UNPROCESSABLE_ENTITY on validation failure

6. **Observability**:
   - **Request Metrics**: Every endpoint calls `recordRequest(method, path, status, duration)` → aggregated stats
   - **Query Metrics**: Every DB query recorded with duration, row count, slow detection
   - **Slow Detection**:
     - Queries > 100ms: debug log
     - Queries > 1000ms: warning log with stack trace
     - Requests > 500ms: recorded as slow, added to slow operations list
   - **Pool Monitoring**: Database connection utilization (active/idle/waiting) updated every 30s
   - **Dashboards**: `/api/metrics` (aggregated), `/api/performance` (detailed, admin-only)

7. **API Conventions**:
   - All endpoints return JSON: `{ success: boolean, data?: T, error?: string }`
   - Status codes: 200 (OK), 400 (bad input), 401 (auth required), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation failed), 429 (rate limited), 500 (server error)
   - X-Request-ID header in all responses for distributed tracing
   - X-Cache header (HIT/MISS) on cached endpoints
   - /api/docs → Swagger UI, /api/openapi.json → OpenAPI 3.1 spec

8. **Component Strategy**:
   - Astro (.astro) for static, server-rendered content
   - React (.tsx) for interactive UI with explicit hydration directives (client:load, client:idle)

### Database

PostgreSQL with connection pool. Key tables:
- `users` — Accounts with roles (user/admin/moderator), bcrypt password hashes
- `places` — Locations with category, coordinates, ratings
- `reviews` / `comments` — User feedback
- `favorites`, `blog_posts`, `events`, `historical_sites` — Content

All queries use parameterized statements (`$1`, `$2`, etc.). Direct access via `npm run db:psql`.

### Authentication & Authorization

**Flow**:
1. POST `/api/auth/register` or `/api/auth/login` with email + password
2. Validate credentials with bcrypt.compare()
3. Create JWT token, store session in Redis with 24h TTL
4. Return token in `auth-token` cookie (httpOnly, secure, sameSite=strict)
5. Middleware validates token on every request, sets `context.locals.user`
6. Routes check `context.locals.isAdmin` for role-based access

**Key Functions** (`src/lib/auth.ts`):
- `signUp(email, password, fullName)` — Create account
- `signIn(email, password)` — Verify credentials, create session
- `verifyToken(token)` — Validate session in Redis
- `createToken(userId, email, role)` — Generate JWT
- `signOut(token)` — Delete session from Redis

**Protected Routes**:
- `/admin/*` requires `isAdmin` role (checked in middleware, redirects to login if unauthorized)
- `/api/admin/*` requires `isAdmin` role (returns 403 FORBIDDEN if not)
- `/api/health/detailed` and `/api/performance` (admin-only)

### API Endpoints

**Health & Observability**:
- `GET /api/health` — Database/Redis status, response times
- `GET /api/health/detailed` (admin) — System metrics, pool info, error details
- `GET /api/metrics` (admin) — Aggregated request metrics, error rates, cache stats, slowest endpoints
- `GET /api/performance` (admin) — Slow queries, slow operations, pool utilization, performance dashboard

**Authentication**:
- `POST /api/auth/register` — Create account (schema: email, password min 8 chars with uppercase/number/special)
- `POST /api/auth/login` — Login (email, password)
- `POST /api/auth/logout` — Logout (clears session from Redis)

**Data**:
- `GET /api/places` — List places (cached 5 min)
- `GET /api/places/:id` — Place detail (cached 10 min)
- `GET /api/reviews?placeId=:id` — Place reviews (cached 10 min)
- `POST /api/reviews` — Create review (invalidates reviews cache)
- `GET /api/favorites` — User's saved places (cached 5 min, per-user)
- `POST /api/favorites` — Save place (invalidates favorites cache)
- `DELETE /api/favorites/:id` — Remove saved place (invalidates cache)

**Documentation**:
- `GET /api/openapi.json` — OpenAPI 3.1 specification
- `GET /api/docs` — Swagger UI viewer

### Security

- **SQL Injection**: Table allowlist in `postgres.ts` (ALLOWED_TABLES set), parameterized queries
- **XSS**: Input sanitization via `sanitizeInput()` in validation
- **Rate Limiting**: 100 req/15min per IP via Redis (`/api/auth/register` and login endpoints flagged for extra attention)
- **CORS**: Configured in middleware, origin validation against `CORS_ORIGINS` env
- **Security Headers**: Content-Type, X-Frame-Options, X-XSS-Protection, CSP
- **Session Hijacking**: httpOnly + secure cookies, strict sameSite policy
- **Password**: Bcrypt (12 rounds), never logged, legacy SHA-256 migration built-in

## Common Development Tasks

### Adding a New API Endpoint

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

### Caching Data

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

### Adding Request Validation

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

### Monitoring Performance

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

### Debugging Slow Operations

Slow operations are logged and trackable:
```typescript
// Get slow queries from metrics
import { metricsCollector } from '../../../lib/metrics';
const slowQueries = metricsCollector.getSlowQueries(10);  // Last 10 slow queries
const slowOps = metricsCollector.getSlowOperations(20);   // Last 20 slow operations
```

### Testing

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

## Important Files

| File | Purpose |
|------|---------|
| `DEPLOYMENT.md` | Complete CentOS Web Panel production deployment guide (PM2, Nginx, SSL, backups) |
| `tsconfig.json` | TypeScript strict mode (must not relax) |
| `.env.example` | Environment variables template (critical: DATABASE_URL, JWT_SECRET, REDIS_URL) |
| `Dockerfile` | Development container image (for local docker-compose stack) |
| `docker-compose.yml` | Development stack with PostgreSQL, Redis, Node.js (local development only) |
| `ecosystem.config.js` | PM2 configuration for production (created during deployment) |
| `src/middleware.ts` | Request auth, CORS, rate limiting, security headers |
| `src/lib/postgres.ts` | Database pool, parameterized queries, table allowlist, slow query monitoring |
| `src/lib/auth.ts` | Bcrypt hashing, Redis sessions, token creation/verification |
| `src/lib/cache.ts` | Redis client, namespaced keys, rate limiting, cache operations |
| `src/lib/validation.ts` | Schema-based validation with sanitization |
| `src/lib/logging.ts` | Structured logging with request ID tracking |
| `src/lib/metrics.ts` | Request/query metrics, aggregation, performance stats |
| `src/lib/api.ts` | Response/error formatters, HTTP constants, validation helpers |
| `src/pages/api/health.ts` | Health check endpoint (basic status) |
| `src/pages/api/health/detailed.ts` | Detailed health (admin, system metrics, pool info) |
| `src/pages/api/metrics.ts` | Aggregated metrics dashboard (admin) |
| `src/pages/api/performance.ts` | Performance monitoring (admin, slow queries, slow ops, pool) |
| `src/pages/api/openapi.json.ts` | OpenAPI 3.1 specification |
| `src/pages/api/docs.ts` | Swagger UI endpoint |
| `e2e/` | Playwright end-to-end tests |

## Environment Variables

**Critical** (must be set for production):
- `DATABASE_URL` — PostgreSQL connection string (required)
- `JWT_SECRET` — Secret for token signing (min 32 chars, required)
- `REDIS_URL` — Redis connection string (required, includes namespace prefix logic)
- `REDIS_KEY_PREFIX` — Redis key namespace (default: `sanliurfa:`, isolates from other projects)

**Recommended**:
- `CORS_ORIGINS` — Comma-separated allowed origins (default: https://sanliurfa.com)
- `NODE_ENV` — `production` or `development` (affects SSL, logging, error messages)

**Optional**:
- Supabase keys (legacy, for backward compatibility)
- OAuth keys (Google, Facebook)
- Email service API keys (Resend)

## Deployment

### Development Stack (Docker)
- **Docker Compose**: `docker-compose.yml` with PostgreSQL, Redis, Node.js services
- **Usage**: `docker-compose up` for full local stack with all dependencies
- **Purpose**: Consistent development environment, mirrors production services

### Production Deployment (CentOS Web Panel)
- **Platform**: Shared hosting on CentOS Web Panel (not Docker)
- **Service Manager**: PM2 (recommended) or Systemd
- **Process**:
  1. Clone repo to `~/sanliurfa` (user's home directory)
  2. Install Node.js via NVM
  3. `npm install --legacy-peer-deps` and `npm run build`
  4. Configure PostgreSQL/Redis (provided by hosting)
  5. Setup PM2 with `ecosystem.config.js`
  6. Configure Nginx reverse proxy in CWP panel (port 6000)
  7. Setup Let's Encrypt SSL (via CWP SSL Manager)
  8. Schedule automated backups via crontab

**See `DEPLOYMENT.md`** for complete CentOS Web Panel production setup guide.

- **Env**: Set critical vars in `.env` file on server
- **Redis**: Must be accessible (redis-cli ping), usually provided by hosting
- **Database**: PostgreSQL provided, create user and database, run migrations on first startup
- **Monitoring**: Use `/api/health` endpoint, PM2 logs, crontab health check script

## Notes for Future Development

### Critical Rules
1. **TypeScript Strict Mode**: Never relax `strict: true` in tsconfig.json. All errors must be fixed or marked with `// @ts-expect-error` with explanation.
2. **Parameterized Queries**: Always use `$1`, `$2`, etc. syntax in SQL. Never interpolate user input.
3. **Table Name Allowlist**: If adding new tables, update `ALLOWED_TABLES` set in `postgres.ts`.
4. **Redis Namespacing**: All new cache keys must start with `sanliurfa:` prefix (handled via `prefixKey()` helper).
5. **Input Validation**: Every API endpoint must validate input via `validateWithSchema()` before using.
6. **Error Handling**: Catch errors in API routes, never throw raw errors to clients. Log to stdout/stderr for server visibility.

### Performance Optimization
- Cache aggressively (5-10 min TTL for reads, invalidate on mutations)
- Monitor database pool: if utilization > 80%, investigate slow queries
- Use `/api/performance` to identify bottlenecks before they become incidents
- Slow queries (> 1000ms) auto-logged with warnings, investigate immediately
- Slow requests (> 500ms) tracked, review aggregates to identify trending issues

### Adding Features
- New tables: update `ALLOWED_TABLES` in postgres.ts
- New validations: add to `commonSchemas` in validation.ts
- New caching: use `prefixKey()` helper, document TTL in comments
- New endpoints: follow response formatter pattern from `src/lib/api.ts`
- New metrics: add to `recordRequest()` or custom `recordSlowOperation()` calls

### Testing
- Run `npm run test` before committing
- E2E tests validate auth flows, data endpoints, admin access control
- Unit tests for validation, utility functions, business logic
- Performance benchmarks in `/api/performance` to catch regressions

### Monitoring
- Check `/api/health` on every deployment
- Monitor `/api/metrics` for error rate increases or cache miss spikes
- Review slow queries in `/api/performance` weekly for optimization opportunities
- Database pool saturation (> 80% active) indicates scaling needs
- All errors logged to stdout with request ID for distributed tracing
