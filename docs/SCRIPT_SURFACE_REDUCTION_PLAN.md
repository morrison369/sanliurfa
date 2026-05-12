# Script Surface Reduction Plan

Bu belge `docs/script-surface-report.json` üstünden çıkan sadeleştirme
kararlarını kanonik hale getirir.

## Mevcut Durum

- Toplam script: `237`
- Script family: `50`
- En büyük aileler:
  - `ops`: `51`
  - `dev`: `19`
  - `test`: `16`
  - `images`: `12`
  - `smoke`: `11`

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

## İlk Kaldırma Batch'i

Bu batch tamamlandı; alias kaldırmaları source seviyesinde uygulandı.

- `test:e2e:nightly`
  - Kaldırıldı. Kanonik komut `test:e2e`.
- `gate:agency`
  - Kaldırıldı. Kanonik komut `gate:isolated`.
- `redis:health`
  - Kaldırıldı. Kanonik komut `redis:isolated:health`.

## Sıradaki Adaylar

- `start`
  - `dev` ile aynı davranışta; CLI beklentisi yoksa sadeleştirilebilir.

## İnceleme Gerektiren Büyük Aileler

### `ops`

- `ops:cwp:*` kanonik runtime ailesi olarak korunur.
- `ops:targeted:*` ve `ops:next:bulk` tarihsel teslim komutları olarak raporlanmalı.
- `ops:agency:all` kaldırıldı; bulk akışlar kanonik komutları doğrudan çağırıyor.

### `dev`

- `dev`, `dev:raw`, `dev:isolated:*` aile yapısı doğru.
- `start:isolated` kaldırıldı.
- `start` şimdilik top-level CLI girişi olarak tutuluyor; ileride `dev` ile birleştirme kararı ayrı alınmalı.

### `test`

- `test:e2e:clean`, `test:e2e:chromium:clean`, `test:e2e:social:phase1:clean` gibi cleanup varyantları korunabilir.
- `test:e2e:nightly` kaldırıldı; benzer tam alias komutlar aynı prensiple azaltılmalı.

## Uygulama Sırası

1. Kullanılmayan alias scriptleri raporla.
2. README / docs referanslarını kanonik script adına taşı.
3. Kaldırılacak scriptleri küçük batch'lerle sil.
4. Her batch sonrası `script-surface-report` yeniden üret.

## Başarı Ölçütü

- Toplam script sayısı düşmeli.
- `top-level` ve tekil aileler azalmalı.
- Büyük ailelerde çakışan alias sayısı ölçülebilir biçimde küçülmeli.
