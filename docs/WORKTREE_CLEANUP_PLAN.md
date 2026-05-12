# Worktree Cleanup Plan

Bu repo büyük ve kirli bir worktree taşıyor. Temizlik tek committe yapılmamalı.

## Amaç

- kasıtlı değişiklik ile stale artefact ayrımını netleştirmek
- source-of-truth belgeleri görünür kılmak
- deploy ve ürün yüzeyini ilgisiz tarihsel dosyalardan ayırmak

## Sıra

1. Doküman normalizasyonu
2. Route alias envanteri
3. Script yüzeyi sadeleştirme
4. Tarihsel deploy rehberlerinin etiketlenmesi veya arşivlenmesi
5. Büyük silme/refactor dalgası

## 1. Doküman Normalizasyonu

- `README.md`, `START-HERE.md`, `scripts/README.md`, `src/components/README.md` güncel kalır
- `docs/SOURCE_OF_TRUTH.md` tek giriş matrisi olur

## 2. Route Alias Envanteri

Önce sadece sınıflandır:

- kanonik rota
- legacy alias
- kaldırılacak rota

Bu adım tamamlanmadan toplu route silinmez.

## 3. Script Sadeleştirme

Öncelik:

- `ops:cwp:*`
- `db:*`
- `type-check`, `build`, `lint`, `test:*`

Eski Python/Supabase veya tek seferlik fix scriptleri ayrı işaretlenir.

## 4. Tarihsel Belgeler

Silme öncesi üç sınıf:

- keep
- historical
- remove-candidate

Özellikle Docker, Kubernetes, tek kullanımlık fix ve credential örnekli belgeler gözden geçirilir.

## 5. Büyük Temizlik

Bu ancak aşağıdakilerden sonra yapılır:

- release hattı yeşil
- route ownership net
- kanonik doküman seti kabul edilmiş

## Yasaklar

- kirli worktree üzerinde toplu rastgele silme yok
- kullanıcıya ait değişiklikleri yorumlamadan revert yok
- deploy scriptleriyle ilgisiz eski dosyalar production blocker gibi sunulmaz
