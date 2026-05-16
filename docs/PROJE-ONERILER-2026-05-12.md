# Şanlıurfa.com — Stratejik Öneriler Raporu

**Tarih**: 2026-05-12
**Bağlam**: Son 2 oturumda 2000+ prod fix + 7/7 audit priority bitti. Site sağlıklı.
**Hedef**: Kullanıcı kazanımı, performans, sürdürülebilirlik için bir sonraki 90 günlük yol haritası.

---

## 📊 Mevcut Durum Snapshot

| Metric | Değer | Yorum |
|---|---|---|
| Database tablo sayısı | **497** | ⚠️ Çok yüksek (enterprise scale) |
| Index sayısı | **1813** | ⚠️ Over-indexed (avg 3.6/tablo) |
| Aktif kullanıcı | 24 | 🚨 Çok az |
| Place active | 533 | ✅ İyi içerik |
| Real review (Mayıs 2026+) | ~0 | 🚨 1202 review hep seed data |
| event_submissions | 0 | Yeni feature, henüz boş |
| dist/client size | **15 MB** | ✅ Build artefact bütçesi içinde |
| public/uploads size | **222 MB** | ⚠️ Local medya envanteri hâlâ büyük |
| TODO yorumları | 6 | ✅ Düşük tech debt |

---

## 🚨 ACİL (1 hafta)

### 1. Compromised OAuth Credentials Rotation
**Risk**: Yüksek. Eski commit'lerde Google CLIENT_SECRET hardcoded → herkes git history'den görebilir.

```bash
# Google Cloud Console'da:
1. eski OAuth client secret'ı → invalidate
2. yeni credential üret
3. scripts/.env.scripts'e ekle (NEVER commit)
4. prod /home/sanliur/public_html/.env güncelle
```

### 2. GitHub Dependabot Vulnerabilities (2 high)
Her push'ta `GitHub found 2 vulnerabilities on default branch (2 high)` uyarısı geliyor.
- Action: `https://github.com/morrison369/sanliurfa/security/dependabot` ziyaret + her birini PR ile çöz

### 3. Real User Acquisition
24 kullanıcı = ürün dead. Marketing/SEO odakla:
- Google Search Console'a yeni sitemap submit (1485 URL hazır)
- Şanlıurfa Facebook/Instagram lokal gruplara organic post
- Influencer outreach (5-10 yerel travel/food blogger)
- Halfeti tekne turları + Göbeklitepe rehberlerine "Powered by Sanliurfa.com" backlink

### 4. Backup Verification (Cron Aktif mi?)
- `cwp-cron-install.sh` → `db-backup-daily` (02:30 UTC) **canlıda çalışıyor mu?**
- Last backup restore test (dry-run) yapılmalı

---

## 🎯 YÜKSEK ÖNCELİK (2-4 hafta)

### 5. Email Notification System (Place + Event Approval)
Submission notification katmanı artık mevcut; kalan iş, tüm karar akışlarını uçtan uca bağlamak ve smoke ile doğrulamak.

```typescript
// src/lib/email/notification-templates.ts
- place-submission-received.html (başvuru alındı)
- place-submission-approved.html (yayında!)
- place-submission-rejected.html (red sebebi)
- event-submission-received.html
- event-submission-approved.html
- review-received-vendor.html (vendor'a yeni yorum bildirimi)
```

Notlar:
- `received` ve `decision` mailer'ları kaynakta mevcut.
- Eksik olan kısım, place/event approval karar yollarının tamamının bu mailer'lara gerçekten uğradığını smoke ile doğrulamak.
- Resend/SMTP env'lerin admin/integrations'da yönetildiğini hatırla.

### 6. Local Media Storage Optimization (public/uploads 222 MB)
Tüm upload medya local filesystem altında tutuluyor. Build artefact küçüldü ama
kalıcı upload envanteri hâlâ büyük. Sorunlar:
- Kategori bazlı boyut bütçesi görünür değil
- Büyük legacy dosyalar hâlâ yerel disk kullanımını şişiriyor
- Orphan cleanup ve sıkıştırma turu düzenli rapora bağlı değil

**Action plan**:
- Orphan upload cleanup önce dry-run raporuyla gözden geçir
- 1 MB üzeri upload dosyalarını kategori bazlı küçültme/backfill turuna sok
- Tüm yeni görseller için WebP + AVIF üretimini operasyon standardı olarak koru
- Admin/media sağlık raporunda kategori ve uzantı bazlı boyut görünürlüğü tut

### 7. Performance Benchmark (Lighthouse Skoru)
Hiç ölçüm yapılmadı. Önerilen:
- Lighthouse CI GitHub Action → her push'ta otomatik
- Web Vitals dashboard (admin/performance var ama gerçek veri toplanmıyor)
- LCP/CLS/INP target: <2.5s / <0.1 / <200ms

### 8. Search Engine Submission
Sitemap 1485 URL hazır ama Google indexing belirsiz.
- Google Search Console: sitemap submit + indexing coverage report
- Bing Webmaster Tools: aynı sitemap
- Yandex (Türkiye trafiği için önemli): sitemap submit

---

## ⚡ ORTA VADE (1-3 ay)

### 9. Tinder Match Algorithm İyileştirme
2 swipe var → kullanıcılar engage olmuyor. Sebepleri:
- Filter eksik (ilçe / yaş / ilgi alanı)
- Match suggestion'lar random
- No "Suggested for you" weighted by interests

**Implement**:
```sql
-- user_match_profiles şu an: bio, photos, is_discoverable
-- Eksik: interests[], age_range, district, gender_preference
ALTER TABLE user_match_profiles
  ADD COLUMN interests TEXT[],
  ADD COLUMN age_range_min INT,
  ADD COLUMN age_range_max INT,
  ADD COLUMN preferred_district VARCHAR(100),
  ADD COLUMN looking_for VARCHAR(50);
```

Match scoring algorithm:
```typescript
function scoreCandidate(user, candidate) {
  return (
    sharedInterests(user.interests, candidate.interests) * 10 +
    sameDistrict(user.preferred_district, candidate.district) * 5 +
    ageMatch(user.age_range, candidate.age) * 3 +
    profileCompleteness(candidate) * 2
  );
}
```

### 10. ReviewManager Panel Parity
Panel özeti artık gerçek API verisi kullanmalı; `/vendor/yorumlar` ile aynı owner-safe veri modeline bağlı kalmalı.

### 11. Place Card Heart Button Propagation
`FavoriteButton.astro` sadece detail sayfada. Listing sayfalarına da ekle:
- `/mekanlar/[kategori]` cards
- `/isletme/[slug]` related places
- Search results
- Profile favorites listing

### 12. Activity Feed Seeding
`/akis` artık çalışıyor ama 12 activity record (1 test user'a ait). Gerçek feed için:
- Migration: existing reviews/favorites/comments için `user_activities` backfill
- Trigger: yeni review/favorite/comment → automatic activity log
- Background job: günlük popular places/blog posts → "trending" activity

### 13. Place Photo Upload (UI Eksik)
`place_photos` tablosu var, `community_photos` da var, ama UI:
- `/profil/fotolar` var (community photos)
- Mekan detayında "Fotoğraf Ekle" yok
- Vendor için "Mekanın fotoğraflarını yönet" yok (/isletme/panel'de eksik)

### 14. Database Cleanup Migration
**497 tablo + 1813 index over-engineered**. Cleanup:
```sql
-- Legacy duplicate tables (audit ettik):
DROP TABLE IF EXISTS favorites;          -- user_favorites canonical
DROP TABLE IF EXISTS user_activity;      -- user_activities canonical
DROP TABLE IF EXISTS followers;          -- user_follows canonical (varsa)
DROP TABLE IF EXISTS activity_feed;      -- activity_feeds canonical

-- Unused enterprise tables (eğer hiç INSERT yapılmıyorsa):
- ai_inventory_planning, predictive_analytics_results, supplier_*, payout_*,
  vendor_analytics, content_intelligence_*, revenue_intelligence_*, etc.
```

İlk audit: Hangi 200+ tabloya hiç INSERT olmadı? → DROP candidates.

---

## 🏗️ UZUN VADE / STRATEGIC (3-12 ay)

### 15. Mobile App (PWA → Native Wrapper)
Mevcut: PWA + service worker ✅. Next level:
- Capacitor.js ile iOS/Android wrapper (web view + native shell)
- Push notifications (VAPID zaten config'de) → mobile notif
- Native camera API for review photo upload
- Offline-first (place data IndexedDB cache)

### 16. Multi-Tenant / Other Cities
Architecture şu an Şanlıurfa-only ama codebase patterns yeniden kullanılabilir:
- `gaziantep.com`, `mardin.com`, `diyarbakir.com` paralel install
- Shared database (city_id column) veya separate instances
- Şu an risk: i18n hardcoded yasak, Türkçe-only → kolay (no language barrier)

### 17. Content Network: Yöre Bloggerlar
- Vendor onboarding flow improvement (sadece place owner değil, content creator):
  - Yerel food blogger (10 mekanlık review)
  - Travel blogger (kategori başına 5 rehber)
  - Photographer (her place için 3-5 unique photo)
- Revenue share model (premium subscription → blogger paylaşımı)

### 18. Reservation System (Mevcut Altyapı Var!)
`place_reservation_hours`, `place_reservation_settings` tabloları var ama UI yok.
- Frontend: place detail'da "Rezervasyon Yap" button
- Form: tarih + saat + kişi sayısı
- Email confirmation (vendor + user)
- Cancellation policy

### 19. Loyalty Program Tam Aktivasyon
`user_loyalty`, `loyalty_tiers`, `user_points_transactions` — backend zengin ama görünür özellik yok:
- Profil sayfasında "X puan, [Bronz/Gümüş/Altın]" göster
- Tier benefits: ilk yorumda extra 5 puan, foto yorum 10, fav 5
- Monthly leaderboard (üst 10 user → küçük ödül)

### 20. Türkiye Genelinde SEO Otoritesi
Şu an Şanlıurfa keyword'lerinde rank gerek. Strategy:
- 274 blog post (var) → 1000+ blog post (yıllık plan)
- 1 öne çıkan blog haftada (gerçek yazar veya Ollama-assisted)
- Featured snippet optimization (FAQ schema + 40-word answer pattern)
- Reddit/Quora: r/Turkey + r/turkishfood + ekşi sözlük backlink

### 21. Hyperlocal Marketing
- Belediye ile partnership (Şanlıurfa Büyükşehir, ilçe belediyeleri)
- Resmi turizm portalı linki
- Üniversite öğrencileri için kampanya (Harran Üniversitesi 30k öğrenci)

### 22. Premium Subscription Plan
Şu an `subscription_tiers` tablosu var ama monetization eksik.
- Tier 1: Free (mevcut özellikler)
- Tier 2: Premium ($5/ay) — unlimited swipe, see who liked you, priority listing
- Tier 3: Business ($20/ay) — vendor analytics + review response priority + featured

---

## 🛡️ INFRASTRUCTURE / OPERATIONS

### 23. Monitoring + Alerting (Eksik)
- Healthcheck cron ✓ var (DEPLOY-OPS-RUNBOOK.md)
- Ama: error rate spike, slow queries, disk full → no alerts
- Önerim: simple uptimerobot.com (free) + Discord/Slack webhook
- DB slow query log → admin/performance dashboard

### 24. Test Coverage Audit
57 security lock test PASS ama:
- Unit test coverage % bilinmiyor
- E2E test'ler kapsamlı mı?
- `npm run test:e2e` çalıştırıp coverage report al

### 25. Disaster Recovery Drill
- DB backup var (cron'da)
- Ama "tam restore" test edilmedi
- Quarterly DR drill: prod DB snapshot → staging restore → smoke test

### 26. Schema Migration Drift Detection
**Bu oturumda 3 farklı drift bulundu** (favorites, user_activity, followers).
Önerim: CI check
```bash
# Her commit'te DB schema dump alıp git'e koy
pg_dump --schema-only > db/schema.sql
# Diff check: schema değişmişse PR'da uyarı
```

---

## 💎 QUICK WINS (1-2 gün/her biri)

### 27. Place Card ❤️ Propagation
3-5 listing page'e `FavoriteButton` ekle (15 dk/sayfa).

### 28. Profile Menü Geliştirme
`/profil` menüsüne ekle (vendor için göster):
- "İşletme Yorumları" → `/vendor/yorumlar`
- "İşletmem" → `/isletme/panel`
- Conditional rendering: `{user.role === 'vendor' && ...}`

### 29. 404 Sayfası İyileştirme
`/404` çoğu site'da varsayılan. Türkçe + Şanlıurfa-themed:
- "Bu mekan da Halfeti gibi sular altında..." humor
- Popular places + categories link
- Search bar

### 30. Robots.txt AI Crawler Refinement
- Şu an 5 AI crawler explicit allow. Bing/Yandex/Baidu eklenebilir
- LLMs.txt: AI agents için ek metadata (zaten var ama enhance)

### 31. Sitemap Submit Otomasyon
- Her gece sitemap regenerate edilsin (lastmod fresh)
- Google Indexing API auto-ping (sitemap güncellendi)

### 32. Health Endpoint Enhancement
`/api/health` şu an basit. Ekle:
- DB query latency (cache hit/miss ratio)
- Redis status
- Disk usage % (zaten var)
- PM2 uptime
- Pending migrations count

---

## 🎨 UX QUICK WINS

### 33. Hero Image Loading State
Skeleton screen iken sayfa açılırken hero blank — Lighthouse CLS olumsuz etkilenebilir.
- LQIP (Low Quality Image Placeholder) — blurred 20x20 base64 inline
- Astro `Picture` component bunu native destekliyor, sadece config

### 34. Cookie Consent Banner Polish
Bottom-right `sf-cookie-decline / sf-cookie-accept` görünür. UX iyileştirme:
- TR-language daha doğal yazım
- "Sadece gerekli" + "Tümünü kabul" + "Detaylar" 3-button
- GDPR/KVKK uyumlu language

### 35. Search Result UX
`/arama` sayfası var ama:
- No type-ahead suggestions
- No recent searches
- No "Sıkça aranan" hints
- → Fuse.js veya Pagefind ile static search index ek

### 36. Sticky CTA Bar Tüm Detail Pages
İşletme detayda var (Telefon/Konum/Yorum/❤️). Diğer detail:
- Blog post: ❤️ + Paylaş + Yazara yaz
- Recipe: ❤️ + Yazdır + Paylaş
- Historical site: ❤️ + Konum + Tarihçe

---

## 📋 PRİORİTE MATRİSİ

| Aksiyon | Impact | Effort | ROI | Sıra |
|---|---|---|---|---|
| OAuth credentials rotate | 🔥🔥🔥 | 5 dk | ∞ | 1 |
| Email notifications | 🔥🔥🔥 | 2 gün | Yüksek | 2 |
| Real user acquisition | 🔥🔥🔥 | Sürekli | Çok yüksek | 3 |
| Place card ❤️ propagation | 🔥🔥 | 30 dk | Yüksek | 4 |
| Lighthouse + perf optim | 🔥🔥 | 1 gün | Yüksek | 5 |
| Tinder algoritma | 🔥🔥 | 3 gün | Orta | 6 |
| DB cleanup (legacy tablolar) | 🔥 | 1 gün | Düşük (gizli) | 7 |
| Mobile app (PWA→Capacitor) | 🔥🔥🔥 | 2 hafta | Çok yüksek | Strategic |
| Multi-tenant (other cities) | 🔥🔥🔥 | 2 ay | Çok yüksek | Vision |

---

## 🎯 SONUÇ

**Sanliurfa.com şu an "MVP done, growth bekleniyor" aşamasında.**

- ✅ Teknik altyapı: **mükemmel** (Astro 6 + PostgreSQL + Redis + Pexels/Unsplash + Tinder/community)
- ✅ İçerik: **zengin** (533 place, 274 blog, 188 recipe, 58 historical, 238 event)
- ✅ Görsel kalite: **production-ready** (2000+ image fix)
- ✅ Code quality: **high** (57/57 lock test, 0 type error, 1813 index)

**Eksik olan tek şey**: **gerçek kullanıcı + monetization**.

Yapılması gerekenler önem sırasına göre:
1. **Acil** (1 hafta): Security rotate + dependabot + first marketing wave
2. **Yüksek** (1 ay): Email + local media cleanup + Lighthouse + SEO submission
3. **Orta** (3 ay): Mobile app + premium subscription + reservation system
4. **Vizyon** (12 ay): Multi-tenant cities + content network + Türkiye SEO otoritesi

**90 günlük başarı tanımı**:
- 24 kullanıcı → **1000+ user**
- 0 real review → **100+ user review**
- 2 swipe → **500+ swipe/hafta**
- 0 monetization → **TL 10k MRR** (premium + featured listing)

---

## 📚 İlgili Dökümanlar

- `docs/FEATURE-AUDIT-2026-05-12.md` — Önceki audit raporu
- `CLAUDE.md` — Codebase rehberi
- `DEPLOY-OPS-RUNBOOK.md` — Operations
- `docs/SECURITY.md` — Security HARD RULES
- `docs/DEPLOYMENT.md` — Deploy lifecycle
