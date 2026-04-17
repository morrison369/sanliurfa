# Olay Mudahale Calisma Kilavuzu

Bu runbook, operasyon sinyali kırıldığında bakılacak sırayı tanımlar.

## 1. Kok saglik `blocked`

1. `GET /api/health`
2. `GET /api/health/detailed`
3. Database `down` ise önce DB bağlantısını doğrula
4. Redis `down` ise cache tarafını `degraded` olarak değerlendir
5. Artefact ozeti de `blocked` ise son surum/gece artefact uretimini kontrol et

## 2. Artefact sagligi `blocked`

1. `GET /api/admin/system/artifact-health`
2. `GET /api/admin/deployment/status`
3. Son `release-gate-summary` artefact'ini dogrula
4. Nightly regression/e2e artifact üretim zamanlarını doğrula
5. `ARTIFACT_FRESHNESS_POLICY.md` eşiklerine göre aksiyon al

## 3. Surum kapisi `failed`

1. `docs/reports/release-gate-summary.json`
2. Blocking failed steps
3. Advisory failed steps
4. `npm run test:critical:blocking`
5. `npm run test:critical:advisory`

## 4. Nightly `degraded`

1. Nightly issue gövdesindeki `Artifact Freshness Alert`
2. Gece ozet JSON'u
3. `performance-ops-summary.json`
4. Gerekirse aynı gün değil sonraki çalışma bloğunda düzelt

## 5. Admin entegrasyon sorunu

1. `/admin/integrations`
2. `GET /api/admin/system/integration-settings?includeVerification=1`
3. Source `env/admin/none` ayrımını doğrula
4. Deployment status icindeki entegrasyon ozetini kontrol et

## Kaynak Gercekler

- [SOURCE_OF_TRUTH_MAP.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\SOURCE_OF_TRUTH_MAP.md)
- [ARTIFACT_FRESHNESS_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ARTIFACT_FRESHNESS_POLICY.md)
- [RELEASE_GATES.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\RELEASE_GATES.md)
