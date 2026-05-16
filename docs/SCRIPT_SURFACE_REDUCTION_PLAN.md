# Script Surface Reduction Plan

Bu belge `docs/script-surface-report.json` üstünden çıkan sadeleştirme
kararlarını kanonik hale getirir.

## Mevcut Durum

- Toplam script: `305`
- Script family: `55`
- Top-level script: `1` (`astro`)
- Exact command alias: `0`
- En büyük aileler:
  - `ops`: `54`
  - `test`: `21`
  - `dev`: `19`
  - `db`: `18`
  - `images`: `16`
  - `smoke`: `16`

Bu sayılar `npm run quality:metrics` çalıştığında otomatik yenilenen
`docs/script-surface-report.json` artefaktından okunur.

## Hedef

- Komut yüzeyini daha anlaşılır hale getirmek
- Alias ve tarihsel kalıntıları azaltmak
- Aynı işi yapan ikinci komutları raporlamak
- Yeni script eklerken aile disiplinini korumak

## Karar Kuralları

- Yeni script önce mevcut ailelerden birine bağlanır.
- `top-level` script sadece kanonik giriş komutları için kabul edilir.
- Aynı komut zincirinin sadece farklı isimli alias'ları varsa biri korunur, diğeri kaldırma adayı olur.
- `ops:cwp:*` ailesi runtime operasyonları içindir; benzer işi yapan `ops:targeted:*` scriptleri karar verilmeden büyütülmez.
- `test:e2e:*` ailesinde sadece farklı kullanım modu varsa ayrı komut korunur.
- Repo içi operasyon raporları için mümkünse yeni `npm script` eklenmez; `node scripts/ci/*.mjs`
  doğrudan çağrılır ve ana girişler `quality:metrics` / `jobs:nightly:core` altında toplanır.

## İlk Kaldırma Batch'i

Bu batch tamamlandı; alias kaldırmaları source seviyesinde uygulandı.

- `test:e2e:nightly`
  - Kaldırıldı. Kanonik komut `test:e2e`.
- `gate:agency`
  - Kaldırıldı. Kanonik komut `gate:isolated`.
- `redis:health`
  - Kaldırıldı. Kanonik komut `redis:isolated:health`.
- `start`
  - Kaldırıldı. Kanonik giriş komutu `npm run dev`.
- `scripts:surface:report`
  - Kaldırıldı. Rapor için kanonik çağrı `node scripts/ci/script-surface-report.mjs`.

## Sıradaki Adaylar

- `ops:targeted:*`
  - Kanonik `ops:cwp:*` ve `release:*` hatlarıyla usage-audit karşılaştırması yapılmalı.

## İnceleme Gerektiren Büyük Aileler

### `ops`

- `ops:cwp:*` kanonik runtime ailesi olarak korunur.
- `ops:targeted:*` ve `ops:next:bulk` tarihsel teslim komutları olarak raporlanmalı.
- `ops:agency:all` kaldırıldı; bulk akışlar kanonik komutları doğrudan çağırıyor.

### `dev`

- `dev`, `dev:raw`, `dev:isolated:*` aile yapısı doğru.
- `start:isolated` kaldırıldı.
- `dev` artık tek kanonik giriş; top-level alias kalmadı.

### `test`

- `test:e2e:clean`, `test:e2e:chromium:clean`, `test:e2e:social:phase1:clean` gibi cleanup varyantları korunabilir.
- `test:e2e:nightly` kaldırıldı; benzer tam alias komutlar aynı prensiple azaltılmalı.

## Uygulama Sırası

1. Kullanılmayan alias scriptleri raporla.
2. `ops:targeted:*` ailesini kanonik `ops:cwp:*` ve `release:*` akışlarına karşı usage-audit ile daralt.
3. `test:e2e:*` ailesinde yalnızca farklı runtime modunu temsil etmeyen alias'ları batch halinde sil.
4. Nightly kritik E2E akışları için yeni `npm script` açmak yerine doğrudan `node scripts/e2e/nightly-critical-suite.mjs` gibi source-level girişler kullan.
5. Her batch sonrası `quality:metrics` veya `script-surface-report` yeniden üret.

## Başarı Ölçütü

- Toplam script sayısı düşmeli.
- `top-level` ve tekil aileler azalmalı.
- Büyük ailelerde çakışan alias sayısı ölçülebilir biçimde küçülmeli.
- `exactCommandAliases` listesi sıfıra yaklaşmalı.
