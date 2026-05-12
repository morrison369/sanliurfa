# Frontend Stabilizasyon Notu

Bu belge yeni karar üretmez. Kanonik frontend kararları:

- `docs/MVP_PUBLIC_ACCEPTANCE.md`
- `docs/ASTRO_SSR_FRONTEND_STACK.md`
- `docs/UI_CONTRACTS.md`

## Net Durum

Astro SSR, Tailwind ve TypeScript hattı kurulu. Tasarım probleminin nedeni eksik Astro paketi değil; public yüzeylerde eski lokal CSS, koyu tema kalıntısı, alakasız görsel fallback ve dağınık route sözleşmeleridir.

## Zorunlu Hat

- Ana public tema sıcak light Şanlıurfa şehir rehberi temasıdır.
- Yeni public section eski koyu tema hexlerini veya emoji placeholder kullanmaz.
- Görsel seçimi `public-image-resolvers.ts`, `seo-image.ts` veya `image-map.ts` üzerinden yapılır.
- `/`, `/arama`, `/harita`, `/saglik/nobetci-eczaneler`, `/topluluk`, `/eslesme` gate kapsamındadır.
- Bir frontend batch `astro check`, `public:city:gate`, `test:e2e:astro:preview` ve `release:astro:gate` geçmeden tamam sayılmaz.
