# Şanlıurfa.com — Proje Mimarisi Haritası

**Son Güncelleme:** 2026-05-05  
**Hedef:** Yeni geliştirici 30 dakkalık onboarding

## 1. Stack Özeti

Astro 6.1 SSR + React 19 + PostgreSQL (raw pg) + Redis + bcrypt JWT + Stripe + Astro SSR

Deployed: CentOS Web Panel (PM2 port 4321 → Apache 443)

*Kaynak: ARCHITECTURE.md, CLAUDE.md Project Overview*

## 2. DB-First Content Management (KRİTİK)

Tüm yönetilebilir içerik database kaynaklı:

**Tablolar:**
- `site_settings` (JSON: homepage.hero, header.brand, vb.)
- `site_content_blocks`
- `site_media_assets`
- `homepage_sections` (visibility + order)
- `site_service_entries` (şehir servisleri)
- `seo_overrides` (entity SEO)
- `site_media_asset_usage` (medya linkler)

**Admin Panel:** `/admin/site-content`
- JSON editör + "Şablon Yükle"
- Dropdown key seçimi
- Preview (DB → public anında)

**DB değişimi → rebuild?** ❌ HAYIR (runtime DB oku, 30s cache)

*Kaynak: docs/DB_FIRST_SITE_MANAGEMENT.md, docs/DB_FIRST_PLATFORM_EXPANSION.md, /src/pages/admin/site-content.astro*

## 3. Mekan Sistemi (Places)

**Akış:** Başvuru → Admin onay → Public

**Tablolar:** places, place_photos, place_reviews

**API:**
- GET /api/places → { places, total }
- GET /api/places/:id
- POST /api/places/apply (başvuru)
- PUT /api/places/:id (admin onay)

**Photo Upload:** Client MIME check → magic bytes validation → /public/uploads/photos/{placeId}/

Cache: places:list:* (5m)

*Kaynak: DATABASE.md, src/migrations/001_initial_schema.ts*

## 4. Authentication + Authorization

**Middleware:** "auth-token" cookie → verifyTokenWithSession() → locals.user

**JWT + Redis:** Login → JWT create + persistAuthSession → 24h window

**Password Reset:** DUMMY_BCRYPT_HASH (timing), SHA-256 token hash (storage)

**2FA:** Secret → TOTP (±1 window) → 5 attempt max → replay check 90s → backup codes

**3-Way Auth:** admin > vendor (ownership check) > else 403 (HARD RULE #11)

*Kaynak: CLAUDE.md HARD RULES #4-6, #11, #35, #39-42, #44, #46, #54*

## 5. SEO / AEO / GEO

- Sitemap: src/pages/sitemap.xml.ts (SSR, DB-driven)
- JSON-LD: Inline <script type="application/ld+json" set:html={...} />
- Canonical: Auto pathname (query HARİÇ)
- llms.txt + robots.txt (AI bot allowlist)

*Kaynak: CLAUDE.md SEO Architecture*

## 6. Content Collections

**src/content.config.ts:**
- blog (title, slug, description, tags, publishedAt, draft, featured)
- tarihi-yerler (period, location, isUnesco)
- etkinlikler (startDate, endDate, isFree)
- places (lat, lon, rating)

*Kaynak: src/content.config.ts*

## 7. Redis Caching (HARD RULE #18)

**Helper pattern:**
```typescript
import { getCache, setCache, deleteCache } from '@/lib/cache/cache';
await getCache('places:list');  // → redis.get('sanliurfa:places:list')
```

**Keys:** sanliurfa:places:list, sanliurfa:session:{token}, sanliurfa:ratelimit:{ip}

**Invalidation:** Mutation sonrası deleteCache() veya deleteCachePattern()

*Kaynak: CLAUDE.md Redis Caching, src/lib/cache/cache.ts*

## 8. Admin-Yönetilen Entegrasyonlar (6 Servis)

| Servis | DB Lokasyon | Rebuild? |
|--------|------------|----------|
| Resend Email | site_settings.integrations.email | ❌ |
| SMTP Fallback | site_settings.integrations.smtp | ❌ |
| Google Analytics | site_settings.integrations.analytics | ❌ |
| Stripe | site_settings.integrations.payment | ❌ |
| Image Providers | site_settings.integrations.image_providers | ❌ |
| OAuth | oauth_providers tablosu | ❌ |

Email 3-tier: Resend → SMTP → Dev log

*Kaynak: CLAUDE.md Production Lifecycle, src/lib/email/index.ts*

## 9. Yeni Özellik Ekleme (9-Step)

1. DB Schema (migration)
2. Helper Library (src/lib/<domain>/)
3. API Endpoint (src/pages/api/<domain>/)
4. Admin UI (opsiyonel)
5. Public Component (React island)
6. Page Integration
7. Tests (unit + security)
8. Documentation (TEST.md)
9. Update Memory (CLAUDE.md)

*Kaynak: docs/DB_FIRST_SITE_MANAGEMENT.md, CLAUDE.md Critical Conventions*

## 10. Testing & Quality

```bash
npm run test:unit                 # Vitest
npm run lint                      # ESLint
npm run type-check                # TypeScript
npm run lint:ci                   # 43 security tests
```

**TEST.md:** Manual test senaryoları (kümülatif)

**Security Static Locks:** vendor-idor, error-leak, redis-namespace, parseint, vb. (HARD RULE enforcement)

*Kaynak: CLAUDE.md SECURITY HARD RULES, TEST.md*

## 11. Strict Prohibitions

❌ i18n (Türkçe-only) — RULE #25
❌ Cloud storage (S3/GCS) — RULE #2, #3, #18
❌ Paid services (Google Maps, SendGrid)
✅ Free: OpenStreetMap, Resend, SMTP, Unsplash/Pexels

*Kaynak: CLAUDE.md Strict Prohibitions*

## 12. Migrations

```bash
npm run db:migrate:status         # Durumu kontrol et
npm run db:migrate                # Çalıştır
```

**Kurallar:** IF EXISTS, foreign keys, default değerleri, indices, down() reverse

*Kaynak: MIGRATIONS.md, src/migrations/*

## 13. CWP Production

Server: CentOS Web Panel (/home/sanliur/public_html)
App: PM2 (sanliurfa-app, port 4321)
Proxy: Apache → 443
DB: PostgreSQL (sanliur_sanliurfa)
Cron: 9 scheduled jobs

Graceful shutdown: registerShutdownHandler (pool.end, redis.quit)

Health: curl http://localhost:4321/api/health

*Kaynak: CLAUDE.md Production Lifecycle*

## 14. HARD RULES Özeti (54 Kural)

Kritikler:
- #2: Magic bytes validation (upload)
- #3: Path traversal regex
- #4: Timing oracle defense
- #6: JWT constant-time compare
- #9: Error sanitization (safeErrorDetail)
- #11: IDOR 3-way auth
- #18: Redis namespace
- #25: i18n YASAK
- #35: Redis session logout
- vb. (tüm liste CLAUDE.md'de)

*Kaynak: CLAUDE.md SECURITY HARD RULES*

## 15. Önemli Dosyalar

- CLAUDE.md (TÜM kurallar, 54 HARD RULES)
- ARCHITECTURE.md (System overview)
- docs/DB_FIRST_SITE_MANAGEMENT.md (KRİTİK: Admin model)
- DATABASE.md (Schema)
- MIGRATIONS.md (Migration tutorial)
- TEST.md (Manual scenarios)
- src/content.config.ts
- src/lib/ (280 modules)
- src/pages/api/ (REST endpoints)
- src/pages/admin/ (57+ admin pages)

## 16. Onboarding Checklist (30 dakika)

- [ ] ARCHITECTURE.md (5 min)
- [ ] CLAUDE.md overview (5 min)
- [ ] DB_FIRST_SITE_MANAGEMENT.md (5 min)
- [ ] DATABASE.md core tables (5 min)
- [ ] npm run dev → localhost:4321 (2 min)
- [ ] /admin/site-content JSON edit (2 min)
- [ ] npm run test:unit, lint (1 min)

---

**Sonuç:** 30 dakikada onboard, sonra 9-step feature checklist başlat.

**Doküman:** D:\sanliurfa.com\sanliurfa\ARCHITECTURE-MAP.md
