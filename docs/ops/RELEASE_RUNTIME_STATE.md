# Surum Runtime Durumu

Bu belge, surum kapisi ve runtime sinyallerinin aktif durum mantigini tek yerde ozetler.

## Güncel Çalışma Modeli

- birlestirme karari:
  - `quick-gate`
- korumali dal push karari:
  - `full-gate`
- tavsiye niteligindeki gorunurluk:
  - `critical-contracts-advisory`
  - `e2e-smoke-advisory`
- runtime artefact saglik durum dili:
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

- Engelleyici karar step adiyla degil job adiyla verilir.
- Artefact sagligi tek basina is akisinin tamamen dogru oldugunu garanti etmez; yalnizca artefact'in varligini ve tazeligini gosterir.
- Surum/runtime kaymasi varsa once kaynak gercek policy duzeltilir, sonra turev raporlar ve paneller hizalanir.

## Hızlı Operasyon Sırası

### Surum kapisi dustuyse

1. `docs/reports/release-gate-summary.json`
2. `npm run test:critical:blocking`
3. `npm run test:critical:advisory`

### Artefact sagligi bozulduysa

1. `GET /api/admin/system/artifact-health`
2. `GET /api/admin/deployment/status`
3. `ARTIFACT_FRESHNESS_POLICY.md`

### Kok saglik bozulduysa

1. `GET /api/health`
2. `GET /api/health/detailed`
3. DB / Redis / artifact ayrımını yap

## Not

Bu belge ozet yuzeydir. Esik, kapi sirasi veya protection karari degisirse:

1. kaynak policy dosyasi guncellenir
2. bu ozet guncellenir
3. ilgili drift/kapi komutlari yeniden calistirilir
