# Warning Debt Sprint

Bu dokuman warning/type debt azaltma sprintinin mevcut durumunu ve sonraki hedeflerini takip eder.

## Baslangic Metrigi (2026-04-18)
- `FormEvent` gecisleri: **46**
- `@ts-nocheck` kullanimi: **514**
- `lint:ci`: error yok, warning mevcut
- `warning:debt:summary`: aktif debt listesi uretiyor

## Guncel Durum (2026-04-28)
- `@ts-nocheck` kullanimi: **0 / 1484**
- Kalan istisna: **yok**
- Lint: **0 error / 0 warning / 0 problem**
- Type-check: **0 error / 0 warning / 0 hint**
- API release gate: **passed**
- OpenAPI P0 missing: **0**
- OpenAPI route current `missingInSpec`: **0**
- OpenAPI route baseline `missingInSpec`: **0** (tarihsel **230** gap cozuldu ve baseline current temiz duruma sifirlandi)

## Sprint-1 (Tamamlandi)
1. Router `any` castleri temizlendi veya typed helper katmanina alindi.
2. API route `request as any` kaliplari azaltildi.
3. Service katmanindaki gereksiz `@ts-nocheck` kaldirildi.
4. Lint warning sayisi canli kalite raporuna baglandi.

## Sprint-2
1. `@ts-nocheck` audit sonucunu `0 / 1484` seviyesinde tut.
2. `quality:metrics` raporunu stale log yerine canli lint/type-check ciktisiyla koru.
3. OpenAPI current/baseline metrik ayrimini release raporlarinda koru.

## Sprint-3
1. `@ts-nocheck` core gate'ini temiz tut ve yeni istisnalari release blocker say.
2. `lint:strict` / kalite metrik trendini release raporuna bagla.
3. En az 20 OpenAPI baseline endpointini dokumante et.

## Komutlar
- `npm run tsnocheck:audit`
- `npm run quality:metrics`
- `npm run warning:debt:summary`
- `npm run ops:targeted:release-lite`
