# Release Gates

## Required Gate Sequence
1. `npm run repo:stabilize:check`
2. `npm run deps:audit:triage`
3. `npm run security:release-definition-contract`
4. `npm run security:seo-template-contract`
5. `npm run security:turkish-content-quality-contract`
6. `npm run security:image-slug-contract`
7. `npm run security:public-readiness`
8. `npm run build`

## Single Command
```bash
npm run release:gate
```

## Ship Command
```bash
npm run release:ship
```

## Release Mode Lock
- Phase mutasyon komutları release modunda kilitlidir.
- Kilit dosyası: `config/release-mode.json`
- Politika: `docs/PHASE_FREEZE_POLICY.md`

## CI Enforcement
- `.github/workflows/ci.yml` runs `repo:stabilize:check` and `release:gate`.
- Runtime sözleşmeleri `security:public-readiness` içinde toplu doğrulanır.
