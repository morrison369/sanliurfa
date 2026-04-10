# Artifact Freshness Policy

Bu dokuman, admin panel ve admin API tarafinda gorunen artifact health sinyalinin nasil uretildigini tanimlar.

## Kapsam

Artifact health sinyali su yuzeylerde kullanilir:

- `GET /api/admin/dashboard/overview`
- `GET /api/admin/system/metrics`
- Admin dashboard `Artifact Health` karti

Takip edilen artifact gruplari:

- `releaseGate`
- `nightlyRegression`
- `nightlyE2E`
- `performanceOps`

## Durum Dili

Tum artifact durumlari ortak statü dilini kullanir:

- `healthy`
- `degraded`
- `blocked`

## Durum Kurallari

### 1. `blocked`

Asagidaki durumlarda artifact `blocked` kabul edilir:

- artifact yoksa
- `available=false` ise
- `generatedAt` bos ise
- `generatedAt` parse edilemiyorsa

Bu durum tipik olarak su anlamlara gelir:

- ilgili workflow hic artifact uretmemis
- summary dosyasi okunamamis
- artifact kontrati kirilmis

### 2. `degraded`

Artifact var ama bayat ise `degraded` kabul edilir.

Esikler:

- `releaseGate`: 24 saat
- `performanceOps`: 24 saat
- `nightlyRegression`: 36 saat
- `nightlyE2E`: 36 saat

36 saat nightly icin secildi; tek bir gece run'i kacirilsa bile sinyal hemen `blocked` olmaz.

### 3. `healthy`

Artifact var, `generatedAt` gecerli ve yas esigi asilmadiysa `healthy` kabul edilir.

## Artifact Uretim Noktalari

### Release Gate

- Workflow: `.github/workflows/ci.yml`
- Job: `full-gate`
- Artifact'ler:
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

## Source Of Truth

Kod tarafindaki siniflandirma helper'i:

- `src/lib/admin-status.ts`

Kullanilan fonksiyon:

- `classifyArtifactFreshnessStatus`

Bu dokuman ile helper mantigi drift etmemelidir. Esik degisirse:

1. helper guncellenir
2. bu dokuman guncellenir
3. ilgili admin kontrat testleri tekrar calistirilir

## Operasyon Notu

Artifact health, is akisinin tam dogru calistigini garanti etmez. Sadece:

- summary dosyasinin uretildigini
- uretim zamaninin beklenen aralikta oldugunu

gosterir.

Yani:

- `healthy` = artifact taze
- `degraded` = artifact bayat
- `blocked` = artifact eksik veya okunamaz
