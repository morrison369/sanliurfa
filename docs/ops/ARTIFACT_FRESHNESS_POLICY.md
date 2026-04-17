# Artefact Tazelik Politikasi

Bu dokuman, calisma zamani sagligi, admin API ve admin panel tarafinda gorunen artefact saglik sinyalinin nasil uretildigini tanimlar.

## Kapsam

Artefact saglik sinyali su yuzeylerde kullanilir:

- `GET /api/health`
- `GET /api/health/detailed`
- `GET /api/performance`
- `GET /api/admin/performance/optimization`
- `GET /api/admin/dashboard/overview`
- `GET /api/admin/system/metrics`
- `GET /api/admin/system/artifact-health`
- `GET /api/admin/deployment/status`
- Admin paneli `Artifact Health` karti

Takip edilen artefact gruplari:

- `releaseGate`
- `nightlyRegression`
- `nightlyE2E`
- `performanceOps`

## Durum Dili

Tum artefact durumlari ortak durum dilini kullanir:

- `healthy`
- `degraded`
- `blocked`

## Durum Kurallari

### 1. `blocked`

Asagidaki durumlarda artefact `blocked` kabul edilir:

- artefact yoksa
- `available=false` ise
- `generatedAt` bos ise
- `generatedAt` parse edilemiyorsa

Bu durum tipik olarak su anlamlara gelir:

- ilgili workflow hic artefact uretmemis
- ozet dosyasi okunamamis
- artefact kontrati kirilmis

### 2. `degraded`

Artefact var ama bayat ise `degraded` kabul edilir.

Esikler:

- `releaseGate`: 24 saat
- `performanceOps`: 24 saat
- `nightlyRegression`: 36 saat
- `nightlyE2E`: 36 saat

36 saat nightly icin secildi; tek bir gece run'i kacirilsa bile sinyal hemen `blocked` olmaz.

### 3. `healthy`

Artefact var, `generatedAt` gecerli ve yas esigi asilmadiysa `healthy` kabul edilir.

## Artefact Uretim Noktalari

### Release Gate

- Workflow: `.github/workflows/ci.yml`
- Job: `full-gate`
- Artefact'lar:
  - `release-gate-summary`
  - `performance-ops-summary`

`release:gate` su dosyalari yazar:

- `docs/reports/release-gate-summary.json`
- `docs/reports/performance-ops-summary.json`

### Nightly Regression

- Workflow: `.github/workflows/nightly-regression.yml`
- Artifact:
  - `nightly-performance-ops-summary`

Nightly summary dosyasi:

- `docs/reports/nightly-regression-summary.json`

### Nightly E2E

- Workflow: `.github/workflows/nightly-e2e.yml`
- Artifact:
  - `nightly-performance-ops-summary`

Nightly summary dosyasi:

- `docs/reports/nightly-e2e-summary.json`

## Kaynak Gercek

Kod tarafindaki siniflandirma helper'i:

- `src/lib/admin-status.ts`
- `src/lib/artifact-health.ts`

Kullanilan fonksiyon:

- `classifyArtifactFreshnessStatus`
- `buildArtifactHealth`
- `getArtifactHealthSnapshot`
- `getAdminArtifactHealthSnapshot`

Bu dokuman ile helper mantigi drift etmemelidir. Esik degisirse:

1. helper guncellenir
2. bu dokuman guncellenir
3. ilgili admin kontrat testleri tekrar calistirilir

## Operasyon Notu

Artefact sagligi, is akisinin tam dogru calistigini garanti etmez. Sadece:

- summary dosyasinin uretildigini
- uretim zamaninin beklenen aralikta oldugunu

gosterir.

Yani:

- `healthy` = artifact taze
- `degraded` = artifact bayat
- `blocked` = artifact eksik veya okunamaz
