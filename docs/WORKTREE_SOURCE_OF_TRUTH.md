# Worktree Otorite Kuralı

## Kural
- Teslimat branch'leri `origin/master` üzerinden açılmış temiz bir `git worktree` ile başlamalıdır.
- Kirli yerel root worktree; faz durumu, tracker'lar, changelog durumu veya release readiness için otoritatif değildir.
- Sadece root'ta görülen yerel gözlemler, temiz worktree'de doğrulanana kadar advisory kabul edilir.

## Kirli Root Worktree'nin İzinli Kullanımı
- Artık diff'leri incelemek.
- Bucket sınıflamalarını yenilemek.
- Temiz branch açmadan önce cleanup planı hazırlamak.

## Yasak Olanlar
- `memory.md`, `TASK_TRACKER.md`, `PHASE_INDEX.md` veya `PHASE_CHANGELOG.md` dosyalarını kirli root worktree'den güncelleme.
- Kirli root worktree'den release veya faz PR'ı açma.
- Dosya bazlı gerekçe olmadan kirli root'tan runtime, page, webhook veya support-file diff'lerini taşıma.

## Gerekli Dokümanlar
- `README.md`
- `AGENTS.md`
- `PHASE_OPERATIONS_GUIDE.md`
- `docs/WORKTREE_SOURCE_OF_TRUTH.md`
- `STALE_WORKTREE.md`
- `ROOT_INVENTORY_ONLY_POLICY.md`
- `docs/ACTIVE_DOCS.md`

Bu dokümanlar birlikte operasyonel source-of-truth politikasını tanımlar.

## Standart Akış
1. `git fetch origin`
2. `git worktree add <path> -b <branch> origin/master`
3. teslimat veya cleanup işini temiz worktree içinde yürüt
4. doğrula
5. PR aç
6. merge et ve worktree'yi kaldır
