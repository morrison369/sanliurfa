# Architecture Index

This directory is for long-form architecture notes.

Current working model:

- `CLAUDE.md` is the high-signal daily execution guide.
- `docs/ops/README.md` is the operational entry point.
- `docs/ops/SOURCE_OF_TRUTH_MAP.md` tells you which file owns which decision.

Use this directory for detailed architecture notes that would otherwise make `CLAUDE.md` too large or too stale.

Recommended split:

- subsystem overviews
- data flow notes
- cache and invalidation strategy details
- admin UI data dependency maps
- realtime / SSE architecture notes
- Astro-only migration assessments and framework transition notes

Open these first:

- [ASTRO_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_RUNTIME_STATE.md) - aktif runtime özeti
- [ASTRO_ONLY_MIGRATION_ASSESSMENT.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md) - mevcut mimari karar
- [ASTRO_ONLY_MIGRATION_BACKLOG.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_BACKLOG.md) - kapanış ve regresyon kuralları

Generated visibility reports:

- [astro-hydration-inventory.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-hydration-inventory.md)
- [astro-high-risk-feasibility.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-high-risk-feasibility.md)
- [react-surface-audit.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-audit.md)
- [react-surface-classification.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/react-surface-classification.md)

Historical record:

- [ASTRO_MIGRATION_CLOSURE_2026-04-17.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/archive/migration/ASTRO_MIGRATION_CLOSURE_2026-04-17.md)

Quick rule:

1. Önce aktif runtime özetini aç.
2. Karar hâlâ net değilse assessment/backlog'a git.
3. Sayısal durum gerekiyorsa generated report aç.
4. Tarihçe gerekiyorsa archive kaydına git.

Rule:

- Add long-form explanation here.
- Keep `CLAUDE.md` focused on commands, rules, source-of-truth pointers, and daily execution guidance.
