# Release Readiness

- Generated At: 2026-05-07T15:54:42.380Z
- Status: ready_with_advisories
- OpenAPI P0 Total Missing: 0
- Migration Duplicate Number Groups: 3
- Migration Duplicate Slug Groups: 14

## Checks

| Check | Status | Artifact |
|---|---|---|
| OpenAPI P0 report | ok | `docs/openapi-p0-closure-report.json` |
| OpenAPI baseline | ok | `docs/openapi-route-gap-baseline.json` |
| Image manifest | ok | `public/images/image-manifest.json` |
| DB-first doc | ok | `docs/DB_FIRST_SITE_MANAGEMENT.md` |
| Public acceptance doc | ok | `docs/MVP_PUBLIC_ACCEPTANCE.md` |
| Astro frontend stack doc | ok | `docs/ASTRO_SSR_FRONTEND_STACK.md` |
| Migration duplicate remediation plan | ok | `docs/MIGRATION_DUPLICATE_REMEDIATION.md` |

## Advisories

| Advisory | Severity | Detail | Artifact |
|---|---|---|---|
| Migration duplicate baseline | advisory | 3 duplicate number group(s), 14 duplicate slug group(s). Dosya rename prod schema_migrations versiyonlarını etkileyebileceği için docs/MIGRATION_DUPLICATE_REMEDIATION.md planıyla çözülmeli. | `docs/migration-duplicate-report.json` |

Summary: Temel artefaktlar mevcut. Advisory maddeleri release notlarında takip edilmeli.