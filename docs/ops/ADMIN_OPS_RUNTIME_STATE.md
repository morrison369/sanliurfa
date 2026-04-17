# Admin Ops Calisma Zamani Durumu

Bu belge, admin ve operasyon yüzeyinin aktif runtime durumunu tek yerde özetler.

## Güncel Durum

2026-04-17 itibarıyla:

- admin sarmalayici kapsama hedefi:
  - `route_files=40`
  - `wrapper_files=40`
  - `coverage=100%`
- admin ops UI yüzeyi:
  - `/admin`
  - `/admin/runtime-monitor`
  - `/admin/access-coverage`
- admin ops sayfaları Astro + plain TS helper modeliyle çalışır
- kaynak gercek yardimci katmani:
  - `src/lib/admin-index-data.ts`
  - `src/lib/admin-index.ts`
  - `src/lib/admin-index-page.ts`
  - `src/lib/admin-index-view.ts`
  - `src/lib/runtime-monitor.ts`
  - `src/lib/admin-access-coverage-page.ts`
  - `src/lib/admin-format.ts`
  - `src/lib/admin-dom.ts`
  - `src/lib/admin-page-bootstrap.ts`

## Ana Komutlar

- `npm run governance:admin:access:check`
- `npm run test:critical:advisory`
- `npm run release:gate`

## Aktif Karar

- Admin API route'lari sarmalayici kapsama disinda birakilamaz.
- Admin arayuz davranisi `.astro` icine gomulmez; yardimci/gorunum modeli/baslatma katmani korunur.
- Rapor kaymasi varsa once kaynak yardimci duzeltilir, sonra sayfa ve rapor yuzeyleri hizalanir.

## İlk Bakılacak Kaynaklar

- [SOURCE_OF_TRUTH_MAP.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/SOURCE_OF_TRUTH_MAP.md)
- [INTEGRATION_READINESS.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/INTEGRATION_READINESS.md)
- [INCIDENT_RUNBOOK.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/ops/INCIDENT_RUNBOOK.md)
- [admin-access-coverage.md](/D:/sanliurfa.com/sanliurfa-ops-batch-all/docs/reports/admin-access-coverage.md)

## Not

`admin-access-coverage.*` raporları aktif karar girdisidir; ancak rapor dosyaları rutin cleanup veya mimari doküman batch’lerine karıştırılmamalıdır.
