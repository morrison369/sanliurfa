# Olay Runtime Durumu

Bu belge, olay aninda ilk ayrimi tek bakista vermek icin kisa ozet yuzeyidir.

## Olay Türleri

- kok saglik `blocked`
- artefact sagligi `blocked`
- surum kapisi `failed`
- nightly `degraded`
- admin entegrasyon sorunu

## İlk Bakılacak Yüzeyler

### Kok saglik

1. `GET /api/health`
2. `GET /api/health/detailed`
3. DB / Redis / artifact ayrımı

### Artefact sagligi

1. `GET /api/admin/system/artifact-health`
2. `GET /api/admin/deployment/status`
3. `ARTIFACT_FRESHNESS_POLICY.md`

### Surum kapisi

1. `docs/reports/release-gate-summary.json`
2. `npm run test:critical:blocking`
3. `npm run test:critical:advisory`

### Admin entegrasyonlari

1. `/admin/integrations`
2. `GET /api/admin/system/integration-settings?includeVerification=1`

## Aktif Karar

- önce sinyal tipini ayır
- sonra kaynak gercek policy dosyasina don
- ayni blok icinde hem olay duzeltmesi hem ilgisiz temizlik yapilmaz

## Kaynaklar

- [INCIDENT_RUNBOOK.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/INCIDENT_RUNBOOK.md)
- [RELEASE_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/RELEASE_RUNTIME_STATE.md)
- [ADMIN_OPS_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/ADMIN_OPS_RUNTIME_STATE.md)
