# Performance Budget (Release Gate)

## Core Web Vitals Hedefleri
- LCP: `<= 2.5s`
- CLS: `<= 0.10`
- INP: `<= 200ms` (hedef)

## Payload ve Asset Bütçesi
- Ana sayfa total JS (initial): `<= 220KB gzip`
- Tek görsel dosya limiti (hero hariç): `<= 300KB`
- Hero görsel: `<= 450KB` (WebP/AVIF tercih)
- Route başına toplam kritik görsel: `<= 1.5MB`
- `dist/client` toplam soft budget: `<= 260MB`
- `_astro` raw JS toplam route-split budget: `<= 1900KB`

## Render ve Runtime
- Critical content SSR fallback süresi: en fazla 1 boş durum geçişi.
- Blocking script kullanımına izin yok.
- Lazy load kullanılmayan görsel kalmamalı.

## Artifact Takibi
- `_astro` CSS / JS bütçesi build artefact üstünden sert korunur.
- `dist/client` toplam boyutu soft budget olarak izlenir; local filesystem media cleanup tamamlanana kadar blocker yerine operasyon sinyali kabul edilir.
- `public/uploads` mutable local medya olarak ayrıca izlenir; `>= 1 MB` dosyalar düzenli optimize edilmelidir.
- `public/uploads` parity raporu release öncesi missing reference sayısını `0` tutmalıdır; unreferenced candidate dosyalar otomatik silinmez.
- `public/uploads` local disk soft limit varsayılanı `512MB` olarak izlenir (`LOCAL_UPLOAD_SOFT_LIMIT_MB` ile değiştirilebilir).
- `public/uploads` quota eşikleri: advisory `%70`, review `%85`, blocker `%95` (`LOCAL_UPLOAD_ADVISORY_PERCENT`, `LOCAL_UPLOAD_REVIEW_PERCENT`, `LOCAL_UPLOAD_BLOCKER_PERCENT` ile değiştirilebilir).
- `public/uploads` ownership modeli bucket bazında raporlanır; sahipliği sınıflandırılmamış dosya otomatik silinmez.
- `public/images` sabit proje medyası olarak ayrıca izlenir; `>= 300 KB` dosyalar optimize edilmelidir.
- Kanonik rapor: `docs/build-artifact-report.md`
- Upload optimizasyon raporu: `docs/local-upload-optimization-report.md`
- Upload parity/orphan raporu: `docs/local-upload-parity-report.md`
- Release artifact freshness raporu: `docs/release-artifact-freshness.md`
- E2E JSON raporu: `docs/e2e-report.md`
- Static image optimizasyon raporu: `docs/static-image-optimization-report.md`
- Üretim komutu: `node scripts/ci/build-artifact-report.mjs`

## Gate Mantığı
- Bütçe ihlali release blocker.
- İstisna gerekiyorsa PR açıklamasında teknik gerekçe + telafi planı zorunlu.
