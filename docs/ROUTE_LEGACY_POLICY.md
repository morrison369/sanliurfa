# Route Legacy Policy

## Kapsam

Bu politika public legacy route ve alias yüzeylerini kapsar.

Mevcut kapsam:

- `/places`
- `/places/*`
- `/vendor/dashboard`
- `/vendor/analytics`
- `/messages`
- `/notifications`
- `/profile`
- `/işletme/*`
- `/kullanıcı/*`

## Sahiplik ve İnceleme Ritmi

- Owner: platform + frontend
- Review cadence: aylık
- Girdi sinyali:
  - `npm run route:legacy:report`
  - iç link referansları
  - erişim logu örnekleri
  - redirect shim ve middleware envanteri

## Kurallar

1. Legacy route üstünde yeni özellik başlatılmaz.
2. İç link üretimi her zaman kanonik rota ailesine yapılır.
3. Legacy yüzey sadece redirect veya compatibility shim olarak kalır.
4. Kaldırma kararı application log ile değil access log teyidiyle verilir.

## Mevcut Operasyon Notu

- `2026-05-06` itibarıyla CWP domain kullanıcısı shell erişiminde okunabilir access log görünmüyor.
- Erişilebilen loglar: `/home/sanliur/public_html/logs/{combined,out,err}.log`
- Bu dosyalar application log niteliğinde olduğu için tek başına alias kaldırma kararı verdirmez.

## Sunset Kuralı

Bir legacy route ancak aşağıdaki koşullar birlikte sağlanınca silme adayına döner:

- repo içinde yeni iç link referansı kalmaması
- `route:legacy:report` çıktısında 3 ardışık aylık raporda `runtime=0`
- access log örneklerinde 3 ardışık aylık raporda `remote=0`
- smoke, canonical ve sitemap yüzeyinin kanonik kalması

## Özel Not

- `/vendor/dashboard` ve `/vendor/analytics` şu an bilinçli compatibility registry içindedir.
- Bunlar borç değil, kontrollü uyumluluk katmanıdır.
- Access log teyidi alınmadan kaldırılmaz.
