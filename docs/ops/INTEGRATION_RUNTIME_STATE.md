# Entegrasyon Runtime Durumu

Bu belge, entegrasyon readiness tarafının aktif karar özetidir.

## Güncel Model

- zorunlu üretim değerleri:
  - `PUBLIC_SITE_URL`
  - `RESEND_API_KEY`
  - analytics kimliği (`PUBLIC_GOOGLE_ANALYTICS_ID` / `GOOGLE_ANALYTICS_ID` / `GA_TRACKING_ID`)
- placeholder değerler readiness sayılmaz
- runtime kaynak önceliği:
  1. env
  2. admin panel global ayarı

## Aktif Yüzeyler

- panel:
  - `/admin/integrations`
- API:
  - `GET /api/admin/system/integration-settings`
  - `PUT /api/admin/system/integration-settings`
- health görünürlüğü:
  - `GET /api/health`
  - `GET /api/health/detailed`

## İlk Bakılacak Komut

- `npm run release:gate:local`

## Aktif Karar

- env boş olsa bile admin panelde kayıtlı global değerler runtime fallback olarak kullanılabilir
- admin panelde kaydedilen entegrasyon değerleri cache temizliği ile birlikte ele alınır
- readiness drift varsa önce `INTEGRATION_READINESS.md`, sonra health/admin görünürlüğü hizalanır

## Kaynaklar

- [INTEGRATION_READINESS.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/INTEGRATION_READINESS.md)
- [ADMIN_OPS_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/ADMIN_OPS_RUNTIME_STATE.md)
- [RELEASE_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/RELEASE_RUNTIME_STATE.md)
