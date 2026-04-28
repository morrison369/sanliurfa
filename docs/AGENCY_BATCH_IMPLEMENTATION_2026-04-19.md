# Ajans Seviyesi Toplu Uygulama Notu (2026-04-19)

Bu dokuman, "onerilerin hepsini yap" talebi icin uygulanan operasyonel iyilestirmelerin ozetidir.

## Uygulanan Maddeler

1. Konfig hardening
- Dinamik `import.meta.env[...]` erisimini engelleyen gate eklendi.
- Script: `scripts/ci/no-dynamic-import-meta-env.mjs`
- NPM komutu: `npm run env:gate`

2. Tek port / tek surec disiplini
- Her toplu komut sonunda dev daemon kapatma + orphan kontrolu zorunlu hale getirildi.
- Script: `scripts/runtime/run-with-cleanup.mjs`
- `gate:isolated` bu mekanizmaya tasindi.

3. Admin-first/DB-first operasyon guvencesi
- Mevcut `smoke:site-settings:schema` akisi gate zincirinde korunuyor.
- Site ayarlari/sayfa bloklari DB-first kontrolu gate akisinin parcasidir.

4. Sosyal cekirdek gate
- `social:core:gate` eklendi ve `gate:done` icine dahil edildi.
- Script: `scripts/smoke/social-place-phase1.mjs`
- Saglik endpointi icin retry/wait eklendi, yerel host `127.0.0.1` sabitlendi.
- Place submit adimi default non-blocking; strict istenirse:
  - `STRICT_PLACE_SUBMIT=1 npm run social:core:gate`

5. SEO/GEO/AIO teknik yuzey gate
- `llms.txt`, sitemap ve robots varligini kontrol eden gate eklendi.
- Script: `scripts/ci/seo-geo-surface-gate.mjs`
- NPM komutu: `npm run seo:geo:gate`

6. Gorsel slug standardi gate
- Manifestteki gorsel isimlerinin slug kuralina uymasini kontrol eden gate eklendi.
- Script: `scripts/ci/slug-image-naming-gate.mjs`
- NPM komutu: `npm run images:slug:gate`

7. Release gate sade ve tek noktadan
- `gate:done` icerisine yeni gate'ler dahil edildi:
  - `env:gate`
  - `images:slug:gate`
  - `seo:geo:gate`
  - `social:core:gate`
- Yeni komut: `npm run gate:agency`

8. Gozlemlenebilirlik ve temiz kapanis
- `scripts/ci/apply-all-recommendations.mjs` icin `finally` temizligi eklendi:
  - `dev:isolated:stop`
  - `dev:isolated:check-no-orphan`

## Hedeflenen Kullanim

```bash
npm run gate:agency
```

Bu komut:
- tum kritik gate zincirini calistirir,
- sonunda dev surecini kapatir,
- orphan process birakmaz.
