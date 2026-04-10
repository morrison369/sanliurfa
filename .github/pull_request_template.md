## Scope
- Phase range or domain (`api-legacy`, `runtime-security`, `governance`, `e2e-ci`)

## Risk
- User-facing impact:
- Data risk:
- Security impact:

## Rollback Plan
- Exact command or revert strategy:
- Recovery ETA:

## Validation Evidence
- Commands run:
- Key outputs:
- `typecheck:app`:
- `typecheck:experimental`:
- `typecheck:experimental:exclude:guard`:
- `release:gate`:

## Observability Impact
- New logs/metrics/alerts:
- Dashboard or panel updates:

## Typecheck Debt Checklist
- [ ] `tsconfig.experimental.json` exclude list size increased mi? Artış varsa gerekçe yazıldı mı?
- [ ] Yeni `src/lib/*.ts` dosyası exclude'a eklendi mi? Eklendiyse neden?
- [ ] `tsconfig.experimental.json` içine yeni baseline dışı exclude eklenmedi
- [ ] Domain bazlı en az 1 unit + 1 smoke doğrulaması eklendi/çalıştırıldı mı?
- [ ] `src/lib/http.ts` dışında yeni timeout/AbortController mantığı eklendi mi? Eklendiyse neden?
- [ ] Secrets allowlist genişledi mi? Genişlediyse risk ve onay notu yazıldı mı?
