# Branch Protection Policy

`master` branch için required check listesi:

1. `Typecheck app scope`
2. `HTTP timeout governance guard`
3. `Typecheck experimental exclude budget`
4. `Typecheck experimental`
5. `Release gate`
6. `Run E2E smoke`

Operasyon notları:

1. `typecheck:experimental` advisory değildir; blocking olmalıdır.
2. `config/experimental-exclude-budget.json` değerleri sadece azaltılır (ratchet).
3. `src/lib/`, `scripts/`, `tsconfig*.json` ve `.github/workflows/*` değişikliklerinde CODEOWNERS onayı zorunludur.
4. Nightly full E2E sonucu issue/comment akışına raporlanır.
