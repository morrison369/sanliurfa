# Type-Check Priority Backlog

`npm run type-check` su an advisory modda. Ana hedef, kritik runtime etkisi olan hatalari once kapatmaktir.

## P0 - Oncelikli (runtime riski yuksek)
1. `src/components/CoreWebVitals.astro`
2. `src/components/GoogleAnalytics.astro`
3. `src/pages/places/ekle.astro`
4. `src/pages/profil/index.astro`
5. `src/pages/profil/bildirimler.astro`
6. `src/pages/profil/aktivite.astro`
7. `src/pages/og/[slug].png.ts`
8. `src/pages/saglik/nobetci-eczaneler.astro`

## P1 - Derleme/Tip borcu
1. `src/components/BlogWidgets.astro`
2. `src/components/DarkModeToggle.astro`
3. `src/pages/profil/favoriler.astro`

## P2 - Temizlik (unused/deprecated)
- React import kullanilmayan dosyalar
- Deprecated `FormEvent`/`onKeyPress` kullanimlari
- `astro(4000)` script hint duzeltmeleri

## Is Akisi
```bash
# mevcut durum
npm run type-check

# her P0 duzeltmesinden sonra
npm run type-check
npm run build
```

