# SSR + PWA Runtime Checklist

## SSR
- Kritik veri fetch noktalarında try/catch + fallback state var.
- SSR hataları kullanıcıya kırmızı ekran yerine kontrollü içerik döndürüyor.
- Runtime logları context içeriyor (`route`, `slug`, `query`, `requestId`).

## PWA
- `manifest.webmanifest` geçerli ve güncel.
- App icons (maskable dahil) tam set.
- Android Chrome install akışı doğrulandı.
- iOS Safari “Ana Ekrana Ekle” akışı ve UX metni mevcut.
- Offline fallback route/page mevcut.

## Deploy Öncesi
- Service worker stratejisi güncel.
- Cache invalidation planı mevcut.
- PWA artefact’ları production build ile senkron.
