# Astro + GitHub Entegrasyon Notlari (2026-04-18)

Bu not, internet ve GitHub kaynakli arastirma sonucunda projeye uygulanan Astro uyumlu iyilestirmeleri listeler.

## Arastirilan Kaynaklar

- Astro on-demand rendering (SSR): `https://docs.astro.build/en/guides/on-demand-rendering/`
- Astro client directives (`client:load`, `client:idle`, `client:visible`): `https://docs.astro.build/hi/reference/directives-reference/`
- Astro server islands (`server:defer`): `https://docs.astro.build/en/guides/server-islands/`
- react-tinder-card resmi repo: `https://github.com/3DJakob/react-tinder-card`

## Uygulanan Iyilestirmeler

1. Topluluk sayfasinda hydration optimizasyonu
- Dosya: `src/pages/topluluk.astro`
- Degisiklik: `SocialFeatures` artik `client:visible` ve `rootMargin: 200px` ile yuklenir.
- Etki: Ilk boyamada daha az JS maliyeti, scroll yaklasirken erken hydration.

2. Swipe deneyiminde GitHub tavsiyesine uygun ayar
- Dosya: `src/components/SwipeMatchExperience.tsx`
- Degisiklikler:
  - `swipeRequirementType="position"`
  - Ekran genisligine gore dinamik `swipeThreshold`
  - `onSwipeRequirementFulfilled`/`onSwipeRequirementUnfulfilled` ile anlik kullanici geri bildirimi
- Etki: Mobil ve desktop farkli genisliklerde daha tutarli swipe davranisi.

3. Swipe UI threshold helper ve test
- Yeni dosya: `src/lib/social/swipe-ui.ts`
- Yeni test: `src/lib/__tests__/swipe-ui.test.ts`
- Etki: Threshold mantigi tekrar kullanilabilir ve testle dogrulaniyor.

