# Incident Runtime Durumu

Bu belge, incident anında ilk ayrımı tek bakışta vermek için kısa özet yüzeyidir.

## Olay Türleri

- root health `blocked`
- artifact health `blocked`
- release gate `failed`
- nightly `degraded`
- admin entegrasyon sorunu

## İlk Bakılacak Yüzeyler

### Root health

1. `GET /api/health`
2. `GET /api/health/detailed`
3. DB / Redis / artifact ayrımı

### Artifact health

1. `GET /api/admin/system/artifact-health`
2. `GET /api/admin/deployment/status`
3. `ARTIFACT_FRESHNESS_POLICY.md`

### Release gate

1. `docs/reports/release-gate-summary.json`
2. `npm run test:critical:blocking`
3. `npm run test:critical:advisory`

### Admin integrations

1. `/admin/integrations`
2. `GET /api/admin/system/integration-settings?includeVerification=1`

## Aktif Karar

- önce sinyal tipini ayır
- sonra source-of-truth policy dosyasına dön
- aynı blok içinde hem incident fix hem unrelated cleanup yapılmaz

## Kaynaklar

- [INCIDENT_RUNBOOK.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/INCIDENT_RUNBOOK.md)
- [RELEASE_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/RELEASE_RUNTIME_STATE.md)
- [ADMIN_OPS_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/ADMIN_OPS_RUNTIME_STATE.md)
