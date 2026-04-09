Modified runtime/webhook/pages residual surface was refreshed in read-only mode against the stale root worktree at `D:\sanliurfa.com\sanliurfa`.

## Observed counts
- modified tracked files: 30
- deleted tracked files: 3
- untracked files: 268

## Modified tracked buckets
- runtime support: `astro.config.mjs`, `vitest.config.ts`, `public/service-worker.js`, `HANDOFF_NOTES.md`
- weather/runtime pages: `src/components/weather/WeatherWidget.astro`, `src/pages/admin/*`, `src/pages/blog/[slug].astro`, `src/pages/places/[slug].astro`, `src/pages/profil/favoriler.astro`, `src/pages/sifre-sifirla.astro`, `src/pages/sosyal/index.astro`
- runtime libs: `src/lib/postgres.ts`, `src/lib/marketing-automation.ts`, `src/lib/__tests__/governance-policy.test.ts`, `src/migrations/032_user_blocking.ts`
- webhook surface: `src/lib/webhook-analytics.ts`, `src/lib/webhook-audit.ts`, `src/lib/webhook-filters.ts`, `src/lib/webhook-logs.ts`, `src/lib/webhook-replay.ts`, `src/lib/webhook-templates.ts`
- e2e residuals: `e2e/2fa.spec.ts`, `e2e/loyalty.spec.ts`, `e2e/messaging.spec.ts`, `e2e/privacy.spec.ts`
- obsolete route deletions: `src/pages/api/search.ts`, `src/pages/api/trending.ts`, `src/pages/arama.astro`

## Decision
- Do not replay any dirty-root modified patch.
- Keep `origin/master` as authoritative for runtime, webhook, pages, and support-file surfaces.
- Treat remaining root entries as stale inventory only.
- Any future recovery must be file-by-file from the inventory, never bulk restore.
