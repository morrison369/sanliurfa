# Dependency Triage

This repository keeps dependency upgrades separate from phase delivery.

## Current Audit Baseline
- Last verified on: `2026-04-09`
- Command: `npm audit --json`
- Result: `8` known vulnerabilities
- Severity split:
  - `3` high
  - `5` moderate

## Runtime Priorities
- `xlsx`
  - Severity: `high`
  - Type: direct runtime dependency
  - Status: no automatic fix available from `npm audit`
  - Risk: user-controlled workbook parsing can expose prototype pollution or ReDoS paths
  - Action: keep usage scoped, do not widen workbook ingestion, evaluate replacement or upstream pin in a dedicated PR

- `vite`
  - Severity: `high`
  - Type: transitive runtime dependency through Astro toolchain
  - Status: fix available
  - Risk: dev/build toolchain file-read and traversal advisories
  - Action: treat as the first upgrade candidate in the next dependency PR, but upgrade through the Astro compatibility window instead of forcing a bare Vite bump

## Dev-Only Priorities
- `basic-ftp`
  - Severity: `high`
  - Source: transitive dependency in the Lighthouse/LHCI path
  - Status: fix available
  - Action: update in the same dependency PR after runtime fixes; not a release blocker for SSR delivery

- `@astrojs/check` / `@astrojs/language-server` / YAML chain
  - Severity: `moderate`
  - Status: suggested fix points to a semver-major downgrade path in `npm audit`
  - Action: do not apply `npm audit fix --force`; re-evaluate only with a tested Astro toolchain upgrade plan

## Operating Rules
- Do not mix dependency upgrades with phase delivery PRs.
- Run `npm run deps:audit:triage` before opening a dependency PR.
- Prioritize runtime dependencies before dev-only tooling.
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
