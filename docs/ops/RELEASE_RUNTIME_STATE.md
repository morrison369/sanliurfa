# Release Runtime Durumu

Bu belge, release gate ve runtime sinyallerinin aktif durum mantığını tek yerde özetler.

## Güncel Çalışma Modeli

- merge kararı:
  - `quick-gate`
- protected branch push kararı:
  - `full-gate`
- advisory görünürlük:
  - `critical-contracts-advisory`
  - `e2e-smoke-advisory`
- runtime artifact health statü dili:
  - `healthy`
  - `degraded`
  - `blocked`

## Ana Kaynaklar

- [RELEASE_GATES.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/RELEASE_GATES.md)
- [BRANCH_PROTECTION.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/BRANCH_PROTECTION.md)
- [ARTIFACT_FRESHNESS_POLICY.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/ARTIFACT_FRESHNESS_POLICY.md)
- [INCIDENT_RUNBOOK.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/INCIDENT_RUNBOOK.md)

## İlk Bakılacak Komutlar

- `npm run release:gate`
- `npm run branch:protection:drift:check`
- `npm run test:critical:blocking`
- `npm run test:critical:advisory`

## Aktif Karar

- Blocking karar step adıyla değil job adıyla verilir.
- Artifact health tek başına iş akışının tamamen doğru olduğunu garanti etmez; yalnızca artifact'in varlığını ve tazeliğini gösterir.
- Release/runtime drift varsa önce source-of-truth policy düzeltilir, sonra türev raporlar ve paneller hizalanır.

## Hızlı Operasyon Sırası

### Release gate düştüyse

1. `docs/reports/release-gate-summary.json`
2. `npm run test:critical:blocking`
3. `npm run test:critical:advisory`

### Artifact health bozulduysa

1. `GET /api/admin/system/artifact-health`
2. `GET /api/admin/deployment/status`
3. `ARTIFACT_FRESHNESS_POLICY.md`

### Root health bozulduysa

1. `GET /api/health`
2. `GET /api/health/detailed`
3. DB / Redis / artifact ayrımını yap

## Not

Bu belge özet yüzeydir. Eşik, gate sırası veya protection kararı değişirse:

1. source policy dosyası güncellenir
2. bu özet güncellenir
3. ilgili drift/gate komutları yeniden çalıştırılır
