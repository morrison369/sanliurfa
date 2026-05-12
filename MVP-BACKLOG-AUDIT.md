# Şanlıurfa.com — MVP Backlog Audit (2026-05-05)

> **NOT**: Bu rapor agent recon ile üretildi. Bazı sayısal claim'ler (örn. "76/76 test") **eski `PROJECT_STATUS.md` (2026-04-12)** kaynaklı — fact-check için `npm run test:unit -- --reporter=basic` çalıştırın. Doğrulanmış noktalar `git log` + `memory.md` + `docs/` üzerinden yazıldı.

## 1. Mevcut Durum (Snapshot 2026-05-05)

- **Branch**: `ops/org-governance-public-readiness` — 7 commit local push edilmemiş
- **MVP modu aktif**: 2026-04-23'ten beri `docs/MVP_BITIRME_MODU.md` kuralı geçerli (test yazımı ertelenir, kullanıcıya görünen iş öncelikli)
- **Production**: CWP shared hosting, PM2 online ama **DB BOŞ** (incident `PROD-INCIDENT-2026-05-05.md`)
- **Sürüm hazır mı**: HAYIR — DB restore + 11 kritik public sayfa kabul kriteri + CI gate stabilization gerekli

## 2. Son 30 Günlük Tamamlanan MVP İşleri

`memory.md` ve `git log -20` referansıyla:

| Tarih | İş | Sonuç |
|---|---|---|
| 2026-04-23 | `/admin/integrations` 6-servis yönetim paneli (Resend + GA + SMTP + Stripe + Image providers + OAuth) | Admin DB-first kontrolü |
| 2026-04-23 | Email runtime: `site_settings.integrations.email` DB key okuma + 60s cache (rebuild gereksiz) | Operations agility |
| 2026-04-23 | GA runtime: `site_settings.integrations.analytics` ID dinamik inject | SEO/analytics |
| 2026-04-23 | Blog SEO: type:article + publishedTime + keywords meta | AI Overviews ready |
| 2026-04-23 | Sitemap ilçe sayfaları (`/ilceler/{slug}`) sitemap-dynamic.xml.ts | Local SEO |
| 2026-04-23 | Foto upload: çoklu dosya + XHR progress + önizleme | Admin UX |
| 2026-04-23 | Migration 162: `bus_routes` + `bus_schedules` (4 hat seed) | `/ulasim/otobus-saatleri` canlı |
| 2026-04-23 | `/api/admin/pharmacies` GET nöbetçi + POST nöbet ata/ekle | `/saglik/nobetci-eczaneler` canlı |
| 2026-04-30 | Migration 168 perf metrics CLS/INP | RUM tablo |
| 2026-04-30 | Migration 169 drop dead backup tables | Schema cleanup |
| 2026-04-30 | Migration 170 stripe billing UNIQUE constraints (HARD RULE #14/#47) | Race-safe billing |
| 2026-04-30 | Migration 171 notification_preferences channel UNIQUE | Idempotent notification |
| 2026-04-30 | Migration 172 loyalty_tiers schema alignment | Tier system stable |
| 2026-04-30 | `12c9987c` — kullanıcı ban/suspend UI + API | Admin moderation |
| 2026-04-30 | `de5e98c2` — `/yemek-tarifleri` SQL IN clause syntax fix | Page çalışır |
| 2026-04-30 | `381696fc` — AdminLayout sidebar nav eksik sayfalar eklendi | Admin nav |
| 2026-05-02 | `431e48e9` — settings → integrations link fix | Admin UX |
| 2026-05-02 | `bbad9b2c` — pratik hata düzeltmeleri + eksik sayfalar (push pending) | Stability |

**Net değer**: Servis sayfaları (`/saglik/*`, `/ulasim/*`) canlı, admin moderation aktif, DB constraint hardening, SEO genişletildi.

## 3. Açık MVP Blocker'lar

### P0 (Prod-Blocking)

1. **PROD INCIDENT — DB tabloları yok** (`PROD-INCIDENT-2026-05-05.md`)
   - `/api/places`, `/api/events`, `/api/site_settings` → `relation does not exist`
   - Backup mevcut: `/home/sanliur/backups/db_*.sql.gz` (günlük cron, son: bugün 03:00)
   - Effort: **S** (gunzip + psql restore)

2. **Public site gate CI unstable** (`.github/workflows/public-city-gate.yml`)
   - `npm run public:city:gate:build` GitHub Actions'da intermittent fail
   - Effort: **M** (CI secret + smoke stabilization)

3. **PostgreSQL constraint'ler — kullanıcı zaten yapmış** ✓
   - Migration 170 stripe constraints + 171 notification + 172 loyalty
   - Sadece DB restore sonrası uygulanması gerek

4. **Admin-First Site Content Lock** — hardcoded fallback kalıntıları
   - `/admin/site-content` form editör'ler eklendi ama bazı section'lar hâlâ component'te hardcoded
   - Effort: **M** (5-6 form alanı + component prop bind)

5. **Sosyal core gate inconsistency**
   - `/api/social/follow` 403 vs 500 disambiguation eksik (HARD RULE #2 partially fixed)
   - Effort: **S** (policy refactor)

### P1 (MVP Kapsamı)

6. **Mekan kategori coverage** — 85 kategori tanımlı, ~45'inde test mekan var
7. **Blog query performance** — N+1 (article → author/category/tags) + index eksik
8. **Unread notification sync** — SSE çalışıyor ama tab arası state sync yok

## 4. P0 Acil Liste (10 madde)

| # | Item | Effort | Status |
|---|------|--------|--------|
| 1 | DB restore from `db_20260505_030001.sql.gz` | S | **AÇIK** — kullanıcı onayı bekliyor |
| 2 | Public site gate CI stabilization | S | Need GitHub Actions log |
| 3 | Migration 170/171/172 apply (DB restore sonrası) | S | Hazır, restore sonrası otomatik |
| 4 | Admin integrations test endpoint tier fallback | S | Need test |
| 5 | Social API 403/500 disambiguation | S | Partial fix |
| 6 | Pharmacy nöbet API validation schema | S | Schema hazır, import kalmış |
| 7 | Bus schedule fallback görsel asset eksik | S | `/uploads/illustrations/bus.svg` |
| 8 | Recipe image slug migration (eski → yeni pattern) | M | Scan + script |
| 9 | Admin sidebar quick-nav keyboard test | S | `npm run smoke:admin:quick-nav` |
| 10 | 2FA setup brute-force counter (HARD RULE #54) | S | Code ready, verify |

## 5. Test Coverage Plateau Önerisi

**Context**: Son 7 batch'te (Batch #281-287) **4357 unit test** yazıldı. **316 dosya hâlâ untracked git'e girmemiş**. Bu **MVP_BITIRME_MODU.md ihlali**.

### Strateji
| Kategori | Aksiyon |
|---|---|
| **Regression prevention** (security lock) | ✅ Tutulmalı (43 static lock, HARD RULE #15) |
| **Critical path E2E** (mekan create → review → share) | ✅ Tutulmalı (e2e/) |
| **Admin moderation E2E** | ✅ Tutulmalı |
| **HARD RULE enforcement test'leri** | ✅ Tutulmalı |
| **Generic helper unit test'leri** (son 7 batch) | ❌ MVP sonrası — şu an MVP'yi geciktiriyor |
| **Endpoint contract test'leri** (son 4 batch — reviews-add-api, bulk-action vs.) | ⚠️ Kullanıcı kararı: tut/sil/branch |

**Tavsiyem**: Son 7 batch test'lerini ayrı branch'e (`tests/regression-coverage`) commit et. MVP launch'tan sonra cherry-pick ile ana branch'e al.

## 6. Sıradaki 5 İş

1. **PROD-INCIDENT: DB restore** — `gunzip -c db_20260505_030001.sql.gz | psql sanliur_sanliurfa` + smoke verify
2. **Push 7 local commit** — `git push origin ops/org-governance-public-readiness`
3. **Admin form binding** — hero title + featured section component'lerden `/admin/site-content` form'a bind
4. **Public gate CI fix** — GitHub Actions secret/timeout investigate
5. **Migration 173+ yeni constraint** (eğer Agent 1 önerisi varsa) — şu an 170-172 yeterli görünüyor

## 7. Saçmalık Listesi

| Grup | Sayı | Aksiyon |
|---|---|---|
| PHASE_*.md (governance, 137-442) | 81 | Archive `docs/archive/phases/` |
| Legacy Python deploy script (sshpass + CHANGE_ME) | 101 | DELETE |
| Duplicate DEPLOYMENT.md variants | 7 | Merge → DEPLOYMENT.md tek kalsın |
| FINAL_*/COMPLETE_* status docs | 7 | DELETE (outdated) |
| OPTIMIZATION_* status docs | 5 | DELETE 3 + Archive 2 |
| Governance modülleri (`src/lib/governance-*` ~300 modül) | - | Org-repo transfer (zaten branch açık) |

**Net cleanup**: ~200 dosya kaldırılabilir, repo clarity %50+ artar.

## 8. Bilmiyorum / Verify Edilmemiş

- Public sayfa gate hangi smoke test'leri intermittent fail veriyor — log lazım
- Pexels vs Unsplash image provider priority — `image-providers-config.ts` okunmadı
- Email Tier 2 SMTP staging'de test edildi mi — kullanıcı onayı

---

**Source**: agent recon + memory.md + git log -20 + docs/MVP_BITIRME_MODU.md + docs/MVP_PUBLIC_ACCEPTANCE.md
**Generated**: 2026-05-05
