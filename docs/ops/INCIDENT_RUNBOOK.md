# Incident Runbook

Bu runbook, operasyon sinyali kırıldığında bakılacak sırayı tanımlar.

## 1. Root health `blocked`

1. `GET /api/health`
2. `GET /api/health/detailed`
3. Database `down` ise önce DB bağlantısını doğrula
4. Redis `down` ise cache tarafını `degraded` olarak değerlendir
5. Artifact summary de `blocked` ise latest release/nightly artifact üretimini kontrol et

## 2. Artifact health `blocked`

1. `GET /api/admin/system/artifact-health`
2. `GET /api/admin/deployment/status`
3. Son `release-gate-summary` artifact’ını doğrula
4. Nightly regression/e2e artifact üretim zamanlarını doğrula
5. `ARTIFACT_FRESHNESS_POLICY.md` eşiklerine göre aksiyon al

## 3. Release gate `failed`

1. `docs/reports/release-gate-summary.json`
2. Blocking failed steps
3. Advisory failed steps
4. `npm run test:critical:blocking`
5. `npm run test:critical:advisory`

## 4. Nightly `degraded`

1. Nightly issue gövdesindeki `Artifact Freshness Alert`
2. Nightly summary JSON
3. `performance-ops-summary.json`
4. Gerekirse aynı gün değil sonraki çalışma bloğunda düzelt

## 5. Admin entegrasyon sorunu

1. `/admin/integrations`
2. `GET /api/admin/system/integration-settings?includeVerification=1`
3. Source `env/admin/none` ayrımını doğrula
4. Deployment status içindeki integration summary’yi kontrol et

## Source Of Truth

- [SOURCE_OF_TRUTH_MAP.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\SOURCE_OF_TRUTH_MAP.md)
- [ARTIFACT_FRESHNESS_POLICY.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\ops\ARTIFACT_FRESHNESS_POLICY.md)
- [RELEASE_GATES.md](D:\sanliurfa.com\sanliurfa-ops-batch-all\docs\RELEASE_GATES.md)
