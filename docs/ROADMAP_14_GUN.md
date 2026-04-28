# Şanlıurfa.com - 14 Günlük Uygulama Yol Haritası

Amaç: Admin-first yönetim, sosyal modül stabilizasyonu, release güvenliği ve SEO/GEO kalite kapılarını
tek bir operasyon planında kapatmak.

## Gün 1
- Hedef: Admin-first kapsam envanteri.
- İş: DB dışı sabit içeriklerin (hero, menü, landing blok) listelenmesi.
- Dosyalar: `src/pages/index.astro`, `src/components/Header.astro`, `src/data/site.ts`.
- Done: Envanter raporu ve taşınacak alanların backlogu.

## Gün 2
- Hedef: Site ayar şeması tamamı.
- İş: Landing, nav, SEO, sosyal ve medya alanlarının tek şemada normalize edilmesi.
- Dosyalar: `src/lib/site-settings-schema.ts`, `src/lib/site-settings-zod.ts`.
- Done: Tüm alanlar için type+validator uyumu.

## Gün 3
- Hedef: Admin panel içerik ekranları.
- İş: Hero, menü, homepage blokları için edit ekranları ve API uçları.
- Dosyalar: `src/pages/admin/site-content.astro`, `src/pages/api/admin/site/*`.
- Done: Kod değişmeden içerik güncellenebilir durum.

## Gün 4
- Hedef: Medya pipeline entegrasyonu.
- İş: Slug bazlı görsel adlandırma + manifest + kalite/moderasyon kapısı.
- Dosyalar: `scripts/content-scraper/*`, `public/images/*`.
- Done: `images:pipeline:db` yeşil, eksik görsel fail.

## Gün 5
- Hedef: Sosyal modül faz 1 sertleşme.
- İş: Arkadaşlık, mesajlaşma, görünürlük ayarlarında abuse/rate-limit kuralları.
- Dosyalar: `src/pages/api/social/*`, `src/lib/social/*`.
- Done: Social core gate ve API contract testleri geçer.

## Gün 6
- Hedef: Sosyal modül faz 2.
- İş: Mekan yorum/puan/foto için anti-spam ve moderasyon kuyruğu.
- Dosyalar: `src/pages/api/reviews/*`, `src/lib/review/*`, `src/pages/admin/moderation.astro`.
- Done: Riskli içerikler admin kuyruğuna otomatik düşer.

## Gün 7
- Hedef: Swipe/match faz 3.
- İş: 4 foto limitli profil ve eşleşme sonrası mesaj izni akışı.
- Dosyalar: `src/pages/eslesme.astro`, `src/lib/social/match-*`, `src/pages/api/social/*`.
- Done: E2E smoke ile swipe -> match -> message akışı geçer.

## Gün 8
- Hedef: API contract sert kapı.
- İş: OpenAPI parity ve problem+json standardının kalan endpointlere yayılması.
- Dosyalar: `src/pages/api/**`, `scripts/openapi/*`, `src/lib/__tests__/openapi-*`.
- Done: `api:release:gate` tamamen yeşil.

## Gün 9
- Hedef: Performans bütçesi.
- İş: LCP/CLS/INP ve kritik route TTFB eşiklerinin CI kapısına bağlanması.
- Dosyalar: `scripts/ci/*`, `lighthouserc*`, `playwright.config.ts`.
- Done: Performans kapısı eşikleri fail/pass üretir.

## Gün 10
- Hedef: SEO/GEO/AEO yüzeyi tamamı.
- İş: Kategori/landing schema parity, internal linking ve AI-citable blok iyileştirmeleri.
- Dosyalar: `src/components/SEO*.astro`, `src/pages/*`, `src/pages/llms.txt.ts`.
- Done: SEO/GEO gate raporunda P0 açık kalmaz.

## Gün 11
- Hedef: DB bakım standartları.
- İş: index bakım, partition arşiv, vacuum/analyze ve slow query rapor akışı.
- Dosyalar: `scripts/jobs/*`, `src/migrations/*`, `docs/*`.
- Done: Haftalık bakım job planı ve doğrulama scriptleri hazır.

## Gün 12
- Hedef: CWP operasyon konsolidasyonu.
- İş: daily/weekly/release-readiness çıktılarını tek operasyon dashboard raporuna bağlama.
- Dosyalar: `scripts/cwp-ops-report.sh`, `scripts/prod-cwp-ops.sh`.
- Done: Tek rapordan günlük+haftalık+release sağlığı görünür.

## Gün 13
- Hedef: Release rehearsal.
- İş: staging/prod benzeri ortamda `ops:cwp:release-readiness` + rollback tatbikatı.
- Dosyalar: `scripts/prod-cwp-ops.sh`, `scripts/cwp-release-readiness.sh`.
- Done: Tatbikat raporu, rollback süresi ve hata notları.

## Gün 14
- Hedef: Kapanış ve canlıya hazır paket.
- İş: Açık backlogların P0/P1 kapanışı, dokümantasyon finali.
- Dosyalar: `DEPLOYMENT.md`, `docs/CWP_DOMAIN_USER_OPERATIONS_2026-04-19.md`, `PROJECT_STATUS.md`.
- Done: “Go-live checklist” tam ve imzalanabilir durumda.

## Günlük Komut Ritmi
- Sabah: `npm run ops:cwp:daily`
- Akşam: `npm run ops:cwp:release-readiness`
- Haftalık: `npm run ops:cwp:weekly`

