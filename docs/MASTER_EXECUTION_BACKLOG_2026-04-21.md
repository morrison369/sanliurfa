# Şanlıurfa.com Master Uygulama Backlog (2026-04-21)

Bu dosya, son öneri paketinin tek yerden takip edilmesi için hazırlanmıştır.

## Çalışma Modu: MVP Bitirme

- Durum: Aktif ve varsayılan
- Referans: `docs/MVP_BITIRME_MODU.md`
- Kural: Zorunlu runtime hatası dışında altyapı/test/CI döngüsüne girilmez; her turda kullanıcıya görünen site, admin paneli, mekan sistemi, sosyal MVP veya SEO/AEO/GEO yüzeyi kapatılır.

## P0 (Kritik)

1. Secret rotasyonu ve sızıntı önleme
- Durum: Uygulandı (runbook + gate zinciri)
- Uygulama:
  - `docs/security-key-rotation-runbook.md`
  - `npm run security:scan-secrets`
- Not: Harici panelde (Unsplash/Pexels/Stripe/Resend) gerçek key yenilemesi operasyon adımıdır.

2. Tek süreç / tek port zorlaması
- Durum: Uygulandı (hard cleanup eklendi)
- Uygulama:
  - `scripts/runtime/cleanup-project-listeners.mjs`
  - `scripts/runtime/run-with-cleanup.mjs`
  - `scripts/runtime/check-no-orphan-dev.mjs`
  - `npm run runtime:cleanup:listeners`

3. Admin-first DB içerik yönetimi
- Durum: Uygulandı
- Uygulama:
  - `docs/DB_FIRST_SITE_MANAGEMENT.md`
  - `/admin/site-content` ve `/api/admin/site/*` akışları

## P1 (Yüksek)

4. Sosyal çekirdek güvenlik/abuse/rate-limit
- Durum: Uygulandı
- Uygulama:
  - `src/lib/social/abuse-policy.ts`
  - `src/lib/social/request-guard.ts`
  - `src/pages/api/social/*`
  - `npm run social:core:gate:strict`

5. Medya hattı fail-safe
- Durum: Uygulandı
- Uygulama:
  - `scripts/content-scraper/*`
  - `npm run images:pipeline:db`
  - slug bazlı görsel gate: `npm run images:slug:gate`

6. SEO/GEO yüzey + parity
- Durum: Uygulandı
- Uygulama:
  - `npm run canonical:domain:gate`
  - `npm run public:city:gate`
  - `npm run seo:geo:gate`
  - `docs/content-cluster-quality-report.md`

7. API sözleşme + canlı smoke
- Durum: Uygulandı
- Uygulama:
  - `npm run api:release:gate`
  - `npm run openapi:sync:routes:gate`
  - `npm run smoke:api:critical`

## P2 (Operasyonel)

8. CWP operasyon sadeleştirme
- Durum: Uygulandı
- Uygulama:
  - `npm run ops:cwp:safe-deploy`
  - `scripts/prod-cwp-ops.sh`

9. Operasyon özetlerinin tek yerden görünümü
- Durum: Uygulandı
- Uygulama:
  - `src/pages/api/admin/monitoring/index.ts`
  - `docs/release-readiness.md`
  - kalite raporları (`docs/*.json`, `docs/*.md`)

10. Domain-bazlı modülerleşme planı
- Durum: Planlandı + takipte
- Uygulama:
  - `docs/ROADMAP_14_GUN.md`
  - `docs/DETAYLI_PROJE_ONERILERI_VE_UYGULAMA_PLANI.md`

## Toplu Çalıştırma

- Tek komut (tam paket): `npm run ops:next:bulk`
- Beklenen çıktı:
  - Public şehir kabul gate'i ilk adımda yeşil
  - Gate/Build/Test yeşil
  - Ready raporlar güncel
  - Port 4321 temiz (`NO_LISTENER_4321`)
