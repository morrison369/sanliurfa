# Entegrasyon Runtime Durumu

Bu belge, entegrasyon hazirlik tarafinin aktif karar ozetidir.

## Güncel Model

- zorunlu üretim değerleri:
  - `PUBLIC_SITE_URL`
  - `RESEND_API_KEY`
- analytics kimligi (`PUBLIC_GOOGLE_ANALYTICS_ID` / `GOOGLE_ANALYTICS_ID` / `GA_TRACKING_ID`)
- yer tutucu degerler hazirlik sayilmaz
- runtime kaynak önceliği:
  1. env
  2. admin panel global ayarı

## Aktif Yüzeyler

- panel:
  - `/admin/integrations`
- API:
  - `GET /api/admin/system/integration-settings`
  - `PUT /api/admin/system/integration-settings`
- saglik gorunurlugu:
  - `GET /api/health`
  - `GET /api/health/detailed`

## İlk Bakılacak Komut

- `npm run release:gate:local`

## Aktif Karar

- env bos olsa bile admin panelde kayitli global degerler runtime yedegi olarak kullanilabilir
- admin panelde kaydedilen entegrasyon değerleri cache temizliği ile birlikte ele alınır
- hazirlik kaymasi varsa once `INTEGRATION_READINESS.md`, sonra saglik/admin gorunurlugu hizalanir

## Kaynaklar

- [INTEGRATION_READINESS.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/INTEGRATION_READINESS.md)
- [ADMIN_OPS_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/ADMIN_OPS_RUNTIME_STATE.md)
- [RELEASE_RUNTIME_STATE.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/RELEASE_RUNTIME_STATE.md)
