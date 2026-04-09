# Typecheck Experimental Backlog

`npm run typecheck:experimental` halen çok sayıda hata üretir; bu dosya kapanış sırasını tanımlar.

## P1 Buckets
1. `queryMany/queryOne` dönüş tipi tutarsızlığı (`any[] | { rowCount... }`)  
   Hedef dosyalar: `src/lib/*` içindeki data erişim katmanı.
2. `verbatimModuleSyntax` kaynaklı `export type` / type-only import hataları  
   Hedef dosyalar: `src/lib/*`, `src/components/*`.
3. React state ve `never` infer hataları (`map`, alan erişimi)  
   Hedef dosyalar: `src/components/*`.

## Uygulama Sırası
1. Önce `src/lib/postgres.ts` tip sözleşmesini sabitle.
2. Sonra `src/lib` data katmanında helper tiplerini normalize et.
3. En son `src/components` state tiplerini düzelt.

## Gate Politikası
- `typecheck:app` merge-blocking.
- `typecheck:experimental` CI'da advisory, backlog kapatıldığında blocking moda alınır.
