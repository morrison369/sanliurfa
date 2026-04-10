# Branch Protection Policy

`master` branch için required check listesi:

1. `Typecheck app scope`
2. `Typecheck experimental exclude budget`
3. `Typecheck experimental`
4. `Release gate`
5. `Run E2E smoke`

Operasyon notları:

1. `typecheck:experimental` advisory değildir; blocking olmalıdır.
2. `config/experimental-exclude-budget.json` değerleri sadece azaltılır (ratchet).
3. `src/lib/` ve gate script değişikliklerinde CODEOWNERS onayı zorunludur.

