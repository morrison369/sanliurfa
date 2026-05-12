# 🚨 PROD INCIDENT — `/api/places` 500 Error (2026-05-05)

**Discovered**: 2026-05-05 20:31 UTC during prod smoke test
**Severity**: 🔴 HIGH — Core endpoint broken (places list) — affects homepage + place browsing
**Status**: ✅ RESOLVED — 2026-05-07

## Resolution (2026-05-07)

- `/api/places` → HTTP 200 (migrations were applied, columns exist — `thumbnail_url`, `avg_rating`, `is_featured`)
- `events` query fix: `short_description`→`description AS short_description`, `event_date`→`start_date::text AS event_date` (`home-data.ts`)
- 10 category pages (acil-durum, otomotiv…) → missing from prod server, transferred and rebuilt
- `middleware.ts` PUBLIC_PATHS updated to include all category pages
- Migration 020: 19 critical DB indexes applied (CONCURRENTLY, no downtime)
- Smoke test: 19/19 PASS post-deploy

## Symptom

All variants of `/api/places` GET return HTTP 500:

```
GET https://sanliurfa.com/api/places              → 500
GET https://sanliurfa.com/api/places?limit=5      → 500
GET https://sanliurfa.com/api/places?limit=20     → 500
GET https://sanliurfa.com/api/places?limit=1      → 500
GET https://sanliurfa.com/api/v1/places?limit=5   → 500
```

Response body:
```json
{
  "type": "/problems/places-index-get-failed",
  "title": "Mekanlar Alınamadı",
  "status": 500,
  "detail": "Mekanlar getirilirken bir hata oluştu",
  "instance": "/api/places"
}
```

TTFB: ~120ms (fast fail = catch path fired immediately, not DB timeout).

## Other Endpoints Healthy (smoke test 2026-05-05 20:31 UTC)

| Endpoint | Status | TTFB |
|---|---|---|
| `/api/health` | 200 ✓ | 180ms |
| `/` | 200 ✓ | 215ms |
| `/sitemap.xml` | 200 ✓ | 117ms |
| `/robots.txt` | 200 ✓ | 184ms |
| `/llms.txt` | 200 ✓ | 105ms |
| `/api/places?limit=5` | **500** ✗ | 118ms |
| `/blog` | 200 ✓ | 184ms |
| `/etkinlikler` | 200 ✓ | 120ms |
| `/hakkinda` | 200 ✓ | 133ms |
| `/iletisim` | 200 ✓ | 112ms |

**Pass rate: 9/10 (90%)** — DB and Redis appear healthy (other endpoints work).

## Endpoint Code Analysis (`src/pages/api/places/index.ts`)

The catch handler (line 116) swallows the actual error and returns generic 500:
```ts
} catch (err) {
  logger.error('Places fetch error:', err);   // log but no detail in response
  return problemJson({ status: 500, ... });
}
```

The query (line 44):
```sql
SELECT id, slug, name, category, rating, review_count, is_featured,
       latitude, longitude, thumbnail_url, avg_rating, status, created_at
FROM places WHERE status = $1
ORDER BY rating DESC LIMIT $N OFFSET $N+1
```

## Most Likely Root Causes (ranked)

1. **Missing column in prod DB schema** — most likely.
   Prod migration not applied → `thumbnail_url` or `avg_rating` column doesn't exist.
   PostgreSQL throws `column "..." does not exist` error.

2. **Migration mismatch** — column renamed locally but prod still has old name.
   E.g., local refactor renamed `featured` → `is_featured` but prod migration not run.

3. **Cache layer error** — `getCache` or `setCache` throws, but other endpoints work
   (favorites uses cache too) → unlikely.

4. **DB pool exhausted** — TTFB 118ms is fast (no timeout), so unlikely.

## Diagnostic Plan (requires SSH access to prod)

Connect to prod via:
```bash
ssh -p 77 sanliur@168.119.79.238   # password auth (key not authorized)
```

Then run these checks:

### 1. Inspect prod DB schema vs query expectations

```bash
# On prod server:
psql sanliur_sanliurfa -c "\d places" | head -40
```

Expected columns the endpoint requires:
```
id, slug, name, category, rating, review_count, is_featured,
latitude, longitude, thumbnail_url, avg_rating, status, created_at
```

If any are missing → **migration not applied**.

### 2. Check migration status

```bash
cd /home/sanliur/public_html
npm run db:migrate:status
```

If pending migrations → `npm run db:migrate`.

### 3. Capture exact PG error from PM2 logs

```bash
pm2 logs sanliurfa-app --lines 100 | grep -i "places\|column.*does not exist"
```

### 4. Manual repro on prod

```bash
psql sanliur_sanliurfa -c "
SELECT id, slug, name, category, rating, review_count, is_featured,
       latitude, longitude, thumbnail_url, avg_rating, status, created_at
FROM places WHERE status = 'active'
ORDER BY rating DESC LIMIT 5;
"
```

The PostgreSQL error will tell the missing column name directly.

## Recommended Fix Path

### If schema mismatch (most likely):

```bash
ssh -p 77 sanliur@168.119.79.238
cd /home/sanliur/public_html
git pull origin main          # ensure latest migration files synced
npm run db:migrate            # apply pending migrations
pm2 restart sanliurfa-app     # restart app

# Verify fix
curl https://sanliurfa.com/api/places?limit=1
# Expect: HTTP 200
```

### If transient (Redis/pool issue):

```bash
pm2 restart sanliurfa-app
sleep 10
curl https://sanliurfa.com/api/places?limit=1
```

## Related Hardening Recommendations

After fix verified, also:

1. **Improve error visibility** — endpoint catch should include `safeErrorDetail(err, 'Mekanlar getirilirken bir hata oluştu')` so dev env shows real error (production stays sanitized — HARD RULE #9). Currently the detail is hardcoded → no debugging info even in dev.

2. **Add this endpoint to `prod-cwp-ops.sh smoke`** — currently smoke probably hits `/api/health` only; add `/api/places?limit=1` to detect this regression earlier.

3. **CI smoke test against staging** — run `scripts/prod-smoke-curl.sh` (with TARGET=staging) after every deploy before promoting to prod.

## Reproducible Smoke Test

```bash
bash scripts/prod-smoke-curl.sh
# Verdict: FAIL (1/10 endpoint failing)
# Expected after fix: PASS (10/10)
```

---

**This file is checked in as ops record. Update with resolution timestamp + cause when fixed.**
