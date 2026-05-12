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

## Render ve Runtime
- Critical content SSR fallback süresi: en fazla 1 boş durum geçişi.
- Blocking script kullanımına izin yok.
- Lazy load kullanılmayan görsel kalmamalı.

## Gate Mantığı
- Bütçe ihlali release blocker.
- İstisna gerekiyorsa PR açıklamasında teknik gerekçe + telafi planı zorunlu.
