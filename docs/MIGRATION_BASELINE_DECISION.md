# Migration Baseline Decision

## Karar

Tarihi duplicate migration numaraları ve slug kayıtları yeniden adlandırılmayacak. Bu kayıtlar baseline olarak kabul edilir.

## Gerekçe

- Migration dosyalarını sonradan rename etmek production geçmişiyle drift yaratabilir.
- Mevcut duplicate kayıtlar `docs/migration-duplicate-baseline.json` ile bilinen borç olarak izlenir.
- Yeni duplicate regresyonları `npm run db:migrate:check-duplicates` ve `npm run migration:debt:report` ile yakalanır.

## Operasyon Kuralı

- Yeni migration eklenirken numara ve slug çakışması yaratılmayacak.
- Bilinen baseline duplicate kayıtları cleanup için zorlanmayacak.
- Baseline dışı yeni duplicate varsa release gate blocker kabul edilir.

## Kanıt Dosyaları

- `docs/migration-duplicate-baseline.json`
- `docs/migration-duplicate-report.json`
- `docs/migration-debt-report.json`
