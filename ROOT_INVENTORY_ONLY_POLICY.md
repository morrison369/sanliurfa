# Root Sadece Envanter Politikası

## Karar
- Kirli yerel root worktree bir implementasyon kaynağı değildir.
- Açık dosya bazlı gerekçe olmadan kirli root'tan runtime, webhook, page, weather, E2E veya support-file patch'i geri oynatılamaz.
- Temiz `origin/master` worktree'leri tek teslimat yüzeyi olmaya devam eder.

## İzinli Kullanım
- Salt-okunur diff inceleme
- Artık bucket sınıflandırması
- Temiz branch açılmadan önce recovery planlama

## Yasak Olanlar
- Tracker'ları, changelog'u veya faz metadata'sını kirli root'tan güncelleme.
- Kirli root'tan release veya faz PR'ı açma.
- Kirli root envanterinden toplu restore veya geniş replay kullanma.

## İlgili Dokümanlar
- [STALE_WORKTREE.md](STALE_WORKTREE.md)
- [docs/WORKTREE_SOURCE_OF_TRUTH.md](docs/WORKTREE_SOURCE_OF_TRUTH.md)
- [docs/ACTIVE_DOCS.md](docs/ACTIVE_DOCS.md)
