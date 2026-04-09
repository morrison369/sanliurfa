# Dirty Weather and Pages Residual Refresh - 2026-04-09

## Scope
- `src/components/weather/WeatherWidget.astro`
- `src/pages/admin/blog/comments.astro`
- `src/pages/admin/blog/index.astro`
- `src/pages/admin/dashboard.astro`
- `src/pages/blog/[slug].astro`
- `src/pages/places/[slug].astro`
- `src/pages/profil/favoriler.astro`
- `src/pages/sifre-sifirla.astro`
- `src/pages/sosyal/index.astro`

## Decision
- Do not replay the dirty root `WeatherWidget.astro` diff. The current script depends on `import.meta.env.PUBLIC_WEATHER_API_KEY`, so converting it to `is:inline` would bypass Astro/Vite env transformation and create a runtime regression.
- Do not replay the dirty root page diffs. `origin/master` already contains the validated `is:inline` plus plain-JavaScript versions of the affected admin, blog, place, profile, reset, and social scripts.

## Outcome
- This residual bucket is stale verification only.
- No source patch is required on top of `origin/master`.
