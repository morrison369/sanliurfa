# Bayat Root Worktree Uyarısı

Bu depo, yerel ortamda kirli veya bayat bir root worktree olarak bulunabilir.

## Bağlayıcı Kural
- `D:\sanliurfa.com\sanliurfa`, `origin/master` gerisindeyse veya artık diff içeriyorsa teslimat yüzeyi olarak kullanılamaz.
- Teslimat, cleanup ve release işi; `origin/master` üzerinden açılmış temiz bir `git worktree` ile başlamalıdır.
- Kirli root worktree yalnızca envanter içindir. Adli inceleme için geçerlidir; source-of-truth kararı için değildir.

## Bunun Yerine Kullan
- [README.md](README.md)
- [AGENTS.md](AGENTS.md)
- [PHASE_OPERATIONS_GUIDE.md](PHASE_OPERATIONS_GUIDE.md)
- [docs/WORKTREE_SOURCE_OF_TRUTH.md](docs/WORKTREE_SOURCE_OF_TRUTH.md)
- [ROOT_INVENTORY_ONLY_POLICY.md](ROOT_INVENTORY_ONLY_POLICY.md)

## Asgari Güvenli Akış
1. `git fetch origin`
2. `git worktree add <path> -b <branch> origin/master`
3. faz veya cleanup işini temiz worktree içinde çalıştır
4. `npm run phase:doctor` ile doğrula
5. PR'ı temiz worktree'den aç ve merge et
