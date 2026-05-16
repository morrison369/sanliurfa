# Şanlıurfa.com — Ops Runbook

**Hedef**: SSH ile prod'a giriş yaptıktan sonra tek bakışta ne çalıştıracağın.

**Prod**: `sanliur@168.119.79.238:77` → `/home/sanliur/public_html`
**SSH**: Password auth (key yetkili değil) — `sshpass -p $PASS ssh -p 77 sanliur@168.119.79.238`

---

## 1. 🚨 ÖNCELİKLİ — Açık Incident'lar

### `/api/places` HTTP 500 (2026-05-05 keşfedildi)
Detay: `PROD-INCIDENT-2026-05-05.md`

**Hızlı tanı + fix**:
```bash
ssh -p 77 sanliur@168.119.79.238
cd ~/public_html

# 1. Migration durumunu kontrol et
npm run db:migrate:status

# 2. Pending migration varsa uygula
npm run db:migrate

# 3. PM2 restart
pm2 restart sanliurfa-app

# 4. Doğrula (lokalden)
exit
curl -sS https://sanliurfa.com/api/places?limit=1
# Beklenen: HTTP 200
```

Eğer migration zaten temizse → DB schema kontrolü:
```bash
psql sanliur_sanliurfa -c "\d places"
# Bu sütunların hepsi olmalı:
# id, slug, name, category, rating, review_count, is_featured,
# latitude, longitude, thumbnail_url, avg_rating, status, created_at
```

---

## 2. Tek Komut Ops (zaten kurulu — `package.json` scripts)

Bu scriptler **CWP sunucusunda** çalıştırılır (SSH ile gir, sonra çalıştır):

### Sağlık + smoke
```bash
npm run ops:cwp:health           # PM2 + DB + Redis ping
npm run ops:cwp:smoke            # endpoint smoke (CWP içi)
npm run ops:cwp:doctor           # auto-diagnostic
npm run ops:cwp:env-check        # .env eksik vars
npm run ops:cwp:report           # daily summary
```

### Deploy
```bash
npm run ops:cwp:safe-deploy      # snapshot + build + restart + verify
npm run ops:cwp:deploy           # plain deploy (no snapshot)
npm run ops:cwp:rollback         # son release'e dön
npm run ops:cwp:releases         # release listesi (son 20)
```

### Cron yönetimi
```bash
npm run ops:cwp:cron:show              # mevcut cron'ları göster
npm run ops:cwp:cron:preview           # eklenecekleri göster (dry-run)
npm run ops:cwp:cron:diff              # mevcut vs önerilen fark
npm run cron:readiness:report          # local/CI managed cron preview kanıtı
npm run ops:cwp:cron:install           # 9 cron job'ı kur
npm run ops:cwp:cron:install:if-needed # idempotent — varsa skip
npm run ops:cwp:cron:apply-safe        # güvenli mod (yedek alır)
npm run ops:cwp:cron:remove            # tüm yönetilen cron'ları kaldır
```

### Pipeline (full)
```bash
npm run ops:cwp:oneshot          # preflight + env-check + doctor + health + smoke + safe-deploy + release-readiness
npm run ops:cwp:pipeline         # standart pipeline
npm run ops:cwp:pipeline:strict  # strict mode (her hata → fail)
```

### Audit + incident
```bash
npm run ops:cwp:audit            # genel audit
npm run ops:cwp:incident-bundle  # incident için log bundle hazırla
npm run ops:cwp:triage           # triage report
```

---

## 3. Cron Jobs (zaten tanımlı — install gerek)

`scripts/cwp-cron-install.sh` 9 job kurar:

| Cron | Schedule | Komut |
|---|---|---|
| doctor-hourly | `5 * * * *` | `ops:cwp:doctor` |
| smoke-6hour | `35 */6 * * *` | `ops:cwp:smoke` |
| report-daily | `45 3 * * *` | `ops:cwp:report` |
| rotate-events-daily | `10 3 * * *` | `ops:cwp:rotate-events` |
| cleanup-weekly | `20 3 * * 0` | `ops:cwp:cleanup` |
| incident-cleanup-weekly | `30 3 * * 0` | `ops:cwp:incident-cleanup` |
| daily-ops | `5 4 * * *` | `ops:cwp:daily` |
| weekly-audit | `15 4 * * 0` | `ops:cwp:weekly` |
| release-readiness | `35 4 * * *` | `ops:cwp:release-readiness` |
| nightly-evidence | `50 4 * * *` | `NIGHTLY_INCLUDE_ADSENSE_LIVE=1 npm run -s jobs:nightly:core` |

Log konumu: `~/public_html/backups/.ops/cron-*.log`

**Aktivasyon adımı (bir kerelik)**:
```bash
ssh -p 77 sanliur@168.119.79.238
cd ~/public_html
npm run ops:cwp:cron:install:if-needed
crontab -l | grep SANLIURFA   # doğrula
```

---

## 4. Web Server Config

CWP zaten Apache reverse proxy kullanıyor (port 4321 → :443). Smoke test ile doğrulandı:
- ✅ `/sitemap.xml` 117ms — Apache statik dosyaları doğru servis ediyor
- ✅ `/api/health` 180ms — proxy + Node.js çalışıyor
- ✅ `/robots.txt` 184ms — public dosyalar OK

**Mevcut konfigürasyon yeterli görünüyor.** Eğer Apache config refresh gerekirse:

```bash
ssh -p 77 sanliur@168.119.79.238
sudo systemctl reload httpd      # Apache reload (graceful)
# veya
sudo systemctl restart httpd     # full restart (downtime ~2s)
```

Gözlemlenmesi gereken metrikler:
- `pm2 monit` — Node.js memory/CPU
- `pm2 logs sanliurfa-app --lines 100` — recent errors
- `tail -f /var/log/httpd/error_log` — Apache errors

---

## 5. k6 Load Testing (Lokal — k6 yüklü olmalı)

### Lokal çalıştırma — k6 binary gerekli
Windows: `winget install k6`
macOS:   `brew install k6`
Linux:   `sudo apt install k6`

### Smoke (1 VU, ~10 req, ~5sn — prod-safe)
```bash
bash load-tests/run-prod.sh smoke
```

### Baseline (50 VU × 5 dk — prod'a hit eder, dikkat!)
```bash
bash load-tests/run-prod.sh baseline
# Onaylama prompt'u çıkar — y ile devam
```

### k6-less smoke (bash + curl)
```bash
bash scripts/prod-smoke-curl.sh
# 10 endpoint test eder, ~10sn sürer
# Şu anki sonuç: 9/10 PASS, /api/places 500 (incident açık)
```

---

## 6. DB Index Audit (DB-INDEX-AUDIT.md)

**18 missing index önerildi** — `DB-INDEX-AUDIT.md` detaylı.

### Tier 1 — En kritik 5 index (uygulama önerilir)

```bash
ssh -p 77 sanliur@168.119.79.238
psql sanliur_sanliurfa
```

```sql
-- Hepsi CONCURRENTLY = no table lock = no downtime
CREATE INDEX CONCURRENTLY idx_reviews_place_id_status
  ON reviews (place_id, status);

CREATE INDEX CONCURRENTLY idx_places_owner_id_status
  ON places (owner_id, status);

CREATE INDEX CONCURRENTLY idx_comments_entity_status
  ON comments (entity_type, entity_id, status);

CREATE INDEX CONCURRENTLY idx_reviews_user_created
  ON reviews (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_blogs_author_status_published
  ON blog_posts (author_id, is_published, published_at DESC);
```

Tahmini etki: **%40-60 query speedup** filtered queries için, +~450MB storage, %2-3 INSERT/UPDATE penalty.

### Doğrulama (her index için)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM reviews WHERE place_id = 'sample-place-id' AND status = 'approved';
-- Beklenen: "Index Scan using idx_reviews_place_id_status"
-- Önceki: "Seq Scan on reviews" (full table scan)
```

### Geri alma (gerekirse)
```sql
DROP INDEX CONCURRENTLY idx_reviews_place_id_status;
-- 2-5 sn, no lock
```

---

## 7. Backup + Rollback

### Manual backup
```bash
ssh -p 77 sanliur@168.119.79.238
cd ~/public_html
bash scripts/backup.sh           # pg_dump + tar
ls -lh backups/                  # son backup'ları göster
```

### Restore (dikkat!)
```bash
bash scripts/restore.sh backup_20260505_030000.sql.gz
```

### Snapshot pre-deploy
```bash
bash scripts/snapshot-dist.sh    # dist/ snapshot, son 5 saklanır
```

### Rollback deploy
```bash
bash scripts/rollback-deploy.sh  # son snapshot'a dön
# veya
npm run ops:cwp:rollback         # CWP-aware rollback
```

---

## 8. Quick Diagnostic Commands

### Prod CPU/RAM
```bash
ssh -p 77 sanliur@168.119.79.238 "top -bn1 | head -10"
```

### PM2 status (memory leak check)
```bash
ssh -p 77 sanliur@168.119.79.238 "pm2 list && pm2 monit"
```

### Recent errors
```bash
ssh -p 77 sanliur@168.119.79.238 "pm2 logs sanliurfa-app --lines 200 --nostream | grep -iE 'error|exception|failed'"
```

### Disk space
```bash
ssh -p 77 sanliur@168.119.79.238 "df -h | head -5"
```

### DB connection count
```bash
ssh -p 77 sanliur@168.119.79.238 "psql sanliur_sanliurfa -c 'SELECT count(*) FROM pg_stat_activity;'"
```

---

## 9. Deployment Checklist (her release öncesi)

```bash
# Lokal:
npm run lint:ci                              # type-check + lint + image audit
npm run test:unit                            # 4357 test (Batch #287'ye kadar)
bash scripts/prod-smoke-curl.sh             # mevcut prod sağlık

# SSH prod:
ssh -p 77 sanliur@168.119.79.238
cd ~/public_html
npm run ops:cwp:preflight                   # pre-flight check
npm run ops:cwp:env-check                   # env eksikliği var mı
git pull origin main
npm install
npm run build
npm run db:migrate                          # migrations
bash scripts/snapshot-dist.sh               # snapshot
pm2 restart sanliurfa-app
sleep 10
npm run ops:cwp:health
exit

# Lokal:
bash scripts/prod-smoke-curl.sh             # post-deploy smoke
npm run adsense:readiness:live              # /ads.txt, AdSense meta, robots crawler izni
npm run release:next-actions                # advisory aksiyon planı
npm run db:observation:cadence              # DB 14 günlük gözlem cadence
npm run db:manual:decision:readiness        # manuel DB karar hazırlığı
# 10/10 PASS bekleniyor
```

---

## Google Maps Scraper / Shared Hosting

Google Maps scraper prod ortamda Docker ile değil, Go binary + Node.js orkestrasyonu ile çalışır.

```bash
cd ~/public_html
npm run gmaps:prod:install                  # tek seferlik Linux binary kurulumu
npm run gmaps:prod:check                    # binary health check
npm run gmaps:query-plan                    # DB'den scripts/gmaps-queries.txt üretir
npm run gmaps:discovery-plan                # kategoriler.txt'den keşif sorguları üretir
npm run gmaps:discovery-drafts              # dry-run: keşif aday taslak raporu
npm run gmaps:discovery-drafts:apply        # pending admin taslaklarına yazar, yayınlamaz
npm run gmaps:enrich:full                   # depth=1, concurrency=1, local storage görseller
```

Kurallar:
- `GMAPS_SCRAPER_BIN` verilirse önce o binary kullanılır.
- Varsayılan prod binary yolu `$HOME/tools/google-maps-scraper`.
- Windows ve prod PostgreSQL için `DATABASE_URL` varsa query plan DB'den üretilir; DB yoksa yerel fallback veriye düşer.
- Dev ve prod aynı PostgreSQL URL'sini kullanıyorsa bu değer tek kaynak olarak `.env`, `.env.local`, `.env.production` veya `scripts/.env.scripts` içinde `DATABASE_URL`/`PROD_DATABASE_URL` adıyla tutulur; scriptler bu dosyaları otomatik okur.
- `scripts/gmaps-queries.txt` satırları `arama sorgusu #!#slug` formatındadır; scraper çıktısındaki `input_id` doğrudan mekan slug eşleştirmesi sağlar.
- `scripts/gmaps-discovery-queries.txt` kategori keşfi içindir; bu dosyadan gelen sonuçlar otomatik DB update değil, aday inceleme/import akışı için kullanılır.
- `gmaps:discovery-drafts:apply` yalnızca `city_content_drafts` içine `pending` taslak yazar; mekan yayını, otomatik import veya otomatik publish yapmaz.
- Shared hosting için `--concurrency=1 --depth=1` korunur.
- `--fast-mode` kullanılacaksa upstream CLI `--geo` ister; Şanlıurfa koordinatı verilmeden fast-mode çalıştırılmaz.
- Görseller yalnızca `/public/uploads/places` altına yazılır; CDN/object storage kullanılmaz.

---

## Notlar

- **Sentry kullanılmıyor** (kullanıcı tercihi). Error tracking için DB `error_logs` tablosu.
- **Sınırlı SSH erişimim var** (key authorize değil) — bu runbook kullanıcı tarafından çalıştırılır.
- Tüm scripts idempotent — birden fazla çalıştırılması güvenli.

## Stripe / Ödeme Sistemini Aktif Etme

Uygulama şu an **Faz 1 (ücretsiz mod)** çalışıyor — tüm checkout akışları devre dışı.

Stripe'ı etkinleştirmek için `.env`'e şunu ekle ve yeniden deploy et:

```bash
PHASE1_FREE_MODE=false
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> **Dikkat**: `PHASE1_FREE_MODE=false` yapıldığında tüm abonelik sayfaları (`/abonelik`) ve checkout endpoint'leri (`/api/billing/checkout`) canlıya geçer. Önce staging'de test et.
>
> `PHASE1_FREE_MODE` ayarlanmamışsa (veya `true` ise) ödeme sistemi her zaman kapalı kalır — güvenli default.

---

**Son güncelleme**: 2026-05-05
**Yazan**: Ops audit + smoke test + DB index analysis pipeline
