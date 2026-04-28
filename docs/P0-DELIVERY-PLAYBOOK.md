# P0 Delivery Playbook

Bu playbook, tekrar eden tam batch akışları yerine hedefe yönelik ilerleme için hazırlanmıştır.

## Neden

- Aynı ağır gate zincirini sürekli çalıştırmak yerine değişen alana odaklı doğrulama gerekir.
- Dev süreç/port kaçağı olmadan kısa çevrimle geliştirme hedeflenir.

## Yeni Komutlar

- `npm run ops:targeted`
- `npm run ops:targeted:release-lite`
- `npm run ops:targeted:content`
- `npm run ops:targeted:social`
- `npm run ops:targeted:landing`
- `npm run ops:targeted:security`

## Scope İçerikleri

- `core`: `astro:sync`, `type-check`
- `content`: görsel doğrulama/moderasyon, kategori coverage, content kalite gate'leri
- `social`: social DB-first import gate + social core gate + kritik API smoke
- `landing`: kritik sayfa smoke + seo geo gate + canonical domain gate
- `security`: env gate + secrets scan + insecure defaults gate
- `release`: build + migration duplicate gate + api contract coverage + openapi route gate + problemjson strict

## Önerilen Kullanım

1. İçerik değişikliği sonrası: `npm run ops:targeted:content`
2. Sosyal özellik değişikliği sonrası: `npm run ops:targeted:social`
3. Landing/SEO değişikliği sonrası: `npm run ops:targeted:landing`
4. Yayın öncesi hızlı set: `npm run ops:targeted:release-lite`
5. Tam hedefli kapsam: `npm run ops:targeted`
6. Üretim deploy öncesi resmi yerel gate: `npm run release:local`
7. Release kanıt tazeliği kontrolü: `npm run release:evidence`

## Runtime Güvencesi

Her hedefli akış sonunda otomatik olarak:

- `dev:isolated:stop`
- `runtime:cleanup:listeners`
- `dev:isolated:check-no-orphan`

çalıştırılır ve 4321 portunda dinleyici kalmaması beklenir.
