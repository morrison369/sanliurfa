# Script Yüzeyi Politikası

Depo iki script katmanı sunar.

## Çalıştırıcı Öncelikli Komutlar
Operatörlerin birincil arayüz olarak görmesi gereken tek komutlar şunlardır:
- `npm run test:phase:range -- <range>`
- `npm run test:phase:batch -- <range-a> <range-b> <range-c>`
- `npm run phase:prepare:block:preferred -- --phase-script test:phase:<range>`
- `npm run phase:prepare:batch:preferred -- --phase-script test:phase:<range-a> --phase-script test:phase:<range-b>`
- `npm run phase:doctor`
- `npm run phase:changelog:normalize`
- `npm run phase:scripts:report`

## Uyumluluk Yüzeyi
- `test:phase:<range>` girdileri, üretilmiş faz bloklarının doğrudan çağrılabilir kalması için vardır.
- Bunlar uyumluluk yüzeyidir; tercih edilen operatör arayüzü değildir.
- Yeni dokümanlar, handoff notları ve runbook'lar tekil `test:phase:<range>` komutları yerine çalıştırıcı öncelikli komutlara referans vermelidir.
- Bayat uyumluluk girdileri `npm run phase:compat:prune-stale` ile temizlenmelidir.

## Azaltma Politikası
- Tekil `test:phase:<range>` script'lerine bağımlı yeni üst seviye operatör dokümanı ekleme.
- Manifest içinde yalnızca hâlâ kullanılan uyumluluk girdilerini tut; bayat range'ler aktif uyumluluk yüzeyinde değil, archive dokümanlarında olmalı.
- Güncel script sayısını `npm run phase:scripts:report` ile gözden geçir.
- Bayat compatibility girdilerini `npm run phase:compat:cleanup` ve `npm run phase:compat:prune-stale` ile gözden geçirip temizle.
- Aktif blocking kararları `quick-gate`, `full-gate`, `test:critical:blocking` ve `test:e2e:smoke` üzerinde kalmalıdır.
- Legacy phase workflow yalnızca manueldir; `docs/ops/LEGACY_PHASE_SURFACE.md` dosyasına bak.

## Değişiklik Politikası
- Script surface değişiklikleri, doğrulama için zorunlu değilse dependency-only PR'lara karıştırılmaz; ayrı ops PR'larında taşınır.
