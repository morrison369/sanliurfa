# Branch Protection Policy

`main` ve `master` için baseline:

- Pull request zorunlu
- Up-to-date branch zorunlu
- Force-push ve branch silme kapalı
- Status checks zorunlu

Required checks:
- `quick-gate`

Protected branch push checks:
- `full-gate`

Recommended advisory checks:
- `critical-contracts-advisory`
- `e2e-smoke-advisory`

Operasyon notları:

1. Blocking karar yalnızca CI job isimleri üzerinden verilir; tekil step isimleri required check olarak kullanılmaz.
2. `docs/BRANCH_PROTECTION.md`, `docs/ops/BRANCH_PROTECTION.md` ve `.github/workflows/ci.yml` merge/push check listelerinde drift üretmemelidir.
3. `.github/workflows/*`, `scripts/*`, `tsconfig*.json`, `src/lib/*`, `package.json` değişikliklerinde CODEOWNERS onayı zorunludur.
