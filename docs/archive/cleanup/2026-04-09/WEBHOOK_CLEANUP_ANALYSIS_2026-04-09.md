# Webhook Cleanup Analysis (2026-04-09)

## Scope
- `src/lib/webhook-analytics.ts`
- `src/lib/webhook-audit.ts`
- `src/lib/webhook-filters.ts`
- `src/lib/webhook-logs.ts`
- `src/lib/webhook-replay.ts`
- `src/lib/webhook-templates.ts`

## Findings
- The six files form a coherent subsystem around webhook operations.
- All six use `Pool` from `pg` directly and avoid broader app runtime coupling, except:
  - `webhook-analytics.ts` depends on `cache`
  - `webhook-filters.ts` and `webhook-templates.ts` depend on `cache`
  - `webhook-replay.ts` depends on `triggerWebhook` from `webhooks`
- Query style is consistent: direct SQL, user scoping through `webhooks` joins, typed return mappers.
- The cleanup branch pointer `cleanup/dirty-webhook-surface` is currently based on `5a358224`, which predates current phase history. It is suitable for isolated review, not direct merge.

## Risks
- `any`-typed payloads and JSON parsing are common across the surface; mechanical cleanup without contract review is risky.
- `webhook-replay.ts` calls `triggerWebhook(..., '')`, which looks suspicious and should be reviewed before shipping.
- Cache invalidation behavior differs by file; changes should be reviewed as one set.

## Recommended Next Step
1. Open a fresh cleanup worktree from current `origin/master` on top of `cleanup/dirty-webhook-surface` or a new branch.
2. Diff the six dirty files against current master and separate:
   - safe typing/import cleanups
   - behavior changes
   - cache invalidation changes
3. Land cleanup as a dedicated PR, not mixed with phase delivery.
