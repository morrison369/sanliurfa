# Worktree Policy

Bu çalışma alanında birden fazla ağaç bulunur. Hepsi aynı otorite seviyesinde değildir.

## Kanonik Uygulama Ağacı

- `sanliurfa/`

Canlı uygulama, package yönetimi, Astro build, deploy scriptleri ve ana ürün kaynakları burada yaşar.

## İkincil Ağaç

- `public-worktree-sync/`

Bu ağaç kanonik uygulama kaynağı değildir. Mirror, senkronizasyon veya tarihsel ayrışma amacıyla
bulunabilir. Buradaki belgeler ve route anlatıları, `sanliurfa/` içindeki kanonik belgelerle
çelişirse `sanliurfa/` kazanır.

## Operasyon Kuralı

- Yeni ürün veya runtime kararı önce `sanliurfa/` içinde uygulanır.
- `public-worktree-sync/` üzerinde görülen belge farkları tek başına ürün gerçeği sayılmaz.
- Deploy, smoke, build ve release readiness sadece `sanliurfa/` ağacına göre yorumlanır.

## İnceleme Kuralı

Bir analiz sırasında:

- önce `sanliurfa/` içeriği doğrulanır
- sonra gerekiyorsa `public-worktree-sync/` sapmaları raporlanır
- mirror dokümanlarıyla uygulama yönü belirlenmez
