# Production Readiness Audit — Şanlıurfa.com

**Project**: Astro 6.1 SSR + React 19 + PostgreSQL + Redis  
**Date**: May 5, 2026  
**Status**: PRODUCTION-READY with critical blockers below

---

## 1. Environment Variables — 🟢 OK

47 envField entries in astro.config.mjs, properly classified:
- Server secrets (JWT_SECRET, REDIS_PASSWORD, STRIPE_SECRET_KEY, SENTRY_DSN)
- Client public (PUBLIC_GA_MEASUREMENT_ID, PUBLIC_VAPID_PUBLIC_KEY)
- .env.example + .env.production.template documented
- **Action**: Create .env.production with actual secrets before deploy (never commit)

---

## 2. PM2 Ecosystem Config — 🔴 BLOCKER

**TWO conflicting files exist**:
- **ecosystem.config.cjs**: Correct (fork mode, kill_timeout: 10000, 512M memory) ✓
- **ecosystem.config.js**: WRONG (cluster mode, NO kill_timeout, 1G memory)

**ACTION**: Delete ecosystem.config.js immediately
```bash
rm ecosystem.config.js
```
Reason: Missing kill_timeout causes graceful shutdown to fail after 5s (kills DB connections mid-drain).

---

## 3. Health Endpoints — 🟢 OK

/api/health returns: DB status + latency, Redis connectivity, integrations summary, memory usage.
HTTP 200 if all services connected, 503 otherwise.
Integrations cached 30s (prevents 5 DB queries per health poll).

---

## 4. Database Migrations — 🟢 OK

73 migrations (001-138), all safe patterns.
Only 001_initial_schema.ts has DROP TABLE (acceptable for initial setup).
All subsequent migrations additive (CREATE TABLE, ALTER TABLE, CREATE INDEX).
No destructive patterns in production migrations.

---

## 5. Redis Namespace — 🟢 OK

HARD RULE #18 enforced:
- prefixKey() mandatory for all cache operations
- KEY_PREFIX = 'sanliurfa:' ensures isolation
- Raw createClient() not exposed to app code
- Static lock test validates

---

## 6. Backup Mechanisms — 🟡 WARN

Script present (/scripts/backup.sh):
- pg_dump -F c with gzip compression
- Retention cleanup (7 days default)

**ACTION REQUIRED**: Schedule cron job
```bash
0 2 * * * /path/to/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## 7. Sentry / Error Tracking — 🟢 OK

Optional integration:
- SENTRY_DSN unset = silent skip, DB error_logs table fallback
- Email PII hashed, headers stripped
- Browser-side: ErrorBoundary.astro lazy-imports if PUBLIC_SENTRY_DSN set
- Keep SENTRY_TEST_ERROR_ENABLED=false in production

---

## 8. Rate Limiting — 🟢 OK

Redis-based tiered limits (per 15-minute window):
- Auth: 10 req/IP, 5 req/user
- Upload: 20 req/IP, 10 req/user
- Admin: 300 req/IP, 150 req/user
- Default: 100 req/IP, 40 req/user

Implemented in src/middleware.ts + Redis atomic ops. Fails open on Redis unavailable.

---

## 9. SEO & Production Setup — 🟢 OK

- robots.txt: Allows all search engines + AI bots ✓
- Disallows: /admin/, /api/, private pages ✓
- Sitemap: /sitemap.xml (SSR endpoint, DB-driven) ✓
- JSON-LD schemas: Organization, Place, Event, Recipe, BlogPosting ✓
- llms.txt: 11 KB, allows AI bots ✓
- Image optimization: Astro <Image> component, sharp, lazy loading ✓

---

## 10. Web Server Config — 🔴 BLOCKER

No sample Apache/Nginx configuration provided.

**ACTION REQUIRED**: Create CWP-NGINX-CONFIG-SAMPLE.md with:
```nginx
client_max_body_size 1M;     # regular routes
client_max_body_size 15M;    # upload routes
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
proxy_pass http://127.0.0.1:3000;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
```

---

## 11. Image Storage — 🟡 WARN

Local disk only (OK):
- src/lib/file/file-storage.ts → public/uploads/photos/
- No S3/GCS/Azure (FORBIDDEN)
- Currently EMPTY (0 files)

**Issues**:
1. No orphan cleanup (deleted files remain on disk)
2. No quota enforcement (UPLOAD_MAX_SIZE env unused)
3. Unbounded disk growth risk

**ACTION REQUIRED**:
1. Create scripts/cleanup-orphan-images.ts (monthly cron)
2. Implement /api/admin/storage-usage endpoint
3. Monitor via: du -sh public/uploads/photos

---

## 12. Bundle Size & Build — 🟢 OK

22M total artifact, ~10-11s build time. 
CI static lock validates: CSS ≤250KB, JS ≤1100KB, ≤130 chunks.
Ready for production deployment.

---

## 13. Cron / Scheduled Jobs — 🔴 BLOCKER

Astro SSR has no built-in cron.

**ACTION REQUIRED**: Schedule external tasks

```bash
# Daily 2 AM: Database backup
0 2 * * * /path/to/scripts/backup.sh

# Hourly: Email queue processing
0 * * * * curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" https://sanliurfa.com/api/emails/process

# Daily 1 AM: Metrics aggregation
0 1 * * * curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" https://sanliurfa.com/api/metrics/aggregate
```

Ensure all endpoints are idempotent.

---

## 14. Open Ports / Dev Artifacts — 🟢 OK

- /api/sentry-test: env-gated, disabled in prod ✓
- DevToolbar: dev-only, stripped from prod build ✓
- No mock endpoints ✓
- Private routes protected (role check, auth cookie) ✓
- Security headers present ✓

---

## 15. TypeScript Strictness — 🟢 OK

- strict: true, noImplicitAny, strictNullChecks all active ✓
- npm run type-check: 0 errors ✓
- 783 uses of ':any' (mostly test mocks) — acceptable ✓
- New code properly typed ✓

---

## Critical Blockers — MUST FIX BEFORE DEPLOY

1. **Delete ecosystem.config.js** (prevents kill_timeout bug)
2. **Schedule cron jobs** (backup, email, metrics)
3. **Create web server config sample** (Apache/Nginx setup)

---

## Deployment Checklist

- [ ] ecosystem.config.js deleted
- [ ] .env.production created with secrets
- [ ] npm run db:migrate executed
- [ ] npm run build succeeds
- [ ] curl http://localhost:3000/api/health → HTTP 200
- [ ] Cron jobs scheduled
- [ ] Apache/Nginx reverse proxy configured
- [ ] Backup script tested
- [ ] Monitoring alerts configured

---

**Audit Date**: May 5, 2026  
**Owner**: @elginozoguz

