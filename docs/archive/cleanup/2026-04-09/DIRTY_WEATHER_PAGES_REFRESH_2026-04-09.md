# Dirty Weather and Pages Refresh - 2026-04-09

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
- Do not replay the dirty root `WeatherWidget.astro` diff. The current script uses `import.meta.env.PUBLIC_WEATHER_API_KEY`; forcing `is:inline` on that script would stop Astro/Vite from transforming the environment reference and would regress runtime behavior.
- Do not replay the dirty root page diffs. `master` already carries the validated `is:inline` plus plain-JavaScript cleanup on the affected admin, blog, place, profile, reset, and social pages.

## Outcome
- This bucket is stale verification only.
- No source patch was required on top of `master`.
