# Production Cron Schedule — Şanlıurfa.com

Astro SSR'da built-in cron yok. Tüm scheduled iş'ler **server-side OS cron** veya **CWP cron job manager** üzerinden tetiklenir. Endpoint'lerin tamamı **idempotent** (HARD RULE #7) — duplicate trigger zarar vermez.

## Setup

```bash
crontab -e
```

`/etc/crontab` veya kullanıcı crontab'ına şunu ekle:

```cron
# === Şanlıurfa.com Production Cron ===
# Format: M H DOM MON DOW command

# Env (cron'da PATH eksik olur)
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
INTERNAL_API_TOKEN=xxx_REPLACE_WITH_REAL_TOKEN
SITE_URL=https://sanliurfa.com
APP_DIR=/home/sanliurfa/public_html

# ─────────────────────────────────────────────────
# DAILY (UTC) - Backup, cleanup, aggregation
# ─────────────────────────────────────────────────

# 02:00 — DB backup (pg_dump + 7 day retention)
0 2 * * * cd $APP_DIR && bash scripts/backup.sh >> logs/cron-backup.log 2>&1

# 03:00 — Uploaded image orphan cleanup (DB referansı olmayan dosyalar)
0 3 * * * cd $APP_DIR && npx tsx scripts/cleanup-orphan-images.ts >> logs/cron-cleanup.log 2>&1

# 04:00 — Log rotation (PM2 log_rotate ek olarak)
0 4 * * * find $APP_DIR/logs -name "*.log" -mtime +14 -delete

# 05:00 — Sitemap regeneration cache invalidation
0 5 * * * curl -fsS -H "Authorization: Bearer $INTERNAL_API_TOKEN" $SITE_URL/api/sitemap/regenerate >> logs/cron-sitemap.log 2>&1

# ─────────────────────────────────────────────────
# HOURLY - Email queue, metrics, webhooks
# ─────────────────────────────────────────────────

# */15 dk — Email queue process (Resend/SMTP retry'lı)
*/15 * * * * curl -fsS -H "Authorization: Bearer $INTERNAL_API_TOKEN" -X POST $SITE_URL/api/emails/process >> logs/cron-email.log 2>&1

# */15 dk — Webhook delivery retry queue
*/15 * * * * curl -fsS -H "Authorization: Bearer $INTERNAL_API_TOKEN" -X POST $SITE_URL/api/webhooks/trigger >> logs/cron-webhooks.log 2>&1

# Saatte bir — metrics aggregation (web vitals, request stats)
0 * * * * curl -fsS -H "Authorization: Bearer $INTERNAL_API_TOKEN" -X POST $SITE_URL/api/metrics/aggregate >> logs/cron-metrics.log 2>&1

# ─────────────────────────────────────────────────
# WEEKLY - Heavy aggregation
# ─────────────────────────────────────────────────

# Pazar 04:00 — Cohort analytics rebuild
0 4 * * 0 curl -fsS -H "Authorization: Bearer $INTERNAL_API_TOKEN" -X POST $SITE_URL/api/analytics/cohort-rebuild >> logs/cron-cohort.log 2>&1

# Pazar 05:00 — Search index optimize
0 5 * * 0 curl -fsS -H "Authorization: Bearer $INTERNAL_API_TOKEN" -X POST $SITE_URL/api/search/reindex >> logs/cron-search.log 2>&1

# ─────────────────────────────────────────────────
# UPTIME PROBE (5 dk)
# ─────────────────────────────────────────────────

# Health check — 5 dk'da bir, fail olursa admin@sanliurfa.com'a mail
*/5 * * * * curl -fsS $SITE_URL/api/health > /dev/null || echo "HEALTH FAIL $(date)" | mail -s "Sanliurfa Health Down" admin@sanliurfa.com
```

## CWP Cron Manager Üzerinden

CWP > Server Settings > Cron Jobs:

1. Above her satırı **ayrı job** olarak gir.
2. **User**: `sanliurfa` (veya app kullanıcısı, root değil).
3. **Output**: stdout+stderr'i `logs/cron-*.log` dosyalarına yönlendir.
4. **Notification**: failure mail için CWP > User > Email Notifications.

## Validation

```bash
# 1. Cron log'ları kontrol et — son 1 saat
tail -100 /var/log/cron | grep sanliurfa

# 2. Backup'ın çalıştığını doğrula
ls -lh /home/sanliurfa/public_html/backups/ | tail -5
# Beklenen: bugünün tarihiyle backup_YYYYMMDD_HHMMSS.sql.gz dosyası

# 3. Email queue boyutu
curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" $SITE_URL/api/emails/queue-status

# 4. Metrics aggregation status
curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" $SITE_URL/api/admin/metrics/last-aggregation
```

## Idempotency Guarantee

Tüm endpoint'ler aynı input ile birden çok kez çağrılabilir:

| Endpoint | Idempotency Mekanizması |
|---|---|
| `/api/emails/process` | DB row `status = 'sent'` set sonrası tekrar gönderilmez (HARD RULE #14 atomic UPDATE) |
| `/api/webhooks/trigger` | `webhook_logs.delivery_id` UNIQUE constraint |
| `/api/metrics/aggregate` | `INSERT ON CONFLICT (period_start) DO NOTHING` |
| `/api/sitemap/regenerate` | Cache key replace, idempotent by definition |
| `/api/analytics/cohort-rebuild` | Tablo TRUNCATE + REINSERT, transaction'lı |
| `backup.sh` | Yeni timestamp dosyası — collision yok |

## Failure Handling

- **Cron job fail**: cron MAILTO env varsa otomatik mail. CWP cron manager'da "On Failure: Email" işaretle.
- **Endpoint 5xx**: log'a yazılır. PM2 restart trigger etmez (cron tetikli işler app log'unda görünmez).
- **DB down**: `/api/health` 503 dönerek uptime monitor alarmlanır.

## Notlar

- `INTERNAL_API_TOKEN` → `astro:env` schema'da tanımlı, `.env.production` içinde set edilmeli (HARD RULE #10).
- Cron komutları **CWP user** olarak çalışır, root değil. PM2 process aynı user'ın altında olmalı.
- `curl -fsS` flag açıklaması: `-f` HTTP error'da fail, `-s` silent (cron noise az), `-S` error'u stderr'e yaz.
