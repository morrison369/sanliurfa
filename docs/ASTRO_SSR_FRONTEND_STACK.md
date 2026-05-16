# Astro SSR Frontend Stack

Son guncelleme: 2026-05-07

Bu proje Astro SSR sehir rehberi olarak calisir. Kanonik runtime `@astrojs/node` standalone adapter ile uretilen `dist/server/entry.mjs` dosyasidir.

## Kurulu Astro Yuzeyi

- `astro` 6.x
- `@astrojs/node` standalone SSR adapter
- `@astrojs/react`
- `@astrojs/mdx`
- `@astrojs/sitemap`
- `@astrojs/partytown`
- `astro-icon`
- `@tailwindcss/vite`
- `sharp` Astro image service
- `@astrojs/check`
- `typescript`
- `vitest` + Astro `getViteConfig()`
- `eslint` + `eslint-plugin-astro` + `astro-eslint-parser`
- `playwright` library + Chromium
- `@axe-core/playwright`

## Zorunlu Komutlar

Eksik paket ve Chromium binary tamamlamak:

```bash
npm run astro:stack:ensure
```

Astro stack sozlesmesini denetlemek:

```bash
npm run astro:stack:audit
```

Astro TypeScript check:

```bash
npm run type-check
```

SSR build:

```bash
npm run build
```

Dev E2E, desktop/tablet/mobile + axe:

```bash
npm run test:e2e:astro
```

Production SSR entrypoint E2E:

```bash
$env:ASTRO_E2E_MODE="preview"; $env:ASTRO_E2E_BASE_URL="http://127.0.0.1:4322"; node scripts/e2e/astro-homepage-a11y.mjs
```

Canli domain E2E:

```bash
$env:ASTRO_E2E_MODE="remote"; $env:ASTRO_E2E_BASE_URL="https://sanliurfa.com"; node scripts/e2e/astro-homepage-a11y.mjs
```

## Gate Kapsami

`astro:stack:audit` asagidakileri zorunlu tutar:

- Astro SSR `output: 'server'`
- `@astrojs/node` standalone adapter
- PM2 `ecosystem.config.cjs` process adi `sanliurfa-app`
- PM2 `HOST=127.0.0.1`, `PORT=4321`
- `@astrojs/sitemap`, React, MDX, Partytown, Tailwind Vite, astro-icon
- Astro sharp image service
- Strict TypeScript config
- Astro env types
- Vitest `getViteConfig()`
- ESLint Astro parser/plugin
- Landing component, Header, Footer, SEO, Image, Icon component sozlesmesi
- Ana sayfada `/eslesme` ve `/topluluk` sosyal MVP baglantilari
- Ana sayfa gorsel-icerik eslesmesi: Balikligol, Gobeklitepe ve Harran kartlari gercek lokasyon gorselleri
- `kategoriler.txt` omurgasini kodlayan `src/data/city-taxonomy.ts`
- Eksik kategori hub sayfalari ve `CategoryHub.astro`
- `src/lib/seo-image.ts` ile eski `hero-home.webp` ve placeholder OG gorsellerinin route-aware sehir gorsellerine normalize edilmesi
- `/ara` kopya arama yuzeyinin query korunarak kanonik `/arama` sayfasina 301 yonlendirmesi
- `SearchResults.tsx` public arama yuzeyinin sicak light tema sozlesmesi
- `public:theme:surface:gate` ile ana public yuzeylerde eski koyu tema, emoji placeholder ve mobil modal regresyonlarinin kilitlenmesi
- `/saglik/nobetci-eczaneler` sicak light hero ve metin rozetli eczane kartlari
- `/harita` mobil mekan listesi modalinin acilir/kapanir durumda baslamasi ve gorsel fallback kullanmasi
- `docs:terminology:gate` ile kanonik dokumanlarda baska sektor/demo ticaret ve eski tema dili regresyonlarinin engellenmesi
- Google Fonts CSP uyumlulugu
- Demo ticaret ve alakasiz arama terimi kalintilari
- Chromium binary varligi

## Ana Sayfa E2E Kapsami

`scripts/e2e/astro-homepage-a11y.mjs` Playwright plugin veya Playwright Test CLI kullanmaz. Astro serveri baslatir, Playwright library API ve `AxeBuilder` ile tarar.

Kontrol edilenler:

- Desktop 1440px
- Tablet 820px
- Mobile 390px
- Tek gorunur H1
- Meta title ve 156 karakter alti meta description
- 4 adet JSON-LD
- Arama kutusu
- Kritik internal linkler
- Topluluk ve eslesme modulu
- `/eslesme`, `/topluluk`, `/otomotiv`, `/acil-durum` kritik route smoke
- Mobil menu
- Yatay overflow
- Kirik gorsel
- Kucuk tiklama hedefi
- Axe critical/serious WCAG ihlali
- Console/page error

## Production Runtime

Production PM2:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Runtime entry:

```bash
HOST=127.0.0.1 PORT=4321 NODE_ENV=production node dist/server/entry.mjs
```

`astro preview` bu projede production dogrulama icin kanonik kabul edilmez; kanonik test `dist/server/entry.mjs` uzerinden yapilir.
