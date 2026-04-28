# Development Guide

Şanlıurfa.com platformu için tam geliştirme kılavuzu.

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Run linter
npm run lint

# Run tests
npm run test

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/           # React + Astro components
├── layouts/             # Page layouts
├── lib/                 # Core business logic
│   ├── auth.ts          # Authentication
│   ├── postgres.ts      # Database
│   ├── cache.ts         # Redis caching
│   ├── privacy.ts       # Privacy management
│   ├── messages.ts      # Messaging system
│   ├── notifications-queue.ts  # Notifications
│   └── performance-monitor.ts  # Performance tracking
├── migrations/          # Database migrations (001-058)
├── pages/               # File-based routing
│   ├── api/            # REST API endpoints
│   └── admin/          # Admin pages
├── styles/             # Tailwind CSS
└── types/              # TypeScript definitions

e2e/                     # End-to-end tests
  ├── messaging.spec.ts  # Messaging tests
  ├── privacy.spec.ts    # Privacy tests
  ├── 2fa.spec.ts       # 2FA tests
  └── ...

public/                 # Static files
  ├── manifest.json     # PWA manifest
  ├── service-worker.js # Service worker
  └── offline.html      # Offline fallback
```

## Development Workflow

### 1. Create New Feature

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes in src/
# Test locally: npm run dev
# Run tests: npm run test

# Commit changes
git add .
git commit -m "feat: Add feature description"

# Push and create PR
git push origin feature/feature-name
```

### 2. Add Database Table

1. Create migration in `src/migrations/NNN_description.ts`
2. Implement migration function with CREATE TABLE statements
3. Add import and export to `src/lib/init-migrations.ts`
4. Add rollback function for migration
5. Test: `npm run build` compiles migrations

### 3. Add API Endpoint

1. Create file at `src/pages/api/resource/action.ts`
2. Implement APIRoute handler
3. Use proper error handling and logging
4. Add to OpenAPI docs if needed
5. Create E2E test in `e2e/`

### 4. Add Library Function

1. Create or edit `src/lib/module.ts`
2. Export typed functions
3. Use consistent error handling
4. Add JSDoc comments
5. Create unit tests

## Key Technologies

### Backend
- **Framework**: Astro 6.1 with Node.js adapter
- **Database**: PostgreSQL with pg connection pool
- **Cache**: Redis with namespaced keys
- **Auth**: JWT + bcrypt (12 rounds)
- **Logging**: Structured logging with request IDs

### Frontend
- **UI Framework**: React 19 for interactive components
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **PWA**: Service Worker + manifest.json
- **Real-time**: Server-Sent Events (SSE)

### DevOps
- **Build**: Vite + Astro build
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Code Quality**: TypeScript strict, Astro check
- **CI/CD**: GitHub Actions (on demand)

## Code Standards

### TypeScript
- Strict mode enabled (`"strict": true`)
- No `any` types without `// @ts-expect-error` comment
- Explicit return types for functions
- Interface-based architecture

### Database
- Parameterized queries only (`$1`, `$2`, etc.)
- Table allowlist validation in `postgres.ts`
- Migrations run sequentially on startup
- Connection pooling configured

### API Endpoints
- Consistent response format: `{ success, data, error }`
- HTTP status codes from `HttpStatus` enum
- Error codes from `ErrorCode` enum
- Request ID tracking for observability
- Rate limiting on auth endpoints

### Error Handling
- Never expose stack traces to clients
- Log errors with context (userId, action, etc.)
- Return user-friendly error messages
- Use proper HTTP status codes

### Performance
- Cache strategy: 5-10 min TTL for stable data
- Lazy load images and components
- Code split by routes
- Monitor with `/api/performance` dashboard

## Common Tasks

### Debug Slow Query
```bash
# Check query performance
npm run db:psql
SELECT * FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

### Check Cache Hit Rate
Visit `/api/metrics` dashboard and check `cacheHitRate`

### Monitor Real-time Metrics
```bash
# Watch in browser
curl http://localhost:3000/api/metrics
curl http://localhost:3000/api/performance
curl http://localhost:3000/api/health
```

### Run Specific Test
```bash
npm run test:e2e -- messaging.spec.ts
npm run test:unit -- src/lib/auth.test.ts
```

### Debug Performance
1. Open DevTools Console
2. Check performance metrics logged
3. Use Lighthouse audit
4. Review `/api/admin/performance/summary`

## Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key (min 32 chars)
- `REDIS_URL` - Redis connection

**Optional**:
- `NODE_ENV` - `production` or `development`
- `CORS_ORIGINS` - Allowed CORS origins
- `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, `GITHUB_CLIENT_ID` - OAuth credentials
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Payment processing
- `RESEND_API_KEY` - Email service

## Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf dist/ node_modules/
npm install --legacy-peer-deps
npm run build
```

### Tests Fail
```bash
# Start fresh
npm run db:reset  # Reset test database
npm run test:unit -- --reporter=verbose
npm run test:e2e -- --debug
```

### Performance Issues
1. Check `/api/performance` dashboard
2. Review slow queries in postgres
3. Monitor Redis hit rate
4. Check Core Web Vitals in browser DevTools

### Database Connection Issues
```bash
# Test connection
npm run db:psql

# Check pool status
curl http://localhost:3000/api/health
```

## Deployment

See `DEPLOYMENT.md` for production deployment guide.

## Contributing

1. Create feature branch
2. Write tests for new code
3. Follow code standards (TypeScript strict, no `any`)
4. Run `npm run lint` before commit
5. Create PR with clear description
6. Ensure CI passes (tests, build, linting)
7. Get code review approval
8. Merge to main

## Security Considerations

- **SQL Injection**: Always use parameterized queries
- **XSS**: Sanitize user input in validation layer
- **CSRF**: Use state tokens for OAuth flows
- **Rate Limiting**: Configured on auth endpoints
- **Session**: httpOnly secure cookies, strict SameSite
- **Secrets**: Never commit `.env` files

## Performance Goals

- **LCP**: < 2.5 seconds
- **FID**: < 100 milliseconds
- **CLS**: < 0.1
- **Page Load**: < 3 seconds
- **API Response**: < 500 milliseconds
- **Cache Hit Rate**: > 80%
- **Test Coverage**: > 80%

## Resources

- [Astro Docs](https://docs.astro.build/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Docs](https://redis.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Web.dev Performance](https://web.dev/performance/)
