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

Current long-form notes:

- [ASTRO_ONLY_MIGRATION_ASSESSMENT.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_ASSESSMENT.md)
- [ASTRO_ONLY_MIGRATION_BACKLOG.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/architecture/ASTRO_ONLY_MIGRATION_BACKLOG.md)
- [astro-hydration-inventory.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/astro-hydration-inventory.md)

Rule:

- Add long-form explanation here.
- Keep `CLAUDE.md` focused on commands, rules, source-of-truth pointers, and daily execution guidance.
