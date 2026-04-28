# Astro Baseline

Bu proje Astro 6 SSR + React adasi modeliyle calisir. Uygulama tarafinda resmi Astro dokumanina gore sabitlenen taban cizgi:

- `@astrojs/node`: SSR, sessions ve server-side route davranisi icin kullanilir.
- `@astrojs/react`: React island bileşenleri icin kullanilir.
- `@astrojs/sitemap`: public route sitemap üretimi icin kullanilir.
- `@astrojs/partytown`: ucuncu taraf scriptleri ana thread disina tasimak icin kullanilir.

## Proje Kararlari

- `output: 'server'` kullanilir.
- Canonical origin `https://sanliurfa.com` merkezlidir.
- Astro prefetch aciktir ve tum dahili linklerde `hover` stratejisi ile calisir.
- Remote image optimizasyonu yalnizca yetkili hostlar icin aciktir:
  - `images.pexels.com`
  - `images.unsplash.com`
  - `source.unsplash.com`
- Content collections `src/content.config.ts` icinde `astro/zod` ile semalandirilir.
- Ortam degiskenleri `astro.config.mjs` icindeki `env.schema` ile tiplenir.
- `src/env.d.ts`:
  - `ImportMetaEnv` genisletir
  - `App.SessionData` tiplerini tanimlar

## Operasyon Notlari

- Tip üretimi ve content/env senkronu icin:
  - `npm run astro:sync`
- Framework seviyesi kontrol icin:
  - `npm run -s type-check`
- Build dogrulamasi icin:
  - `npm run -s build`

## Resmi Referanslar

- Astro environment variables
- Astro sessions
- Astro images
- Astro content collections
- Astro prefetch
