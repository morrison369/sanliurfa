# API Legacy Policy

## Scope
This policy governs endpoints under `src/pages/api/legacy/*`.

Current legacy routes:
- `/api/legacy/search`
- `/api/legacy/trending`

## Ownership & Review Cadence
- Owner: Platform API Team
- Review cadence: Monthly (first business day of each month)
- Input signal: Last 30-day endpoint usage and migration status

## Rules
1. Legacy endpoints are read-only compatibility surfaces; no new features are added.
2. New clients must use canonical endpoints (`/api/search/*`, `/api/trending/*`) instead of legacy routes.
3. Breaking changes are forbidden on legacy routes without migration notes.
4. Legacy responses must include deprecation metadata headers:
   - `Deprecation: true`
   - `Sunset: Tue, 30 Sep 2026 23:59:59 GMT`
   - `Link: </docs/API_LEGACY_POLICY.md>; rel=\"deprecation\"`

## Deprecation Timeline
- `2026-04-08`: Legacy routes moved under `/api/legacy/*` and marked deprecated.
- `2026-06-30`: Announce removal in release notes and API changelog.
- `2026-09-30`: Remove legacy handlers if access logs show no critical usage.

## Operational Checklist Before Removal
- Verify 30-day usage is near-zero.
- Confirm dependent internal tools are migrated.
- Publish one release cycle in advance with explicit removal date.
