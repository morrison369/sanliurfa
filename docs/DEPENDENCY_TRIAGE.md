# Dependency Triage

This repository keeps dependency upgrades separate from phase delivery.

## Current Audit Baseline
- Last verified on: `2026-04-09`
- Command: `npm audit --json`
- Result: `0` known vulnerabilities
- Severity split:
  - `0` high
  - `0` moderate

## Runtime Priorities
- `vite`
  - Severity: `resolved`
  - Type: transitive runtime dependency through Astro toolchain
  - Action taken: upgraded Astro React integration and pinned `vite` with an override to a non-vulnerable line

- `xlsx`
  - Severity: `resolved`
  - Type: former direct runtime dependency
  - Action taken: removed from the runtime path and replaced with write-only `exceljs` export generation
  - Guardrail: validate workbook generation through `src/lib/__tests__/report-engine-excel-smoke.test.ts`

## Dev-Only Priorities
- `basic-ftp`
  - Severity: `resolved`
  - Source: transitive dependency in the Lighthouse/LHCI path
  - Action taken: pinned via override to the patched `5.2.1` line

- `@astrojs/check` / `@astrojs/language-server` / YAML chain
  - Severity: `resolved`
  - Action taken: upgraded `@astrojs/check` and pinned patched YAML chain packages with overrides

## Operating Rules
- Do not mix dependency upgrades with phase delivery PRs.
- Run `npm run deps:audit:triage` before opening a dependency PR.
- Prioritize runtime dependencies before dev-only tooling.
- Remove vulnerable runtime dependencies entirely when a narrow replacement is available.
- Prefer one small dependency PR per risk bucket:
  - runtime/high
  - dev/high
  - moderate/tooling

## Exit Criteria For A Dependency PR
- `npm ci`
- `npm run phase:doctor`
- `npm run test:phase:gate:ci`
- `npm run build`
- changelog untouched unless the PR also ships a phase delivery
