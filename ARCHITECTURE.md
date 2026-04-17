# Mimari

Bu depo, ayrı bir faz-teslim operasyon katmanına sahip Astro SSR uygulamasıdır. Tek depoyu paylaşan iki ayrı sistem gibi düşünülmelidir.

Önce bunları aç:

- `docs/ACTIVE_DOCS.md`
- `docs/architecture/ASTRO_RUNTIME_STATE.md`
- `docs/ops/README.md`
- `docs/ops/SOURCE_OF_TRUTH_MAP.md`

## Teslimat Modeli
- Otoritatif teslimat yüzeyi: `origin/master` üzerinden açılmış temiz `git worktree`
- Otoritatif olmayan yerel yüzey: kirli root worktree, yalnızca envanter amaçlı
- Operasyon politika referansları:
  - `STALE_WORKTREE.md`
  - `ROOT_INVENTORY_ONLY_POLICY.md`
  - `docs/WORKTREE_SOURCE_OF_TRUTH.md`

## Uygulama Calisma Zamani
- Çerçeve: Astro SSR
- Çıktı modu: `server`
- Adaptör: `@astrojs/node`
- Aktif arayuz calisma zamani: Astro sayfalari/yerlesimleri + duz TypeScript tarayici yardimcilari
- React entegrasyonu: izin verilen uyumluluk katmani, aktif arayuz sahibi degil
- Ortak mantık: `src/lib/`
- İçerik koleksiyonları: `src/content/` + `src/content.config.ts`

## Astro Değişmezleri
- `src/pages/x.ts` ve `src/pages/x/index.ts` gibi route çakışmaları üretmeyin.
- Aynı worktree içinde paralel Astro derleme veya faz kapısı zinciri çalıştırmayın.
- `import.meta.env` kullanan scriptleri `is:inline` haline çevirmeyin; bu, Astro/Vite dönüşümlerini bypass eder.
- Sıkıştırma veya exclusion kuralı değiştirirken `sw.js` dosyasını üretilen PWA worker artefact'ı olarak ele alın.
- İçerik koleksiyonu loader ve schema değişikliklerini birlikte taşıyın; `src/content/` ile `src/content.config.ts` birlikte hareket eder.

## Operasyonel Calisma Zamani
- Faz teslim modeli runner-first'tür:
  - `test:phase:range`
  - `test:phase:batch`
  - `phase:prepare:block:preferred`
  - `phase:prepare:batch:preferred`
  - `phase:doctor`
- `test:phase:<range>` girdileri uretilmis bloklar icin uyumluluk yuzeyidir; tercih edilen operator API'si degildir.

## Durum Dosyaları
- Aktif metaveri:
  - `PHASE_INDEX.md`
  - `TASK_TRACKER.md`
  - `memory.md`
  - `PHASE_CHANGELOG.md`
- `PHASE_CHANGELOG.md` yalnızca faz satırlarını kaydeder. Changelog bakım işleri changelog içine yazılmaz.

## Bağımlılık Politikası
- Bağımlılık yükseltmeleri rutin faz-teslim PR'ları içinde taşınmaz.
- Her bağımlılık PR'ından önce riski sınıflamak için `npm run deps:audit:triage` ve `docs/DEPENDENCY_TRIAGE.md` kullanın.
- Calisma zamani bagimlilik duzeltmeleri, yalnizca gelistirme araclari duzeltmelerinden once gelir.

## Build ve Gate Sınırı
- Derleme/kapı doğruluğu şu yüzeylerle doğrulanır:
  - `npm run phase:doctor`
  - `npm run test:phase:gate:ci`
  - `npm run build`
- CI required check listesi minimal ve deterministik tutulur:
  - `phase:check:tsconfig`
  - `test:phase:gate:ci`
- Advisory check'ler genişleyebilir, ancak required check'ler ancak açık bir hata modu kapatılacaksa değiştirilmelidir.
