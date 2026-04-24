# Warning Debt Sprint

Bu dokuman warning borcunu kademeli azaltmak icin operasyon planidir.

## Baslangic Metrigi (2026-04-18)
- `FormEvent` gecisleri: **46**
- `@ts-nocheck` kullanimi: **514**
- `lint:ci`: error yok, warning mevcut

## Alan Bazli Uygulama (Aktif)
1. `src/components` warning temizligi
2. `src/pages/api` warning temizligi
3. `src/pages` warning temizligi
4. `src/lib` warning temizligi

Her alan kapanisinda:
- `npm run lint:phase:<alan>`
- `npm run warning:debt:summary`
- `docs/warning-debt-summary.json` trend kontrolu

## Sprint-1 (Bu hafta)
1. `@ts-nocheck` temizlik envanteri olustur (`npm run tsnocheck:audit`)
2. Cekirdek sayfalarda `@ts-nocheck` kaldir (`giris`, `kayit`, `messages`, `profile`, `admin/dashboard`, `admin/campaigns`)
3. Form submit handler'larinda `EventTarget` guard patternini standartlastir
4. CI kalite metrik artifact'i uret (`quality-metrics.json`)

## Sprint-2
1. `FormEvent` tiplerini `Event + HTMLFormElement guard` modeline tasima
2. `no-unused-vars` warning sayisini domain bazli azaltma (admin/api/pages)
3. `@ts-nocheck` sayisini < 400 hedefine cekme

## Sprint-3
1. `@ts-nocheck` sayisini < 250
2. `lint:strict` dry-run sonucu warning trendini raporlama
3. En az 20 OpenAPI gap endpointini dokumante etme

## Komutlar
```bash
npm run tsnocheck:audit
npm run tsnocheck:clean:core
npm run tsnocheck:core:gate
npm run lint:ci
npm run lint:strict
npm run warning:debt:summary
npm run type-check
npm run quality:metrics
npm run quality:metrics:ci
```
