# Faz Operasyon Rehberi

## Temel Çizgi
- `origin/master` üzerinden açılmış temiz bir `git worktree` ile çalış.
- Node `22.13.0+` kullan; otorite dosyası `.nvmrc`'dir.
- Aynı worktree içinde Astro build veya gate komutlarını paralel çalıştırma.
- Kirli yerel root worktree'yi faz otoritesi olarak kullanma; yalnızca artık diff envanteri için kullan.
- Source-of-truth dokümanları veya changelog davranışı değiştiğinde `npm run phase:doctor` çalıştır.
- Legacy job adı korunmuş olsa da `phase:doctor:advisory` artık CI içinde zorunlu yeşil kontroldür.
- [STALE_WORKTREE.md](STALE_WORKTREE.md), [ROOT_INVENTORY_ONLY_POLICY.md](ROOT_INVENTORY_ONLY_POLICY.md) ve [docs/ACTIVE_DOCS.md](docs/ACTIVE_DOCS.md) birbiriyle uyumlu kalmalıdır.
- [ARCHITECTURE.md](ARCHITECTURE.md), [docs/DEPENDENCY_TRIAGE.md](docs/DEPENDENCY_TRIAGE.md) ve [docs/SCRIPT_SURFACE_POLICY.md](docs/SCRIPT_SURFACE_POLICY.md) operatör gerçeğiyle hizalı kalmalıdır.

## Standart Teslimat Akışı
1. Faz blok dosyalarını ve export'ları üret.
   - Tercih edilen yazma yolu: `npm run phase:generate:block:write -- scripts/phase-blocks/phase-803-808.json`
2. `package.json`, `PHASE_INDEX.md`, `TASK_TRACKER.md`, `memory.md` ve `tsconfig.phase.json` dosyalarını güncelle.
3. Şunlardan birini çalıştır:
   - `npm run phase:prepare:block -- --phase-script test:phase:<range>`
   - `npm run phase:prepare:batch -- --phase-script test:phase:<range-a> --phase-script test:phase:<range-b>`
   - `npm run test:phase:range -- <range>`
   - `npm run test:phase:batch -- <range-a> <range-b> <range-c>`
4. Faz içeriğini commit et.
5. Faz commit hash'ini al, `npm run phase:changelog -- --ref <phase-commit>` çalıştır ve ardından changelog güncellemesini commit et.
6. `update/normalize/finalize/refresh phase changelog` için changelog bakım satırı ekleme.
7. `phase:doctor` changelog drift raporlarsa, PR açmadan önce `npm run phase:changelog:normalize` çalıştır ve cleanup'ı commit et.
8. Branch'i push et, PR aç, check'leri bekle, merge et ve uzak merge durumunu doğrula.

## Kilit Kuralları
- `phase:prepare:block`, `phase:prepare:batch`, `test:phase:gate` ve `test:phase:gate:ci` `.phase-worktree.lock` üzerinden worktree kilidi alır.
- Önceki bir çalıştırma çöktüyse kilit dosyasını silmeden önce incele.
- Canlı bir kilit varsa bunu tekrar deneme sinyali değil, operasyonel hata olarak ele al.
- Kilit veya gate mantığı değiştiğinde davranışı `src/lib/__tests__/phase-automation-scripts.test.ts` üzerinden doğrula.

## PR ve Merge Politikası
- Faz içeriği ile changelog'u iki ayrı commit olarak tut.
- Cleanup doğrulama PR'ları `PHASE_CHANGELOG.md` dosyasına cleanup-only satırlar eklememelidir.
- PR'ları `npm run phase:pr:open:file -- <repo> <base> <head> <title-file> <body-file>` ile aç.
- Check'leri `npm run phase:checks:wait -- <pr> --repo titanai777/sanliurfa` ile bekle.
- Merge durumunu `npm run phase:pr:view -- titanai777/sanliurfa <pr>` ile doğrula.

## Doküman Hijyeni
- Aktif operasyon dokümanlarını yalnızca mevcut teslimat yüzeyinin parçasıysa root'ta tut.
- Tarihsel faz raporları ile tarihli cleanup doğrulama notlarını `docs/archive/` altına taşı.
- `PHASE_INDEX.md`, hem aktif root dokümanlar hem de arşiv konumları için kanonik haritadır.
- `README.md`, `AGENTS.md`, `PHASE_OPERATIONS_GUIDE.md` ve `docs/WORKTREE_SOURCE_OF_TRUTH.md`, source-of-truth politikasında drift üretmemelidir.
- `STALE_WORKTREE.md` ve `ROOT_INVENTORY_ONLY_POLICY.md` repo root'unda görünür zorunlu guard'lardır.

## Script Yüzeyi Politikası
- Çalıştırıcı tabanlı komutları tercih et:
  - `test:phase:range`
  - `test:phase:batch`
  - `phase:prepare:block:preferred`
  - `phase:prepare:batch:preferred`
- Tekil `test:phase:<range>` girdilerini, birincil operatör arayüzü değil, üretilmiş faz blokları için uyumluluk yüzeyi olarak gör.
- `package.json` script yüzeyini değiştirmeden önce `npm run phase:scripts:report` ile mevcut durumu gözden geçir.
- Uyumluluk ile çalıştırıcı önceliği arasındaki repo kuralı için `docs/SCRIPT_SURFACE_POLICY.md` dosyasını kullan.

## Astro'ya Özgü Guardrail'ler
- Repo, `@astrojs/node` ile SSR-first çalışır.
- Route çakışmalarından kaçın ve content collection loader/schema değişikliklerini eşlenik tut.
- `.astro/` ve `dist/` artefact'ları eşzamanlı çalıştırmaya güvenli olmadığı için build ve gate wrapper'ları seri kalmalıdır.
- Astro runtime invariant'ları için kaynak dosya `ARCHITECTURE.md`'dir; bu rehberi faz operasyonlarına odaklı tut.
