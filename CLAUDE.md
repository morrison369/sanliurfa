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
│   ├── api/          # REST API endpoints (health, auth, places, reviews, metrics, performance, docs, admin, loyalty, social, realtime, webhooks)
│   ├── admin/        # Admin management pages (users, moderation, loyalty, analytics)
│   ├── kullanıcı/    # User profiles and settings
│   ├── sosyal/       # Social features (feed, hashtag explorer)
│   ├── canli-analitik/ # Real-time analytics dashboard
│   └── [more pages]
├── layouts/          # Page layout templates
├── lib/              # Core utilities (TypeScript strict)
│   ├── postgres.ts   # PostgreSQL pool, parameterized queries, table allowlist security
│   ├── auth.ts       # Bcrypt hashing, Redis sessions, token management
│   ├── cache.ts      # Redis client, namespaced key prefixing (sanliurfa:), rate limiting
│   ├── validation.ts # Schema-based input validation with XSS sanitization
│   ├── logging.ts    # Structured logging with request ID tracking
│   ├── metrics.ts    # Request/query metrics, slow operation detection, performance stats
│   ├── api.ts        # Response formatters, error codes, validation helpers
│   ├── env.ts        # Environment variable validation
│   ├── realtime-sse.ts # Server-Sent Events manager for real-time features
│   ├── loyalty-points.ts # Loyalty points logic
│   ├── badges.ts     # Badge management and awarding
│   ├── achievements.ts # Achievement tracking and unlocking
│   ├── gamification.ts # Gamification event hooks
│   ├── social-features.ts # Hashtags, mentions, activity tracking
│   ├── business-analytics.ts # KPI and performance metrics
│   ├── subscriptions.ts # Premium tier management
│   ├── feature-gating.ts # Feature availability by tier
│   └── [more utilities]
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

**Data & Content**:
- `GET /api/places` — List places (cached 5 min)
- `GET /api/places/:id` — Place detail (cached 10 min)
- `GET /api/reviews?placeId=:id` — Place reviews (cached 10 min)
- `POST /api/reviews` — Create review (invalidates reviews cache)
- `GET /api/favorites` — User's saved places (cached 5 min, per-user)
- `POST /api/favorites` — Save place (invalidates favorites cache)
- `DELETE /api/favorites/:id` — Remove saved place (invalidates cache)

**Loyalty & Rewards**:
- `GET /api/loyalty/points` — User's points balance and history (auth required)
- `GET /api/loyalty/rewards` — Available rewards catalog (public)
- `GET /api/loyalty/achievements` — User achievements (auth required, supports view=all/unviewed/stats)
- `POST /api/loyalty/achievements` — Mark achievement as viewed (auth required)
- `GET /api/loyalty/tiers` — User tier and tier list (auth required)
- `POST /api/admin/loyalty/rewards` (admin) — Create new reward
- `GET /api/admin/loyalty/rewards` (admin) — List all rewards (active + inactive)
- `POST /api/admin/loyalty/award` (admin) — Manually award points or badge to user

**Social Features**:
- `GET /api/hashtags` — Trending hashtags (cached 30 min)
- `GET /api/hashtags/:slug` — Hashtag detail with tagged places/reviews (cached 10 min)
- `GET /api/users/:id/mentions` — User mentions and notifications (auth required)
- `GET /api/realtime/feed` — SSE: Real-time social feed updates (cursor-based, 15s polling)
- `GET /api/leaderboards/users` — Top users leaderboard (supports sortBy=points/reviews, limit param)

**Real-time Analytics** (admin):
- `GET /api/realtime/analytics` — SSE: Live metrics (5s) + KPIs (30s polling)

**User Management**:
- `GET /api/users/:id/profile` — Public user profile
- `GET /api/users/me` — Current user info (auth required)
- `PUT /api/users/me` — Update user profile (auth required)
- `GET /api/user/quotas` — Feature usage quotas (auth required)
- `POST /api/blocking/block` — Block user (auth required)
- `GET /api/blocking/check` — Check if blocked (auth required)
- `DELETE /api/blocking/unblock` — Unblock user (auth required)

**Admin Moderation**:
- `POST /api/reports/submit` — Submit content report
- `GET /api/admin/moderation/reports` (admin) — List reports
- `POST /api/admin/moderation/resolve` (admin) — Resolve report
- `DELETE /api/admin/moderation/remove-content` (admin) — Remove reported content

**Subscriptions & Payments**:
- `GET /api/subscriptions/tiers` — Available subscription tiers
- `POST /api/subscriptions/checkout` — Create Stripe checkout session
- `POST /api/subscriptions/webhook` — Stripe webhook handler

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

### Real-time Features

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

### Loyalty & Rewards System

Complete gamification system with points, badges, achievements, tiers, and redeemable rewards.

**Components**:
- `src/lib/loyalty-points.ts` — Points transactions, balance tracking, history
- `src/lib/badges.ts` — Badge definitions and award logic
- `src/lib/achievements.ts` — Achievement definitions, unlock conditions, stats
- `src/lib/gamification.ts` — Event hooks to trigger achievements (review created, photo uploaded, daily login)

**Database Tables**:
- `loyalty_points` — Point transactions (user_id, amount, type, reason, created_at)
- `user_badges` — Awarded badges (user_id, badge_key, awarded_at, reason)
- `user_achievements` — Unlocked achievements (user_id, achievement_id, unlocked_at, viewed_at)
- `loyalty_tiers` — User tier assignments (user_id, tier_name, total_points_earned, current_points, achieved_at)
- `rewards` — Reward catalog (reward_name, description, category, points_cost, tier_requirement, is_active, display_order)
- `reward_inventory` — Stock tracking (reward_id, available_stock, total_stock)
- `user_tier_history` — Tier progression log (user_id, tier_name, previous_tier, achieved_at, points_at_achievement)

**Key Flows**:
1. **Earning Points**: `awardPoints(userId, amount, reason)` creates transaction, updates `loyalty_tiers.current_points`, checks tier upgrade
2. **Unlocking Achievements**: `checkCommonAchievements(userId)` called from gamification hooks, auto-unlocks based on conditions
3. **Awarding Badges**: `awardBadgeToUser(userId, badgeKey, reason)` inserts record, returns false if already awarded
4. **Redeeming Rewards**: User selects reward if they have enough points, deducts points via transaction

**Admin Management**:
- `GET /api/admin/loyalty/rewards` — List all rewards (active + inactive), cached 2 min
- `POST /api/admin/loyalty/rewards` — Create new reward with optional inventory
- `POST /api/admin/loyalty/award` — Manually award points/badge to user

**Caching**:
- `sanliurfa:loyalty:balance:{userId}` — User's points balance (TTL: 300s)
- `sanliurfa:tier:user:{userId}` — User's current tier (TTL: 300s)
- `sanliurfa:achievements:stats:{userId}` — Achievement stats (TTL: 300s)
- `sanliurfa:admin:rewards:catalog` — Admin rewards list (TTL: 120s)

### Social Features

Social networking elements: hashtags, mentions, activity feed, trending content.

**Components**:
- `src/lib/social-features.ts` — Hashtag trends, mention detection
- `src/components/HashtagExplorer.tsx` — Browse trending hashtags and associated content
- `src/components/MentionNotifications.tsx` — User mention notifications
- Activity feed via real-time SSE endpoint

**Features**:
1. **Hashtags** (`/api/hashtags` and `/api/hashtags/:slug`)
   - Trending hashtags extracted from place/review descriptions
   - Endpoint returns: hashtag name, usage count, trending period
   - Detail view shows places and reviews tagged with hashtag
   - Cached: 30 min (list), 10 min (detail)

2. **Mentions** (`/api/users/:id/mentions`)
   - Track @mentions in reviews/comments
   - User notification system with view status
   - Fire-and-forget background query marks mentions as read
   - Cached: 2 min per user

3. **Activity Feed** (Real-time SSE: `/api/realtime/feed`)
   - User activities: reviews, uploads, tier achievements
   - Cursor-based tracking (only new activities since last fetch)
   - 15-second polling interval

4. **User Profiles** (`/api/users/:id/profile`)
   - Public profile with stats: reviews written, badges, tier, achievements
   - Follower/following counts

**Database Tables**:
- `user_activity` — Activity log (user_id, activity_type, related_id, created_at)
- `followers` — Follow relationships (follower_id, following_id, created_at)
- `mentions` — @mentions (user_id, mentioned_by_id, review_id, viewed_at)

**Caching**:
- `sanliurfa:hashtags:list:{period}:{limit}` — Trending hashtags (TTL: 30 min)
- `sanliurfa:hashtag:slug:{slug}` — Hashtag detail (TTL: 10 min)
- `sanliurfa:mentions:{userId}:{unreadOnly}` — User mentions (TTL: 2 min)

### Premium Subscriptions & Feature Gating

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

### Real-time SSE Endpoints

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

### Gamification & Event Hooks

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

### Core Infrastructure
| File | Purpose |
|------|---------|
| `DEPLOYMENT.md` | Complete CentOS Web Panel production deployment guide (PM2, Nginx, SSL, backups) |
| `tsconfig.json` | TypeScript strict mode (must not relax) |
| `.env.example` | Environment variables template (critical: DATABASE_URL, JWT_SECRET, REDIS_URL) |
| `Dockerfile` | Development container image (for local docker-compose stack) |
| `docker-compose.yml` | Development stack with PostgreSQL, Redis, Node.js (local development only) |
| `ecosystem.config.js` | PM2 configuration for production (created during deployment) |

### Core Libraries
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Request auth, CORS, rate limiting, security headers |
| `src/lib/postgres.ts` | Database pool, parameterized queries, table allowlist, slow query monitoring |
| `src/lib/auth.ts` | Bcrypt hashing, Redis sessions, token creation/verification |
| `src/lib/cache.ts` | Redis client, namespaced keys, rate limiting, cache operations |
| `src/lib/validation.ts` | Schema-based validation with sanitization |
| `src/lib/logging.ts` | Structured logging with request ID tracking |
| `src/lib/metrics.ts` | Request/query metrics, aggregation, performance stats |
| `src/lib/api.ts` | Response/error formatters, HTTP constants, validation helpers |
| `src/lib/env.ts` | Environment variable validation |

### Health & Observability
| File | Purpose |
|------|---------|
| `src/pages/api/health.ts` | Health check endpoint (basic status) |
| `src/pages/api/health/detailed.ts` | Detailed health (admin, system metrics, pool info) |
| `src/pages/api/metrics.ts` | Aggregated metrics dashboard (admin) |
| `src/pages/api/performance.ts` | Performance monitoring (admin, slow queries, slow ops, pool) |
| `src/pages/api/openapi.json.ts` | OpenAPI 3.1 specification |
| `src/pages/api/docs.ts` | Swagger UI endpoint |

### Real-time & Analytics
| File | Purpose |
|------|---------|
| `src/lib/realtime-sse.ts` | Server-Sent Events manager, reconnection logic, event listeners |
| `src/lib/business-analytics.ts` | KPI calculations, performance metrics aggregation |
| `src/pages/api/realtime/analytics.ts` | Real-time metrics/KPIs SSE endpoint (admin-only) |
| `src/pages/api/realtime/feed.ts` | Real-time social feed updates SSE endpoint (auth required) |
| `src/components/LiveAnalyticsDashboard.tsx` | Real-time metrics display with color-coded health |
| `src/pages/canli-analitik/index.astro` | Admin analytics dashboard page |

### Loyalty & Rewards System
| File | Purpose |
|------|---------|
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
| `src/components/LoyaltyDashboard.tsx` | User loyalty status and rewards display |
| `src/components/RewardsPanel.tsx` | Public rewards catalog browsing and redemption UI |
| `src/components/AdminLoyaltyPanel.tsx` | Admin 3-tab panel: rewards catalog, manual awards, statistics |
| `src/pages/admin/loyalty/index.astro` | Admin loyalty management page |

### Social Features
| File | Purpose |
|------|---------|
| `src/lib/social-features.ts` | Hashtag trending logic, mention detection |
| `src/pages/api/hashtags/index.ts` | Trending hashtags endpoint |
| `src/pages/api/hashtags/[slug].ts` | Hashtag detail with tagged places/reviews |
| `src/pages/api/users/[id]/mentions.ts` | User mentions and notifications endpoint |
| `src/pages/api/users/[id]/profile.ts` | Public user profile endpoint |
| `src/pages/api/leaderboards/users.ts` | Top users leaderboard endpoint |
| `src/components/HashtagExplorer.tsx` | Hashtag browsing and trending display |
| `src/components/UserPublicProfile.tsx` | Public user profile display |
| `src/pages/sosyal/index.astro` | Social exploration page with feed and hashtag explorer |

### Subscriptions & User Management
| File | Purpose |
|------|---------|
| `src/lib/subscriptions.ts` | Stripe integration, subscription tier management |
| `src/lib/feature-gating.ts` | Feature availability checking by subscription tier |
| `src/pages/api/subscriptions/checkout.ts` | Stripe checkout session creation |
| `src/pages/api/subscriptions/webhook.ts` | Stripe webhook event handler |
| `src/pages/api/subscriptions/tiers.ts` | Available subscription tiers endpoint |
| `src/pages/api/user/quotas.ts` | Feature usage quotas endpoint |
| `src/pages/api/blocking/block.ts` | Block user endpoint |
| `src/pages/api/blocking/check.ts` | Check if user is blocked endpoint |
| `src/pages/api/blocking/unblock.ts` | Unblock user endpoint |
| `src/pages/api/reports/submit.ts` | Content report submission |
| `src/pages/api/admin/moderation/reports.ts` | Admin moderation reports list |
| `src/pages/api/admin/moderation/resolve.ts` | Admin report resolution |
| `src/pages/api/admin/moderation/remove-content.ts` | Admin content removal |
| `src/pages/ayarlar/index.astro` | User settings page |
| `src/pages/fiyatlandirma/index.astro` | Subscription pricing page |
| `src/pages/abonelik/index.astro` | Subscription management page |
| `src/components/UserSettings.tsx` | User settings UI |

### Testing
| File | Purpose |
|------|---------|
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
4. **Redis Namespacing**: All new cache keys must start with `sanliurfa:` prefix (handled via `prefixKey()` helper). **CRITICAL**: namespace isolation prevents cache collision with other projects on shared Redis.
5. **Input Validation**: Every API endpoint must validate input via `validateWithSchema()` before using.
6. **Error Handling**: Catch errors in API routes, never throw raw errors to clients. Log to stdout/stderr for server visibility.
7. **SSE Implementation**: Always use `ReadableStream` for real-time endpoints, include `Cache-Control: no-cache` and `Connection: keep-alive` headers, implement client-side exponential backoff reconnection with max 60s delay.
8. **Gamification Hooks**: `checkCommonAchievements()` must be called from event hooks, not directly. It has internal try/catch so it cannot throw.
9. **Cache Invalidation**: On any mutation (POST/PUT/DELETE), invalidate related cache patterns. For loyalty changes, invalidate `sanliurfa:loyalty:*` and `sanliurfa:tier:*` patterns.
10. **Admin Guard**: Every admin endpoint must check `if (!locals.user || locals.user.role !== 'admin')` and return 403 FORBIDDEN, never redirect.
11. **Fire-and-Forget**: For non-critical background work (marking mentions as read), queue async queries without awaiting to avoid request timeout.

### Performance Optimization
- Cache aggressively (5-10 min TTL for reads, invalidate on mutations)
- Monitor database pool: if utilization > 80%, investigate slow queries
- Use `/api/performance` to identify bottlenecks before they become incidents
- Slow queries (> 1000ms) auto-logged with warnings, investigate immediately
- Slow requests (> 500ms) tracked, review aggregates to identify trending issues

### Adding Features

**New Database Tables**:
- Update `ALLOWED_TABLES` in `postgres.ts`
- Create migration file in `migrations/` (timestamp_description.sql)
- Run migration on all environments before deploying endpoint code

**New API Endpoints**:
- Follow response formatter pattern from `src/lib/api.ts`
- Include auth checks (`locals.user`, role checks for admin)
- Validate input via `validateWithSchema()` before using
- Record metrics: `recordRequest(method, path, status, duration)`
- Log important mutations: `logger.logMutation(action, table, recordId, userId, details)`
- Return X-Request-ID in response headers
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
