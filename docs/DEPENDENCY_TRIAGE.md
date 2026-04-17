# Bağımlılık Önceliklendirmesi

Bu depo, bağımlılık yükseltmelerini faz teslimatından ayrı tutar.

## Güncel Audit Temel Çizgisi
- Son doğrulama tarihi: `2026-04-09`
- Komut: `npm audit --json`
- Sonuç: `0` bilinen zafiyet
- Şiddet dağılımı:
  - `0` high
  - `0` moderate

## Runtime Öncelikleri
- `vite`
  - Durum: `resolved`
  - Tür: Astro toolchain üzerinden gelen transitif runtime bağımlılığı
  - Alınan aksiyon: Astro React entegrasyonu yükseltildi ve `vite`, zafiyetsiz bir hatta override ile sabitlendi

- `xlsx`
  - Durum: `resolved`
  - Tür: Eski doğrudan runtime bağımlılığı
  - Alınan aksiyon: Runtime yolundan çıkarıldı ve yerine yalnızca yazma yapan `exceljs` export üretimi kondu
  - Guardrail: Workbook üretimini `src/lib/__tests__/report-engine-excel-smoke.test.ts` üzerinden doğrula

## Yalnızca Geliştirme Ortamı Öncelikleri
- `basic-ftp`
  - Durum: `resolved`
  - Kaynak: Lighthouse/LHCI yolundaki transitif bağımlılık
  - Alınan aksiyon: Patched `5.2.1` hattına override ile sabitlendi

- `@astrojs/check` / `@astrojs/language-server` / YAML chain
  - Durum: `resolved`
  - Alınan aksiyon: `@astrojs/check` yükseltildi ve patched YAML zinciri override'larla sabitlendi

## İşletim Kuralları
- Bağımlılık yükseltmelerini faz teslimat PR'larıyla karıştırma.
- Bir bağımlılık PR'ı açmadan önce `npm run deps:audit:triage` çalıştır.
- Runtime bağımlılıklarını, yalnızca geliştirme araçlarından önce önceliklendir.
- Dar bir alternatif varsa zafiyetli runtime bağımlılığını tamamen kaldır.
- Her risk bucket'ı için küçük ve ayrı bir bağımlılık PR'ı tercih et:
  - runtime/high
  - dev/high
  - moderate/tooling

## Bağımlılık PR'ı İçin Çıkış Kriteri
- `npm ci`
- `npm run phase:doctor`
- `npm run test:phase:gate:ci`
- `npm run build`
- PR aynı anda faz teslimatı da taşımıyorsa changelog'a dokunma
