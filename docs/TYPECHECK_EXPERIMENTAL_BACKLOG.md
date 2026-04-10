# Typecheck Experimental Backlog

`npm run typecheck:experimental` halen çok sayıda hata üretir; bu dosya kapanış sırasını tanımlar.

## P1 Buckets
1. `queryMany/queryOne` dönüş tipi tutarsızlığı (`any[] | { rowCount... }`)  
   Durum: **kısmen kapandı**. `queryMany` artık hem dizi hem `rows` erişimini aynı anda destekliyor.
2. Monorepo/legacy alanlar için aşırı geniş experimental kapsam  
   Durum: **kısmen kapandı**. `tsconfig.experimental.json` yalnızca `src/lib` + `src/env.d.ts` kapsıyor.
3. Legacy modül sözleşme kırıkları (`src/lib/index.ts` mega re-export, `cache.redis`, zayıf tipli helper kullanımları)  
   Durum: **kısmen kapandı**. `src/lib/index.ts` artık curated stable barrel; excluded domainler doğrudan import ile ayrıştırılıyor.
4. React state ve API wrapper tip uyuşmazlıkları  
   Durum: **açık** (experimental scope dışına alındı; ayrı fazda kapanacak).

## Uygulama Sırası
1. `src/lib/postgres.ts` sözleşmesini sabitle (tamamlandı).
2. `src/lib/index.ts` re-export ağacını domain bazlı parçalara ayır.
3. `src/lib/cache.ts` içine geriye uyumlu `redis` facade ekle veya importları `getRedisClient` modeline taşı.
4. `unknown` ile dönen helper’larda (`logger`, parse fonksiyonları) daraltma yardımcıları ekle.
5. Son fazda `src/components` state tiplerini düzelt.

## Gate Politikası
- `typecheck:app` merge-blocking.
- `typecheck:experimental` merge-blocking.
- `typecheck:experimental:exclude:guard` merge-blocking.

## Exclude Budget
- Budget dosyası: `config/experimental-exclude-budget.json`
- Kural: `tsconfig.experimental.json` içindeki `exclude` listesi bütçeyi aşamaz.
- Aktif hedef: `max_entries=18`, `max_file_entries=15`
- Amaç: yeni teknik borcun gate altından sessizce büyümesini engellemek.
