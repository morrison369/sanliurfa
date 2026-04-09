# Runtime Pages Cleanup Refresh (2026-04-09)

## Summary
- Snapshot source: `D:\sanliurfa.com\sanliurfa`
- Cleanup branch scope: admin/blog/page-level inline script hygiene under `src/pages/`
- Route-collision files `src/pages/api/search.ts`, `src/pages/api/trending.ts`, and `src/pages/arama.astro` are already absent on top of `origin/master`.

## Applied Scope
- `src/pages/admin/blog/comments.astro`
- `src/pages/admin/blog/index.astro`
- `src/pages/admin/dashboard.astro`
- `src/pages/blog/[slug].astro`
- `src/pages/places/[slug].astro`
- `src/pages/profil/favoriler.astro`
- `src/pages/sifre-sifirla.astro`
- `src/pages/sosyal/index.astro`

## Change
- Converted page-level client scripts from plain `<script>` to `<script is:inline>`.
- Preserved runtime logic; this is Astro page script hygiene only.

## Verification Goal
- Align page-level inline scripts with Astro SSR expectations.
- Keep route-collision cleanup documented as already upstreamed.
- Leave `runtime-libs` and other dirty buckets untouched.
