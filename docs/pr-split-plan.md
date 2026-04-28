# PR Split Plan

## PR-1: API Contract + OpenAPI
- `src/pages/api/docs/openapi.json.ts`
- `src/lib/__tests__/openapi-*.test.ts`
- `src/lib/__tests__/places-*-api.test.ts`
- `scripts/openapi/**`
- `scripts/smoke/**`
- `vitest.api-contract.config.ts`
- Yerel API contract gate komutları

## PR-2: Image/Content Pipeline
- `scripts/content-scraper/**`
- `public/images/**`
- `src/content/**`
- `src/lib/content-images.ts`
- `src/lib/__tests__/content-images.test.ts`

## PR-3: Infra/Ops
- Yerel gate ve operasyon scriptleri
- `scripts/ci/**`
- `scripts/security/**`
- `playwright.config.ts`
- `scripts/e2e-preflight.mjs`

## Lokal Hazırlık Komut Örneği
```bash
git checkout -b pr/api-contract
git add <PR-1 dosyalari>
git commit -m "chore(api): contract gate ve openapi kapsam genisletme"

git checkout -b pr/image-pipeline
git add <PR-2 dosyalari>
git commit -m "feat(images): slug-bazli gorsel pipeline"

git checkout -b pr/infra-workflow
git add <PR-3 dosyalari>
git commit -m "ci: lint/secrets/e2e preflight ve workflow sertlestirme"
```
