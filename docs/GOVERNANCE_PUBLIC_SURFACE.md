# Governance Public Surface

## Problem
Phase-versioned governance modules were imported directly from many filenames, creating upgrade drift.

## Standard
Use `src/lib/governance/index.ts` as the import entrypoint for:
- assurance
- continuity
- stability
- recovery/trust

## Rule
Do not import `governance-*-v*.ts` directly from feature code unless adding a new version to the public surface file first.
