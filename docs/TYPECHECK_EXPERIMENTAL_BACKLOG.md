# Typecheck Experimental Backlog

`npm run typecheck:experimental` artık yeşil; bu dosya kalıcı kalite eşiğini ve borcun tekrar büyümemesini tanımlar.

## P1 Buckets
1. `queryMany/queryOne` dönüş tipi tutarsızlığı (`any[] | { rowCount... }`)  
   Durum: **kapandı**. Liste sorguları `queryRows` standardına taşındı; deprecated `queryMany` kaldırıldı.
2. Monorepo/legacy alanlar için aşırı geniş experimental kapsam  
   Durum: **kısmen kapandı**. `tsconfig.experimental.json` yalnızca `src/lib` + `src/env.d.ts` kapsıyor.
3. Legacy modül sözleşme kırıkları (`src/lib/index.ts` mega re-export, `cache.redis`, zayıf tipli helper kullanımları)  
   Durum: **kapandı**. `src/lib/index.ts` curated stable barrel'a indirildi; `cache.redis` facade kaldırıldı; eski import yüzeyi governance guard ile yasaklandı.
4. React state ve API wrapper tip uyuşmazlıkları  
   Durum: **açık** (experimental scope dışına alındı; ayrı fazda kapanacak).

## Uygulama Sırası
1. `src/lib/postgres.ts` sözleşmesini sabitle (tamamlandı).
2. `src/lib/index.ts` re-export ağacını domain bazlı parçalara ayır.
3. `src/lib/cache.ts` üzerindeki legacy `redis` facade'i kaldır ve tüm tüketicileri `getRedisClient` modeline taşı (tamamlandı).
4. `unknown` ile dönen helper’larda (`logger`, parse fonksiyonları) daraltma yardımcıları ekle.
5. Son fazda `src/components` state tiplerini düzelt.

## Gate Politikası
- `typecheck:app` merge-blocking.
- `typecheck:experimental` merge-blocking.
- `typecheck:experimental:exclude:guard` merge-blocking.

## Exclude Policy
- Kural: `tsconfig.experimental.json` içine baseline dışı exclude eklenmez.
- Aktif hedef: `total=0`, `file_entries=0`
- Amaç: yeni teknik borcun gate altından sessizce büyümesini tamamen engellemek.
