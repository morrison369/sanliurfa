# Script Canonical Surface Report

- Generated at: 2026-05-15T12:07:46.713Z
- Status: ok
- Total scripts: 370
- Families: 65
- Missing canonical commands: 0

## Canonical Commands

| Area | Command | Exists | Purpose |
|---|---|---|---|
| local_release | `release:local:fast` | yes | Local release readiness minimum gate |
| quality | `quality:reports:refresh` | yes | Regenerate release evidence artifacts |
| quality | `quality:metrics` | yes | Read-only quality summary |
| astro | `type-check` | yes | Astro framework type/schema check |
| build | `build` | yes | Astro SSR production build |
| storage | `storage:local:gate` | yes | Local filesystem media model enforcement |
| uploads | `images:uploads:parity` | yes | Local upload reference parity |
| uploads | `images:uploads:bucket-quota` | yes | Per-bucket local storage quota |
| db | `db:retirement:observe` | yes | DB retirement observation evidence |
| db | `db:p0:quarantine:plan` | yes | Manual-only DB P0 quarantine plan |
| e2e | `e2e:critical:coverage` | yes | Critical flow E2E coverage evidence |
| adsense | `adsense:readiness` | yes | Local AdSense file/meta readiness |
| adsense | `adsense:readiness:live` | yes | Live AdSense crawler readiness |
| runtime | `redis:runtime:health:report` | yes | Redis advisory health snapshot |
| runtime | `warmup:safety:report` | yes | Warmup no-port/no-server safety |

## Largest Families

| Family | Count |
|---|---:|
| ops | 49 |
| db | 28 |
| images | 25 |
| dev | 19 |
| test | 19 |
| smoke | 16 |
| blog | 15 |
| gmaps | 13 |
| release | 13 |
| jobs | 10 |
| gsc | 9 |
| lint | 9 |
| public | 8 |
| home | 7 |
| openapi | 7 |

Not: Bu rapor script silmez. Ama CI ve release dokümantasyonunda kanonik komutları öne çıkarır.
